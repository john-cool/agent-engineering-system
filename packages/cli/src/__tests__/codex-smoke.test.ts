import assert from 'node:assert/strict';
import test from 'node:test';
import { runCodexSmoke } from '../codex-smoke.js';

test('codex smoke skips cleanly when binary is unavailable', async () => {
  const result = await runCodexSmoke({ findBinary: async () => undefined });
  assert.deepEqual(result, { status: 'skipped', reason: 'codex binary not found' });
});
