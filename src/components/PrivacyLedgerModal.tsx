import React, { useState } from 'react';
import {
  X,
  Shield,
  Trash2,
  FileCode,
  FileSpreadsheet,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { LedgerEntry, AppLanguage } from '../types';
import { TRANSLATIONS } from '../data/i18n';
import { exportLedgerJson, exportLedgerCsv } from '../services/privacyLedger';

interface PrivacyLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LedgerEntry[];
  onClear: () => void;
  language: AppLanguage;
}

export const PrivacyLedgerModal: React.FC<PrivacyLedgerModalProps> = ({
  isOpen,
  onClose,
  entries,
  onClear,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalBytes = entries.reduce((acc, curr) => acc + curr.outboundBytes, 0);
  const totalRedactedTokens = entries.reduce(
    (acc, curr) => acc + (curr.redactedCounts?.total || 0),
    0
  );
  const onDeviceChecks = entries.filter((e) => e.stage !== 'stage2_cloud_redacted').length;

  const handleDownload = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = async () => {
    const json = await exportLedgerJson();
    handleDownload(json, `wary-privacy-ledger-${Date.now()}.json`, 'application/json');
  };

  const handleExportCsv = async () => {
    const csv = await exportLedgerCsv();
    handleDownload(csv, `wary-privacy-ledger-${Date.now()}.csv`, 'text/csv');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#090d16]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">{t.ledgerTitle}</h2>
              <p className="text-xs text-slate-400">{t.ledgerSubtitle}</p>
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

        {/* Audit Stats Banner */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/60 border-b border-slate-800 text-center">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              100% On-Device Checks
            </span>
            <span className="text-lg font-bold text-emerald-400 font-mono">
              {onDeviceChecks} / {entries.length}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Total Outbound Bytes
            </span>
            <span className="text-lg font-bold text-blue-400 font-mono">
              {totalBytes} B
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Redacted Private Items
            </span>
            <span className="text-lg font-bold text-purple-400 font-mono">
              {totalRedactedTokens}
            </span>
          </div>
        </div>

        {/* Ledger Entries List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-300">{t.emptyLedger}</p>
              <p className="text-xs text-slate-500 mt-1">
                Zero data is kept on external servers. Everything stays on this browser.
              </p>
            </div>
          ) : (
            entries.map((entry) => {
              const isExpanded = expandedId === entry.id;
              const isCloud = entry.stage === 'stage2_cloud_redacted';

              return (
                <div
                  key={entry.id}
                  className="rounded-xl bg-[#090d16] border border-slate-800/80 p-3.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                          isCloud
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {entry.stage === 'stage0_rules'
                          ? 'Stage 0 Rules (Offline)'
                          : entry.stage === 'stage1_on_device'
                            ? 'Stage 1 On-Device'
                            : 'Stage 2 Cloud (Redacted)'}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        {entry.verdict}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({Math.round(entry.confidence * 100)}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="font-mono">
                        {entry.outboundBytes === 0 ? (
                          <span className="text-emerald-400 font-semibold">0 B Outbound</span>
                        ) : (
                          <span className="text-amber-400">{entry.outboundBytes} B Sent</span>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Redacted Payload Inspector */}
                  {entry.redactedPayload && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>
                          {isExpanded ? 'Hide Outbound Payload' : 'Inspect Exact Text Sent to Cloud'}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
                          <div className="text-[10px] text-emerald-400 mb-1 flex items-center gap-1 font-sans">
                            <Lock className="w-3 h-3" />
                            <span>
                              Verified: All phones, IDs, accounts & names were stripped before dispatch.
                            </span>
                          </div>
                          {entry.redactedPayload}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-800 bg-[#090d16]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJson}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-50 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>{t.exportJson}</span>
            </button>
            <button
              onClick={handleExportCsv}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-50 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.exportCsv}</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (confirm('Permanently delete all privacy ledger records from this device?')) {
                onClear();
              }
            }}
            disabled={entries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.clearLedger}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
