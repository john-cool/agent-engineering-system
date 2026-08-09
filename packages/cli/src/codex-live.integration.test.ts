import assert from 'node:assert/strict';
import test from 'node:test';
import { runCodexSmoke } from './codex-smoke.js';

test('live Codex App Server smoke', async (t) => {
  const result = await runCodexSmoke();
  if (result.status === 'skipped') {
    t.skip(result.reason);
    return;
  }
  assert.equal(result.status, 'passed', result.status === 'failed' ? result.reason : undefined);
});
