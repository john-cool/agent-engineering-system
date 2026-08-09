import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryUsageWindowStore, SlidingWindowResourcePolicy } from '../index.js';

test('usage window expires entries outside the configured window', async () => {
  const store = new InMemoryUsageWindowStore(1000);
  await store.record('session:1', 400, 1000);
  await store.record('session:1', 300, 1500);

  assert.equal((await store.snapshot('session:1', 1999)).usedTokens, 700);
  assert.equal((await store.snapshot('session:1', 2001)).usedTokens, 300);
});

test('sliding window throttles projected usage above the limit with retry guidance', async () => {
  const store = new InMemoryUsageWindowStore(1000);
  await store.record('session:2', 800, 1000);
  const policy = new SlidingWindowResourcePolicy({ maxTokens: 1000, windowMs: 1000, store });

  const decision = await policy.evaluate({
    scopeKey: 'session:2',
    usage: {},
    projected: { totalTokens: 250 },
    now: 1100
  });

  assert.equal(decision.outcome, 'throttle');
  assert.equal(decision.retryAfterMs, 900);
  assert.equal((await store.snapshot('session:2', 1100)).usedTokens, 800);
});

test('sliding window allows execution after the blocking usage expires', async () => {
  const store = new InMemoryUsageWindowStore(1000);
  await store.record('session:3', 800, 1000);
  const policy = new SlidingWindowResourcePolicy({ maxTokens: 1000, windowMs: 1000, store });

  const decision = await policy.evaluate({
    scopeKey: 'session:3',
    usage: {},
    projected: { totalTokens: 250 },
    now: 2001
  });

  assert.equal(decision.outcome, 'allow');
  assert.equal(decision.retryAfterMs, undefined);
});
