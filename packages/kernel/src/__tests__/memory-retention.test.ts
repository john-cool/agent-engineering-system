import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryRetentionPlanner } from '../memory-retention.js';
test('retention uses deterministic cutoffs and preserves referenced evidence', () => { const result = new MemoryRetentionPlanner().plan({ now: '2026-08-09T00:00:00Z', rawTracesDays: 90, failedTracesDays: 180, traces: [{ id: 'old-success', timestamp: '2026-01-01T00:00:00Z', failed: false, referencedByActiveKnowledge: false }, { id: 'old-failed', timestamp: '2025-01-01T00:00:00Z', failed: true, referencedByActiveKnowledge: false }, { id: 'referenced', timestamp: '2020-01-01T00:00:00Z', failed: true, referencedByActiveKnowledge: true }] }); assert.deepEqual(result.remove, ['old-failed', 'old-success']); assert.deepEqual(result.keep, ['referenced']); });
