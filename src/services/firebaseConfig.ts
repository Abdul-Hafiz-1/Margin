import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getRemoteConfig, type RemoteConfig } from 'firebase/remote-config';
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider, type AppCheck } from 'firebase/app-check';
import { getAI, GoogleAIBackend } from 'firebase/ai';

// Safe environment variable retrieval
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'wary-shield-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'wary-shield-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'wary-shield-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:abcdef123456',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'demo-api-key'
);

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const firebaseApp = app;

// Auth
export const auth: Auth = getAuth(app);

// Firestore
export const db: Firestore = getFirestore(app);

// Remote Config
export let remoteConfig: RemoteConfig | null = null;
try {
  remoteConfig = getRemoteConfig(app);
  // Default to 1 hour minimum fetch, or 0 in development/demo mode
  remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 0 : 3600000;
} catch (e) {
  console.warn('Remote Config initialization deferred or unavailable:', e);
}

// App Check with debug token support
export let appCheck: AppCheck | null = null;
export function initAppCheck(): AppCheck | null {
  if (appCheck) return appCheck;
  if (typeof window === 'undefined') return null;

  try {
    const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
    if (debugToken) {
      // Allow judges and developers to bypass reCAPTCHA locally
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken;
    } else if (import.meta.env.DEV) {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (recaptchaSiteKey) {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } else {
      // Local dev / evaluation custom provider fallback
      appCheck = initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: async () => ({
            token: 'demo-local-app-check-token',
            expireTimeMillis: Date.now() + 3600000,
          }),
        }),
        isTokenAutoRefreshEnabled: true,
      });
    }
  } catch (err) {
    console.warn('App Check initialization note:', err);
  }
  return appCheck;
}

// Firebase AI Logic
let aiInstance: ReturnType<typeof getAI> | null = null;
export function getFirebaseAI() {
  if (!aiInstance) {
    try {
      aiInstance = getAI(app, { backend: new GoogleAIBackend() });
    } catch (e) {
      console.warn('Firebase AI Logic initialization note:', e);
    }
  }
  return aiInstance;
}
