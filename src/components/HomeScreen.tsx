import React from 'react';
import {
  ArrowRight,
  AlertCircle,
  Sparkles,
  Plus,
  Play,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import type { Space, MarginRecord, RecordAuthor, ReEntryBriefing } from '../types/margin';

interface HomeScreenProps {
  spaces: Space[];
  recentRecords: MarginRecord[];
  currentUser: RecordAuthor;
  onOpenSpace: (spaceId: string) => void;
  onOpenCapture: () => void;
  onLaunchReEntry: (spaceId: string) => void;
  onLaunchRelay: (spaceId: string) => void;
  reEntryCache: Record<string, ReEntryBriefing>;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  spaces,
  recentRecords,
  currentUser,
  onOpenSpace,
  onOpenCapture,
  onLaunchReEntry,
  onLaunchRelay,
}) => {
  const primarySpace = spaces[0];
  const unresolvedItems = recentRecords.filter(
    (r) => r.status === 'active' && (r.type === 'hypothesis' || r.type === 'action')
  );
  const recentDecisions = recentRecords.filter((r) => r.type === 'decision');

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-10">
      {/* Editorial Header & Greeting */}
      <div className="border-b border-[#E5E3DA] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77766E]">
              Continuity Overview
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#252620] tracking-tight">
            Welcome back, {currentUser.name.split(' ')[0]}.
          </h1>
          <p className="text-sm text-[#77766E] mt-1 max-w-xl">
            Your work has a memory. Context preserved across sessions, decisions, and handoffs.
          </p>
        </div>

        {/* Fast Action Cluster */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCapture}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#252620] text-[#F6F5F0] hover:bg-[#3D3E35] transition-all text-xs font-medium tracking-wide shadow-xs active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-[#A8BBAA]" />
            <span>Capture Observation</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: RESUME CARDS — "Where did I leave off?" */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#77766E] flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-[#657C69]" />
            Where You Left Off
          </h2>
          <span className="text-[11px] text-[#77766E]">
            {spaces.length} active {spaces.length === 1 ? 'space' : 'spaces'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spaces.slice(0, 2).map((space) => {
            const spaceRecords = recentRecords.filter((r) => r.spaceId === space.id);
            const latest = spaceRecords[0];

            return (
              <div
                key={space.id}
                className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-xl p-5 hover:border-[#C8D6C9] transition-all shadow-xs flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#657C69]" />
                      <span className="text-[11px] font-mono text-[#77766E] uppercase">
                        {space.type} space
                      </span>
                    </div>
                    <span className="text-[10px] text-[#77766E]">
                      {spaceRecords.length} records
                    </span>
                  </div>

                  <h3
                    onClick={() => onOpenSpace(space.id)}
                    className="font-serif text-lg font-medium text-[#252620] group-hover:text-[#657C69] transition-colors cursor-pointer"
                  >
                    {space.name}
                  </h3>

                  <p className="text-xs text-[#77766E] line-clamp-2 mt-1 leading-relaxed">
                    {space.description}
                  </p>

                  {/* Context Marker */}
                  <div className="mt-4 p-2.5 bg-[#F6F5F0] rounded-lg border border-[#E5E3DA] text-xs">
                    <span className="text-[10px] font-mono text-[#657C69] uppercase block mb-0.5">
                      Last Anchor
                    </span>
                    <p className="text-[#252620] font-medium line-clamp-1">
                      {latest ? `[${latest.type}] ${latest.title}` : 'No records yet'}
                    </p>
                  </div>
                </div>

                {/* Resume Actions */}
                <div className="mt-5 pt-3 border-t border-[#E5E3DA] flex items-center justify-between">
                  <button
                    onClick={() => onLaunchReEntry(space.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#657C69] hover:text-[#536757] transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Re-Entry Briefing</span>
                  </button>

                  <button
                    onClick={() => onOpenSpace(space.id)}
                    className="flex items-center gap-1 text-xs font-medium text-[#252620] hover:translate-x-0.5 transition-transform"
                  >
                    <span>Open Space</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#77766E]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: ATTENTION & UNRESOLVED MATTERS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Unresolved Questions & Hypotheses */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#77766E] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-[#B87A4D]" />
              Requires Verification & Attention
            </h2>
            <span className="text-[11px] text-[#77766E]">
              {unresolvedItems.length} active items
            </span>
          </div>

          <div className="space-y-2.5">
            {unresolvedItems.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-lg p-6 text-center text-xs text-[#77766E]">
                All hypotheses and action items in your active spaces are resolved.
              </div>
            ) : (
              unresolvedItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onOpenSpace(item.spaceId)}
                  className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-lg p-3.5 hover:border-[#D5D2C7] transition-all cursor-pointer flex items-start gap-3 group"
                >
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider shrink-0 mt-0.5 ${
                      item.type === 'hypothesis'
                        ? 'bg-[#F3EDF8] text-[#70538A] border border-[#E2D5EC]'
                        : 'bg-[#FBF0EA] text-[#94532B] border border-[#F2D8C9]'
                    }`}
                  >
                    {item.type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-medium text-[#252620] group-hover:text-[#657C69] transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#77766E] line-clamp-1 mt-0.5">
                      {item.content}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#77766E] font-mono shrink-0">
                    v{item.version}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Decisions Made */}
        <div className="space-y-4">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#77766E] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2E6B47]" />
            Recent Decisions
          </h2>

          <div className="space-y-2.5">
            {recentDecisions.length === 0 ? (
              <div className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-lg p-6 text-center text-xs text-[#77766E]">
                No decisions recorded yet.
              </div>
            ) : (
              recentDecisions.slice(0, 3).map((dec) => (
                <div
                  key={dec.id}
                  onClick={() => onOpenSpace(dec.spaceId)}
                  className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-lg p-3 hover:border-[#D5D2C7] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-[10px] text-[#77766E] mb-1">
                    <span className="text-[#2E6B47] font-semibold">DECISION</span>
                    <span>{new Date(dec.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                  <h4 className="text-xs font-medium text-[#252620] group-hover:text-[#657C69] transition-colors line-clamp-2">
                    {dec.title}
                  </h4>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* SECTION 3: SIGNATURE CONTINUITY ACTIONS */}
      <section className="bg-[#EFEEE8] border border-[#E5E3DA] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#657C69]" />
            <h3 className="font-serif text-lg text-[#252620] font-medium">
              Hand off context to a teammate with Relay
            </h3>
          </div>
          <p className="text-xs text-[#77766E] max-w-lg leading-relaxed">
            Generate an evidence-grounded briefing containing current state, key decisions, verified observations, and next actions.
          </p>
        </div>

        {primarySpace && (
          <button
            onClick={() => onLaunchRelay(primarySpace.id)}
            className="px-4 py-2 bg-[#FFFFFF] border border-[#D5D2C7] text-[#252620] hover:bg-[#F6F5F0] rounded-lg text-xs font-medium tracking-wide transition-colors shrink-0 shadow-xs active:scale-98"
          >
            Launch Relay for {primarySpace.name.split('—')[0]}
          </button>
        )}
      </section>
    </div>
  );
};
