import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Users,
  Lock,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { ScanResult, AppLanguage } from '../types';
import { TRANSLATIONS } from '../data/i18n';

interface VerdictCardProps {
  result: ScanResult;
  onSecondOpinion: () => void;
  onBroadcastFamilyAlert: () => void;
  isSecondOpinionLoading: boolean;
  language: AppLanguage;
  isCircleJoined?: boolean;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  result,
  onSecondOpinion,
  onBroadcastFamilyAlert,
  isSecondOpinionLoading,
  language,
}) => {
  const t = TRANSLATIONS[language];

  // Visual styling based on verdict
  const isSafe = result.verdict === 'Safe';
  const isSuspicious = result.verdict === 'Suspicious';
  const isScam = result.verdict === 'Likely scam';

  const badgeConfig = isSafe
    ? {
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-950/20',
        text: 'text-emerald-400',
        title: t.verdictSafe,
        icon: ShieldCheck,
        pillBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        barColor: 'bg-emerald-500',
      }
    : isSuspicious
      ? {
          border: 'border-amber-500/40',
          bg: 'bg-amber-950/20',
          text: 'text-amber-400',
          title: t.verdictSuspicious,
          icon: AlertTriangle,
          pillBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
          barColor: 'bg-amber-500',
        }
      : {
          border: 'border-red-500/50',
          bg: 'bg-red-950/30',
          text: 'text-red-400',
          title: t.verdictScam,
          icon: ShieldAlert,
          pillBg: 'bg-red-500/10 text-red-300 border-red-500/30',
          barColor: 'bg-red-500',
        };

  const IconComponent = badgeConfig.icon;
  const confidencePercent = Math.round(result.confidence * 100);

  // Friendly name for scam types
  const formatScamType = (type: string) => {
    switch (type) {
      case 'otp_fraud':
        return 'OTP & Credential Theft';
      case 'fake_kyc':
        return 'Fake Bank KYC / Account Block';
      case 'digital_arrest':
        return 'Digital Arrest & Police Intimidation';
      case 'courier_customs':
        return 'Customs Duty & Courier Fee Fraud';
      case 'job_offer':
        return 'YouTube Task & Fake Job Offer';
      case 'lottery':
        return 'Lottery & Lucky Draw Fee Fraud';
      case 'upi_collect_request':
        return 'UPI Collect Request / Enter PIN Trap';
      case 'investment':
        return 'Guaranteed Returns Investment Scam';
      case 'impersonation':
        return 'Impersonation & Friend Emergency';
      case 'electricity_disconnection':
        return 'Urgent Electricity Disconnection Threat';
      default:
        return 'Unknown Threat / Suspicious Link';
    }
  };

  return (
    <div
      className={`rounded-2xl border ${badgeConfig.border} ${badgeConfig.bg} p-5 sm:p-7 shadow-2xl transition-all`}
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border ${badgeConfig.border} ${badgeConfig.pillBg}`}
          >
            <IconComponent className="w-7 h-7" />
          </div>
          <div>
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeConfig.pillBg}`}
            >
              {result.verdict}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              {badgeConfig.title}
            </h2>
          </div>
        </div>

        {/* Confidence & Mode Badge */}
        <div className="flex flex-col items-start sm:items-end gap-1.5 self-stretch sm:self-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{t.confidenceLabel}:</span>
            <span className={`text-sm font-bold font-mono ${badgeConfig.text}`}>
              {confidencePercent}%
            </span>
          </div>
          <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className={`h-full ${badgeConfig.barColor} transition-all duration-500`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>
              {result.stageDecided === 'stage0_rules'
                ? 'Decided On-Device (Rules, 0 bytes sent)'
                : result.stageDecided === 'stage1_on_device'
                  ? 'Decided On-Device (Gemini Nano, 0 bytes sent)'
                  : 'Cloud Model (Redacted Payload)'}
            </span>
          </div>
        </div>
      </div>

      {/* Scam Category (if not safe) */}
      {!isSafe && (
        <div className="mt-5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">{t.scamTypeLabel}:</span>
          <span className="text-xs font-bold text-slate-200">
            {formatScamType(result.scamType)}
          </span>
        </div>
      )}

      {/* Reasons Section */}
      <div className="mt-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>{t.reasonsHeading}</span>
        </h4>
        <ul className="space-y-2">
          {result.reasons.map((reason, idx) => (
            <li
              key={idx}
              className="text-sm text-slate-200 flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80"
            >
              <span className="text-blue-400 font-bold leading-none mt-1">•</span>
              <span className="leading-relaxed font-sans">{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Steps Section */}
      <div className="mt-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>{t.actionsHeading}</span>
        </h4>
        <ul className="space-y-2">
          {result.actionSteps.map((step, idx) => (
            <li
              key={idx}
              className="text-sm text-slate-300 flex items-start gap-2.5 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60"
            >
              <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-sans">{step}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Cloud Second Opinion & Family Circle Buttons */}
      <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center flex-wrap gap-2.5">
          {result.stageDecided !== 'stage2_cloud_redacted' && (
            <button
              onClick={onSecondOpinion}
              disabled={isSecondOpinionLoading}
              className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
              title="Escalates to cloud model after automatically stripping phone numbers, accounts, and IDs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSecondOpinionLoading ? 'animate-spin' : ''}`} />
              <span>{t.secondOpinionBtn}</span>
            </button>
          )}

          {isScam && (
            <button
              onClick={onBroadcastFamilyAlert}
              className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 transition-colors"
              title="Sends an alert to your Family Circle (only scam category and time, NEVER message content)"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Alert Family Circle</span>
            </button>
          )}
        </div>

        {/* Disclaimer */}
        <p className="text-[11px] text-slate-400 italic flex items-center gap-1.5 self-center">
          <HelpCircle className="w-3 h-3 text-slate-500 shrink-0" />
          <span>{t.disclaimer}</span>
        </p>
      </div>
    </div>
  );
};
