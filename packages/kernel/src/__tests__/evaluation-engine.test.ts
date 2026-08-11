import test from 'node:test';
import assert from 'node:assert/strict';
import type { LearningCandidate } from '@aes/spec';
import { LearningEvaluationEngine } from '../evaluation-engine.js';

const engine = new LearningEvaluationEngine({
  minSamples: 20,
  minComparableSamplesPerAlternative: 5,
  qualityNonInferiorityMargin: 0.01,
  minRelativeImprovement: 0.05,
  regressionWindow: 20
});

const candidate: LearningCandidate = {
  id: 'candidate:model:1', kind: 'model_preference', scope: 'project',
  applicability: { stage: 'execution' },
  effect: { kind: 'model_preference', prefer: 'balanced' },
  source: 'experience_miner', evidenceRefs: ['e1'], evidenceStrength: 'comparative',
  status: 'shadow', createdAt: '2026-08-09T00:00:00Z', updatedAt: '2026-08-09T00:00:00Z', evaluationRefs: []
};

test('comparative evidence with preserved quality and lower retry cost validates', () => {
  const result = engine.evaluate({
    candidate,
    candidateMetrics: { sampleCount: 20, verifiedSuccessRate: .96, retryRate: .10, interruptionRate: .10, coverage: { totalTokens: 0, estimatedCost: 0, durationMs: 0 } },
    baselineMetrics: { sampleCount: 20, verifiedSuccessRate: .96, retryRate: .20, interruptionRate: .10, coverage: { totalTokens: 0, estimatedCost: 0, durationMs: 0 } },
    stableWindows: 2,
    evaluatedAt: '2026-08-09T00:00:00Z'
  });
  assert.equal(result.outcome, 'validate');
  assert.equal(result.quality.passed, true);
  assert.equal(result.efficiency.passed, true);
});

test('observational model candidate cannot validate a counterfactual even when aggregate metrics are present', () => {
  const result = engine.evaluate({
    candidate: { ...candidate, evidenceStrength: 'observational' },
    candidateMetrics: { sampleCount: 20, verifiedSuccessRate: .98, retryRate: .05, interruptionRate: .05, coverage: { totalTokens: 0, estimatedCost: 0, durationMs: 0 } },
    baselineMetrics: { sampleCount: 20, verifiedSuccessRate: .96, retryRate: .20, interruptionRate: .20, coverage: { totalTokens: 0, estimatedCost: 0, durationMs: 0 } },
    stableWindows: 2,
    evaluatedAt: '2026-08-09T00:00:00Z'
  });
  assert.equal(result.outcome, 'keep_candidate');
  assert.equal(result.evidenceVolume.passed, false);
});

test('large savings cannot validate unacceptable quality regression', () => {
  const result = engine.evaluate({
    candidate,
    candidateMetrics: { sampleCount: 20, verifiedSuccessRate: .82, retryRate: .01, interruptionRate: .01, averageTotalTokens: 100, coverage: { totalTokens: 1, estimatedCost: 0, durationMs: 0 } },
    baselineMetrics: { sampleCount: 20, verifiedSuccessRate: .96, retryRate: .20, interruptionRate: .20, averageTotalTokens: 1000, coverage: { totalTokens: 1, estimatedCost: 0, durationMs: 0 } },
    stableWindows: 2,
    evaluatedAt: '2026-08-09T00:00:00Z'
  });
  assert.equal(result.outcome, 'reject');
  assert.equal(result.quality.passed, false);
});
