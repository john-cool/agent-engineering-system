import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRuntimeConfig, toControlledEvalResourceBudget } from '../runtime-config.js';

test('runtime config defaults raw provider event capture off and quality degradation to assisted', () => {
  const config = normalizeRuntimeConfig({ runtime: { provider: 'codex' } });
  assert.equal(config.runtime.provider, 'codex');
  assert.equal(config.telemetry.providerRawEvents, false);
  assert.equal(config.modelResolution.qualityDegradation, 'assisted');
  assert.equal(config.codex.processScope, 'workspace');
});

test('runtime config exposes exact learning and knowledge defaults', () => {
  const config = normalizeRuntimeConfig({ runtime: { provider: 'codex' } });
  assert.deepEqual(config.learning.analysis, { maxCandidatesPerTask: 3, maxAnalysisTokensPerTask: 3000, maxIncrementalWorkMs: 500 });
  assert.deepEqual(config.learning.evaluation, { minSamples: 20, regressionWindow: 20 });
  assert.deepEqual(config.learning.controlledEvals, { enabled: true, sandboxOnly: true, maxRunsPerCandidate: 5, maxTokensPerDay: 100000, maxCostPerDay: 0.5 });
  assert.deepEqual(config.knowledge.retrieval, { maxRecords: 8, maxEstimatedTokens: 2500 });
  assert.equal(config.control.actions.controlledEvaluation, 'autonomous'); assert.equal(config.control.actions.controlledEvaluationBudgetOverride, 'assisted');
  assert.equal(toControlledEvalResourceBudget(config.learning.controlledEvals).allowed, false);
  assert.deepEqual(toControlledEvalResourceBudget(config.learning.controlledEvals, 'USD'), { allowed: true, budget: { maxTotalTokens: 100000, maxEstimatedCost: { amount: 0.5, currency: 'USD' }, warningThreshold: 0.8 } });
});
