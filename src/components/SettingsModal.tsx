import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Shield,
  Database,
  Play,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { checkOnDeviceHardware, runAIProofOfConcept, type AIProofResult } from '../services/aiProofService';
import { getAILogs, processPendingSyncQueue } from '../services/marginRepository';
import { signInWithGoogle, signInAsGuest, signOutUser } from '../services/authService';
import type { AIOperationLog, RecordAuthor } from '../types/margin';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: RecordAuthor;
  onSwitchUser: (newUser: RecordAuthor) => void;
  isSimulatedOffline: boolean;
  onToggleSimulatedOffline: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchUser,
  isSimulatedOffline,
  onToggleSimulatedOffline,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'sync' | 'account'>('ai');
  const [proofResult, setProofResult] = useState<AIProofResult | null>(null);
  const [isRunningProof, setIsRunningProof] = useState(false);
  const [aiLogs, setAiLogs] = useState<AIOperationLog[]>([]);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getAILogs().then(setAiLogs);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const hardware = checkOnDeviceHardware();

  const handleRunProof = async () => {
    setIsRunningProof(true);
    try {
      const res = await runAIProofOfConcept();
      setProofResult(res);
      const logs = await getAILogs();
      setAiLogs(logs);
    } finally {
      setIsRunningProof(false);
    }
  };

  const handleManualSync = async () => {
    setSyncFeedback('Processing pending queue...');
    const res = await processPendingSyncQueue();
    setSyncFeedback(`Sync complete: ${res.syncedCount} items uploaded, ${res.errors} deferred.`);
    setTimeout(() => setSyncFeedback(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252620]/40 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-[#FFFFFF] rounded-xl border border-[#E5E3DA] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E3DA] bg-[#F6F5F0]">
          <h2 id="settings-title" className="font-serif text-xl font-medium text-[#252620]">
            System & AI Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-[#77766E] hover:text-[#252620] p-1 rounded-md"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-[#E5E3DA] px-6 bg-[#FFFFFF] text-xs font-medium">
          <button
            onClick={() => setActiveTab('ai')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'ai'
                ? 'border-[#657C69] text-[#252620]'
                : 'border-transparent text-[#77766E] hover:text-[#252620]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Firebase AI Logic & Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'border-[#657C69] text-[#252620]'
                : 'border-transparent text-[#77766E] hover:text-[#252620]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Offline & Persistence</span>
          </button>

          <button
            onClick={() => setActiveTab('account')}
            className={`py-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'account'
                ? 'border-[#657C69] text-[#252620]'
                : 'border-transparent text-[#77766E] hover:text-[#252620]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Profile & Privacy</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Hardware Status Card */}
              <div className="bg-[#EFEEE8] border border-[#E5E3DA] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-semibold text-[#657C69]">
                    Hardware & Prompt API Audit
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      hardware.hasPromptAPI
                        ? 'bg-[#EAF3EC] text-[#2E6B47]'
                        : 'bg-[#FBF0EA] text-[#94532B]'
                    }`}
                  >
                    {hardware.hasPromptAPI ? 'Gemini Nano Ready' : 'Cloud / Fallback Mode'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#56554D]">
                  <div>
                    <span className="text-[#77766E] block text-[10px]">Browser Engine:</span>
                    <span className="font-mono text-[#252620]">
                      {hardware.isChromeDesktop139Plus ? 'Chrome Desktop 139+' : 'Other / Non-Chrome'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#77766E] block text-[10px]">Prompt API (window.ai):</span>
                    <span className="font-mono text-[#252620]">
                      {hardware.hasPromptAPI ? 'Detected & Enabled' : 'Unavailable'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-[#77766E] leading-relaxed pt-1 border-t border-[#E5E3DA]">
                  {hardware.details}
                </p>
              </div>

              {/* Technical Proof Verification Button */}
              <div className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-sm font-medium text-[#252620]">
                      Run Firebase AI Logic Technical Proof
                    </h3>
                    <p className="text-[11px] text-[#77766E]">
                      Tests initialization, structured JSON generation, and reports verified execution path.
                    </p>
                  </div>

                  <button
                    onClick={handleRunProof}
                    disabled={isRunningProof}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252620] text-[#F6F5F0] rounded-md text-xs font-medium hover:bg-[#3D3E35] disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 text-[#A8BBAA]" />
                    <span>{isRunningProof ? 'Testing...' : 'Execute Proof'}</span>
                  </button>
                </div>

                {proofResult && (
                  <div className="p-3 bg-[#F6F5F0] border border-[#E5E3DA] rounded-md space-y-2 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#252620] font-semibold">Verified Path:</span>
                      <span className="text-[#657C69]">{proofResult.actualExecutionPath}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#252620]">Latency:</span>
                      <span>{proofResult.latencyMs} ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#252620]">Model Instance:</span>
                      <span>{proofResult.modelUsed}</span>
                    </div>
                    <div className="pt-2 border-t border-[#E5E3DA] text-[10px] text-[#56554D]">
                      Structured Output: {JSON.stringify(proofResult.sampleOutput)}
                    </div>
                  </div>
                )}
              </div>

              {/* Execution Audit Log Table */}
              <div className="space-y-2">
                <h3 className="font-serif text-sm font-medium text-[#252620]">
                  AI Execution Transparency Audit Log
                </h3>
                <div className="border border-[#E5E3DA] rounded-lg overflow-hidden bg-[#FFFFFF]">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#F6F5F0] border-b border-[#E5E3DA] text-[#77766E] font-mono text-[10px]">
                      <tr>
                        <th className="p-2">Operation</th>
                        <th className="p-2">Inference Mode</th>
                        <th className="p-2">Model</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E3DA]">
                      {aiLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-[#77766E]">
                            No AI operations logged yet.
                          </td>
                        </tr>
                      ) : (
                        aiLogs.slice(0, 6).map((log) => (
                          <tr key={log.id} className="hover:bg-[#F6F5F0]">
                            <td className="p-2 font-medium capitalize text-[#252620]">
                              {log.operationType.replace('_', ' ')}
                            </td>
                            <td className="p-2 font-mono text-[#657C69]">{log.inferenceMode}</td>
                            <td className="p-2 font-mono text-[#77766E]">{log.model}</td>
                            <td className="p-2">
                              <span
                                className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                                  log.status === 'success'
                                    ? 'bg-[#EAF3EC] text-[#2E6B47]'
                                    : 'bg-[#FBF0EA] text-[#94532B]'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-[#77766E]">{log.latencyMs || 0}ms</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#EFEEE8] border border-[#E5E3DA] rounded-lg space-y-2">
                <h3 className="font-medium text-[#252620]">IndexedDB Local-First Persistence</h3>
                <p className="text-[11px] text-[#77766E] leading-relaxed">
                  All spaces, records, and relationships are persisted in your browser's IndexedDB before any cloud synchronization. Your context remains completely accessible and editable offline.
                </p>
              </div>

              {/* Simulate Offline Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#FFFFFF] border border-[#E5E3DA] rounded-lg">
                <div>
                  <h4 className="font-medium text-[#252620]">Simulate Offline Mode</h4>
                  <p className="text-[11px] text-[#77766E]">
                    Forces offline behavior for hackathon demos and testing local queues.
                  </p>
                </div>
                <button
                  onClick={onToggleSimulatedOffline}
                  className={`px-3 py-1.5 rounded-md font-mono text-xs font-medium transition-colors ${
                    isSimulatedOffline
                      ? 'bg-[#B87A4D] text-white'
                      : 'bg-[#EFEEE8] text-[#252620] hover:bg-[#E5E3DA]'
                  }`}
                >
                  {isSimulatedOffline ? 'Simulating Offline' : 'Online'}
                </button>
              </div>

              {/* Sync queue trigger */}
              <div className="flex items-center justify-between p-4 bg-[#FFFFFF] border border-[#E5E3DA] rounded-lg">
                <div>
                  <h4 className="font-medium text-[#252620]">Synchronize Pending Queue</h4>
                  <p className="text-[11px] text-[#77766E]">
                    Flush pending local writes to Cloud Firestore.
                  </p>
                </div>
                <button
                  onClick={handleManualSync}
                  className="px-3 py-1.5 bg-[#252620] text-[#F6F5F0] rounded-md text-xs font-medium"
                >
                  Sync Now
                </button>
              </div>
              {syncFeedback && <p className="text-xs text-[#2E6B47] font-medium">{syncFeedback}</p>}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#EFEEE8] border border-[#E5E3DA] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#657C69] uppercase font-semibold">
                    Active Identity & UID
                  </span>
                  <span className="font-mono text-[10px] text-[#77766E] truncate max-w-[200px]">
                    UID: {currentUser.id}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-medium text-[#252620]">
                  {currentUser.name}
                </h3>
                <p className="text-xs text-[#77766E]">{currentUser.email || 'Anonymous Guest Session'}</p>
              </div>

              {/* Real Firebase Authentication Controls */}
              <div className="p-4 bg-[#FFFFFF] border border-[#E5E3DA] rounded-lg space-y-3">
                <h4 className="font-medium text-[#252620]">Firebase Authentication:</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const authed = await signInWithGoogle();
                        onSwitchUser(authed);
                      } catch (err: any) {
                        alert(`Google Sign-In notice: ${err?.message || err}`);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#D5D2C7] rounded-md text-xs font-medium text-[#252620] hover:bg-[#F6F5F0]"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#657C69]" />
                    <span>Sign in with Google</span>
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        const guest = await signInAsGuest();
                        onSwitchUser(guest);
                      } catch (err: any) {
                        alert(`Guest Sign-In notice: ${err?.message || err}`);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#D5D2C7] rounded-md text-xs font-medium text-[#252620] hover:bg-[#F6F5F0]"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-[#2E6B47]" />
                    <span>Continue as Guest</span>
                  </button>

                  <button
                    onClick={async () => {
                      await signOutUser();
                      onSwitchUser({
                        id: `guest-${Math.random().toString(36).substring(2, 7)}`,
                        name: 'Signed Out User',
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] border border-[#E5E3DA] rounded-md text-xs font-medium text-[#77766E] hover:text-[#B87A4D]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>

              {/* Persona Switcher for Quick Demos */}
              <div className="space-y-2">
                <h4 className="font-medium text-[#252620]">Quick Demo Personas:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() =>
                      onSwitchUser({
                        id: 'user-lead',
                        name: 'Sarah Chen',
                        email: 'sarah.chen@margin.app',
                      })
                    }
                    className={`p-2.5 rounded-lg border text-left text-xs ${
                      currentUser.name === 'Sarah Chen'
                        ? 'border-[#657C69] bg-[#E8EEE7] text-[#252620]'
                        : 'border-[#E5E3DA] bg-[#FFFFFF] text-[#77766E]'
                    }`}
                  >
                    <p className="font-medium text-[#252620]">Sarah Chen (Tech Lead)</p>
                    <p className="text-[10px] text-[#77766E]">Owner of Project Apollo</p>
                  </button>

                  <button
                    onClick={() =>
                      onSwitchUser({
                        id: 'user-engineer',
                        name: 'Marcus Vance',
                        email: 'marcus.v@margin.app',
                      })
                    }
                    className={`p-2.5 rounded-lg border text-left text-xs ${
                      currentUser.name === 'Marcus Vance'
                        ? 'border-[#657C69] bg-[#E8EEE7] text-[#252620]'
                        : 'border-[#E5E3DA] bg-[#FFFFFF] text-[#77766E]'
                    }`}
                  >
                    <p className="font-medium text-[#252620]">Marcus Vance (Staff SRE)</p>
                    <p className="text-[10px] text-[#77766E]">Relay Receiver & Editor</p>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-[#E5E3DA] bg-[#F6F5F0]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252620] text-[#F6F5F0] rounded-md text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
