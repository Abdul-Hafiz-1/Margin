import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
} from 'lucide-react';
import type { RelayBriefing, Space } from '../types/margin';

interface RelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  relay: RelayBriefing | null;
  space: Space;
  onSaveRelay: (updated: RelayBriefing) => Promise<void>;
}

export const RelayModal: React.FC<RelayModalProps> = ({
  isOpen,
  onClose,
  relay,
  space,
  onSaveRelay,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableObjective, setEditableObjective] = useState(relay?.objective || '');
  const [editableState, setEditableState] = useState(relay?.currentState || '');

  if (!isOpen || !relay) return null;

  const handleCopyMarkdown = () => {
    const md = `# MARGIN RELAY BRIEFING — ${space.name}
Generated: ${new Date(relay.createdAt).toLocaleString()}
Created by: ${relay.createdBy.name}

## 1. Project Objective
${editableObjective || relay.objective}

## 2. Current State
${editableState || relay.currentState}

## 3. Key Decisions & Reasoning
${relay.keyDecisions.map((d) => `- **${d.title}**: ${d.reasoning}`).join('\n')}

## 4. Verified Observations
${relay.verifiedObservations.map((o) => `- **${o.title}**: ${o.content}`).join('\n')}

## 5. Unresolved Hypotheses
${relay.unresolvedHypotheses.map((h) => `- [ ] ${h.title}: ${h.hypothesis}`).join('\n')}

## 6. Outstanding Actions
${relay.outstandingActions.map((a) => `- [ ] ${a.title}`).join('\n')}

## 7. Suggested Next Steps
${relay.suggestedNextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

---
*Preserved in MARGIN Living Context Platform.*`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    await onSaveRelay({
      ...relay,
      objective: editableObjective,
      currentState: editableState,
      status: 'finalized',
    });
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252620]/40 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-[#FFFFFF] rounded-xl border border-[#E5E3DA] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="relay-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E3DA] bg-[#F6F5F0]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#657C69]" />
            <h2 id="relay-modal-title" className="font-serif text-xl font-medium text-[#252620]">
              Relay Context Handoff Briefing
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#D5D2C7] bg-[#FFFFFF] hover:bg-[#EFEEE8] text-xs font-medium text-[#252620] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#2E6B47]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied MD' : 'Copy Briefing'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-[#77766E] hover:text-[#252620] p-1 rounded-md"
              aria-label="Close Relay modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Metadata banner */}
          <div className="p-3 bg-[#E8EEE7] border border-[#C8D6C9] rounded-lg text-xs text-[#2E6B47] flex items-center justify-between">
            <span>
              Transferring context for <strong>{space.name}</strong> • Grounded in {relay.selectedRecordIds.length} live records
            </span>
            <span className="font-mono text-[10px]">Mode: {relay.inferenceModeUsed || 'cloud_grounded'}</span>
          </div>

          {/* Section 1: Objective */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-[#657C69] uppercase tracking-wider block font-semibold">
              1. Project Objective
            </span>
            {isEditing ? (
              <textarea
                value={editableObjective}
                onChange={(e) => setEditableObjective(e.target.value)}
                rows={2}
                className="w-full p-2.5 border border-[#E5E3DA] rounded text-xs text-[#252620] font-sans"
              />
            ) : (
              <p className="text-[#252620] font-medium leading-relaxed bg-[#F6F5F0] p-3 rounded-lg border border-[#E5E3DA]">
                {editableObjective || relay.objective}
              </p>
            )}
          </div>

          {/* Section 2: Current State */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-[#657C69] uppercase tracking-wider block font-semibold">
              2. Trajectory & Current State
            </span>
            {isEditing ? (
              <textarea
                value={editableState}
                onChange={(e) => setEditableState(e.target.value)}
                rows={3}
                className="w-full p-2.5 border border-[#E5E3DA] rounded text-xs text-[#252620] font-sans"
              />
            ) : (
              <p className="text-[#56554D] leading-relaxed bg-[#F6F5F0] p-3 rounded-lg border border-[#E5E3DA] text-xs">
                {editableState || relay.currentState}
              </p>
            )}
          </div>

          {/* Section 3: Decisions & Reasoning */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#2E6B47] uppercase tracking-wider block font-semibold">
              3. Explicit Decisions & Reasoning ({relay.keyDecisions.length})
            </span>
            <div className="space-y-2">
              {relay.keyDecisions.map((d, i) => (
                <div key={i} className="p-3 bg-[#EAF3EC] border border-[#C8D6C9] rounded-lg text-xs space-y-1">
                  <h4 className="font-semibold text-[#2E6B47]">{d.title}</h4>
                  <p className="text-[#3D5A43]">{d.reasoning}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Verified Observations */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#4A6B82] uppercase tracking-wider block font-semibold">
              4. Verified Observations ({relay.verifiedObservations.length})
            </span>
            <div className="space-y-2">
              {relay.verifiedObservations.map((o, i) => (
                <div key={i} className="p-3 bg-[#EBF1F5] border border-[#CCDCE6] rounded-lg text-xs space-y-1">
                  <h4 className="font-semibold text-[#4A6B82]">{o.title}</h4>
                  <p className="text-[#364F61]">{o.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Unresolved Hypotheses & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <span className="text-[10px] font-mono text-[#70538A] uppercase tracking-wider block font-semibold">
                5. Unresolved Hypotheses
              </span>
              <div className="space-y-2">
                {relay.unresolvedHypotheses.length === 0 ? (
                  <p className="text-[11px] text-[#77766E] italic">None active.</p>
                ) : (
                  relay.unresolvedHypotheses.map((h, i) => (
                    <div key={i} className="p-2.5 bg-[#F3EDF8] border border-[#DFCEEC] rounded-lg text-xs">
                      <p className="font-medium text-[#70538A]">{h.title}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono text-[#94532B] uppercase tracking-wider block font-semibold">
                6. Outstanding Actions
              </span>
              <div className="space-y-2">
                {relay.outstandingActions.length === 0 ? (
                  <p className="text-[11px] text-[#77766E] italic">None active.</p>
                ) : (
                  relay.outstandingActions.map((a, i) => (
                    <div key={i} className="p-2.5 bg-[#FBF0EA] border border-[#F2D8C9] rounded-lg text-xs">
                      <p className="font-medium text-[#94532B]">{a.title}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Section 7: Suggested Next Steps */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-[#252620] uppercase tracking-wider block font-semibold">
              7. Suggested Next Steps
            </span>
            <div className="space-y-1.5">
              {relay.suggestedNextSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-[#252620]">
                  <span className="font-mono text-[#657C69] font-bold">{idx + 1}.</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E3DA] bg-[#F6F5F0]">
          <span className="text-[11px] text-[#77766E]">
            Never fabricates evidence; grounded directly in stored records.
          </span>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                onClick={handleSave}
                className="px-4 py-1.5 bg-[#252620] text-[#F6F5F0] rounded-md text-xs font-medium"
              >
                Save Changes
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 bg-[#FFFFFF] border border-[#D5D2C7] text-[#252620] rounded-md text-xs font-medium"
              >
                Edit Inclusions
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#252620] text-[#F6F5F0] rounded-md text-xs font-medium"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
