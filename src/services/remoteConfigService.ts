import { fetchAndActivate, getValue } from 'firebase/remote-config';
import { remoteConfig } from './firebaseConfig';
import type { RemoteConfigState } from '../types';

export const DEFAULT_REMOTE_CONFIG: RemoteConfigState = {
  patternPackVersion: '2026.11.20-base',
  escalationConfidenceThreshold: 0.85,
  promptVersion: 'v1.4',
  localOnlyMode: false,
  bannerMessage: 'Wary Shield Active: On-device private scan first. Cloud fallback only on redacted text.',
  extraKeywords: [
    'digital arrest',
    'customs narcotics',
    'skype interrogation',
    'bescom bill update',
    'telegram review task',
    'youtube like job',
  ],
  lastFetchedAt: Date.now(),
};

// Cached state with fallback defaults
let currentState: RemoteConfigState = { ...DEFAULT_REMOTE_CONFIG };
const listeners: Set<(state: RemoteConfigState) => void> = new Set();

export function getActiveRemoteConfig(): RemoteConfigState {
  return currentState;
}

export function subscribeRemoteConfig(callback: (state: RemoteConfigState) => void): () => void {
  listeners.add(callback);
  callback(currentState);
  return () => listeners.delete(callback);
}

function notifyListeners() {
  for (const listener of listeners) {
    listener({ ...currentState });
  }
}

/**
 * Fetches and activates Remote Config parameters from Firebase,
 * falling back seamlessly to cached in-app defaults if offline or unconfigured.
 */
export async function refreshRemoteConfig(): Promise<RemoteConfigState> {
  if (remoteConfig) {
    try {
      const activated = await fetchAndActivate(remoteConfig);
      if (activated) {
        const patternPack = getValue(remoteConfig, 'pattern_pack_version').asString();
        const threshold = getValue(remoteConfig, 'escalation_confidence_threshold').asNumber();
        const promptVer = getValue(remoteConfig, 'prompt_version').asString();
        const localOnly = getValue(remoteConfig, 'local_only_mode').asBoolean();
        const banner = getValue(remoteConfig, 'banner_message').asString();
        const keywordsJson = getValue(remoteConfig, 'extra_keywords').asString();

        let extraKeywords = currentState.extraKeywords;
        if (keywordsJson) {
          try {
            const parsed = JSON.parse(keywordsJson);
            if (Array.isArray(parsed)) extraKeywords = parsed;
          } catch {
            // Keep existing keywords on JSON parse failure
          }
        }

        currentState = {
          patternPackVersion: patternPack || currentState.patternPackVersion,
          escalationConfidenceThreshold: threshold > 0 ? threshold : currentState.escalationConfidenceThreshold,
          promptVersion: promptVer || currentState.promptVersion,
          localOnlyMode: localOnly,
          bannerMessage: banner || currentState.bannerMessage,
          extraKeywords,
          lastFetchedAt: Date.now(),
        };
        notifyListeners();
      }
    } catch (err) {
      console.warn('Remote Config fetch deferred or network offline, using in-app defaults:', err);
    }
  }
  return currentState;
}

/**
 * Allows judges and testers to test dynamic Remote Config changes in-app
 * without needing Firebase Console permissions.
 */
export function updateSimulationRemoteConfig(updates: Partial<RemoteConfigState>): RemoteConfigState {
  currentState = {
    ...currentState,
    ...updates,
    lastFetchedAt: Date.now(),
  };
  notifyListeners();
  return currentState;
}
