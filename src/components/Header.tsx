import React from 'react';
import {
  Shield,
  Eye,
  Wifi,
  WifiOff,
  BookOpen,
  Users,
  Settings,
  Download,
  CheckCircle,
  Cloud,
} from 'lucide-react';
import type { AppLanguage, ModelStatus } from '../types';
import { TRANSLATIONS } from '../data/i18n';

interface HeaderProps {
  language: AppLanguage;
  onLanguageChange: (lang: AppLanguage) => void;
  modelStatus: ModelStatus;
  downloadProgress: number;
  onInitOnDeviceAI: () => void;
  simulateOffline: boolean;
  onToggleSimulateOffline: () => void;
  onOpenLedger: () => void;
  onOpenFamily: () => void;
  onOpenSettings: () => void;
  ledgerCount: number;
  hasUnreadFamilyAlert: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onLanguageChange,
  modelStatus,
  downloadProgress,
  onInitOnDeviceAI,
  simulateOffline,
  onToggleSimulateOffline,
  onOpenLedger,
  onOpenFamily,
  onOpenSettings,
  ledgerCount,
  hasUnreadFamilyAlert,
}) => {
  const t = TRANSLATIONS[language];

  return (
    <header className="border-b border-slate-800 bg-[#090d16]/95 backdrop-blur sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400">
            <Shield className="w-5 h-5 text-blue-400" />
            <Eye className="w-2.5 h-2.5 text-white absolute bottom-2" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">{t.appTitle}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                Hybrid AI
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">{t.promise}</p>
          </div>
        </div>

        {/* Status Pills & Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Offline simulation toggle */}
          <button
            onClick={onToggleSimulateOffline}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              simulateOffline
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle offline mode to test Stage 0 rules and on-device offline capability"
            aria-pressed={simulateOffline}
          >
            {simulateOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{simulateOffline ? 'Offline Active' : 'Simulate Offline'}</span>
          </button>

          {/* Model Status Pill */}
          <div className="flex items-center">
            {modelStatus === 'ready' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>On-Device AI Ready</span>
              </span>
            )}

            {modelStatus === 'downloading' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400 animate-pulse">
                <Download className="w-3.5 h-3.5 animate-bounce" />
                <span>Downloading AI ({downloadProgress}%)</span>
              </span>
            )}

            {modelStatus === 'unavailable' && (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 border border-slate-700 text-slate-300">
                <Cloud className="w-3.5 h-3.5 text-blue-400" />
                <span>Cloud Fallback</span>
              </span>
            )}

            {modelStatus === 'idle' && (
              <button
                onClick={onInitOnDeviceAI}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                title="Initialize on-device Gemini Nano model on this device"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Enable On-Device AI</span>
              </button>
            )}
          </div>

          {/* Language Selector */}
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            {(['en', 'hi', 'kn'] as AppLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onLanguageChange(lang)}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  language === lang
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिंदी' : 'ಕನ್ನಡ'}
              </button>
            ))}
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={onOpenLedger}
            className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title={t.privacyLedgerBtn}
            aria-label={t.privacyLedgerBtn}
          >
            <BookOpen className="w-4 h-4" />
            {ledgerCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {ledgerCount > 9 ? '9+' : ledgerCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenFamily}
            className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title={t.familyCircleBtn}
            aria-label={t.familyCircleBtn}
          >
            <Users className="w-4 h-4" />
            {hasUnreadFamilyAlert && (
              <span className="absolute -top-1 -right-1 bg-red-500 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 animate-pulse" />
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
            title={t.settingsBtn}
            aria-label={t.settingsBtn}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
