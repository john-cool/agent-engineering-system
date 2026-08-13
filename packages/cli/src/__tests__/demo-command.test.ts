import test from 'node:test';
import assert from 'node:assert/strict';
import { runDemo } from '../demo-command.js';

test('runDemo executes one deterministic turn through the in-memory provider', async () => {
  const summary = await runDemo();

  assert.deepEqual(summary, {
    provider: 'memory',
    model: 'memory-balanced',
    capabilityClass: 'balanced',
    outcome: 'success',
    verification: 'passed',
    totalTokens: 12
  });
});
