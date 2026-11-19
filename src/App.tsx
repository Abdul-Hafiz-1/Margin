import { useState, useEffect, useCallback } from 'react';
import { Navigation, type ActiveTab } from './components/Navigation';
import { HomeScreen } from './components/HomeScreen';
import { SpacesScreen } from './components/SpacesScreen';
import { SpaceWorkspace } from './components/SpaceWorkspace';
import { ActivityScreen } from './components/ActivityScreen';
import { SearchScreen } from './components/SearchScreen';
import { CaptureModal } from './components/CaptureModal';
import { RelayModal } from './components/RelayModal';
import { ReEntryModal } from './components/ReEntryModal';
import { SettingsModal } from './components/SettingsModal';
import {
  getSpaces,
  getRecords,
  getRelationships,
  getActivity,
  saveRecord,
  deleteRecord,
  saveSpace,
  renameSpace,
  archiveSpace,
  saveRelationship,
  saveRelayBriefing,
  saveReEntry,
  getReEntry,
  processPendingSyncQueue,
  seedInitialMarginProject,
} from './services/marginRepository';
import { generateRelayBriefing, generateReEntryBriefing } from './services/marginAI';
import { checkOnDeviceHardware } from './services/aiProofService';
import { subscribeToAuthChanges, signInAsGuest } from './services/authService';
import { isFirebaseConfigured } from './services/firebaseConfig';
import type {
  Space,
  MarginRecord,
  RecordRelationship,
  ActivityItem,
  RecordAuthor,
  RelayBriefing,
  ReEntryBriefing,
} from './types/margin';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);

  // Core Data State
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [records, setRecords] = useState<MarginRecord[]>([]);
  const [relationships, setRelationships] = useState<RecordRelationship[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [reEntryCache, setReEntryCache] = useState<Record<string, ReEntryBriefing>>({});

  // Active User Profile
  const [currentUser, setCurrentUser] = useState<RecordAuthor>({
    id: 'user-lead',
    name: 'Sarah Chen',
    email: 'sarah.chen@margin.app',
  });

  // Modal States
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeRelay, setActiveRelay] = useState<RelayBriefing | null>(null);
  const [activeReEntry, setActiveReEntry] = useState<ReEntryBriefing | null>(null);

  // Network & System States
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'local' | 'error'>('synced');
  const [hasOnDeviceAI, setHasOnDeviceAI] = useState(false);

  // Load Initial Repository Data
  const loadData = useCallback(async () => {
    await seedInitialMarginProject();
    const [sp, rec, rel, act] = await Promise.all([
      getSpaces(),
      getRecords(),
      getRelationships(),
      getActivity(),
    ]);

    setSpaces(sp);
    setRecords(rec);
    setRelationships(rel);
    setActivity(act);

    // Populate Re-entry cache for each space
    const cache: Record<string, ReEntryBriefing> = {};
    for (const space of sp) {
      const stored = await getReEntry(space.id);
      if (stored) cache[space.id] = stored;
    }
    setReEntryCache(cache);

    // Hardware capability check
    const hw = checkOnDeviceHardware();
    setHasOnDeviceAI(hw.hasPromptAPI);
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      await loadData();

      // Subscribe to real Firebase Auth
      if (isFirebaseConfigured) {
        subscribeToAuthChanges(async (authAuthor) => {
          if (!mounted) return;
          if (authAuthor) {
            setCurrentUser(authAuthor);
          } else {
            // Auto-sign in as guest if no session exists so Firestore auth checks succeed
            try {
              const guest = await signInAsGuest();
              if (mounted) setCurrentUser(guest);
            } catch (authErr) {
              console.warn('[MARGIN Auth] Anonymous sign-in deferred:', authErr);
            }
          }
        });
      }
    })();

    const handleOnline = () => {
      setIsOnline(true);
      // Automatically flush pending offline writes on reconnection
      void processPendingSyncQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Global keyboard shortcut: 'C' to quick capture
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'c' || e.key === 'C') &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setIsCaptureOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      mounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loadData]);

  // Record Handlers
  const handleSaveRecord = async (newRec: MarginRecord, reason?: string) => {
    setSyncStatus('syncing');
    await saveRecord(newRec, reason);
    await loadData();
    setSyncStatus('synced');
  };

  const handleArchiveRecord = async (recordId: string) => {
    if (!activeSpaceId) return;
    await deleteRecord(recordId, activeSpaceId, currentUser);
    await loadData();
  };

  const handleSaveRelationship = async (rel: RecordRelationship) => {
    await saveRelationship(rel, currentUser);
    await loadData();
  };

  const handleCreateSpace = async (newSpace: Space) => {
    await saveSpace(newSpace);
    await loadData();
    setActiveSpaceId(newSpace.id);
  };

  const handleRenameSpace = async (spaceId: string, newName: string, newDesc?: string) => {
    await renameSpace(spaceId, newName, newDesc);
    await loadData();
  };

  const handleArchiveSpace = async (spaceId: string) => {
    await archiveSpace(spaceId);
    await loadData();
  };

  // Launch Relay Briefing
  const handleLaunchRelay = async (spaceId: string) => {
    const spaceObj = spaces.find((s) => s.id === spaceId);
    if (!spaceObj) return;

    const spaceRecords = records.filter((r) => r.spaceId === spaceId);
    const briefing = await generateRelayBriefing(spaceObj.name, spaceRecords, currentUser);
    await saveRelayBriefing(briefing);
    setActiveRelay(briefing);
  };

  // Launch Re-Entry Briefing
  const handleLaunchReEntry = async (spaceId: string) => {
    const spaceRecords = records.filter((r) => r.spaceId === spaceId);
    const briefing = await generateReEntryBriefing(spaceId, spaceRecords);
    await saveReEntry(briefing);
    setReEntryCache((prev) => ({ ...prev, [spaceId]: briefing }));
    setActiveReEntry(briefing);
  };

  // Active Workspace
  const currentWorkspace = spaces.find((s) => s.id === activeSpaceId);

  return (
    <div className="min-h-screen bg-[#F6F5F0] text-[#252620] flex flex-col md:flex-row antialiased selection:bg-[#E8EEE7] selection:text-[#252620]">
      {/* Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setActiveSpaceId(null); // Return to top-level view
        }}
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        currentUser={currentUser}
        isOnline={!isSimulatedOffline && isOnline}
        syncStatus={syncStatus}
        hasOnDeviceAI={hasOnDeviceAI}
      />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-8 pt-4 md:pt-6 overflow-y-auto">
        {/* Workspace View if Space Selected */}
        {activeSpaceId && currentWorkspace ? (
          <SpaceWorkspace
            space={currentWorkspace}
            records={records.filter((r) => r.spaceId === activeSpaceId)}
            relationships={relationships.filter((r) => r.spaceId === activeSpaceId)}
            currentUser={currentUser}
            onBack={() => setActiveSpaceId(null)}
            onOpenCapture={() => setIsCaptureOpen(true)}
            onLaunchRelay={() => handleLaunchRelay(activeSpaceId)}
            onLaunchReEntry={() => handleLaunchReEntry(activeSpaceId)}
            onSaveRecord={handleSaveRecord}
            onArchiveRecord={handleArchiveRecord}
            onSaveRelationship={handleSaveRelationship}
            onRenameSpace={handleRenameSpace}
            onArchiveSpace={handleArchiveSpace}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                spaces={spaces}
                recentRecords={records}
                currentUser={currentUser}
                onOpenSpace={(id) => setActiveSpaceId(id)}
                onOpenCapture={() => setIsCaptureOpen(true)}
                onLaunchReEntry={handleLaunchReEntry}
                onLaunchRelay={handleLaunchRelay}
                reEntryCache={reEntryCache}
              />
            )}

            {activeTab === 'spaces' && (
              <SpacesScreen
                spaces={spaces}
                records={records}
                currentUser={currentUser}
                onOpenSpace={(id) => setActiveSpaceId(id)}
                onCreateSpace={handleCreateSpace}
                onLaunchRelay={handleLaunchRelay}
                onLaunchReEntry={handleLaunchReEntry}
              />
            )}

            {activeTab === 'activity' && (
              <ActivityScreen
                activity={activity}
                spaces={spaces}
                onOpenSpace={(id) => setActiveSpaceId(id)}
              />
            )}

            {activeTab === 'search' && (
              <SearchScreen
                records={records}
                spaces={spaces}
                onOpenSpace={(id) => setActiveSpaceId(id)}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onSaveRecord={handleSaveRecord}
        spaces={spaces}
        activeSpaceId={activeSpaceId || spaces[0]?.id}
        currentUser={currentUser}
      />

      {activeRelay && currentWorkspace && (
        <RelayModal
          isOpen={Boolean(activeRelay)}
          onClose={() => setActiveRelay(null)}
          relay={activeRelay}
          space={currentWorkspace}
          onSaveRelay={async (updated) => {
            await saveRelayBriefing(updated);
            setActiveRelay(updated);
          }}
        />
      )}

      {activeReEntry && currentWorkspace && (
        <ReEntryModal
          isOpen={Boolean(activeReEntry)}
          onClose={() => setActiveReEntry(null)}
          briefing={activeReEntry}
          space={currentWorkspace}
          onRegenerate={async () => {
            await handleLaunchReEntry(activeSpaceId!);
          }}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentUser={currentUser}
        onSwitchUser={setCurrentUser}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={() => setIsSimulatedOffline(!isSimulatedOffline)}
      />
    </div>
  );
}

export default App;
