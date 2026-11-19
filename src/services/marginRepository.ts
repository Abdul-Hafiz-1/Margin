/**
 * MARGIN — Repository Abstraction & IndexedDB Local-First Engine
 * Fully offline-capable repository managing Spaces, Records, Relationships,
 * Activity, Relay briefings, Re-entry checkpoints, and Firestore sync.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type {
  MarginRecord,
  RecordRelationship,
  Space,
  RelayBriefing,
  ReEntryBriefing,
  ActivityItem,
  AIOperationLog,
  RecordAuthor,
} from '../types/margin';
import { db as firestoreDb, isFirebaseConfigured } from './firebaseConfig';
import {
  doc,
  setDoc,
} from 'firebase/firestore';

const DB_NAME = 'margin_continuity_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;
const memoryStore = new Map<string, Map<string, any>>();

function getMemoryStore(storeName: string) {
  if (!memoryStore.has(storeName)) {
    memoryStore.set(storeName, new Map());
  }
  return memoryStore.get(storeName)!;
}

export function getLocalDB(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined') {
    // In-memory mock for Node / Vitest testing environment
    const mockDB: any = {
      async getAll(store: string) {
        return Array.from(getMemoryStore(store).values());
      },
      async get(store: string, id: string) {
        return getMemoryStore(store).get(id);
      },
      async put(store: string, val: any) {
        getMemoryStore(store).set(val.id || val.spaceId, val);
        return val.id || val.spaceId;
      },
      async delete(store: string, id: string) {
        getMemoryStore(store).delete(id);
      },
      async getAllFromIndex(store: string, indexName: string, queryVal: any) {
        const all = Array.from(getMemoryStore(store).values());
        if (indexName === 'by_space') return all.filter((x: any) => x.spaceId === queryVal);
        return all;
      },
    };
    return Promise.resolve(mockDB);
  }

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('spaces')) {
          const spaceStore = db.createObjectStore('spaces', { keyPath: 'id' });
          spaceStore.createIndex('by_owner', 'ownerId');
          spaceStore.createIndex('by_updated', 'updatedAt');
        }
        if (!db.objectStoreNames.contains('records')) {
          const recordStore = db.createObjectStore('records', { keyPath: 'id' });
          recordStore.createIndex('by_space', 'spaceId');
          recordStore.createIndex('by_type', 'type');
          recordStore.createIndex('by_status', 'status');
          recordStore.createIndex('by_created', 'createdAt');
        }
        if (!db.objectStoreNames.contains('relationships')) {
          const relStore = db.createObjectStore('relationships', { keyPath: 'id' });
          relStore.createIndex('by_space', 'spaceId');
          relStore.createIndex('by_source', 'sourceRecordId');
          relStore.createIndex('by_target', 'targetRecordId');
        }
        if (!db.objectStoreNames.contains('activity')) {
          const actStore = db.createObjectStore('activity', { keyPath: 'id' });
          actStore.createIndex('by_space', 'spaceId');
          actStore.createIndex('by_time', 'timestamp');
        }
        if (!db.objectStoreNames.contains('relays')) {
          const relayStore = db.createObjectStore('relays', { keyPath: 'id' });
          relayStore.createIndex('by_space', 'spaceId');
        }
        if (!db.objectStoreNames.contains('reEntries')) {
          db.createObjectStore('reEntries', { keyPath: 'spaceId' });
        }
        if (!db.objectStoreNames.contains('aiLogs')) {
          const aiStore = db.createObjectStore('aiLogs', { keyPath: 'id' });
          aiStore.createIndex('by_time', 'timestamp');
        }
        if (!db.objectStoreNames.contains('pendingSync')) {
          db.createObjectStore('pendingSync', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ============================================================================
// SPACES
// ============================================================================

export async function getSpaces(): Promise<Space[]> {
  const db = await getLocalDB();
  const spaces = await db.getAll('spaces');
  return spaces.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getSpaceById(spaceId: string): Promise<Space | undefined> {
  const db = await getLocalDB();
  return db.get('spaces', spaceId);
}

export async function saveSpace(space: Space): Promise<void> {
  const db = await getLocalDB();
  space.updatedAt = Date.now();
  
  // Guarantee memberIds and roles for Firestore security rules
  space.memberIds = Array.from(new Set([space.ownerId, ...(space.members?.map((m) => m.userId) || [])]));
  space.roles = space.roles || {};
  space.roles[space.ownerId] = 'owner';
  space.members?.forEach((m) => {
    if (space.roles) space.roles[m.userId] = m.role;
  });

  await db.put('spaces', space);

  // Firestore background sync
  if (isFirebaseConfigured && navigator.onLine) {
    try {
      await setDoc(doc(firestoreDb, 'spaces', space.id), space, { merge: true });
    } catch (err) {
      console.warn('[MARGIN Repository] Firestore space sync deferred:', err);
      await queuePendingSync('space', space.id, space);
    }
  } else {
    await queuePendingSync('space', space.id, space);
  }
}

export async function renameSpace(spaceId: string, newName: string, newDescription?: string): Promise<void> {
  const space = await getSpaceById(spaceId);
  if (!space) return;
  space.name = newName.trim();
  if (newDescription !== undefined) space.description = newDescription.trim();
  await saveSpace(space);
}

export async function archiveSpace(spaceId: string): Promise<void> {
  const space = await getSpaceById(spaceId);
  if (!space) return;
  space.isArchived = true;
  await saveSpace(space);
}

// ============================================================================
// RECORDS (Living Context Engine)
// ============================================================================

export async function getRecords(spaceId?: string): Promise<MarginRecord[]> {
  const db = await getLocalDB();
  let records: MarginRecord[] = [];
  if (spaceId) {
    records = await db.getAllFromIndex('records', 'by_space', spaceId);
  } else {
    records = await db.getAll('records');
  }
  return records.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getRecordById(id: string): Promise<MarginRecord | undefined> {
  const db = await getLocalDB();
  return db.get('records', id);
}

export async function saveRecord(record: MarginRecord, changeReason?: string): Promise<void> {
  const db = await getLocalDB();
  const existing = await db.get('records', record.id);

  if (existing) {
    // Preserve history versioning
    const historyItem = {
      version: existing.version || 1,
      title: existing.title,
      content: existing.content,
      updatedAt: existing.updatedAt,
      updatedBy: existing.author,
      changeSummary: changeReason || 'Record revised',
    };
    record.version = (existing.version || 1) + 1;
    record.history = [...(existing.history || []), historyItem];
  } else {
    record.version = 1;
    record.history = [];
  }

  record.updatedAt = Date.now();
  record.syncStatus = navigator.onLine && isFirebaseConfigured ? 'synced' : 'local';
  await db.put('records', record);

  // Record Activity
  await logActivity({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    spaceId: record.spaceId,
    recordId: record.id,
    type: existing ? 'record_updated' : 'record_created',
    recordType: record.type,
    title: existing ? `Updated ${record.type}: ${record.title}` : `Created ${record.type}: ${record.title}`,
    detail: record.content.substring(0, 120),
    actor: record.author,
    timestamp: Date.now(),
  });

  // Background Firestore sync
  if (isFirebaseConfigured && navigator.onLine) {
    try {
      await setDoc(doc(firestoreDb, 'records', record.id), record, { merge: true });
    } catch (e) {
      console.warn('[MARGIN Repository] Firestore record sync queued:', e);
      record.syncStatus = 'local';
      await db.put('records', record);
      await queuePendingSync('record', record.id, record);
    }
  } else {
    await queuePendingSync('record', record.id, record);
  }
}

export async function deleteRecord(id: string, spaceId: string, author: RecordAuthor): Promise<void> {
  const db = await getLocalDB();
  const existing = await db.get('records', id);
  if (!existing) return;

  // Mark status as archived instead of silently destroying history
  existing.status = 'archived';
  existing.updatedAt = Date.now();
  await db.put('records', existing);

  await logActivity({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    spaceId,
    recordId: id,
    type: 'record_resolved',
    recordType: existing.type,
    title: `Archived ${existing.type}: ${existing.title}`,
    detail: 'Marked as archived to preserve historical context.',
    actor: author,
    timestamp: Date.now(),
  });
}

// ============================================================================
// RELATIONSHIPS
// ============================================================================

export async function getRelationships(spaceId?: string): Promise<RecordRelationship[]> {
  const db = await getLocalDB();
  if (spaceId) {
    return db.getAllFromIndex('relationships', 'by_space', spaceId);
  }
  return db.getAll('relationships');
}

export async function saveRelationship(rel: RecordRelationship, author: RecordAuthor): Promise<void> {
  const db = await getLocalDB();
  await db.put('relationships', rel);

  await logActivity({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    spaceId: rel.spaceId,
    type: 'relationship_created',
    title: `Linked context: ${rel.type.replace('_', ' ')}`,
    detail: rel.explanation || `Connected record ${rel.sourceRecordId.substring(0, 8)} to ${rel.targetRecordId.substring(0, 8)}`,
    actor: author,
    timestamp: Date.now(),
  });

  if (isFirebaseConfigured && navigator.onLine) {
    try {
      await setDoc(doc(firestoreDb, 'relationships', rel.id), rel, { merge: true });
    } catch {
      await queuePendingSync('relationship', rel.id, rel);
    }
  }
}

// ============================================================================
// ACTIVITY & AUDIT LOG
// ============================================================================

export async function getActivity(spaceId?: string): Promise<ActivityItem[]> {
  const db = await getLocalDB();
  let acts: ActivityItem[] = [];
  if (spaceId) {
    acts = await db.getAllFromIndex('activity', 'by_space', spaceId);
  } else {
    acts = await db.getAll('activity');
  }
  return acts.sort((a, b) => b.timestamp - a.timestamp);
}

export async function logActivity(item: ActivityItem): Promise<void> {
  const db = await getLocalDB();
  await db.put('activity', item);
}

// ============================================================================
// RELAY BRIEFINGS & RE-ENTRY CHECKPOINTS
// ============================================================================

export async function saveRelayBriefing(relay: RelayBriefing): Promise<void> {
  const db = await getLocalDB();
  await db.put('relays', relay);

  await logActivity({
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    spaceId: relay.spaceId,
    type: 'relay_generated',
    title: `Relay briefing generated: "${relay.objective.substring(0, 50)}..."`,
    detail: `Preserved state with ${relay.keyDecisions.length} decisions and ${relay.outstandingActions.length} actions.`,
    actor: relay.createdBy,
    timestamp: Date.now(),
  });

  if (isFirebaseConfigured && navigator.onLine) {
    try {
      await setDoc(doc(firestoreDb, 'relays', relay.id), relay, { merge: true });
    } catch {
      await queuePendingSync('relay', relay.id, relay);
    }
  }
}

export async function getRelayBriefings(spaceId: string): Promise<RelayBriefing[]> {
  const db = await getLocalDB();
  const relays = await db.getAllFromIndex('relays', 'by_space', spaceId);
  return relays.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveReEntry(briefing: ReEntryBriefing): Promise<void> {
  const db = await getLocalDB();
  await db.put('reEntries', briefing);
}

export async function getReEntry(spaceId: string): Promise<ReEntryBriefing | undefined> {
  const db = await getLocalDB();
  return db.get('reEntries', spaceId);
}

// ============================================================================
// AI AUDIT LOGS
// ============================================================================

export async function logAIOperation(log: AIOperationLog): Promise<void> {
  const db = await getLocalDB();
  await db.put('aiLogs', log);
}

export async function getAILogs(): Promise<AIOperationLog[]> {
  const db = await getLocalDB();
  const logs = await db.getAll('aiLogs');
  return logs.sort((a, b) => b.timestamp - a.timestamp);
}

// ============================================================================
// OFFLINE QUEUE & SYNC ENGINE
// ============================================================================

async function queuePendingSync(type: string, id: string, payload: any): Promise<void> {
  const db = await getLocalDB();
  await db.put('pendingSync', {
    id: `${type}_${id}`,
    type,
    targetId: id,
    payload,
    timestamp: Date.now(),
  });
}

export async function processPendingSyncQueue(): Promise<{ syncedCount: number; errors: number }> {
  if (!navigator.onLine || !isFirebaseConfigured) {
    return { syncedCount: 0, errors: 0 };
  }

  const db = await getLocalDB();
  const pending = await db.getAll('pendingSync');
  let syncedCount = 0;
  let errors = 0;

  for (const item of pending) {
    try {
      const collectionName = item.type === 'space' ? 'spaces' : item.type === 'record' ? 'records' : 'relationships';
      await setDoc(doc(firestoreDb, collectionName, item.targetId), item.payload, { merge: true });
      await db.delete('pendingSync', item.id);
      syncedCount++;
    } catch {
      errors++;
    }
  }

  return { syncedCount, errors };
}

// ============================================================================
// SEED DATA GENERATOR (For instant exploration & testing)
// ============================================================================

export async function seedInitialMarginProject(): Promise<void> {
  const db = await getLocalDB();
  const existingSpaces = await db.getAll('spaces');
  if (existingSpaces.length > 0) return; // Don't overwrite if data exists

  const user: RecordAuthor = {
    id: 'user-lead',
    name: 'Sarah Chen',
    email: 'sarah.chen@margin.app',
  };

  const defaultSpace: Space = {
    id: 'space-apollo',
    name: 'Project Apollo — Core Latency & Cache Architecture',
    description: 'Diagnosing p99 latency spikes and designing multi-region read replicas with durable caching.',
    ownerId: user.id,
    type: 'personal',
    color: '#657C69',
    members: [
      {
        userId: user.id,
        name: user.name,
        email: user.email!,
        role: 'owner',
        joinedAt: Date.now() - 86400000 * 7,
      },
    ],
    memberIds: [user.id],
    roles: { [user.id]: 'owner' },
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 1000 * 60 * 30,
    stats: {
      recordCount: 5,
      unresolvedCount: 2,
      lastActivityAt: Date.now() - 1000 * 60 * 30,
    },
  };

  await db.put('spaces', defaultSpace);

  const r1: MarginRecord = {
    id: 'rec-01',
    spaceId: defaultSpace.id,
    type: 'observation',
    title: 'p99 query latency surged from 35ms to 420ms after index v3 rollout',
    content: 'Telemetry in Datadog showed severe thread pool exhaustion on primary PostgreSQL node starting at 14:22 UTC. CPU pegged at 92%.',
    status: 'active',
    author: user,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    source: 'user',
    supportingRecordIds: [],
    tags: ['database', 'latency', 'postgres'],
    version: 1,
    syncStatus: 'synced',
  };

  const r2: MarginRecord = {
    id: 'rec-02',
    spaceId: defaultSpace.id,
    type: 'decision',
    title: 'Roll back index v3 and revert to composite B-Tree schema',
    content: 'We explicitly decided to cancel the index migration immediately to restore SLA headroom rather than attempting inline re-indexing under production load.',
    status: 'active',
    author: user,
    createdAt: Date.now() - 86400000 * 2 + 1800000,
    updatedAt: Date.now() - 86400000 * 2 + 1800000,
    source: 'user',
    supportingRecordIds: ['rec-01'],
    tags: ['migration', 'decision', 'rollback'],
    version: 1,
    syncStatus: 'synced',
  };

  const r3: MarginRecord = {
    id: 'rec-03',
    spaceId: defaultSpace.id,
    type: 'event',
    title: 'Database failover triggered during maintenance window',
    content: 'Automated health probe triggered read replica promotion at 03:00 UTC. Secondary node took over within 4.2 seconds with zero data loss.',
    status: 'resolved',
    author: user,
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now() - 86400000 * 1,
    source: 'system',
    supportingRecordIds: [],
    tags: ['failover', 'infra'],
    version: 1,
    syncStatus: 'synced',
  };

  const r4: MarginRecord = {
    id: 'rec-04',
    spaceId: defaultSpace.id,
    type: 'hypothesis',
    title: 'Hash partition bloom filters are failing due to skewed tenant distribution',
    content: 'The 3 largest enterprise tenants generate 64% of all join operations. We suspect the hash partition strategy causes hotspotting on shard 04.',
    status: 'active',
    author: user,
    createdAt: Date.now() - 1000 * 3600 * 14,
    updatedAt: Date.now() - 1000 * 3600 * 14,
    source: 'ai_suggested',
    supportingRecordIds: ['rec-01'],
    tags: ['hypothesis', 'sharding', 'unresolved'],
    version: 1,
    aiMetadata: {
      confidence: 0.88,
      inferenceMode: 'in_cloud',
      model: 'gemini-2.5-flash',
      extractedAt: Date.now() - 1000 * 3600 * 14,
    },
    syncStatus: 'synced',
  };

  const r5: MarginRecord = {
    id: 'rec-05',
    spaceId: defaultSpace.id,
    type: 'action',
    title: 'Run query EXPLAIN ANALYZE on shard 04 with tenant isolation',
    content: 'Generate isolated query execution plans for top 3 tenants and benchmark against Redis read-through caching.',
    status: 'active',
    author: user,
    createdAt: Date.now() - 1000 * 3600 * 4,
    updatedAt: Date.now() - 1000 * 3600 * 4,
    source: 'user',
    supportingRecordIds: ['rec-04'],
    tags: ['action', 'benchmark'],
    version: 1,
    syncStatus: 'synced',
  };

  await db.put('records', r1);
  await db.put('records', r2);
  await db.put('records', r3);
  await db.put('records', r4);
  await db.put('records', r5);

  // Relationships
  const rel1: RecordRelationship = {
    id: 'rel-01',
    spaceId: defaultSpace.id,
    sourceRecordId: 'rec-02',
    targetRecordId: 'rec-01',
    type: 'caused_by',
    provenance: 'user',
    explanation: 'Rollback was directly prompted by the 420ms latency telemetry.',
    createdAt: Date.now() - 86400000 * 2 + 1900000,
  };

  const rel2: RecordRelationship = {
    id: 'rel-02',
    spaceId: defaultSpace.id,
    sourceRecordId: 'rec-04',
    targetRecordId: 'rec-01',
    type: 'supports',
    provenance: 'ai_detected',
    explanation: 'Shard 04 hotspotting explains the specific p99 read delay.',
    createdAt: Date.now() - 1000 * 3600 * 13,
  };

  const rel3: RecordRelationship = {
    id: 'rel-03',
    spaceId: defaultSpace.id,
    sourceRecordId: 'rec-05',
    targetRecordId: 'rec-04',
    type: 'depends_on',
    provenance: 'user',
    explanation: 'Action tests the validity of the sharding hypothesis.',
    createdAt: Date.now() - 1000 * 3600 * 3,
  };

  await db.put('relationships', rel1);
  await db.put('relationships', rel2);
  await db.put('relationships', rel3);

  // Activity logs
  await db.put('activity', {
    id: 'act-01',
    spaceId: defaultSpace.id,
    recordId: 'rec-01',
    type: 'record_created',
    recordType: 'observation',
    title: 'Observation recorded: p99 query latency surged',
    detail: 'Latency telemetry in Datadog showed severe thread pool exhaustion.',
    actor: user,
    timestamp: Date.now() - 86400000 * 2,
  });

  await db.put('activity', {
    id: 'act-02',
    spaceId: defaultSpace.id,
    recordId: 'rec-02',
    type: 'record_created',
    recordType: 'decision',
    title: 'Decision recorded: Roll back index v3',
    detail: 'Explicitly decided to cancel index migration to restore SLA headroom.',
    actor: user,
    timestamp: Date.now() - 86400000 * 2 + 1800000,
  });

  await db.put('activity', {
    id: 'act-03',
    spaceId: defaultSpace.id,
    recordId: 'rec-04',
    type: 'record_created',
    recordType: 'hypothesis',
    title: 'Hypothesis created: Tenant skew on shard 04',
    detail: 'Top 3 tenants represent 64% of all join operations.',
    actor: user,
    timestamp: Date.now() - 1000 * 3600 * 14,
  });
}
