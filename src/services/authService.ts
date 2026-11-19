/**
 * MARGIN — Authentication Service
 * Wraps Firebase Auth with support for:
 * - Google OAuth popup sign-in
 * - Anonymous / Guest sign-in (explicitly distinguished)
 * - True sign-out with auth state transition
 * - Auth state subscription with proper cleanup
 * - Distinction between real Firebase sessions and local guest mode
 */

import {
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebaseConfig';
import type { RecordAuthor } from '../types/margin';

export type AuthLifecycleState = 'loading' | 'authenticated' | 'unauthenticated' | 'local_guest';

export function userToRecordAuthor(user: User): RecordAuthor {
  return {
    id: user.uid,
    name: user.displayName || (user.isAnonymous ? 'Guest (Anonymous Session)' : user.email?.split('@')[0] || 'User'),
    email: user.email || undefined,
    avatarUrl: user.photoURL || undefined,
    isAnonymous: user.isAnonymous,
    isGuest: false,
  };
}

export function createLocalGuestAuthor(): RecordAuthor {
  return {
    id: 'local-guest',
    name: 'Local Guest (Unauthenticated)',
    isAnonymous: false,
    isGuest: true,
  };
}

export function subscribeToAuthChanges(
  callback: (user: RecordAuthor | null, rawUser: User | null, state: AuthLifecycleState) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(userToRecordAuthor(user), user, 'authenticated');
    } else {
      callback(null, null, 'unauthenticated');
    }
  });
}

export async function signInWithGoogle(): Promise<RecordAuthor> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return userToRecordAuthor(cred.user);
}

export async function signInAsGuest(): Promise<RecordAuthor> {
  const cred = await signInAnonymously(auth);
  return userToRecordAuthor(cred.user);
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export function getCurrentAuthUser(): RecordAuthor | null {
  if (auth.currentUser) {
    return userToRecordAuthor(auth.currentUser);
  }
  return null;
}
