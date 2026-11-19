import type { AppLanguage } from '../types';

export interface TranslationStrings {
  appTitle: string;
  tagline: string;
  promise: string;
  pastePrompt: string;
  pastePlaceholder: string;
  dropScreenshot: string;
  dropScreenshotHint: string;
  checkButton: string;
  checking: string;
  trySampleHeading: string;
  verdictSafe: string;
  verdictSuspicious: string;
  verdictScam: string;
  confidenceLabel: string;
  scamTypeLabel: string;
  reasonsHeading: string;
  actionsHeading: string;
  disclaimer: string;
  secondOpinionBtn: string;
  privacyLedgerBtn: string;
  familyCircleBtn: string;
  settingsBtn: string;
  simulateOffline: string;
  onDeviceReady: string;
  onDeviceDownloading: string;
  onDeviceUnavailable: string;
  onDeviceIdle: string;
  downloadAiBtn: string;
  ledgerTitle: string;
  ledgerSubtitle: string;
  clearLedger: string;
  exportJson: string;
  exportCsv: string;
  emptyLedger: string;
  familyTitle: string;
  familySubtitle: string;
  createCircle: string;
  joinCircle: string;
  inviteCodeLabel: string;
  membersLabel: string;
  alertsLabel: string;
  noAlertsYet: string;
  switchDemoUser: string;
  ocrExtracting: string;
}

