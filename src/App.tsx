import React, { useState, useEffect } from 'react';
import type {
  ScanResult,
  AppLanguage,
  ModelStatus,
  RemoteConfigState,
  LedgerEntry,
  FamilyCircleAlert,
} from './types';
import { Header } from './components/Header';
import { ModelStatusBanner } from './components/ModelStatusBanner';
import { CheckScreen } from './components/CheckScreen';
import { VerdictCard } from './components/VerdictCard';
import { PrivacyLedgerModal } from './components/PrivacyLedgerModal';
import { FamilyCircleModal } from './components/FamilyCircleModal';
import { SettingsModal } from './components/SettingsModal';

import {
  runHybridScan,
  subscribeModelStatus,
  initializeOnDeviceModel,
} from './services/hybridAI';
import {
  subscribeRemoteConfig,
  getActiveRemoteConfig,
  refreshRemoteConfig,
} from './services/remoteConfigService';
import {
  getLedgerEntries,
  clearLedgerEntries,
} from './services/privacyLedger';
import {
  listenAuth,
  getCurrentUser,
  subscribeCircleAlerts,
  broadcastFamilyAlert,
  type CircleInfo,
} from './services/familyCircle';
import { initAppCheck } from './services/firebaseConfig';
import { TRANSLATIONS } from './data/i18n';

export const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [currentResult, setCurrentResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSecondOpinionLoading, setIsSecondOpinionLoading] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>('en');

  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [simulateOffline, setSimulateOffline] = useState(false);

  const [remoteConfig, setRemoteConfig] = useState<RemoteConfigState>(getActiveRemoteConfig());
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);

  // Family Circle State
  const [currentUser, setCurrentUser] = useState<{ uid: string; displayName: string } | null>(
    getCurrentUser()
  );
  const [activeCircle, setActiveCircle] = useState<CircleInfo | null>(null);
  const [familyAlerts, setFamilyAlerts] = useState<FamilyCircleAlert[]>([]);
  const [hasUnreadAlert, setHasUnreadAlert] = useState(false);

  // Modals
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isFamilyOpen, setIsFamilyOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const t = TRANSLATIONS[language];

  // Lifecycle initialization
  useEffect(() => {
    // 1. Initialize App Check
    initAppCheck();

    // 2. Subscribe to Model Status
    const unsubModel = subscribeModelStatus((status, progress) => {
      setModelStatus(status);
      setDownloadProgress(progress);
    });

    // 3. Subscribe to Remote Config
    const unsubConfig = subscribeRemoteConfig((cfg) => {
      setRemoteConfig(cfg);
    });
    refreshRemoteConfig();

    // 4. Load initial Privacy Ledger
    getLedgerEntries().then(setLedgerEntries);

    // 5. Subscribe to Auth
    const unsubAuth = listenAuth((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsubModel();
      unsubConfig();
      unsubAuth();
    };
  }, []);

  // Family Circle realtime listener
  useEffect(() => {
    if (activeCircle) {
      const unsubCircle = subscribeCircleAlerts(activeCircle.id, (alerts) => {
        setFamilyAlerts(alerts);
        if (alerts.length > 0) {
          setHasUnreadAlert(true);
        }
      });
      return unsubCircle;
    }
  }, [activeCircle]);

  const refreshLedger = async () => {
    const entries = await getLedgerEntries();
    setLedgerEntries(entries);
  };

  const handleRunCheck = async (text: string, source: 'text' | 'screenshot' = 'text') => {
    if (!text.trim()) return;
    setIsScanning(true);
    try {
      const result = await runHybridScan(text, {
        simulateOffline,
        source,
      });
      setCurrentResult(result);
      await refreshLedger();
    } catch (err) {
      console.error('Scan execution error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSecondOpinion = async () => {
    if (!currentResult) return;
    setIsSecondOpinionLoading(true);
    try {
      const result = await runHybridScan(currentResult.originalText, {
        forceCloudSecondOpinion: true,
        simulateOffline: false,
      });
      setCurrentResult(result);
      await refreshLedger();
    } catch (err) {
      console.error('Second opinion error:', err);
    } finally {
      setIsSecondOpinionLoading(false);
    }
  };

  const handleBroadcastFamilyAlert = async () => {
    if (!currentResult) return;
    const targetCircleId = activeCircle ? activeCircle.id : 'circle_demo_family';
    await broadcastFamilyAlert(
      targetCircleId,
      currentResult.scamType,
      currentResult.verdict === 'Likely scam' ? 'high' : 'medium'
    );
    alert('Security Alert sent to Family Circle: Alert contains ONLY the threat pattern and time. No message text was shared.');
    setIsFamilyOpen(true);
  };

  const handleInitOnDeviceAI = async () => {
    await initializeOnDeviceModel();
  };

  const handleClearLedger = async () => {
    await clearLedgerEntries();
    setLedgerEntries([]);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* App Header */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        modelStatus={modelStatus}
        downloadProgress={downloadProgress}
        onInitOnDeviceAI={handleInitOnDeviceAI}
        simulateOffline={simulateOffline}
        onToggleSimulateOffline={() => setSimulateOffline(!simulateOffline)}
        onOpenLedger={() => setIsLedgerOpen(true)}
        onOpenFamily={() => {
          setIsFamilyOpen(true);
          setHasUnreadAlert(false);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        ledgerCount={ledgerEntries.length}
        hasUnreadFamilyAlert={hasUnreadAlert}
      />

      {/* Model & Operational Banner */}
      <ModelStatusBanner
        modelStatus={modelStatus}
        downloadProgress={downloadProgress}
        bannerMessage={remoteConfig.bannerMessage}
        patternPackVersion={remoteConfig.patternPackVersion}
        simulateOffline={simulateOffline}
        onInitOnDeviceAI={handleInitOnDeviceAI}
        language={language}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {t.tagline}
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            {t.promise}
          </p>
        </div>

        {/* Check Screen Input & Samples */}
        <CheckScreen
          inputText={inputText}
          onInputChange={setInputText}
          onRunCheck={handleRunCheck}
          isScanning={isScanning}
          language={language}
        />

        {/* Verdict Display */}
        {currentResult && (
          <div id="verdict-section" className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <VerdictCard
              result={currentResult}
              onSecondOpinion={handleSecondOpinion}
              onBroadcastFamilyAlert={handleBroadcastFamilyAlert}
              isSecondOpinionLoading={isSecondOpinionLoading}
              language={language}
              isCircleJoined={Boolean(activeCircle)}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d16] py-6 px-4 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto space-y-2">
          <p className="flex items-center justify-center gap-2 flex-wrap">
            <strong className="text-slate-300">Wary</strong> — Apache-2.0 Open Source.
            <span>Built for #BuildHybridAI 2026.</span>
            <span>Powered by Firebase AI Logic & App Check.</span>
          </p>
          <p className="text-[11px] text-slate-600">
            A second opinion, not a guarantee. Wary never reads or stores your private text on any cloud server.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <PrivacyLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => setIsLedgerOpen(false)}
        entries={ledgerEntries}
        onClear={handleClearLedger}
        language={language}
      />

      <FamilyCircleModal
        isOpen={isFamilyOpen}
        onClose={() => setIsFamilyOpen(false)}
        currentUser={currentUser}
        activeCircle={activeCircle}
        alerts={familyAlerts}
        onCircleJoined={setActiveCircle}
        onUserChanged={setCurrentUser}
        language={language}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={remoteConfig}
      />
    </div>
  );
};

export default App;
