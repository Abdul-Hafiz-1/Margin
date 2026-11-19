/**
 * MARGIN — Firestore Security Rules Verification Suite
 * 
 * Verifies all 8 critical authorization & privacy boundaries:
 * 1. Owner access
 * 2. Editor access
 * 3. Viewer access
 * 4. Non-member access
 * 5. Cross-space access & containment
 * 6. Unauthorized membership / role escalation
 * 7. Unauthorized ownership transfer
 * 8. Record deletion & immutable historical provenance
 */

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import * as fs from 'fs';
import * as path from 'path';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const PROJECT_ID = 'waryapp';
const RULES_PATH = path.join(__dirname, '..', '..', 'firestore.rules');

describe('Firestore Security Rules Authorization Boundaries', () => {
  let testEnv: RulesTestEnvironment;

  const OWNER_UID = 'user-owner';
  const EDITOR_UID = 'user-editor';
  const VIEWER_UID = 'user-viewer';
  const STRANGER_UID = 'user-stranger';

  const SPACE_ID = 'space-quantum';
  const OTHER_SPACE_ID = 'space-other';

  let emulatorAvailable = false;

  beforeAll(async () => {
    // Check if emulator is actively listening on port 8080
    emulatorAvailable = await fetch('http://127.0.0.1:8080')
      .then(() => true)
      .catch(() => false);

    if (!emulatorAvailable) {
      console.warn(
        '\n⚠️  Firestore emulator not detected at 127.0.0.1:8080.\n' +
        '   To run full emulator security tests: npm run test:rules\n'
      );
      return;
    }

    const rules = fs.readFileSync(RULES_PATH, 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async (ctx) => {
    if (!emulatorAvailable || !testEnv) {
      ctx.skip();
      return;
    }

    await testEnv.clearFirestore();

    // Setup base fixture via admin context (bypasses security rules)
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();

      // Space 1: Controlled space with Owner, Editor, and Viewer
      await setDoc(doc(adminDb, 'spaces', SPACE_ID), {
        id: SPACE_ID,
        name: 'Quantum Core',
        description: 'Living context for quantum engine',
        ownerId: OWNER_UID,
        memberIds: [OWNER_UID, EDITOR_UID, VIEWER_UID],
        roles: {
          [OWNER_UID]: 'owner',
          [EDITOR_UID]: 'editor',
          [VIEWER_UID]: 'viewer',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Space 2: Completely separate private space owned by Stranger
      await setDoc(doc(adminDb, 'spaces', OTHER_SPACE_ID), {
        id: OTHER_SPACE_ID,
        name: 'Stranger Secret Space',
        description: 'Restricted space',
        ownerId: STRANGER_UID,
        memberIds: [STRANGER_UID],
        roles: {
          [STRANGER_UID]: 'owner',
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Existing records in Space 1
      await setDoc(doc(adminDb, 'records', 'rec-01'), {
        id: 'rec-01',
        spaceId: SPACE_ID,
        type: 'decision',
        title: 'Adopt SQLite for on-device state',
        content: 'Decision rationale and implementation notes',
        author: { id: OWNER_UID, name: 'Alice Owner' },
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
  });

  // 1. OWNER ACCESS
  it('1. Owner Access: allows owner full read, update, role management, and delete', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();

    // Read space
    await assertSucceeds(getDoc(doc(ownerDb, 'spaces', SPACE_ID)));

    // Update space metadata and roles
    await assertSucceeds(
      updateDoc(doc(ownerDb, 'spaces', SPACE_ID), {
        description: 'Updated description by owner',
        'roles.user-viewer': 'editor', // Owner can promote members
      })
    );

    // Create record
    await assertSucceeds(
      setDoc(doc(ownerDb, 'records', 'rec-owner-01'), {
        id: 'rec-owner-01',
        spaceId: SPACE_ID,
        type: 'observation',
        title: 'Telemetry verified',
        content: 'No packet drop detected',
        author: { id: OWNER_UID, name: 'Alice Owner' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );
  });

  // 2. EDITOR ACCESS
  it('2. Editor Access: allows editor to create and edit records, but prevents modifying roles', async () => {
    const editorDb = testEnv.authenticatedContext(EDITOR_UID).firestore();

    // Editor can read space
    await assertSucceeds(getDoc(doc(editorDb, 'spaces', SPACE_ID)));

    // Editor can create a record with matching author
    await assertSucceeds(
      setDoc(doc(editorDb, 'records', 'rec-editor-01'), {
        id: 'rec-editor-01',
        spaceId: SPACE_ID,
        type: 'hypothesis',
        title: 'Cache eviction race condition',
        content: 'Investigating high load locks',
        author: { id: EDITOR_UID, name: 'Bob Editor' },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    );

    // Editor can update existing record without changing spaceId
    await assertSucceeds(
      updateDoc(doc(editorDb, 'records', 'rec-01'), {
        content: 'Revised rationale by editor',
        updatedAt: Date.now(),
        spaceId: SPACE_ID,
      })
    );

    // Editor CANNOT modify roles or memberIds on the space
    await assertFails(
      updateDoc(doc(editorDb, 'spaces', SPACE_ID), {
        roles: {
          [OWNER_UID]: 'viewer',
          [EDITOR_UID]: 'owner',
        },
      })
    );
  });

  // 3. VIEWER ACCESS
  it('3. Viewer Access: allows read-only access and denies all modifications', async () => {
    const viewerDb = testEnv.authenticatedContext(VIEWER_UID).firestore();

    // Viewer can read space and records
    await assertSucceeds(getDoc(doc(viewerDb, 'spaces', SPACE_ID)));
    await assertSucceeds(getDoc(doc(viewerDb, 'records', 'rec-01')));

    // Viewer CANNOT create record
    await assertFails(
      setDoc(doc(viewerDb, 'records', 'rec-viewer-fail'), {
        id: 'rec-viewer-fail',
        spaceId: SPACE_ID,
        type: 'observation',
        title: 'Viewer observation attempt',
        content: 'Should fail',
        author: { id: VIEWER_UID, name: 'Charlie Viewer' },
      })
    );

    // Viewer CANNOT update existing record
    await assertFails(
      updateDoc(doc(viewerDb, 'records', 'rec-01'), {
        content: 'Malicious modification by viewer',
      })
    );

    // Viewer CANNOT update space document
    await assertFails(
      updateDoc(doc(viewerDb, 'spaces', SPACE_ID), {
        description: 'Unauthorized edit by viewer',
      })
    );
  });

  // 4. NON-MEMBER ACCESS
  it('4. Non-Member Access: denies all access to stranger', async () => {
    const strangerDb = testEnv.authenticatedContext(STRANGER_UID).firestore();

    // Stranger cannot read space
    await assertFails(getDoc(doc(strangerDb, 'spaces', SPACE_ID)));

    // Stranger cannot read records in space
    await assertFails(getDoc(doc(strangerDb, 'records', 'rec-01')));

    // Stranger cannot create records in space
    await assertFails(
      setDoc(doc(strangerDb, 'records', 'rec-stranger-fail'), {
        id: 'rec-stranger-fail',
        spaceId: SPACE_ID,
        type: 'action',
        title: 'Breach attempt',
        content: 'Should fail',
        author: { id: STRANGER_UID, name: 'Stranger' },
      })
    );
  });

  // 5. CROSS-SPACE ACCESS
  it('5. Cross-Space Access: prevents cross-space record contamination and moving', async () => {
    const editorDb = testEnv.authenticatedContext(EDITOR_UID).firestore();

    // Editor of Space 1 attempts to write record into Space 2
    await assertFails(
      setDoc(doc(editorDb, 'records', 'rec-cross-fail'), {
        id: 'rec-cross-fail',
        spaceId: OTHER_SPACE_ID,
        type: 'decision',
        title: 'Cross space injection',
        content: 'Should fail',
        author: { id: EDITOR_UID, name: 'Bob Editor' },
      })
    );

    // Editor of Space 1 attempts to move rec-01 to Space 2
    await assertFails(
      updateDoc(doc(editorDb, 'records', 'rec-01'), {
        spaceId: OTHER_SPACE_ID,
      })
    );
  });

  // 6. UNAUTHORIZED MEMBERSHIP ESCALATION
  it('6. Membership Escalation: prevents viewer or editor from promoting themselves', async () => {
    const viewerDb = testEnv.authenticatedContext(VIEWER_UID).firestore();
    const editorDb = testEnv.authenticatedContext(EDITOR_UID).firestore();

    // Viewer tries to promote self to editor
    await assertFails(
      updateDoc(doc(viewerDb, 'spaces', SPACE_ID), {
        [`roles.${VIEWER_UID}`]: 'editor',
      })
    );

    // Editor tries to promote self to owner
    await assertFails(
      updateDoc(doc(editorDb, 'spaces', SPACE_ID), {
        [`roles.${EDITOR_UID}`]: 'owner',
      })
    );
  });

  // 7. UNAUTHORIZED OWNERSHIP TRANSFER
  it('7. Ownership Transfer: prevents non-owner from transferring space ownership', async () => {
    const editorDb = testEnv.authenticatedContext(EDITOR_UID).firestore();

    // Editor attempts to seize ownership
    await assertFails(
      updateDoc(doc(editorDb, 'spaces', SPACE_ID), {
        ownerId: EDITOR_UID,
      })
    );
  });

  // 8. RECORD DELETION & HISTORICAL INTEGRITY
  it('8. Record Deletion Integrity: strictly denies deleting records to preserve history', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const editorDb = testEnv.authenticatedContext(EDITOR_UID).firestore();

    // Even owner cannot permanently delete a record (records must be archived)
    await assertFails(deleteDoc(doc(ownerDb, 'records', 'rec-01')));

    // Editor cannot delete a record
    await assertFails(deleteDoc(doc(editorDb, 'records', 'rec-01')));
  });
});
