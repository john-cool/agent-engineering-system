import test from 'node:test';
import assert from 'node:assert/strict';
import { RetryBudget } from '../index.js';

test('transport retry budget stops after configured attempts', () => {
  const budget = new RetryBudget({ transport_failed: 2 });
  assert.equal(budget.consume('transport_failed').allowed, true);
  assert.equal(budget.consume('transport_failed').allowed, true);
  assert.equal(budget.consume('transport_failed').allowed, false);
});
