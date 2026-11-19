import React from 'react';
import {
  Compass,
  FolderOpen,
  History,
  Search,
  Plus,
  Settings,
  Cpu,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { RecordAuthor } from '../types/margin';

export type ActiveTab = 'home' | 'spaces' | 'activity' | 'search';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenCapture: () => void;
  onOpenSettings: () => void;
  currentUser: RecordAuthor;
  isOnline: boolean;
  syncStatus: 'synced' | 'syncing' | 'local' | 'error';
  hasOnDeviceAI: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenCapture,
  onOpenSettings,
  currentUser,
  isOnline,
  syncStatus,
  hasOnDeviceAI,
}) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Home', icon: <Compass className="w-4 h-4" /> },
    { id: 'spaces', label: 'Spaces', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'activity', label: 'Activity', icon: <History className="w-4 h-4" /> },
    { id: 'search', label: 'Search', icon: <Search className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#EFEEE8] border-r border-[#E5E3DA] p-4 justify-between h-screen fixed left-0 top-0 z-30 select-none">
        <div>
          {/* Brand Identity */}
          <div className="flex items-center justify-between mb-8 px-2 pt-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#657C69]" />
                <h1 className="font-serif text-2xl font-semibold tracking-tight text-[#252620]">
                  MARGIN
                </h1>
              </div>
              <p className="text-[11px] text-[#77766E] tracking-wide mt-0.5 font-sans uppercase">
                Your work has a memory
              </p>
            </div>
          </div>

          {/* Global Fast Capture Button */}
          <div className="mb-6 px-1">
            <button
              onClick={onOpenCapture}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-[#252620] text-[#F6F5F0] hover:bg-[#3D3E35] transition-all text-xs font-medium tracking-wide shadow-xs active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-[#A8BBAA]" />
              <span>Capture Context</span>
              <kbd className="ml-auto text-[10px] bg-[#3D3E35] text-[#D0CFC5] px-1.5 py-0.5 rounded font-mono">
                C
              </kbd>
            </button>
          </div>

          {/* Main Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[#E8EEE7] text-[#252620] font-semibold border border-[#C8D6C9]'
                      : 'text-[#56554D] hover:bg-[#E5E3DA] hover:text-[#252620]'
                  }`}
                >
                  <span className={active ? 'text-[#657C69]' : 'text-[#77766E]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Area: Sync, Hardware, and Account */}
        <div className="pt-4 border-t border-[#E5E3DA] space-y-3 px-1">
          {/* System Status Indicators */}
          <div className="flex items-center justify-between text-[11px] text-[#77766E] px-2 py-1.5 bg-[#F6F5F0] rounded-md border border-[#E5E3DA]">
            <div className="flex items-center gap-1.5" title={isOnline ? 'Online' : 'Offline'}>
              {isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-[#657C69]" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-[#B87A4D]" />
              )}
              <span className="capitalize">{isOnline ? syncStatus : 'Offline'}</span>
            </div>

            <div
              className="flex items-center gap-1 cursor-pointer hover:text-[#252620]"
              onClick={onOpenSettings}
              title={hasOnDeviceAI ? 'On-Device Gemini Nano active' : 'Using cloud / fallback inference'}
            >
              <Cpu className={`w-3.5 h-3.5 ${hasOnDeviceAI ? 'text-[#657C69]' : 'text-[#77766E]'}`} />
              <span>{hasOnDeviceAI ? 'Nano AI' : 'Cloud AI'}</span>
            </div>
          </div>

          {/* User Profile & Settings */}
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-[#E5E3DA] transition-colors text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-[#D5D2C7] flex items-center justify-center text-xs font-medium text-[#252620]">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#252620] truncate">{currentUser.name}</p>
                <p className="text-[10px] text-[#77766E] truncate">{currentUser.email || 'Personal Space'}</p>
              </div>
            </div>
            <Settings className="w-3.5 h-3.5 text-[#77766E] shrink-0" />
          </button>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#EFEEE8] border-t border-[#E5E3DA] px-4 py-2 z-40 flex items-center justify-around">
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 p-1 text-[10px] font-medium transition-colors ${
                active ? 'text-[#252620]' : 'text-[#77766E]'
              }`}
            >
              <span className={active ? 'text-[#657C69]' : 'text-[#77766E]'}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}

        {/* Mobile Quick Capture FAB */}
        <button
          onClick={onOpenCapture}
          className="w-10 h-10 rounded-full bg-[#252620] text-[#F6F5F0] flex items-center justify-center shadow-md active:scale-95"
          aria-label="Capture record"
        >
          <Plus className="w-5 h-5 text-[#A8BBAA]" />
        </button>

        <button
          onClick={onOpenSettings}
          className="flex flex-col items-center gap-1 p-1 text-[10px] text-[#77766E]"
        >
          <Settings className="w-4 h-4" />
          <span>Config</span>
        </button>
      </nav>
    </>
  );
};
