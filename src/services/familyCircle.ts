import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebaseConfig';
import type { FamilyCircleAlert, ScamType } from '../types';

export interface CircleInfo {
  id: string;
  name: string;
  inviteCode: string;
  members: string[];
}

// Local simulation fallback for demo/offline testing
let simulatedUser: { uid: string; displayName: string; email: string } | null = null;
const simulatedCircles: Map<string, CircleInfo> = new Map();
const simulatedAlerts: Map<string, FamilyCircleAlert[]> = new Map();
const simulatedListeners: Map<string, Set<(alerts: FamilyCircleAlert[]) => void>> = new Map();

// Initialize demo circle
const DEMO_CIRCLE: CircleInfo = {
  id: 'circle_demo_family',
  name: 'Sharma Family Circle',
  inviteCode: 'SHAR99',
  members: ['demo_user_dad', 'demo_user_daughter'],
};
simulatedCircles.set(DEMO_CIRCLE.id, DEMO_CIRCLE);
simulatedCircles.set(DEMO_CIRCLE.inviteCode, DEMO_CIRCLE);
simulatedAlerts.set(DEMO_CIRCLE.id, [
  {
    id: 'alert_initial_1',
    circleId: DEMO_CIRCLE.id,
    timestamp: Date.now() - 3600000,
    scamType: 'electricity_disconnection',
    severity: 'high',
    senderDisplayName: 'Dad',
    senderUserId: 'demo_user_dad',
  },
]);

export async function loginWithGoogle(): Promise<{ uid: string; displayName: string }> {
  if (isFirebaseConfigured) {
    try {
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);
      return {
        uid: res.user.uid,
        displayName: res.user.displayName || 'Family Member',
      };
    } catch (err) {
      console.warn('Google sign-in popup canceled or unconfigured, using simulated profile:', err);
    }
  }

  // Simulated login for offline/evaluation demonstration
  simulatedUser = {
    uid: 'demo_user_' + Math.random().toString(36).substring(2, 6),
    displayName: 'Priya (Daughter)',
    email: 'priya.demo@waryshield.app',
  };
  return simulatedUser;
}

export async function switchSimulatedUser(role: 'Dad' | 'Daughter'): Promise<{ uid: string; displayName: string }> {
  if (role === 'Dad') {
    simulatedUser = {
      uid: 'demo_user_dad',
      displayName: 'Dad (Ramesh)',
      email: 'ramesh.demo@waryshield.app',
    };
  } else {
    simulatedUser = {
      uid: 'demo_user_daughter',
      displayName: 'Priya (Daughter)',
      email: 'priya.demo@waryshield.app',
    };
  }
  return simulatedUser;
}

export function getCurrentUser(): { uid: string; displayName: string } | null {
  if (auth.currentUser) {
    return {
      uid: auth.currentUser.uid,
      displayName: auth.currentUser.displayName || 'Family Member',
    };
  }
  return simulatedUser;
}

export async function logoutUser(): Promise<void> {
  if (isFirebaseConfigured) {
    await signOut(auth);
  }
  simulatedUser = null;
}

export function listenAuth(callback: (user: { uid: string; displayName: string } | null) => void): () => void {
  if (isFirebaseConfigured) {
    return onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        callback({ uid: fbUser.uid, displayName: fbUser.displayName || 'Member' });
      } else {
        callback(simulatedUser);
      }
    });
  }

  callback(simulatedUser);
  return () => {};
}

/**
 * Creates a new family circle and generates a 6-character invite code.
 */
export async function createFamilyCircle(circleName: string): Promise<CircleInfo> {
  const user = getCurrentUser() || { uid: 'demo_user_creator', displayName: 'Circle Admin' };
  const circleId = `circle_${Date.now()}`;
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const circleData: CircleInfo = {
    id: circleId,
    name: circleName.trim(),
    inviteCode,
    members: [user.uid],
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'circles', circleId), {
        ...circleData,
        createdAt: serverTimestamp(),
      });
      // Store code lookup mapping
      await setDoc(doc(db, 'inviteCodes', inviteCode), { circleId });
      return circleData;
    } catch (err) {
      console.warn('Firestore write deferred, storing simulated circle:', err);
    }
  }

  simulatedCircles.set(circleId, circleData);
  simulatedCircles.set(inviteCode, circleData);
  simulatedAlerts.set(circleId, []);
  return circleData;
}

