import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Plus,
  Tag,
  Link2,
  History,
  Archive,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type {
  Space,
  MarginRecord,
  RecordType,
  RecordRelationship,
  RecordAuthor,
} from '../types/margin';
import { analyzeContextConnections, type SynthesisInsight } from '../services/marginAI';

interface SpaceWorkspaceProps {
  space: Space;
  records: MarginRecord[];
  relationships: RecordRelationship[];
  currentUser: RecordAuthor;
  onBack: () => void;
  onOpenCapture: () => void;
  onLaunchRelay: () => void;
  onLaunchReEntry: () => void;
  onSaveRecord: (record: MarginRecord, reason?: string) => Promise<void>;
  onArchiveRecord: (recordId: string) => Promise<void>;
  onSaveRelationship: (rel: RecordRelationship) => Promise<void>;
}

export const SpaceWorkspace: React.FC<SpaceWorkspaceProps> = ({
  space,
  records,
  relationships,
  onBack,
  onOpenCapture,
  onLaunchRelay,
  onLaunchReEntry,
  onArchiveRecord,
  onSaveRelationship,
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | RecordType>('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [insights, setInsights] = useState<SynthesisInsight[]>([]);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Link Modal State
  const [linkingRecord, setLinkingRecord] = useState<MarginRecord | null>(null);
  const [targetRecordId, setTargetRecordId] = useState('');
  const [relType, setRelType] = useState<RecordRelationship['type']>('supports');

  const filteredRecords = records.filter((r) => {
    if (r.status === 'archived') return false;
    if (selectedTypeFilter !== 'all' && r.type !== selectedTypeFilter) return false;
    return true;
  });

  const activeHypotheses = records.filter((r) => r.type === 'hypothesis' && r.status === 'active');
  const activeActions = records.filter((r) => r.type === 'action' && r.status === 'active');
  const decisions = records.filter((r) => r.type === 'decision');

  const handleSynthesizeInsights = async () => {
    setIsSynthesizing(true);
    try {
      const generated = await analyzeContextConnections(records, relationships);
      setInsights(generated);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleApplySuggestedRelationship = async (insight: SynthesisInsight) => {
    if (!insight.suggestedRelationship) return;
    const rel = insight.suggestedRelationship;
    const newRel: RecordRelationship = {
      id: `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      spaceId: space.id,
      sourceRecordId: rel.sourceId,
      targetRecordId: rel.targetId,
      type: rel.type,
      provenance: 'ai_detected',
      explanation: rel.explanation,
      createdAt: Date.now(),
    };
    await onSaveRelationship(newRel);
    // Remove from active insights list
    setInsights((prev) => prev.filter((i) => i.title !== insight.title));
  };

  const handleCreateManualLink = async () => {
    if (!linkingRecord || !targetRecordId) return;

    const newRel: RecordRelationship = {
      id: `rel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      spaceId: space.id,
      sourceRecordId: linkingRecord.id,
      targetRecordId: targetRecordId,
      type: relType,
      provenance: 'user',
      createdAt: Date.now(),
    };

    await onSaveRelationship(newRel);
    setLinkingRecord(null);
    setTargetRecordId('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E3DA] pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-[#E5E3DA] bg-[#FFFFFF] hover:bg-[#EFEEE8] text-[#77766E] hover:text-[#252620] transition-colors"
            aria-label="Back to Spaces"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#657C69]" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#77766E]">
                {space.type} Space
              </span>
            </div>
            <h1 className="font-serif text-2xl md:text-3xl font-medium text-[#252620] tracking-tight">
              {space.name}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLaunchReEntry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E3DA] bg-[#FFFFFF] hover:bg-[#EFEEE8] text-[#252620] text-xs font-medium transition-colors"
            title="Where did I leave off?"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#657C69]" />
            <span>Re-Entry</span>
          </button>

          <button
            onClick={onLaunchRelay}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E8EEE7] border border-[#C8D6C9] hover:bg-[#D9E4D8] text-[#252620] text-xs font-medium transition-colors"
            title="Handoff context"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#657C69]" />
            <span>Relay Briefing</span>
          </button>

          <button
            onClick={onOpenCapture}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#252620] text-[#F6F5F0] hover:bg-[#3D3E35] text-xs font-medium tracking-wide transition-colors active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-[#A8BBAA]" />
            <span>Capture</span>
          </button>
        </div>
      </div>

      {/* Space Overview & Current State */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 bg-[#FFFFFF] border border-[#E5E3DA] rounded-xl p-5 shadow-xs">
          <span className="text-[10px] font-mono text-[#657C69] uppercase tracking-wider block mb-1">
            Current Trajectory & Objective
          </span>
          <p className="text-sm text-[#252620] leading-relaxed">{space.description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[#77766E] border-t border-[#E5E3DA] pt-3">
            <span>
              <strong className="text-[#252620]">{records.length}</strong> living records
            </span>
            <span>•</span>
            <span>
              <strong className="text-[#2E6B47]">{decisions.length}</strong> decisions
            </span>
            <span>•</span>
            <span>
              <strong className="text-[#70538A]">{activeHypotheses.length}</strong> hypotheses
            </span>
            <span>•</span>
            <span>
              <strong className="text-[#94532B]">{activeActions.length}</strong> open actions
            </span>
          </div>
        </div>

        {/* AI Continuity Synthesis Widget */}
        <div className="bg-[#EFEEE8] border border-[#E5E3DA] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#252620] mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#657C69]" />
              <span>Living Context AI</span>
            </div>
            <p className="text-[11px] text-[#77766E] leading-relaxed">
              Detect cross-record contradictions, causal dependencies, and unverified assumptions.
            </p>
          </div>

          <button
            onClick={handleSynthesizeInsights}
            disabled={isSynthesizing || records.length < 2}
            className="mt-3 w-full py-1.5 px-2 bg-[#FFFFFF] border border-[#D5D2C7] hover:bg-[#F6F5F0] text-[#252620] text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isSynthesizing ? 'Analyzing Context...' : 'Synthesize Context'}
          </button>
        </div>
      </div>

      {/* AI Grounded Insights Banner (If Generated) */}
      {insights.length > 0 && (
        <div className="space-y-3 bg-[#E8EEE7] border border-[#C8D6C9] rounded-xl p-5 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#2E6B47] font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Grounded Context Insights ({insights.length})
            </h3>
            <button
              onClick={() => setInsights([])}
              className="text-[11px] text-[#536757] hover:underline"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((ins, idx) => (
              <div
                key={idx}
                className="bg-[#FFFFFF] border border-[#C8D6C9] rounded-lg p-3 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${
                      ins.type === 'contradiction' || ins.type === 'risk'
                        ? 'bg-[#FBF0EA] text-[#94532B]'
                        : 'bg-[#EBF1F5] text-[#4A6B82]'
                    }`}
                  >
                    {ins.type}
                  </span>
                </div>
                <h4 className="font-medium text-[#252620]">{ins.title}</h4>
                <p className="text-[11px] text-[#77766E] leading-relaxed">{ins.summary}</p>

                {ins.suggestedRelationship && (
                  <button
                    onClick={() => handleApplySuggestedRelationship(ins)}
                    className="mt-2 flex items-center gap-1 text-[11px] font-medium text-[#2E6B47] hover:underline pt-1"
                  >
                    <span>Link as {ins.suggestedRelationship.type.replace('_', ' ')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Record Type Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#E5E3DA] pb-2 overflow-x-auto text-xs">
        {(
          [
            'all',
            'observation',
            'decision',
            'event',
            'hypothesis',
            'action',
          ] as Array<'all' | RecordType>
        ).map((t) => {
          const count =
            t === 'all'
              ? records.filter((r) => r.status !== 'archived').length
              : records.filter((r) => r.type === t && r.status !== 'archived').length;

          const active = selectedTypeFilter === t;
          return (
            <button
              key={t}
              onClick={() => setSelectedTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md capitalize font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                active
                  ? 'bg-[#252620] text-[#F6F5F0]'
                  : 'text-[#77766E] hover:text-[#252620] hover:bg-[#EFEEE8]'
              }`}
            >
              <span>{t}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  active ? 'bg-[#3D3E35] text-[#D0CFC5]' : 'bg-[#E5E3DA] text-[#77766E]'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Living Records Feed */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-xl p-12 text-center space-y-3">
            <Layers className="w-8 h-8 text-[#A2A096] mx-auto" />
            <h3 className="font-serif text-lg text-[#252620]">No records in this category</h3>
            <p className="text-xs text-[#77766E] max-w-sm mx-auto">
              Preserve context before it fades. Capture an observation, an agreed decision, or an open hypothesis.
            </p>
            <button
              onClick={onOpenCapture}
              className="px-3.5 py-1.5 bg-[#252620] text-[#F6F5F0] rounded-lg text-xs font-medium"
            >
              Capture Now
            </button>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const isExpanded = expandedRecordId === record.id;
            const recordRels = relationships.filter(
              (r) => r.sourceRecordId === record.id || r.targetRecordId === record.id
            );

            return (
              <div
                key={record.id}
                className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-xl p-5 hover:border-[#D5D2C7] transition-all shadow-xs space-y-3"
              >
                {/* Header: Record Type, Version, and Timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold tracking-wider ${
                        record.type === 'observation'
                          ? 'bg-[#EBF1F5] text-[#4A6B82]'
                          : record.type === 'decision'
                          ? 'bg-[#EAF3EC] text-[#2E6B47]'
                          : record.type === 'event'
                          ? 'bg-[#F7EFE9] text-[#845B38]'
                          : record.type === 'hypothesis'
                          ? 'bg-[#F3EDF8] text-[#70538A]'
                          : 'bg-[#FBF0EA] text-[#94532B]'
                      }`}
                    >
                      {record.type}
                    </span>

                    <span className="text-[10px] font-mono text-[#77766E] bg-[#EFEEE8] px-1.5 py-0.5 rounded">
                      v{record.version}
                    </span>

                    {record.source === 'ai_suggested' && (
                      <span className="text-[10px] text-[#657C69] font-mono flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> AI Structured
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] text-[#77766E]">
                    {new Date(record.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Title & Content */}
                <div>
                  <h3 className="font-serif text-lg font-medium text-[#252620]">
                    {record.title}
                  </h3>
                  <p className="text-xs text-[#56554D] mt-1.5 leading-relaxed font-sans whitespace-pre-wrap">
                    {record.content}
                  </p>
                </div>

                {/* Tags and Relations */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  {record.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] text-[#77766E] bg-[#F6F5F0] border border-[#E5E3DA] px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      <Tag className="w-2.5 h-2.5 text-[#A2A096]" />
                      {tag}
                    </span>
                  ))}

                  {/* Relationship Badges */}
                  {recordRels.map((rel) => {
                    const isSource = rel.sourceRecordId === record.id;
                    const otherId = isSource ? rel.targetRecordId : rel.sourceRecordId;
                    const otherRecord = records.find((r) => r.id === otherId);

                    return (
                      <span
                        key={rel.id}
                        className="text-[10px] font-mono text-[#2E6B47] bg-[#E8EEE7] border border-[#C8D6C9] px-2 py-0.5 rounded-md flex items-center gap-1"
                        title={rel.explanation || rel.type}
                      >
                        <Link2 className="w-2.5 h-2.5" />
                        {isSource ? rel.type.replace('_', ' ') : `referenced by`} "{otherRecord?.title.substring(0, 20) || otherId.substring(0, 6)}..."
                      </span>
                    );
                  })}
                </div>

                {/* Expandable Version History & Provenance */}
                {isExpanded && (
                  <div className="mt-4 pt-3 border-t border-[#E5E3DA] bg-[#F6F5F0] p-3 rounded-lg space-y-2 text-xs">
                    <span className="text-[10px] font-mono uppercase text-[#77766E] block font-semibold">
                      Revision Provenance & History
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-[#252620]">
                        <span>v{record.version} (Current) by {record.author.name}</span>
                        <span className="text-[#77766E]">{new Date(record.updatedAt).toLocaleString()}</span>
                      </div>
                      {record.history && record.history.length > 0 ? (
                        record.history.map((h, i) => (
                          <div
                            key={i}
                            className="p-2 bg-[#FFFFFF] rounded border border-[#E5E3DA] text-[11px] space-y-0.5"
                          >
                            <div className="flex items-center justify-between text-[#77766E]">
                              <span>v{h.version} — {h.changeSummary}</span>
                              <span>{new Date(h.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[#56554D] italic">"{h.content}"</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-[#77766E]">Initial immutable revision.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-[#E5E3DA] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}
                      className="text-[#77766E] hover:text-[#252620] flex items-center gap-1"
                    >
                      <History className="w-3 h-3" />
                      <span>{isExpanded ? 'Hide History' : 'History'}</span>
                    </button>

                    <button
                      onClick={() => setLinkingRecord(record)}
                      className="text-[#77766E] hover:text-[#252620] flex items-center gap-1"
                    >
                      <Link2 className="w-3 h-3" />
                      <span>Link Record</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onArchiveRecord(record.id)}
                      className="text-[#77766E] hover:text-[#B87A4D] transition-colors p-1"
                      title="Archive record to preserve history"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Link Modal */}
      {linkingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252620]/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FFFFFF] rounded-xl border border-[#E5E3DA] p-5 space-y-4">
            <h3 className="font-serif text-lg font-medium text-[#252620]">
              Connect Living Context
            </h3>
            <p className="text-xs text-[#77766E]">
              Link <strong>"{linkingRecord.title.substring(0, 40)}..."</strong> to another record.
            </p>

            <div>
              <label className="text-[11px] font-medium text-[#77766E] block mb-1">
                Relationship Type:
              </label>
              <select
                value={relType}
                onChange={(e) => setRelType(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-[#F6F5F0] border border-[#E5E3DA] rounded-md text-xs font-medium"
              >
                <option value="supports">Supports (Confirms hypothesis or observation)</option>
                <option value="contradicts">Contradicts (Exposes conflicting evidence)</option>
                <option value="caused_by">Caused by (Causal explanation)</option>
                <option value="related_to">Related to (Contextual association)</option>
                <option value="depends_on">Depends on (Prerequisite constraint)</option>
                <option value="supersedes">Supersedes (Replaces outdated decision)</option>
                <option value="resolves">Resolves (Satisfies open action)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-[#77766E] block mb-1">
                Target Record:
              </label>
              <select
                value={targetRecordId}
                onChange={(e) => setTargetRecordId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#F6F5F0] border border-[#E5E3DA] rounded-md text-xs"
              >
                <option value="">Select target record...</option>
                {records
                  .filter((r) => r.id !== linkingRecord.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.type}] {r.title}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E3DA]">
              <button
                onClick={() => setLinkingRecord(null)}
                className="px-3 py-1.5 text-xs text-[#77766E] hover:text-[#252620]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateManualLink}
                disabled={!targetRecordId}
                className="px-4 py-1.5 bg-[#252620] text-[#F6F5F0] rounded-md text-xs font-medium disabled:opacity-50"
              >
                Create Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
