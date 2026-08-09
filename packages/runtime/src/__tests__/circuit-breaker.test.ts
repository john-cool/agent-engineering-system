import test from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreaker } from '../index.js';

test('circuit opens after threshold and only probes after cooldown', () => {
  const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
  breaker.recordFailure(0);
  breaker.recordFailure(10);
  assert.equal(breaker.state, 'open');
  assert.equal(breaker.canAttempt(500), false);
  assert.equal(breaker.canAttempt(1010), true);
  assert.equal(breaker.state, 'half_open');
  breaker.recordSuccess();
  assert.equal(breaker.state, 'closed');
});
