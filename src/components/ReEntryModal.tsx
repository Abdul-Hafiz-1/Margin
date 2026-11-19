import React from 'react';
import {
  X,
  RotateCcw,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type { ReEntryBriefing, Space } from '../types/margin';

interface ReEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  briefing: ReEntryBriefing | null;
  space: Space;
  onRegenerate: () => Promise<void>;
  onOpenRecord?: (recordId: string) => void;
}

export const ReEntryModal: React.FC<ReEntryModalProps> = ({
  isOpen,
  onClose,
  briefing,
  space,
  onRegenerate,
}) => {
  if (!isOpen || !briefing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252620]/40 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-[#FFFFFF] rounded-xl border border-[#E5E3DA] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reentry-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E3DA] bg-[#F6F5F0]">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-[#657C69]" />
            <h2 id="reentry-title" className="font-serif text-lg font-medium text-[#252620]">
              Re-Entry Briefing — {space.name.split('—')[0]}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#77766E] hover:text-[#252620] p-1 rounded-md"
            aria-label="Close Re-entry modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Question 1: Where did I leave off? */}
          <div className="p-3.5 bg-[#E8EEE7] border border-[#C8D6C9] rounded-lg space-y-1">
            <span className="text-[10px] font-mono text-[#2E6B47] uppercase tracking-wider block font-semibold flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> 1. Where You Left Off
            </span>
            <p className="text-sm font-serif text-[#252620] font-medium leading-relaxed">
              {briefing.whereLeftOff}
            </p>
          </div>

          {/* Question 2 & 3: What changed / happened since? */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-[#657C69] uppercase tracking-wider block font-semibold">
              2. What Changed & New Observations
            </span>
            <div className="space-y-1">
              {briefing.whatChanged.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#F6F5F0] border border-[#E5E3DA] rounded-md text-[#252620] font-medium"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Question 4: What remains unresolved? */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-[#B87A4D] uppercase tracking-wider block font-semibold flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> 3. What Remains Unresolved
            </span>
            <div className="space-y-1">
              {briefing.unresolvedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 bg-[#FBF0EA] border border-[#F2D8C9] rounded-md text-[#94532B]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Question 5: Sensible Next Action */}
          <div className="p-3.5 bg-[#F6F5F0] border border-[#E5E3DA] rounded-lg space-y-1">
            <span className="text-[10px] font-mono text-[#252620] uppercase tracking-wider block font-semibold">
              4. Recommended Next Action
            </span>
            <p className="text-[#252620] font-medium leading-relaxed">
              {briefing.recommendedNextAction}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E5E3DA] bg-[#F6F5F0]">
          <button
            onClick={onRegenerate}
            className="flex items-center gap-1.5 text-xs text-[#657C69] hover:text-[#536757] font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Briefing</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#252620] text-[#F6F5F0] rounded-md text-xs font-medium"
          >
            Resume Work
          </button>
        </div>
      </div>
    </div>
  );
};
