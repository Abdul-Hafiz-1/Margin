import React, { useState } from 'react';
import {
  Filter,
} from 'lucide-react';
import type { ActivityItem, Space } from '../types/margin';

interface ActivityScreenProps {
  activity: ActivityItem[];
  spaces: Space[];
  onOpenSpace: (spaceId: string) => void;
}

export const ActivityScreen: React.FC<ActivityScreenProps> = ({
  activity,
  spaces,
  onOpenSpace,
}) => {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const filtered = activity.filter((item) => {
    if (selectedSpaceId !== 'all' && item.spaceId !== selectedSpaceId) return false;
    if (selectedType !== 'all') {
      if (item.recordType !== selectedType) return false;
    }
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E5E3DA] pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#77766E]">
            Immutable Context Log
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#252620] tracking-tight">
          Activity & Provenance
        </h1>
        <p className="text-sm text-[#77766E] mt-1 max-w-xl">
          Chronological audit trail of observations, explicit decisions, hypotheses, and context handoffs.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#EFEEE8] p-2 rounded-lg border border-[#E5E3DA] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#77766E] flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Space:
          </span>
          <select
            value={selectedSpaceId}
            onChange={(e) => setSelectedSpaceId(e.target.value)}
            className="bg-[#FFFFFF] border border-[#E5E3DA] px-2.5 py-1 rounded-md text-xs font-medium text-[#252620]"
          >
            <option value="all">All Spaces</option>
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium text-[#77766E]">Record Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-[#FFFFFF] border border-[#E5E3DA] px-2.5 py-1 rounded-md text-xs font-medium text-[#252620] capitalize"
          >
            <option value="all">All Types</option>
            <option value="observation">Observation</option>
            <option value="decision">Decision</option>
            <option value="event">Event</option>
            <option value="hypothesis">Hypothesis</option>
            <option value="action">Action</option>
          </select>
        </div>
      </div>

      {/* Chronological Timeline */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-xl p-12 text-center text-xs text-[#77766E]">
            No activity matches the selected filters.
          </div>
        ) : (
          filtered.map((item) => {
            const spaceObj = spaces.find((s) => s.id === item.spaceId);

            return (
              <div
                key={item.id}
                className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-lg p-4 hover:border-[#D5D2C7] transition-all flex items-start gap-4 shadow-2xs"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#657C69] mt-1.5 shrink-0" />

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#252620]">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-[#77766E] font-mono">
                      {new Date(item.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-[#77766E] line-clamp-2 leading-relaxed">
                    {item.detail}
                  </p>

                  <div className="flex items-center gap-3 pt-1 text-[10px] text-[#77766E]">
                    <span className="font-medium text-[#252620]">By {item.actor.name}</span>
                    {spaceObj && (
                      <span
                        onClick={() => onOpenSpace(spaceObj.id)}
                        className="text-[#657C69] hover:underline cursor-pointer"
                      >
                        {spaceObj.name.split('—')[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
