import test from 'node:test';
import assert from 'node:assert/strict';
import { EvaluationGate } from '../evaluation-gate.js';

const gate = new EvaluationGate({
  minSamples: 10,
  minSuccessRate: 0.9,
  maxRetryRate: 0.2,
  maxOverrideRate: 0.1,
  maxQualityRegressionRate: 0.05
});

test('strong evidence promotes hypothesis', () => {
  const result = gate.evaluate(
    { id: 'h1', taskClass: 'refactor', recommendation: 'balanced+fast', sampleCount: 12, successCount: 12, retryCount: 1, overrideCount: 0, evidenceRefs: ['t'] },
    { hypothesisId: 'h1', sampleCount: 12, successRate: 1, retryRate: 1 / 12, overrideRate: 0, qualityRegressionRate: 0 }
  );
  assert.equal(result.outcome, 'promote');
});

test('insufficient samples stay candidate', () => {
  const result = gate.evaluate(
    { id: 'h2', taskClass: 'refactor', recommendation: 'balanced+fast', sampleCount: 3, successCount: 3, retryCount: 0, overrideCount: 0, evidenceRefs: ['t'] },
    { hypothesisId: 'h2', sampleCount: 3, successRate: 1, retryRate: 0, overrideRate: 0, qualityRegressionRate: 0 }
  );
  assert.equal(result.outcome, 'keep_candidate');
});

test('authority is proposed, never silently promoted', () => {
  assert.equal(gate.shouldProposeAuthorityPromotion({ approvals: 12, rejections: 0, verifiedSuccesses: 12 }), true);
});
