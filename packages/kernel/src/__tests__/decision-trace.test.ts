import test from 'node:test';
import assert from 'node:assert/strict';
import { DecisionTraceBuilder } from '../decision-trace.js';

test('decision trace captures routing context and verified outcome without hidden reflection', () => {
  const builder = new DecisionTraceBuilder();
  const trace = builder.build({
    taskClass: 'architecture-change',
    analysis: {
      stage: 'planning', planStatus: 'none', ambiguity: 'high', risk: 'medium', taskComplexity: 'complex',
      confidence: 'high', failedAttempts: 0, architecturalDecisionRequired: true, evidenceSufficient: true,
      reasons: ['architecture decision required']
    },
    modelDecisions: [{
      modelClass: 'powerful', confidence: 'high', reasons: ['architecture planning'], previousClass: 'balanced',
      transition: 'upgrade', latencyMode: 'standard'
    }],
    contextDecisions: [],
    controlOutcomes: [],
    retries: 0,
    verificationOutcome: 'passed',
    userOverrides: [],
    timestamp: '2026-08-08T00:00:00Z'
  });
  assert.equal(trace.taskClass, 'architecture-change');
  assert.equal(trace.verificationOutcome, 'passed');
  assert.deepEqual(trace.modelDecisions[0]?.reasons, ['architecture planning']);
});
