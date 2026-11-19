import React, { useState } from 'react';
import { Search as SearchIcon, X, ArrowRight } from 'lucide-react';
import type { MarginRecord, Space } from '../types/margin';

interface SearchScreenProps {
  records: MarginRecord[];
  spaces: Space[];
  onOpenSpace: (spaceId: string) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  records,
  spaces,
  onOpenSpace,
}) => {
  const [query, setQuery] = useState('');

  const results = query.trim()
    ? records.filter((r) => {
        const q = query.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.type.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E5E3DA] pb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#77766E]">
            Global Retrieval
          </span>
        </div>
        <h1 className="font-serif text-3xl md:text-4xl text-[#252620] tracking-tight">
          Search Context
        </h1>
        <p className="text-sm text-[#77766E] mt-1 max-w-xl">
          Instantly locate past observations, decisions, hypotheses, and tags across all spaces.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <SearchIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#77766E]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search observations, decisions, hypotheses, tags (e.g. latency, rollback)..."
          className="w-full pl-12 pr-10 py-3.5 bg-[#FFFFFF] border border-[#E5E3DA] rounded-xl text-sm text-[#252620] placeholder-[#77766E] focus:outline-hidden focus:ring-1 focus:ring-[#657C69] shadow-xs font-sans"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#77766E] hover:text-[#252620]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results Feed */}
      <div className="space-y-3">
        {query.trim() && (
          <div className="text-xs text-[#77766E]">
            Found {results.length} {results.length === 1 ? 'record' : 'records'} matching "{query}"
          </div>
        )}

        {results.map((r) => {
          const spaceObj = spaces.find((s) => s.id === r.spaceId);

          return (
            <div
              key={r.id}
              onClick={() => onOpenSpace(r.spaceId)}
              className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-xl p-4 hover:border-[#D5D2C7] transition-all cursor-pointer shadow-2xs group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                      r.type === 'decision'
                        ? 'bg-[#EAF3EC] text-[#2E6B47]'
                        : r.type === 'observation'
                        ? 'bg-[#EBF1F5] text-[#4A6B82]'
                        : r.type === 'hypothesis'
                        ? 'bg-[#F3EDF8] text-[#70538A]'
                        : 'bg-[#FBF0EA] text-[#94532B]'
                    }`}
                  >
                    {r.type}
                  </span>
                  {spaceObj && (
                    <span className="text-[11px] text-[#77766E] font-medium">
                      in {spaceObj.name}
                    </span>
                  )}
                </div>

                <span className="text-[10px] text-[#77766E]">
                  {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <h3 className="font-serif text-base font-medium text-[#252620] group-hover:text-[#657C69] transition-colors">
                {r.title}
              </h3>

              <p className="text-xs text-[#77766E] line-clamp-2 mt-1 leading-relaxed">
                {r.content}
              </p>

              <div className="mt-3 flex items-center justify-between text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {r.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] bg-[#F6F5F0] border border-[#E5E3DA] px-2 py-0.5 rounded text-[#77766E]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                <span className="text-xs font-medium text-[#252620] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  <span>Open Space</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#77766E]" />
                </span>
              </div>
            </div>
          );
        })}

        {!query.trim() && (
          <div className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-xl p-12 text-center text-xs text-[#77766E]">
            Type a query above to search through living records, decisions, and hypotheses.
          </div>
        )}
      </div>
    </div>
  );
};
