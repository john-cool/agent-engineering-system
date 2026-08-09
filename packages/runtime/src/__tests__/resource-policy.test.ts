import test from 'node:test';
import assert from 'node:assert/strict';
import type { ResourcePolicy } from '@aes/runtime-sdk';
import { BudgetResourcePolicy, ResourcePolicyEngine } from '../index.js';

const budgetPolicy = new BudgetResourcePolicy();

test('hard total-token budget denies a projected execution above the limit', async () => {
  const decision = await budgetPolicy.evaluate({
    scopeKey: 'task:1',
    budget: { maxTotalTokens: 1000 },
    usage: { totalTokens: 800 },
    projected: { totalTokens: 250 }
  });
  assert.equal(decision.outcome, 'deny');
  assert.ok(decision.reasons.some((reason) => reason.includes('total token budget')));
  assert.equal(decision.remaining?.totalTokens, 0);
});

test('budget warns at the default 80 percent threshold before hard exhaustion', async () => {
  const decision = await budgetPolicy.evaluate({
    scopeKey: 'task:2',
    budget: { maxTotalTokens: 1000 },
    usage: { totalTokens: 810 }
  });
  assert.equal(decision.outcome, 'warn');
  assert.equal(decision.remaining?.totalTokens, 190);
});

test('matching-currency estimated cost can enforce a hard budget', async () => {
  const decision = await budgetPolicy.evaluate({
    scopeKey: 'task:3',
    budget: { maxEstimatedCost: { amount: 2, currency: 'USD' } },
    usage: { estimatedCost: { amount: 1.7, currency: 'USD' } },
    projected: { estimatedCost: { amount: 0.4, currency: 'USD' } }
  });
  assert.equal(decision.outcome, 'deny');
  assert.equal(decision.remaining?.estimatedCost?.amount, 0);
});

test('unknown token and incomparable currency evidence stay non-enforcing', async () => {
  const decision = await budgetPolicy.evaluate({
    scopeKey: 'task:4',
    budget: {
      maxTotalTokens: 1000,
      maxEstimatedCost: { amount: 2, currency: 'USD' }
    },
    usage: { estimatedCost: { amount: 5, currency: 'EUR' } }
  });
  assert.equal(decision.outcome, 'allow');
  assert.equal(decision.remaining?.totalTokens, undefined);
  assert.equal(decision.remaining?.estimatedCost, undefined);
});

test('resource policy engine returns the strictest outcome', async () => {
  const warn: ResourcePolicy = { evaluate: () => ({ outcome: 'warn', reasons: ['near budget'] }) };
  const throttle: ResourcePolicy = {
    evaluate: () => ({ outcome: 'throttle', reasons: ['window exceeded'], retryAfterMs: 500 })
  };
  const deny: ResourcePolicy = { evaluate: () => ({ outcome: 'deny', reasons: ['hard cap'] }) };
  const engine = new ResourcePolicyEngine([warn, throttle, deny]);
  const decision = await engine.evaluate({ scopeKey: 'task:5', usage: {} });
  assert.equal(decision.outcome, 'deny');
  assert.deepEqual(decision.reasons, ['near budget', 'window exceeded', 'hard cap']);
});
