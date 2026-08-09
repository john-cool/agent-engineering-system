import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  ResourceBudget,
  ResourceDecision,
  ResourcePolicy,
  ResourcePolicyContext,
  ResourceUsageSnapshot
} from '../index.js';

test('resource contracts preserve unknown usage instead of coercing it to zero', () => {
  const usage: ResourceUsageSnapshot = {};
  assert.equal(usage.totalTokens, undefined);
  assert.equal(usage.estimatedCost, undefined);
});

test('custom resource policies can return a provider-neutral allow decision', async () => {
  const policy: ResourcePolicy = {
    evaluate(_context: ResourcePolicyContext): ResourceDecision {
      return { outcome: 'allow', reasons: [] };
    }
  };
  const budget: ResourceBudget = { maxTotalTokens: 1000 };
  const decision = await policy.evaluate({ scopeKey: 'task:1', budget, usage: {} });
  assert.equal(decision.outcome, 'allow');
});

import type { RuntimeDecisionTrace } from '../index.js';

test('runtime decision trace can carry a normalized resource decision', () => {
  const trace = {
    traceId: 'trace-resource-1',
    sessionId: 'session-1',
    timestamp: '2026-08-08T00:00:00.000Z',
    requirement: {
      class: 'balanced', reasoning: 'medium', latency: 'balanced', context: 'standard'
    },
    resolution: {
      requested: { class: 'balanced', reasoning: 'medium', latency: 'balanced', context: 'standard' },
      selected: {
        id: 'balanced', provider: 'test',
        capabilities: { coding: true, toolUse: true },
        traits: { qualityClass: 'balanced' }, availability: 'available'
      },
      reasons: ['selected'], alternatives: [], fallback: { used: false, type: 'none' }
    },
    telemetry: {
      provider: 'test', model: 'balanced', durationMs: 1, retries: 0, compactions: 0,
      outcome: 'success', verification: 'not_run'
    },
    providerRecoveries: 0,
    userInterruptions: 0,
    resource: { outcome: 'warn', reasons: ['80% task budget'] }
  } satisfies RuntimeDecisionTrace;
  assert.equal(trace.resource.outcome, 'warn');
});
