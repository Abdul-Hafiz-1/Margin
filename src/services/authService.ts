/**
 * MARGIN — Authentication Service
 * Wraps Firebase Auth with support for:
 * - Google OAuth popup sign-in
 * - Anonymous / Guest developer sign-in
 * - Sign out
 * - Auth state subscription
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

export function userToRecordAuthor(user: User): RecordAuthor {
  return {
    id: user.uid,
    name: user.displayName || (user.isAnonymous ? 'Guest Contributor' : user.email?.split('@')[0] || 'User'),
    email: user.email || undefined,
    avatarUrl: user.photoURL || undefined,
  };
}

export function subscribeToAuthChanges(
  callback: (user: RecordAuthor | null, rawUser: User | null) => void
): () => void {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(userToRecordAuthor(user), user);
    } else {
      callback(null, null);
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