export const TRANSLATIONS: Record<AppLanguage, TranslationStrings> = {
  en: {
    appTitle: 'Wary',
    tagline: 'Hybrid-AI Scam & Data-Leak Shield',
    promise: 'A second pair of eyes that never reads your messages out loud.',
    pastePrompt: 'Paste message text or drop a screenshot',
    pastePlaceholder: 'Paste suspicious SMS, WhatsApp message, email, or Telegram text here to check...',
    dropScreenshot: 'Drop screenshot here, or click to upload',
    dropScreenshotHint: 'PNG or JPEG. Scanned 100% on your device with zero cloud leakage.',
    checkButton: 'Check Message',
    checking: 'Analyzing securely...',
    trySampleHeading: 'Try a sample message (instant check)',
    verdictSafe: 'Safe Message',
    verdictSuspicious: 'Suspicious Warning',
    verdictScam: 'Likely Scam Detected',
    confidenceLabel: 'Confidence Score',
    scamTypeLabel: 'Detected Scam Pattern',
    reasonsHeading: 'Why this was flagged',
    actionsHeading: 'What to do right now',
    disclaimer: 'A second opinion, not a guarantee. Always verify directly through official channels.',
    secondOpinionBtn: 'Get Cloud Second Opinion (Redacted)',
    privacyLedgerBtn: 'Privacy Ledger',
    familyCircleBtn: 'Family Circle',
    settingsBtn: 'Settings & Remote Config',
    simulateOffline: 'Simulate Offline',
    onDeviceReady: 'On-device AI: Ready (100% Private)',
    onDeviceDownloading: 'Downloading on-device AI weights',
    onDeviceUnavailable: 'On-device AI: Unavailable (Cloud fallback ready)',
    onDeviceIdle: 'On-device AI: Available to download',
    downloadAiBtn: 'Initialize On-Device AI',
    ledgerTitle: 'Local Privacy Ledger',
    ledgerSubtitle: 'Complete cryptographic transparency of every outbound byte. Stored only in your device IndexedDB.',
    clearLedger: 'Delete All Records',
    exportJson: 'Export JSON',
    exportCsv: 'Export CSV',
    emptyLedger: 'No checks recorded yet. Paste a message or try a sample to see your privacy audit log.',
    familyTitle: 'Family Protection Circle',
    familySubtitle: 'Real-time alerts to protect elders and family members. Only scam category and timestamp are shared — never message content.',
    createCircle: 'Create Circle',
    joinCircle: 'Join with Code',
    inviteCodeLabel: 'Invite Code',
    membersLabel: 'Protected Members',
    alertsLabel: 'Recent Family Alerts',
    noAlertsYet: 'No alerts. All family members are safe.',
    switchDemoUser: 'Switch Test Profile (Demo)',
    ocrExtracting: 'Reading text on device...',
  },
  hi: {
    appTitle: 'वेरी (Wary)',
    tagline: 'हाइब्रिड-एआई फ्रॉड एवं डेटा सुरक्षा शील्ड',
    promise: 'एक अतिरिक्त नज़र जो कभी भी आपके संदेश ज़ोर से नहीं पढ़ती।',
    pastePrompt: 'संदेश पेस्ट करें या स्क्रीनशॉट डालें',
    pastePlaceholder: 'संदिग्ध SMS, व्हाट्सएप, ईमेल या टेलीग्राम संदेश यहाँ पेस्ट करें...',
    dropScreenshot: 'स्क्रीनशॉट यहाँ डालें या फ़ाइल चुनें',
    dropScreenshotHint: 'PNG/JPEG। आपके डिवाइस पर 100% सुरक्षित स्कैन, कोई फोटो क्लाउड पर नहीं जाती।',
    checkButton: 'संदेश की जाँच करें',
    checking: 'सुरक्षित जाँच जारी है...',
    trySampleHeading: 'नमूना संदेश आज़माएँ (तुरंत जाँच)',
    verdictSafe: 'सुरक्षित संदेश',
    verdictSuspicious: 'संदिग्ध संदेश की चेतावनी',
    verdictScam: 'संभावित फ्रॉड (स्कैम) पकड़ा गया',
    confidenceLabel: 'विश्वास स्कोर',
    scamTypeLabel: 'पहचाना गया फ्रॉड प्रकार',
    reasonsHeading: 'चेतावनी का कारण',
    actionsHeading: 'अब तुरंत क्या करें',
    disclaimer: 'यह एक अतिरिक्त राय है, कोई कानूनी गारंटी नहीं। हमेशा आधिकारिक माध्यम से पुष्टि करें।',
    secondOpinionBtn: 'क्लाउड दूसरी राय लें (सुरक्षित रूप से छिपाकर)',
    privacyLedgerBtn: 'प्राइवेसी लेज़र',
    familyCircleBtn: 'परिवार सुरक्षा घेरा',
    settingsBtn: 'सेटिंग्स',
    simulateOffline: 'ऑफलाइन मोड',
    onDeviceReady: 'डिवाइस पर एआई: तैयार (100% निजी)',
    onDeviceDownloading: 'डिवाइस एआई डाउनलोड हो रहा है',
    onDeviceUnavailable: 'डिवाइस एआई अनुपलब्ध (क्लाउड तैयार)',
    onDeviceIdle: 'डिवाइस एआई: डाउनलोड उपलब्ध',
    downloadAiBtn: 'डिवाइस एआई शुरू करें',
    ledgerTitle: 'स्थानीय प्राइवेसी लेज़र',
    ledgerSubtitle: 'बाहर जाने वाले प्रत्येक बाइट का पूरा हिसाब। केवल आपके फोन में IndexedDB में सुरक्षित।',
    clearLedger: 'सभी रिकॉर्ड हटाएं',
    exportJson: 'JSON निर्यात करें',
    exportCsv: 'CSV निर्यात करें',
    emptyLedger: 'अभी कोई रिकॉर्ड नहीं है। जाँच करने पर यहाँ विवरण दिखेगा।',
    familyTitle: 'परिवार सुरक्षा घेरा',
    familySubtitle: 'बुजुर्गों और परिजनों की सुरक्षा के लिए तत्काल अलर्ट। केवल फ्रॉड का प्रकार और समय साझा होता है — संदेश नहीं।',
    createCircle: 'नया घेरा बनाएं',
    joinCircle: 'कोड से जुड़ें',
    inviteCodeLabel: 'आमंत्रण कोड',
    membersLabel: 'सुरक्षित सदस्य',
    alertsLabel: 'पारिवारिक अलर्ट',
    noAlertsYet: 'कोई अलर्ट नहीं। सभी सदस्य सुरक्षित हैं।',
    switchDemoUser: 'टेस्ट प्रोफाइल बदलें (डेमो)',
    ocrExtracting: 'डिवाइस पर फोटो से टेक्स्ट पढ़ा जा रहा है...',
  },
  kn: {
    appTitle: 'ವೇರಿ (Wary)',
    tagline: 'ಹೈಬ್ರಿಡ್-ಎಐ ವಂಚನೆ ಮತ್ತು ಖಾಸಗಿತನ ರಕ್ಷಕ',
    promise: 'ನಿಮ್ಮ ಸಂದೇಶಗಳನ್ನು ಎಂದಿಗೂ ಹೊರಗೆ ಓದದ ನಂಬಿಕಸ್ಥ ರಕ್ಷಕ ಕಣ್ಣು.',
    pastePrompt: 'ಸಂದೇಶವನ್ನು ಪೇಸ್ಟ್ ಮಾಡಿ ಅಥವಾ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಹಾಕಿ',
    pastePlaceholder: 'ಅನುಮಾನಾಸ್ಪದ SMS, WhatsApp ಅಥವಾ ಟೆಲಿಗ್ರಾಮ್ ಸಂದೇಶವನ್ನು ಇಲ್ಲಿ ಪೇಸ್ಟ್ ಮಾಡಿ...',
    dropScreenshot: 'ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಡ್ರಾಪ್ ಮಾಡಿ ಅಥವಾ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ',
    dropScreenshotHint: 'PNG ಅಥವಾ JPEG. ನಿಮ್ಮ ಸಾಧನದಲ್ಲೇ 100% ಆನ್-ಡಿವೈಸ್ ಸ್ಕ್ಯಾನ್.',
    checkButton: 'ಪರಿಶೀಲಿಸಿ',
    checking: 'ಸುರಕ್ಷಿತವಾಗಿ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...',
    trySampleHeading: 'ಮಾದರಿ ಸಂದೇಶವನ್ನು ಪರೀಕ್ಷಿಸಿ',
    verdictSafe: 'ಸುರಕ್ಷಿತ ಸಂದೇಶ',
    verdictSuspicious: 'ಅನುಮಾನಾಸ್ಪದ ಎಚ್ಚರಿಕೆ',
    verdictScam: 'ವಂಚನೆ (ಸ್ಕ್ಯಾಮ್) ಪತ್ತೆಯಾಗಿದೆ',
    confidenceLabel: 'ವಿಶ್ವಾಸಾರ್ಹತೆ ಅಂಕ',
    scamTypeLabel: 'ವಂಚನೆಯ ಮಾದರಿ',
    reasonsHeading: 'ಕಾರಣಗಳು',
    actionsHeading: 'ನೀವು ಈಗ ಏನು ಮಾಡಬೇಕು',
    disclaimer: 'ಇದು ದ್ವಿತೀಯ ಅಭಿಪ್ರಾಯ, ಅಂತಿಮ ಖಾತರಿಯಲ್ಲ. ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ ದೃಢೀಕರಿಸಿ.',
    secondOpinionBtn: 'ಕ್ಲೌಡ್ ದ್ವಿತೀಯ ಅಭಿಪ್ರಾಯ ಪಡೆಯಿರಿ',
    privacyLedgerBtn: 'ಖಾಸಗಿತನ ಲೆಡ್ಜರ್',
    familyCircleBtn: 'ಕುಟುಂಬ ರಕ್ಷಣೆ',
    settingsBtn: 'ಸೆಟ್ಟಿಂಗ್ಸ್',
    simulateOffline: 'ಆಫ್‌ಲೈನ್ ಸಿಮ್ಯುಲೇಶನ್',
    onDeviceReady: 'ಆನ್-ಡಿವೈಸ್ ಎಐ: ಸಿದ್ಧವಾಗಿದೆ (ಖಾಸಗಿ)',
    onDeviceDownloading: 'ಡೌನ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ',
    onDeviceUnavailable: 'ಆನ್-ಡಿವೈಸ್ ಅಲಭ್ಯ (ಕ್ಲೌಡ್ ಸಿದ್ಧ)',
    onDeviceIdle: 'ಆನ್-ಡಿವೈಸ್ ಎಐ ಲಭ್ಯವಿದೆ',
    downloadAiBtn: 'ಆನ್-ಡಿವೈಸ್ ಎಐ ಆರಂಭಿಸಿ',
    ledgerTitle: 'ಖಾಸಗಿತನ ಲೆಡ್ಜರ್',
    ledgerSubtitle: 'ನಿಮ್ಮ ಸಾಧನದಿಂದ ಹೊರಹೋಗುವ ಪ್ರತಿ ಬೈಟ್‌ನ ಪಾರದರ್ಶಕ ಲೆಕ್ಕ. IndexedDB ಯಲ್ಲಿ ಮಾತ್ರ ಸಂಗ್ರಹ.',
    clearLedger: 'ಎಲ್ಲವನ್ನೂ ಅಳಿಸಿ',
    exportJson: 'JSON ರಫ್ತು ಮಾಡಿ',
    exportCsv: 'CSV ರಫ್ತು ಮಾಡಿ',
    emptyLedger: 'ಇನ್ನೂ ಯಾವುದೇ ದಾಖಲೆಗಳಿಲ್ಲ.',
    familyTitle: 'ಕುಟುಂಬ ರಕ್ಷಣಾ ವೃತ್ತ',
    familySubtitle: 'ಕುಟುಂಬದವರಿಗೆ ತಕ್ಷಣದ ಎಚ್ಚರಿಕೆ. ಕೇವಲ ವಂಚನೆಯ ಮಾದರಿ ಮತ್ತು ಸಮಯ ಮಾತ್ರ ಹಂಚಲಾಗುತ್ತದೆ — ಸಂದೇಶವಲ್ಲ.',
    createCircle: 'ವೃತ್ತ ರಚಿಸಿ',
    joinCircle: 'ಕೋಡ್‌ನೊಂದಿಗೆ ಸೇರಿ',
    inviteCodeLabel: 'ಆಹ್ವಾನ ಕೋಡ್',
    membersLabel: 'ಸದಸ್ಯರು',
    alertsLabel: 'ಕುಟುಂಬ ಎಚ್ಚರಿಕೆಗಳು',
    noAlertsYet: 'ಯಾವುದೇ ಎಚ್ಚರಿಕೆಗಳಿಲ್ಲ. ಎಲ್ಲರೂ ಸುರಕ್ಷಿತವಾಗಿದ್ದಾರೆ.',
    switchDemoUser: 'ಪ್ರೊಫೈಲ್ ಬದಲಾಯಿಸಿ (ಡೆಮೊ)',
    ocrExtracting: 'ಚಿತ್ರದಿಂದ ಅಕ್ಷರಗಳನ್ನು ಓದಲಾಗುತ್ತಿದೆ...',
  },
};
