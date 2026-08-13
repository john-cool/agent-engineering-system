import assert from 'node:assert/strict';
import test from 'node:test';
import { findCodexBinary, runCodexSmoke } from '../codex-smoke.js';

test('codex smoke skips cleanly when binary is unavailable', async () => {
  const result = await runCodexSmoke({ findBinary: async () => undefined });
  assert.deepEqual(result, { status: 'skipped', reason: 'codex binary not found' });
});

test('finds the Windows Codex command shim', async () => {
  const attemptedCommands: string[] = [];
  const binary = await findCodexBinary({
    platform: 'win32',
    execFile: (command, _args, options, callback) => {
      attemptedCommands.push(command);
      assert.deepEqual(options, { shell: true });
      callback(command === 'codex.cmd' ? null : new Error('not found'));
    }
  });

  assert.equal(binary, 'codex.cmd');
  assert.deepEqual(attemptedCommands, ['codex.cmd']);
});
