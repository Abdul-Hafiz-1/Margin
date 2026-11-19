import React, { useState } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  ShieldAlert,
  LogIn,
  LogOut,
  UserCheck,
  AlertTriangle,
  Plus,
  KeyRound,
  Lock,
} from 'lucide-react';
import type { FamilyCircleAlert, AppLanguage } from '../types';
import { TRANSLATIONS } from '../data/i18n';
import {
  loginWithGoogle,
  logoutUser,
  switchSimulatedUser,
  createFamilyCircle,
  joinFamilyCircleByCode,
  type CircleInfo,
} from '../services/familyCircle';

interface FamilyCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { uid: string; displayName: string } | null;
  activeCircle: CircleInfo | null;
  alerts: FamilyCircleAlert[];
  onCircleJoined: (circle: CircleInfo) => void;
  onUserChanged: (user: { uid: string; displayName: string } | null) => void;
  language: AppLanguage;
}

export const FamilyCircleModal: React.FC<FamilyCircleModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeCircle,
  alerts,
  onCircleJoined,
  onUserChanged,
  language,
}) => {
  const t = TRANSLATIONS[language];
  const [copiedCode, setCopiedCode] = useState(false);
  const [circleNameInput, setCircleNameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [activeTab, setActiveTab] = useState<'alerts' | 'manage'>('alerts');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (activeCircle?.inviteCode) {
      navigator.clipboard.writeText(activeCircle.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLogin = async () => {
    const user = await loginWithGoogle();
    onUserChanged(user);
  };

  const handleLogout = async () => {
    await logoutUser();
    onUserChanged(null);
  };

  const handleSwitchRole = async (role: 'Dad' | 'Daughter') => {
    const user = await switchSimulatedUser(role);
    onUserChanged(user);
  };

  const handleCreate = async () => {
    if (!circleNameInput.trim()) return;
    const circle = await createFamilyCircle(circleNameInput);
    onCircleJoined(circle);
    setCircleNameInput('');
  };

  const handleJoin = async () => {
    if (!joinCodeInput.trim()) return;
    const circle = await joinFamilyCircleByCode(joinCodeInput);
    if (circle) {
      onCircleJoined(circle);
      setJoinCodeInput('');
    } else {
      alert('Circle not found with this code. Check the 6-character invite code.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#090d16]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">{t.familyTitle}</h2>
              <p className="text-xs text-slate-400">{t.familySubtitle}</p>
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

        {/* User Account / Role Bar */}
        <div className="flex items-center justify-between p-3.5 bg-slate-900/80 border-b border-slate-800 px-5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Active Profile:</span>
            {currentUser ? (
              <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentUser.displayName}</span>
              </span>
            ) : (
              <span className="text-slate-500 italic">Not signed in</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Demo Role Switcher for Judges */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => handleSwitchRole('Daughter')}
                className="px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-white hover:bg-slate-700"
              >
                Priya (Daughter)
              </button>
              <button
                onClick={() => handleSwitchRole('Dad')}
                className="px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-white hover:bg-slate-700"
              >
                Dad (Ramesh)
              </button>
            </div>

            {currentUser ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-slate-400 hover:text-red-400 px-2 py-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white font-medium px-2.5 py-1 rounded-md"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/40 text-xs font-medium">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Family Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`flex-1 py-2.5 text-center border-b-2 transition-colors ${
              activeTab === 'manage'
                ? 'border-blue-500 text-white font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Circle Setup & Invite
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'alerts' ? (
            <div className="space-y-3">
              {/* Privacy Notice Card */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-300">
                <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-white">
                    Strict Zero-Content Security Guarantee
                  </span>
                  <span>
                    Firestore rules strictly prohibit storing message content, phone numbers, or raw text.
                    Family members only see which scam pattern occurred to protect against elder fraud.
                  </span>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-10">
                  <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-300">{t.noAlertsYet}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    When any circle member receives a Likely Scam and requests an alert, it appears here in realtime.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3.5 rounded-xl bg-[#090d16] border border-slate-800 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">
                            {alert.senderDisplayName} encountered a threat
                          </span>
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 font-sans">
                          Pattern: <strong className="text-slate-100">{alert.scamType.replace('_', ' ')}</strong>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Active Circle Card */}
              {activeCircle ? (
                <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Active Circle:</span>
                      <h3 className="text-base font-bold text-white">{activeCircle.name}</h3>
                    </div>
                    <span className="text-xs font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                      {activeCircle.members.length} Members
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">{t.inviteCodeLabel}:</span>
                      <span className="text-sm font-mono font-bold text-blue-400 tracking-widest">
                        {activeCircle.inviteCode}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                  No active circle. Create one or join an existing family circle below.
                </div>
              )}

              {/* Create Circle */}
              <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  <span>Create New Circle</span>
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={circleNameInput}
                    onChange={(e) => setCircleNameInput(e.target.value)}
                    placeholder="e.g., Sharma Family Protection"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={!circleNameInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Create
                  </button>
                </div>
              </div>

              {/* Join Circle */}
              <div className="p-4 rounded-xl bg-[#090d16] border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>Join with Invite Code</span>
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    placeholder="Enter 6-character code"
                    maxLength={8}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 font-mono tracking-wider focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleJoin}
                    disabled={!joinCodeInput.trim()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors border border-slate-700"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
