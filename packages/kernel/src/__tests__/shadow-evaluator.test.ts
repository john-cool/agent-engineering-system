import test from 'node:test';
import assert from 'node:assert/strict';
import { ShadowEvaluator } from '../shadow-evaluator.js';

test('shadow evaluation records a hypothetical decision without substituting baseline', () => {
  const baseline = { modelClass: 'balanced' } as const;
  const trace = new ShadowEvaluator().record<{ modelClass: 'balanced' | 'cheap' }>({
    candidateId: 'candidate:model:cheap',
    baselineDecision: baseline,
    shadowDecision: { modelClass: 'cheap' } as const,
    comparable: false,
    timestamp: '2026-08-09T00:00:00Z'
  });
  assert.deepEqual(baseline, { modelClass: 'balanced' });
  assert.equal(trace.shadowDecision.modelClass, 'cheap');
  assert.equal(trace.comparable, false);
});
