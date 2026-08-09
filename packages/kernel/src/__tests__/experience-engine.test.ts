import test from 'node:test';
import assert from 'node:assert/strict';
import type { DecisionTrace } from '@aes/spec';
import { ExperienceEngine } from '../experience-engine.js';

const trace = (outcome: 'passed' | 'failed', retries = 0): DecisionTrace => ({
  taskClass: 'approved-plan-refactor',
  analysis: {} as never,
  modelDecisions: [],
  contextDecisions: [],
  controlOutcomes: [],
  retries,
  verificationOutcome: outcome,
  userOverrides: [],
  timestamp: '2026-08-08T00:00:00Z'
});

test('experience hypothesis aggregates verified outcomes and preserves evidence refs', () => {
  const engine = new ExperienceEngine();
  const hypothesis = engine.aggregate([
    { id: 'trace-1', trace: trace('passed') },
    { id: 'trace-2', trace: trace('passed', 1) },
    { id: 'trace-3', trace: trace('failed', 1) }
  ], 'prefer balanced+fast');
  assert.equal(hypothesis.sampleCount, 3);
  assert.equal(hypothesis.successCount, 2);
  assert.equal(hypothesis.retryCount, 2);
  assert.deepEqual(hypothesis.evidenceRefs, ['trace-1', 'trace-2', 'trace-3']);
});