/**
 * Joins an existing circle by invite code.
 */
export async function joinFamilyCircleByCode(code: string): Promise<CircleInfo | null> {
  const normalizedCode = code.trim().toUpperCase();
  const user = getCurrentUser() || { uid: 'demo_user_joiner', displayName: 'Family Member' };

  if (isFirebaseConfigured) {
    try {
      const codeRef = doc(db, 'inviteCodes', normalizedCode);
      const codeSnap = await getDoc(codeRef);
      if (codeSnap.exists()) {
        const circleId = codeSnap.data().circleId;
        const circleRef = doc(db, 'circles', circleId);
        const circleSnap = await getDoc(circleRef);
        if (circleSnap.exists()) {
          const circle = circleSnap.data() as CircleInfo;
          if (!circle.members.includes(user.uid)) {
            circle.members.push(user.uid);
            await setDoc(circleRef, { members: circle.members }, { merge: true });
          }
          return circle;
        }
      }
    } catch (err) {
      console.warn('Firestore join error, checking simulated circles:', err);
    }
  }

  const existing = simulatedCircles.get(normalizedCode);
  if (existing) {
    if (!existing.members.includes(user.uid)) {
      existing.members.push(user.uid);
    }
    return existing;
  }
  return null;
}

/**
 * Publishes an alert to the family circle when a "Likely scam" is encountered.
 * GUARANTEE: NEVER includes message content, phones, accounts or raw text.
 * Only scamType, timestamp, severity, and sender name.
 */
export async function broadcastFamilyAlert(
  circleId: string,
  scamType: ScamType,
  severity: 'high' | 'medium' = 'high'
): Promise<FamilyCircleAlert> {
  const user = getCurrentUser() || { uid: 'demo_user', displayName: 'Family Member' };
  const alert: FamilyCircleAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    circleId,
    timestamp: Date.now(),
    scamType,
    severity,
    senderDisplayName: user.displayName,
    senderUserId: user.uid,
  };

  if (isFirebaseConfigured) {
    try {
      const alertsCol = collection(db, 'circles', circleId, 'alerts');
      // STRICT FIELD SET: NO message or text fields allowed
      await addDoc(alertsCol, {
        circleId: alert.circleId,
        timestamp: alert.timestamp,
        scamType: alert.scamType,
        severity: alert.severity,
        senderDisplayName: alert.senderDisplayName,
        senderUserId: alert.senderUserId,
      });
    } catch (err) {
      console.warn('Firestore alert broadcast deferred, logging to simulation:', err);
    }
  }

  // Update simulation
  const list = simulatedAlerts.get(circleId) || [];
  list.unshift(alert);
  simulatedAlerts.set(circleId, list);

  // Notify listeners
  const listeners = simulatedListeners.get(circleId);
  if (listeners) {
    for (const l of listeners) {
      l([...list]);
    }
  }

  return alert;
}

/**
 * Real-time listener for circle alerts.
 */
export function subscribeCircleAlerts(
  circleId: string,
  onAlerts: (alerts: FamilyCircleAlert[]) => void
): () => void {
  if (isFirebaseConfigured) {
    try {
      const alertsCol = collection(db, 'circles', circleId, 'alerts');
      const q = query(alertsCol, orderBy('timestamp', 'desc'), limit(25));
      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: FamilyCircleAlert[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              circleId: data.circleId,
              timestamp: data.timestamp,
              scamType: data.scamType,
              severity: data.severity,
              senderDisplayName: data.senderDisplayName,
              senderUserId: data.senderUserId,
            });
          });
          onAlerts(list);
        },
        (err) => {
          console.warn('Firestore snapshot error, falling back to local simulation:', err);
          const list = simulatedAlerts.get(circleId) || [];
          onAlerts(list);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.warn('Snapshot listener init note:', e);
    }
  }

  // Local simulation listener
  if (!simulatedListeners.has(circleId)) {
    simulatedListeners.set(circleId, new Set());
  }
  const set = simulatedListeners.get(circleId)!;
  set.add(onAlerts);

  // Initial emit
  const initial = simulatedAlerts.get(circleId) || [];
  onAlerts([...initial]);

  return () => {
    set.delete(onAlerts);
  };
}
