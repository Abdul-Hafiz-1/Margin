import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  type GenerativeModel,
} from 'firebase/ai';
import { firebaseApp, isFirebaseConfigured } from './firebaseConfig';
import { redactSensitiveData, restoreRedactions } from './redactor';
import { evaluateRules } from './rulesEngine';
import { addLedgerEntry } from './privacyLedger';
import { getActiveRemoteConfig } from './remoteConfigService';
import type {
  ScanResult,
  ModelStatus,
  PipelineStage,
  Verdict,
  ScamType,
} from '../types';

let onDeviceModelInstance: GenerativeModel | null = null;
let cloudModelInstance: GenerativeModel | null = null;

let currentModelStatus: ModelStatus = 'idle';
let currentDownloadProgress: number = 0;
const statusListeners: Set<(status: ModelStatus, progress: number) => void> = new Set();

export function subscribeModelStatus(
  callback: (status: ModelStatus, progress: number) => void
): () => void {
  statusListeners.add(callback);
  callback(currentModelStatus, currentDownloadProgress);
  return () => statusListeners.delete(callback);
}

function updateStatus(status: ModelStatus, progress: number = 0) {
  currentModelStatus = status;
  currentDownloadProgress = progress;
  for (const listener of statusListeners) {
    listener(status, progress);
  }
}

/**
 * Checks if the browser environment supports Chrome Built-in / on-device AI.
 */
export function checkOnDeviceSupport(): boolean {
  if (typeof window === 'undefined') return false;
  // Chrome Prompt API / window.ai availability
  const hasWindowAI = typeof (window as any).ai !== 'undefined';
  const isChrome =
    /Chrome/.test(navigator.userAgent) &&
    /Google Inc/.test(navigator.vendor) &&
    !/Mobile|Android/.test(navigator.userAgent);

  return hasWindowAI || isChrome;
}

// Auto-detect initial state
if (typeof window !== 'undefined') {
  if (!checkOnDeviceSupport()) {
    currentModelStatus = 'unavailable';
  } else {
    currentModelStatus = 'idle';
  }
}

/**
 * Initializes the on-device model via Firebase AI Logic.
 * Must be triggered on or after a user interaction (button click).
 */
export async function initializeOnDeviceModel(): Promise<boolean> {
  if (!checkOnDeviceSupport()) {
    updateStatus('unavailable');
    return false;
  }

  updateStatus('downloading', 0);

  try {
    const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
    onDeviceModelInstance = getGenerativeModel(ai, {
      model: 'gemini-2.5-flash',
      mode: InferenceMode.PREFER_ON_DEVICE,
    });

    // Call initializeDeviceModel with progress tracking
    if (typeof (onDeviceModelInstance as any).initializeDeviceModel === 'function') {
      await (onDeviceModelInstance as any).initializeDeviceModel((val: number) => {
        const pct = Math.round(val * 100);
        updateStatus('downloading', pct);
      });
    } else {
      // Simulate download progress steps for browsers preparing model weights
      for (let p = 15; p <= 100; p += 25) {
        updateStatus('downloading', p);
        await new Promise((r) => setTimeout(r, 120));
      }
    }

    updateStatus('ready', 100);
    return true;
  } catch (err) {
    console.warn('On-device model initialization failed or unconfigured, falling back to cloud:', err);
    updateStatus('unavailable');
    return false;
  }
}

function buildPrompt(message: string): string {
  const cfg = getActiveRemoteConfig();
  return `PromptVersion: ${cfg.promptVersion}
Role: You are Wary, a scam and data-leak detection shield built for users in India and globally.
Analyze the message below for scam indicators, fraud patterns, or credential theft.
Reply strictly in JSON with this exact structure:
{
  "verdict": "Safe" | "Suspicious" | "Likely scam",
  "scam_type": "otp_fraud" | "fake_kyc" | "digital_arrest" | "courier_customs" | "job_offer" | "lottery" | "upi_collect_request" | "investment" | "impersonation" | "electricity_disconnection" | "other" | "none",
  "confidence": 0.0 to 1.0,
  "reasons": ["plain language reason quoting risky phrase 1", "plain language reason 2"],
  "action_steps": ["step 1", "step 2"],
  "reply_language": "en" | "hi" | "kn"
}

Message:
${message}`;
}

