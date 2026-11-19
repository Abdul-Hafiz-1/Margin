import React from 'react';
import { ShieldCheck, Cloud, AlertCircle, Download, WifiOff } from 'lucide-react';
import type { ModelStatus, AppLanguage } from '../types';
import { TRANSLATIONS } from '../data/i18n';

interface ModelStatusBannerProps {
  modelStatus: ModelStatus;
  downloadProgress: number;
  bannerMessage: string;
  patternPackVersion: string;
  simulateOffline: boolean;
  onInitOnDeviceAI: () => void;
  language: AppLanguage;
}

export const ModelStatusBanner: React.FC<ModelStatusBannerProps> = ({
  modelStatus,
  downloadProgress,
  bannerMessage,
  patternPackVersion,
  simulateOffline,
  onInitOnDeviceAI,
  language,
}) => {
  const t = TRANSLATIONS[language];

  return (
    <div className="w-full bg-slate-900/60 border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        {/* Left: Message or Offline note */}
        <div className="flex items-center gap-2 text-slate-300">
          {simulateOffline ? (
            <>
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-400">
                <WifiOff className="w-3 h-3" />
              </span>
              <span className="font-medium text-amber-300">
                Offline Mode: Stage 0 deterministic rules running locally. Zero cloud calls.
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/20 text-blue-400">
                <AlertCircle className="w-3 h-3" />
              </span>
              <span className="text-slate-300">{bannerMessage}</span>
            </>
          )}
        </div>

        {/* Right: Technical status info */}
        <div className="flex items-center gap-3 text-slate-400 self-end sm:self-auto">
          <span className="text-[11px] font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
            Rules Pack: {patternPackVersion}
          </span>

          {modelStatus === 'idle' && (
            <button
              onClick={onInitOnDeviceAI}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium underline underline-offset-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.downloadAiBtn}</span>
            </button>
          )}

          {modelStatus === 'downloading' && (
            <div className="flex items-center gap-2">
              <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-700">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <span className="text-[11px] text-blue-400 font-mono">{downloadProgress}%</span>
            </div>
          )}

          {modelStatus === 'ready' && (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Gemini Nano Ready</span>
            </span>
          )}

          {modelStatus === 'unavailable' && (
            <span className="flex items-center gap-1 text-slate-400">
              <Cloud className="w-3.5 h-3.5 text-blue-400" />
              <span>Cloud Fallback (Redacted)</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
