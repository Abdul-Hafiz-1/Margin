import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getRemoteConfig, type RemoteConfig } from 'firebase/remote-config';
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider, type AppCheck } from 'firebase/app-check';
import { getAI, GoogleAIBackend } from 'firebase/ai';

// Safe environment variable retrieval targeted for 'waryapp'
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (import.meta.env.PROD ? '' : 'demo-api-key'),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'waryapp.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'waryapp',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'waryapp.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '411348456286',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:411348456286:web:92b228f879bc785e5375cf',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-RZPTFQKY9S',
};

export const isFirebaseConfigured = Boolean(
  import.meta.env.VITE_FIREBASE_API_KEY &&
  import.meta.env.VITE_FIREBASE_API_KEY !== 'demo-api-key' &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID &&
  import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'demo-project'
);

let app: FirebaseApp;
if (!getApps().length) {
  if (import.meta.env.PROD && !isFirebaseConfigured) {
    throw new Error('[MARGIN Firebase] Missing required production Firebase configuration. VITE_FIREBASE_API_KEY must be provided.');
  }
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
  remoteConfig.settings.minimumFetchIntervalMillis = import.meta.env.DEV ? 0 : 3600000;
} catch (e) {
  console.warn('Remote Config initialization deferred or unavailable:', e);
}

// App Check with strict production isolation
export let appCheck: AppCheck | null = null;

export function initAppCheck(): AppCheck | null {
  if (appCheck) return appCheck;
  if (typeof window === 'undefined') return null;

  const isProd = import.meta.env.PROD;
  const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;

  // Debug token handling: NEVER enable debug tokens implicitly in production
  if (!isProd && debugToken) {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === 'true' ? true : debugToken;
  }

  if (recaptchaSiteKey) {
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      return appCheck;
    } catch (err) {
      console.warn('[MARGIN App Check] ReCaptchaV3 initialization note:', err);
    }
  }

  // In production, NEVER use a dummy App Check token as if it were valid
  if (isProd) {
    console.warn('[MARGIN App Check] VITE_RECAPTCHA_SITE_KEY not provided. App Check is uninitialized in production.');
    return null;
  }

  // Development / Test only custom provider
  if (debugToken) {
    try {
      appCheck = initializeAppCheck(app, {
        provider: new CustomProvider({
          getToken: async () => ({
            token: typeof debugToken === 'string' && debugToken !== 'true' ? debugToken : 'debug-dev-appcheck-token',
            expireTimeMillis: Date.now() + 3600000,
          }),
        }),
        isTokenAutoRefreshEnabled: true,
      });
      return appCheck;
    } catch (err) {
      console.warn('[MARGIN App Check] Development CustomProvider note:', err);
    }
  }

  return null;
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
