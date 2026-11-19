export type Verdict = 'Safe' | 'Suspicious' | 'Likely scam';

export type ScamType =
  | 'otp_fraud'
  | 'fake_kyc'
  | 'digital_arrest'
  | 'courier_customs'
  | 'job_offer'
  | 'lottery'
  | 'upi_collect_request'
  | 'investment'
  | 'impersonation'
  | 'electricity_disconnection'
  | 'other'
  | 'none';

export type PipelineStage = 'stage0_rules' | 'stage1_on_device' | 'stage2_cloud_redacted';

export type ModelStatus = 'ready' | 'downloading' | 'unavailable' | 'idle';

export type AppLanguage = 'en' | 'hi' | 'kn';

export interface ScanResult {
  id: string;
  timestamp: number;
  verdict: Verdict;
  confidence: number; // 0.0 to 1.0
  scamType: ScamType;
  reasons: string[];
  actionSteps: string[];
  stageDecided: PipelineStage;
  redactedPayload?: string | null;
  outboundBytes: number;
  originalText: string;
  languageDetected: string;
  source: 'text' | 'screenshot';
}

export interface RedactionResult {
  redactedText: string;
  placeholderMap: Record<string, string>;
  counts: {
    phones: number;
    accounts: number;
    cards: number;
    aadhaar: number;
    pan: number;
    upiIds: number;
    emails: number;
    names: number;
    urlQueries: number;
    total: number;
  };
}

export interface LedgerEntry {
  id: string;
  timestamp: number;
  stage: PipelineStage;
  verdict: Verdict;
  scamType: ScamType;
  confidence: number;
  outboundBytes: number;
  redactedPayload: string | null;
  redactedCounts: {
    phones: number;
    accounts: number;
    cards: number;
    aadhaar: number;
    pan: number;
    upiIds: number;
    emails: number;
    names: number;
    urlQueries: number;
    total: number;
  };
}

export interface RemoteConfigState {
  patternPackVersion: string;
  escalationConfidenceThreshold: number;
  promptVersion: string;
  localOnlyMode: boolean;
  bannerMessage: string;
  extraKeywords: string[];
  lastFetchedAt: number;
}

export interface FamilyCircleAlert {
  id: string;
  circleId: string;
  timestamp: number;
  scamType: ScamType;
  severity: 'high' | 'medium';
  senderDisplayName: string;
  senderUserId: string;
}

export interface SampleMessage {
  id: string;
  label: string;
  category: 'scam' | 'legitimate';
  language: AppLanguage;
  scamType: ScamType;
  text: string;
  hint: string;
}