function parseModelJson(rawText: string): any {
  try {
    const cleaned = rawText.replace(/```json\s*|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * Three-Stage Hybrid AI Pipeline
 */
export async function runHybridScan(
  inputText: string,
  options: {
    forceCloudSecondOpinion?: boolean;
    simulateOffline?: boolean;
    source?: 'text' | 'screenshot';
  } = {}
): Promise<ScanResult> {
  const config = getActiveRemoteConfig();
  const text = inputText.trim();

  // --- STAGE 0: Deterministic Rules Engine (runs offline & with zero AI) ---
  const rulesResult = evaluateRules(text, config.extraKeywords);

  // If network simulated offline or local_only_mode is active, return Stage 0 / On-Device only
  if (options.simulateOffline || config.localOnlyMode) {
    await addLedgerEntry({
      stage: 'stage0_rules',
      verdict: rulesResult.verdict,
      scamType: rulesResult.scamType,
      confidence: rulesResult.confidence,
      outboundBytes: 0,
      redactedPayload: null,
      redactedCounts: {
        phones: 0,
        accounts: 0,
        cards: 0,
        aadhaar: 0,
        pan: 0,
        upiIds: 0,
        emails: 0,
        names: 0,
        urlQueries: 0,
        total: 0,
      },
    });

    return {
      id: `scan_${Date.now()}`,
      timestamp: Date.now(),
      verdict: rulesResult.verdict,
      confidence: rulesResult.confidence,
      scamType: rulesResult.scamType,
      reasons: rulesResult.reasons,
      actionSteps: rulesResult.actionSteps,
      stageDecided: 'stage0_rules',
      redactedPayload: null,
      outboundBytes: 0,
      originalText: text,
      languageDetected: rulesResult.languageDetected,
      source: options.source || 'text',
    };
  }

  // Check if Stage 1 (On-Device) can be run
  let stage1Decided: ScanResult | null = null;
  if (!options.forceCloudSecondOpinion && currentModelStatus === 'ready' && onDeviceModelInstance) {
    try {
      const prompt = buildPrompt(text);
      const res = await onDeviceModelInstance.generateContent(prompt);
      const textOutput = res.response.text();
      const parsed = parseModelJson(textOutput);

      if (parsed && parsed.verdict && parsed.confidence != null) {
        // Zero outbound bytes for on-device inference!
        await addLedgerEntry({
          stage: 'stage1_on_device',
          verdict: parsed.verdict,
          scamType: parsed.scam_type || 'other',
          confidence: parsed.confidence,
          outboundBytes: 0,
          redactedPayload: null,
          redactedCounts: {
            phones: 0,
            accounts: 0,
            cards: 0,
            aadhaar: 0,
            pan: 0,
            upiIds: 0,
            emails: 0,
            names: 0,
            urlQueries: 0,
            total: 0,
          },
        });

        stage1Decided = {
          id: `scan_${Date.now()}`,
          timestamp: Date.now(),
          verdict: parsed.verdict,
          confidence: parsed.confidence,
          scamType: parsed.scam_type || 'other',
          reasons: parsed.reasons || rulesResult.reasons,
          actionSteps: parsed.action_steps || rulesResult.actionSteps,
          stageDecided: 'stage1_on_device',
          redactedPayload: null,
          outboundBytes: 0,
          originalText: text,
          languageDetected: parsed.reply_language || rulesResult.languageDetected,
          source: options.source || 'text',
        };
      }
    } catch (err) {
      console.warn('Stage 1 on-device execution encountered error, falling through to Stage 2:', err);
    }
  }

  // Check if Stage 1 is satisfactory and above threshold
  if (stage1Decided && stage1Decided.confidence >= config.escalationConfidenceThreshold) {
    return stage1Decided;
  }

  // --- STAGE 2: Cloud Escalation with ON-DEVICE REDACTION FIRST ---
  // Triggered when:
  // 1. User asked for a second opinion
  // 2. Stage 1 confidence < escalation threshold (e.g. 0.85)
  // 3. On-device model unavailable
  const redaction = redactSensitiveData(text);
  const outboundBytes = new TextEncoder().encode(redaction.redactedText).length;

  let cloudVerdict: Verdict = rulesResult.verdict;
  let cloudScamType: ScamType = rulesResult.scamType;
  let cloudConfidence: number = rulesResult.confidence;
  let cloudReasons: string[] = rulesResult.reasons;
  let cloudActionSteps: string[] = rulesResult.actionSteps;
  let cloudLang: string = rulesResult.languageDetected;
  let stageUsed: PipelineStage = 'stage2_cloud_redacted';

  if (isFirebaseConfigured) {
    try {
      if (!cloudModelInstance) {
        const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });
        cloudModelInstance = getGenerativeModel(ai, {
          model: 'gemini-2.5-flash',
          mode: InferenceMode.ONLY_IN_CLOUD,
        });
      }

      const prompt = buildPrompt(redaction.redactedText);
      const res = await cloudModelInstance.generateContent(prompt);
      const parsed = parseModelJson(res.response.text());

      if (parsed && parsed.verdict) {
        cloudVerdict = parsed.verdict;
        cloudScamType = parsed.scam_type || cloudScamType;
        cloudConfidence = parsed.confidence ?? cloudConfidence;
        // Restore placeholders in reasons & action steps locally
        cloudReasons = (parsed.reasons || []).map((r: string) =>
          restoreRedactions(r, redaction.placeholderMap)
        );
        cloudActionSteps = (parsed.action_steps || []).map((a: string) =>
          restoreRedactions(a, redaction.placeholderMap)
        );
        cloudLang = parsed.reply_language || cloudLang;
      }
    } catch (err) {
      console.warn('Cloud model call error (using Stage 0 rules result):', err);
      stageUsed = 'stage0_rules';
    }
  } else {
    // If Firebase cloud API key not provided, Stage 0 rules provide high-fidelity offline protection
    stageUsed = 'stage0_rules';
  }

  // Log in Privacy Ledger
  await addLedgerEntry({
    stage: stageUsed,
    verdict: cloudVerdict,
    scamType: cloudScamType,
    confidence: cloudConfidence,
    outboundBytes: stageUsed === 'stage2_cloud_redacted' ? outboundBytes : 0,
    redactedPayload: stageUsed === 'stage2_cloud_redacted' ? redaction.redactedText : null,
    redactedCounts: redaction.counts,
  });

  return {
    id: `scan_${Date.now()}`,
    timestamp: Date.now(),
    verdict: cloudVerdict,
    confidence: cloudConfidence,
    scamType: cloudScamType,
    reasons: cloudReasons,
    actionSteps: cloudActionSteps,
    stageDecided: stageUsed,
    redactedPayload: stageUsed === 'stage2_cloud_redacted' ? redaction.redactedText : null,
    outboundBytes: stageUsed === 'stage2_cloud_redacted' ? outboundBytes : 0,
    originalText: text,
    languageDetected: cloudLang,
    source: options.source || 'text',
  };
}
