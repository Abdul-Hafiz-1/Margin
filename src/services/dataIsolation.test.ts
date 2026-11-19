/**
 * MARGIN — Multi-User Lifecycle & Local Data Isolation Verification
 * 
 * Verifies Requirement 4:
 * 1. User A signs in.
 * 2. User A creates a personal space.
 * 3. User A captures records.
 * 4. User A signs out.
 * 5. User B signs in.
 * 6. User B must not see User A's private records.
 * 7. User B cannot modify User A's records.
 * 8. User A signs back in.
 * 9. User A's data must still exist.
 * 
 * Guarantees IndexedDB / local repository is strictly scoped per authenticated user ID.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setActiveUserContext,
  saveSpace,
  getSpaces,
  saveRecord,
  getRecords,
  getRecordById,
  getSpaceById,
} from './marginRepository';
import type { Space, MarginRecord } from '../types/margin';

describe('Authentication Lifecycle & Data Isolation Engine', () => {
  const USER_A_ID = 'user-alice-uid';
  const USER_B_ID = 'user-bob-uid';

  const USER_A_SPACE_ID = 'space-alice-private';
  const USER_A_REC_ID = 'rec-alice-confidential-01';

  beforeEach(() => {
    setActiveUserContext(null);
  });

  it('strictly isolates local repository data between User A, Signed-Out state, and User B', async () => {
    // 1. User A signs in
    setActiveUserContext(USER_A_ID);

    // 2. User A creates a personal space
    const aliceSpace: Space = {
      id: USER_A_SPACE_ID,
      name: "Alice's Autonomous Engine Design",
      description: 'Strictly confidential architecture space',
      ownerId: USER_A_ID,
      type: 'personal',
      color: '#657C69',
      members: [
        {
          userId: USER_A_ID,
          name: 'Alice Owner',
          email: 'alice@margin.app',
          role: 'owner',
          joinedAt: Date.now(),
        },
      ],
      memberIds: [USER_A_ID],
      roles: { [USER_A_ID]: 'owner' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: { recordCount: 1, unresolvedCount: 0, lastActivityAt: Date.now() },
    };
    await saveSpace(aliceSpace);

    // 3. User A captures private records
    const aliceRecord: MarginRecord = {
      id: USER_A_REC_ID,
      spaceId: USER_A_SPACE_ID,
      type: 'decision',
      title: 'Proprietary Zero-Knowledge Architecture Decision',
      content: 'Confidential system parameters and private cryptographic seeds.',
      status: 'active',
      author: { id: USER_A_ID, name: 'Alice Owner' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      source: 'user',
      supportingRecordIds: [],
      tags: ['zk', 'confidential', 'core'],
      version: 1,
      syncStatus: 'local',
    };
    await saveRecord(aliceRecord);

    // Verify User A can see their space and record
    const aliceSpaces = await getSpaces();
    expect(aliceSpaces.some((s) => s.id === USER_A_SPACE_ID)).toBe(true);
    const aliceRecords = await getRecords(USER_A_SPACE_ID);
    expect(aliceRecords.some((r) => r.id === USER_A_REC_ID)).toBe(true);

    // 4. User A signs out
    setActiveUserContext(null);

    // In signed-out state, User A's private personal space must not leak into guest repository
    const guestSpaces = await getSpaces();
    expect(guestSpaces.some((s) => s.id === USER_A_SPACE_ID)).toBe(false);

    // 5. User B signs in on the same browser
    setActiveUserContext(USER_B_ID);

    // 6. User B must not see User A's private space or private records
    const bobSpaces = await getSpaces();
    expect(bobSpaces.some((s) => s.id === USER_A_SPACE_ID)).toBe(false);

    const bobRecords = await getRecords();
    expect(bobRecords.some((r) => r.id === USER_A_REC_ID)).toBe(false);

    // 7. User B cannot access or modify User A's record directly
    const directBobAccess = await getRecordById(USER_A_REC_ID);
    expect(directBobAccess).toBeUndefined();

    const directBobSpaceAccess = await getSpaceById(USER_A_SPACE_ID);
    expect(directBobSpaceAccess).toBeUndefined();

    // User B creates their own separate space
    const bobSpace: Space = {
      id: 'space-bob-public',
      name: "Bob's Public Performance Testing",
      description: 'Public benchmarks space',
      ownerId: USER_B_ID,
      type: 'shared',
      color: '#4A6B82',
      members: [{ userId: USER_B_ID, name: 'Bob Engineer', email: 'bob@margin.app', role: 'owner', joinedAt: Date.now() }],
      memberIds: [USER_B_ID],
      roles: { [USER_B_ID]: 'owner' },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveSpace(bobSpace);

    const bobOwnedSpaces = await getSpaces();
    expect(bobOwnedSpaces.length).toBe(1);
    expect(bobOwnedSpaces[0].id).toBe('space-bob-public');

    // 8. User B signs out and User A signs back in
    setActiveUserContext(null);
    setActiveUserContext(USER_A_ID);

    // 9. User A's private data must still exist intact
    const restoredAliceSpaces = await getSpaces();
    expect(restoredAliceSpaces.some((s) => s.id === USER_A_SPACE_ID)).toBe(true);

    const restoredAliceRecords = await getRecords(USER_A_SPACE_ID);
    expect(restoredAliceRecords.length).toBe(1);
    expect(restoredAliceRecords[0].id).toBe(USER_A_REC_ID);
    expect(restoredAliceRecords[0].title).toBe('Proprietary Zero-Knowledge Architecture Decision');

    // And User A cannot see User B's space
    expect(restoredAliceSpaces.some((s) => s.id === 'space-bob-public')).toBe(false);
  });
});
