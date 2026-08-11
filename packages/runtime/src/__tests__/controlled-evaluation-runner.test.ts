import test from 'node:test';
import assert from 'node:assert/strict';
import { ControlledEvaluationRunner, InMemoryControlledEvaluationUsageStore } from '../controlled-evaluation-runner.js';
import { ResourcePolicyEngine } from '../resource-policy.js';
import type { ControlledEvaluationFixture, ControlledEvaluationResult, RuntimeControlBridge } from '@aes/runtime-sdk';

const fixture: ControlledEvaluationFixture = { id: 'f1', candidateId: 'c1', signature: { taskClass: 'implementation' }, sandboxPath: 'sandbox', sideEffectRisk: 'none' };
const control: RuntimeControlBridge = { authorize: async () => ({ outcome: 'execute', reason: 'test' }) };
const evidence = (id: string, totalTokens?: number): ControlledEvaluationResult => ({ candidateId: 'c1', fixtureId: 'f1', evidence: { id, traceId: id, signature: { taskClass: 'implementation' }, verification: 'passed', attributable: true, origin: 'controlled', retries: 0, userInterruptions: 0, providerRecoveries: 0, ...(totalTokens === undefined ? {} : { totalTokens }), timestamp: '2026-08-09T00:00:00Z' } });

test('controlled evaluation blocks unsafe fixtures before executor calls', async () => {
  let calls = 0;
  const runner = new ControlledEvaluationRunner({ executor: { evaluate: async () => { calls += 1; return evidence('e1', 10); } }, resources: new ResourcePolicyEngine([]), control, usage: new InMemoryControlledEvaluationUsageStore(), budget: {}, sandboxOnly: true, maxRunsPerCandidate: 5 });
  assert.equal((await runner.run({ candidateId: 'c1', fixture: { ...fixture, sideEffectRisk: 'material' }, dayScopeKey: 'day', projected: {} })).outcome, 'blocked');
  assert.equal((await runner.run({ candidateId: 'c1', fixture: { ...fixture, sandboxPath: '' }, dayScopeKey: 'day', projected: {} })).outcome, 'blocked');
  assert.equal(calls, 0);
});

test('controlled evaluation preserves unknown usage and enforces max candidate runs', async () => {
  let calls = 0;
  const usage = new InMemoryControlledEvaluationUsageStore();
  const runner = new ControlledEvaluationRunner({ executor: { evaluate: async () => { calls += 1; return evidence(`e${calls}`); } }, resources: new ResourcePolicyEngine([]), control, usage, budget: { maxTotalTokens: 100 }, sandboxOnly: true, maxRunsPerCandidate: 1 });
  assert.equal((await runner.run({ candidateId: 'c1', fixture, dayScopeKey: 'day', projected: { totalTokens: 10 } })).outcome, 'completed');
  assert.equal((await runner.run({ candidateId: 'c1', fixture, dayScopeKey: 'day', projected: { totalTokens: 10 } })).outcome, 'max_runs_reached');
  assert.equal(calls, 1);
  const secondCandidate = await runner.run({ candidateId: 'c2', fixture: { ...fixture, candidateId: 'c2' }, dayScopeKey: 'day', projected: { totalTokens: 10 } });
  assert.equal(secondCandidate.outcome, 'blocked');
  assert.equal('reason' in secondCandidate && secondCandidate.reason, 'usage_unknown_for_configured_budget');
});
