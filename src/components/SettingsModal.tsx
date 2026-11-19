import React, { useState } from 'react';
import {
  X,
  Settings,
  RefreshCw,
  SlidersHorizontal,
  Key,
  Check,
  RotateCcw,
} from 'lucide-react';
import type { RemoteConfigState } from '../types';
import {
  updateSimulationRemoteConfig,
  refreshRemoteConfig,
  DEFAULT_REMOTE_CONFIG,
} from '../services/remoteConfigService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RemoteConfigState;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
}) => {
  const [threshold, setThreshold] = useState(config.escalationConfidenceThreshold);
  const [localOnly, setLocalOnly] = useState(config.localOnlyMode);
  const [banner, setBanner] = useState(config.bannerMessage);
  const [patternVersion, setPatternVersion] = useState(config.patternPackVersion);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSimulationRemoteConfig({
      escalationConfidenceThreshold: threshold,
      localOnlyMode: localOnly,
      bannerMessage: banner,
      patternPackVersion: patternVersion,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleReset = () => {
    updateSimulationRemoteConfig(DEFAULT_REMOTE_CONFIG);
    setThreshold(DEFAULT_REMOTE_CONFIG.escalationConfidenceThreshold);
    setLocalOnly(DEFAULT_REMOTE_CONFIG.localOnlyMode);
    setBanner(DEFAULT_REMOTE_CONFIG.bannerMessage);
    setPatternVersion(DEFAULT_REMOTE_CONFIG.patternPackVersion);
  };

  const handleFetchRemote = async () => {
    setIsRefreshing(true);
    const updated = await refreshRemoteConfig();
    setThreshold(updated.escalationConfidenceThreshold);
    setLocalOnly(updated.localOnlyMode);
    setBanner(updated.bannerMessage);
    setPatternVersion(updated.patternPackVersion);
    setIsRefreshing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#090d16]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Settings & Remote Config
              </h2>
              <p className="text-xs text-slate-400">
                Control runtime behavior, scam rules packs, and App Check.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Remote Config Sync Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block uppercase tracking-wider font-semibold">
                Active Pattern Pack
              </span>
              <span className="text-sm font-mono font-bold text-blue-400">
                {config.patternPackVersion}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                Prompt Version: {config.promptVersion}
              </span>
            </div>
            <button
              onClick={handleFetchRemote}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Fetch Remote</span>
            </button>
          </div>

          {/* Escalation Confidence Threshold */}
          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                <span>Escalation Confidence Threshold</span>
              </label>
              <span className="text-xs font-mono font-bold text-blue-400">
                {Math.round(threshold * 100)}%
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              If on-device confidence is below this value, Wary escalates to the cloud model with on-device redaction.
            </p>
            <input
              type="range"
              min="0.5"
              max="0.99"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-blue-600 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Local-Only Mode (Kill Switch) */}
          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 flex items-center justify-between">
            <div className="pr-4">
              <span className="text-xs font-semibold text-slate-200 block">
                Local-Only Mode (Cloud Kill Switch)
              </span>
              <span className="text-[11px] text-slate-400">
                When active, completely disables all cloud fallback calls. Only Stage 0 rules and on-device AI run.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={localOnly}
              onClick={() => setLocalOnly(!localOnly)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                localOnly ? 'bg-blue-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  localOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Banner Message */}
          <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-200 block">
              Broadcast Banner Message
            </label>
            <input
              type="text"
              value={banner}
              onChange={(e) => setBanner(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* App Check Information for Judges */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Firebase App Check & Debug Tokens</span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              App Check protects both Firebase AI Logic and Firestore. In production, reCAPTCHA v3 validates web traffic. For local judge evaluation and development, set:
            </p>
            <code className="text-[11px] bg-slate-950 p-2 rounded block text-emerald-400 font-mono overflow-x-auto border border-slate-800">
              VITE_APPCHECK_DEBUG_TOKEN=true
            </code>
            <p className="text-[10px] text-slate-500">
              The debug token printed in the browser console can be whitelisted under Firebase Console &gt; App Check &gt; Apps.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-[#090d16]">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-600/20"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Applied!</span>
              </>
            ) : (
              <span>Apply Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
