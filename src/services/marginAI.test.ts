import { describe, it, expect } from 'vitest';
import {
  extractRecordFromText,
  generateRelayBriefing,
  generateReEntryBriefing,
} from './marginAI';
import type { MarginRecord, RecordAuthor } from '../types/margin';

describe('Living Context & Hybrid AI Engine', () => {
  const author: RecordAuthor = { id: 'u1', name: 'Alex Rivera' };

  it('extracts structured decision from text with deterministic fallback reliability', async () => {
    const raw = 'We decided to switch from REST to gRPC for inter-service communication to reduce serialization overhead.';
    const result = await extractRecordFromText(raw);

    expect(result.type).toBe('decision');
    expect(result.title).toContain('switch');
    expect(result.content).toBe(raw);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.inferenceMode).toMatch(/on_device|in_cloud|deterministic_fallback/);
  });

  it('extracts structured observation from telemetry text', async () => {
    const raw = 'Noticed that memory usage spikes to 1.8GB during background batch exports.';
    const result = await extractRecordFromText(raw);

    expect(result.type).toBe('observation');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('generates a complete Relay briefing grounded in project records', async () => {
    const records: MarginRecord[] = [
      {
        id: 'r1',
        spaceId: 's1',
        type: 'decision',
        title: 'Deprecate legacy auth endpoint',
        content: 'Decided to sunset /auth/v1 by end of quarter.',
        status: 'active',
        author,
        createdAt: Date.now() - 5000,
        updatedAt: Date.now() - 5000,
        source: 'user',
        supportingRecordIds: [],
        tags: ['auth'],
        version: 1,
      },
      {
        id: 'r2',
        spaceId: 's1',
        type: 'action',
        title: 'Notify mobile team of v1 sunset',
        content: 'Send announcement email to mobile SDK leads.',
        status: 'active',
        author,
        createdAt: Date.now() - 1000,
        updatedAt: Date.now() - 1000,
        source: 'user',
        supportingRecordIds: ['r1'],
        tags: ['notification'],
        version: 1,
      },
    ];

    const relay = await generateRelayBriefing('API Modernization', records, author);

    expect(relay.objective).toBeDefined();
    expect(relay.currentState).toBeDefined();
    expect(relay.keyDecisions.length).toBe(1);
    expect(relay.keyDecisions[0].title).toBe('Deprecate legacy auth endpoint');
    expect(relay.outstandingActions.length).toBe(1);
    expect(relay.suggestedNextSteps.length).toBeGreaterThan(0);
  });

  it('generates a Re-entry briefing providing contextual return markers', async () => {
    const records: MarginRecord[] = [
      {
        id: 'r1',
        spaceId: 's1',
        type: 'observation',
        title: 'Cache hit ratio dropped to 42%',
        content: 'Memcached eviction rate increased dramatically after catalog refresh.',
        status: 'active',
        author,
        createdAt: Date.now() - 10000,
        updatedAt: Date.now() - 10000,
        source: 'user',
        supportingRecordIds: [],
        tags: ['cache'],
        version: 1,
      },
    ];

    const reEntry = await generateReEntryBriefing('s1', records);

    expect(reEntry.whereLeftOff).toContain('Cache hit ratio');
    expect(reEntry.whatChanged.length).toBeGreaterThan(0);
    expect(reEntry.recommendedNextAction).toBeDefined();
  });
});
