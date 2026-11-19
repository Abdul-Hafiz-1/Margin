import React, { useState } from 'react';
import {
  Plus,
  Users,
  Lock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Search,
  X,
} from 'lucide-react';
import type { Space, RecordAuthor, MarginRecord } from '../types/margin';

interface SpacesScreenProps {
  spaces: Space[];
  records: MarginRecord[];
  currentUser: RecordAuthor;
  onOpenSpace: (spaceId: string) => void;
  onCreateSpace: (space: Space) => Promise<void>;
  onLaunchRelay: (spaceId: string) => void;
  onLaunchReEntry: (spaceId: string) => void;
}

export const SpacesScreen: React.FC<SpacesScreenProps> = ({
  spaces,
  records,
  currentUser,
  onOpenSpace,
  onCreateSpace,
  onLaunchRelay,
  onLaunchReEntry,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'personal' | 'shared'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewSpaceModalOpen, setIsNewSpaceModalOpen] = useState(false);

  // New Space Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'personal' | 'shared'>('personal');
  const [memberEmail, setMemberEmail] = useState('');

  const filteredSpaces = spaces.filter((s) => {
    if (filterType !== 'all' && s.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const newSpace: Space = {
      id: `space-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newName.trim(),
      description: newDesc.trim() || 'A living context space in MARGIN.',
      ownerId: currentUser.id,
      type: newType,
      color: '#657C69',
      members: [
        {
          userId: currentUser.id,
          name: currentUser.name,
          email: currentUser.email || 'user@margin.app',
          role: 'owner',
          joinedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: {
        recordCount: 0,
        unresolvedCount: 0,
        lastActivityAt: Date.now(),
      },
    };

    if (newType === 'shared' && memberEmail.trim()) {
      newSpace.members.push({
        userId: `user-${Math.random().toString(36).substring(2, 6)}`,
        name: memberEmail.split('@')[0],
        email: memberEmail.trim(),
        role: 'editor',
        joinedAt: Date.now(),
      });
    }

    await onCreateSpace(newSpace);

    setNewName('');
    setNewDesc('');
    setMemberEmail('');
    setIsNewSpaceModalOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E5E3DA] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#77766E]">
              Project Workspaces
            </span>
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-[#252620] tracking-tight">
            Spaces
          </h1>
          <p className="text-sm text-[#77766E] mt-1 max-w-xl">
            Isolated personal workspaces and collaborative environments with strict privacy boundaries.
          </p>
        </div>

        <button
          onClick={() => setIsNewSpaceModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#252620] text-[#F6F5F0] hover:bg-[#3D3E35] transition-all text-xs font-medium tracking-wide shadow-xs active:scale-[0.98] self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-[#A8BBAA]" />
          <span>New Space</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-[#EFEEE8] p-1 rounded-lg border border-[#E5E3DA] text-xs font-medium self-start">
          {(['all', 'personal', 'shared'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-md capitalize transition-colors ${
                filterType === t
                  ? 'bg-[#FFFFFF] text-[#252620] shadow-2xs font-semibold'
                  : 'text-[#77766E] hover:text-[#252620]'
              }`}
            >
              {t} Spaces
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#77766E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter spaces..."
            className="pl-8 pr-3 py-1.5 bg-[#FFFFFF] border border-[#E5E3DA] rounded-lg text-xs text-[#252620] placeholder-[#77766E] focus:outline-hidden focus:ring-1 focus:ring-[#657C69] w-full sm:w-56"
          />
        </div>
      </div>

      {/* Spaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredSpaces.map((space) => {
          const spaceRecords = records.filter((r) => r.spaceId === space.id);
          const unresolved = spaceRecords.filter(
            (r) => r.status === 'active' && (r.type === 'hypothesis' || r.type === 'action')
          );

          return (
            <div
              key={space.id}
              className="bg-[#FFFFFF] border border-[#E5E3DA] rounded-xl p-5 hover:border-[#C8D6C9] transition-all shadow-xs flex flex-col justify-between group"
            >
              <div>
                {/* Meta Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {space.type === 'personal' ? (
                      <Lock className="w-3 h-3 text-[#77766E]" />
                    ) : (
                      <Users className="w-3 h-3 text-[#657C69]" />
                    )}
                    <span className="text-[11px] font-mono text-[#77766E] uppercase">
                      {space.type}
                    </span>
                  </div>

                  <span className="text-[11px] font-mono text-[#77766E]">
                    {space.members.length} {space.members.length === 1 ? 'member' : 'members'}
                  </span>
                </div>

                {/* Title */}
                <h3
                  onClick={() => onOpenSpace(space.id)}
                  className="font-serif text-lg font-medium text-[#252620] group-hover:text-[#657C69] transition-colors cursor-pointer"
                >
                  {space.name}
                </h3>

                <p className="text-xs text-[#77766E] line-clamp-2 mt-1.5 leading-relaxed">
                  {space.description}
                </p>

                {/* Stat pills */}
                <div className="mt-4 flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 bg-[#EFEEE8] rounded text-[#56554D]">
                    {spaceRecords.length} records
                  </span>
                  {unresolved.length > 0 && (
                    <span className="px-2 py-0.5 bg-[#FBF0EA] text-[#94532B] border border-[#F2D8C9] rounded">
                      {unresolved.length} unresolved
                    </span>
                  )}
                  <span className="text-[#77766E] ml-auto text-[10px]">
                    Updated {new Date(space.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3.5 border-t border-[#E5E3DA] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onLaunchRelay(space.id)}
                    className="text-xs font-medium text-[#657C69] hover:text-[#536757] flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Relay</span>
                  </button>
                  <span className="text-[#D5D2C7]">•</span>
                  <button
                    onClick={() => onLaunchReEntry(space.id)}
                    className="text-xs font-medium text-[#77766E] hover:text-[#252620] flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Re-Entry</span>
                  </button>
                </div>

                <button
                  onClick={() => onOpenSpace(space.id)}
                  className="flex items-center gap-1 text-xs font-medium text-[#252620] hover:translate-x-0.5 transition-transform"
                >
                  <span>Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#77766E]" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW SPACE MODAL */}
      {isNewSpaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252620]/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#FFFFFF] rounded-xl border border-[#E5E3DA] shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E3DA] bg-[#F6F5F0]">
              <h2 className="font-serif text-lg font-medium text-[#252620]">Create New Space</h2>
              <button
                onClick={() => setIsNewSpaceModalOpen(false)}
                className="text-[#77766E] hover:text-[#252620]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-medium text-[#77766E] block mb-1">
                  Space Name:
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Project Apollo — Database Scaling"
                  className="w-full px-3 py-1.5 bg-[#F6F5F0] border border-[#E5E3DA] rounded-md text-xs text-[#252620] font-medium focus:outline-hidden focus:ring-1 focus:ring-[#657C69]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-[#77766E] block mb-1">
                  Project Objective / Description:
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Briefly state the context and goals for this space..."
                  rows={3}
                  className="w-full p-2.5 bg-[#F6F5F0] border border-[#E5E3DA] rounded-md text-xs text-[#252620] focus:outline-hidden focus:ring-1 focus:ring-[#657C69] resize-none"
                />
              </div>

              {/* Space Visibility & Type */}
              <div>
                <label className="text-[11px] font-medium text-[#77766E] block mb-1">
                  Privacy Boundary:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewType('personal')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      newType === 'personal'
                        ? 'border-[#657C69] bg-[#E8EEE7] text-[#252620]'
                        : 'border-[#E5E3DA] bg-[#FFFFFF] text-[#77766E]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-xs mb-0.5">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Personal Space</span>
                    </div>
                    <p className="text-[10px] text-[#77766E]">Private by default. Only visible to you.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewType('shared')}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      newType === 'shared'
                        ? 'border-[#657C69] bg-[#E8EEE7] text-[#252620]'
                        : 'border-[#E5E3DA] bg-[#FFFFFF] text-[#77766E]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-xs mb-0.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Shared Space</span>
                    </div>
                    <p className="text-[10px] text-[#77766E]">Collaborate with authorized team members.</p>
                  </button>
                </div>
              </div>

              {newType === 'shared' && (
                <div>
                  <label className="text-[11px] font-medium text-[#77766E] block mb-1">
                    Invite Initial Member (Email):
                  </label>
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="teammate@company.com"
                    className="w-full px-3 py-1.5 bg-[#F6F5F0] border border-[#E5E3DA] rounded-md text-xs text-[#252620] focus:outline-hidden focus:ring-1 focus:ring-[#657C69]"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E5E3DA] bg-[#F6F5F0]">
              <button
                onClick={() => setIsNewSpaceModalOpen(false)}
                className="px-3 py-1.5 text-xs text-[#77766E] hover:text-[#252620]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-1.5 bg-[#252620] text-[#F6F5F0] rounded-md text-xs font-medium disabled:opacity-50"
              >
                Create Space
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
