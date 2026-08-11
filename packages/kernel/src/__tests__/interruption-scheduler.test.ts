import test from 'node:test';
import assert from 'node:assert/strict';
import { InterruptionScheduler } from '../interruption-scheduler.js';
test('scheduler partitions urgency without reordering items', () => { const result = new InterruptionScheduler().schedule([{ id: 'i', summary: 'ambiguous side effect', urgency: 'immediate' }, { id: 'b', summary: 'authority proposal', urgency: 'boundary' }, { id: 'd', summary: 'overlay degraded', urgency: 'digest' }]); assert.deepEqual(result.immediate.map((item) => item.id), ['i']); assert.deepEqual(result.boundary.map((item) => item.id), ['b']); assert.deepEqual(result.digest.map((item) => item.id), ['d']); });
