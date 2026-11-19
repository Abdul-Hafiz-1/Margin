import { openDB, type IDBPDatabase } from 'idb';
import type { LedgerEntry, PipelineStage, Verdict, ScamType } from '../types';

const DB_NAME = 'wary_privacy_ledger';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

let dbPromise: Promise<IDBPDatabase> | null = null;
const memoryFallback: LedgerEntry[] = [];

function getDB(): Promise<IDBPDatabase> | null {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export async function addLedgerEntry(data: {
  stage: PipelineStage;
  verdict: Verdict;
  scamType: ScamType;
  confidence: number;
  outboundBytes: number;
  redactedPayload: string | null;
  redactedCounts: {
    phones: number;
    accounts: number;
    cards: number;
    aadhaar: number;
    pan: number;
    upiIds: number;
    emails: number;
    names: number;
    urlQueries: number;
    total: number;
  };
}): Promise<LedgerEntry> {
  const entry: LedgerEntry = {
    id: `ledger_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: Date.now(),
    ...data,
  };

  try {
    const db = getDB();
    if (db) {
      const database = await db;
      await database.put(STORE_NAME, entry);
    } else {
      memoryFallback.unshift(entry);
    }
  } catch (err) {
    console.warn('Failed to write to IndexedDB, fallback to memory:', err);
    memoryFallback.unshift(entry);
  }

  return entry;
}

export async function getLedgerEntries(): Promise<LedgerEntry[]> {
  try {
    const db = getDB();
    if (db) {
      const database = await db;
      const entries = await database.getAllFromIndex(STORE_NAME, 'timestamp');
      // Sort newest first
      return entries.reverse();
    }
    return [...memoryFallback];
  } catch (err) {
    console.warn('Failed to read from IndexedDB, returning memory entries:', err);
    return [...memoryFallback];
  }
}

export async function deleteLedgerEntry(id: string): Promise<void> {
  try {
    const db = getDB();
    if (db) {
      const database = await db;
      await database.delete(STORE_NAME, id);
    }
    const idx = memoryFallback.findIndex((e) => e.id === id);
    if (idx !== -1) memoryFallback.splice(idx, 1);
  } catch (err) {
    console.error('Failed to delete ledger entry:', err);
  }
}

export async function clearLedgerEntries(): Promise<void> {
  try {
    const db = getDB();
    if (db) {
      const database = await db;
      await database.clear(STORE_NAME);
    }
    memoryFallback.length = 0;
  } catch (err) {
    console.error('Failed to clear ledger:', err);
  }
}

export async function exportLedgerJson(): Promise<string> {
  const entries = await getLedgerEntries();
  return JSON.stringify(entries, null, 2);
}

export async function exportLedgerCsv(): Promise<string> {
  const entries = await getLedgerEntries();
  const headers = [
    'Timestamp',
    'Date ISO',
    'Pipeline Stage',
    'Verdict',
    'Scam Type',
    'Confidence',
    'Outbound Bytes',
    'Redacted Tokens Total',
    'Phones',
    'Accounts',
    'Cards',
    'Aadhaar',
    'PAN',
    'UPI IDs',
    'Emails',
    'Names',
    'URL Queries',
    'Redacted Payload Outbound',
  ];

  const escapeCsv = (str: string | null | undefined) => {
    if (str == null) return '""';
    return `"${String(str).replace(/"/g, '""')}"`;
  };

  const rows = entries.map((e) => [
    e.timestamp,
    new Date(e.timestamp).toISOString(),
    e.stage,
    e.verdict,
    e.scamType,
    e.confidence.toFixed(2),
    e.outboundBytes,
    e.redactedCounts.total,
    e.redactedCounts.phones,
    e.redactedCounts.accounts,
    e.redactedCounts.cards,
    e.redactedCounts.aadhaar,
    e.redactedCounts.pan,
    e.redactedCounts.upiIds,
    e.redactedCounts.emails,
    e.redactedCounts.names,
    e.redactedCounts.urlQueries,
    escapeCsv(e.redactedPayload),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
