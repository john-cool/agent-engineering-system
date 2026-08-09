import test from 'node:test';
import assert from 'node:assert/strict';
import { CodexRuntimeAdapter } from '../index.js';

test('CodexRuntimeAdapter maps AES capability classes using runtime configuration', () => {
  const adapter = new CodexRuntimeAdapter({
    models: {
      cheap: 'codex-cheap',
      balanced: 'codex-balanced',
      powerful: 'codex-powerful'
    }
  });
  assert.equal(adapter.resolveModel('powerful'), 'codex-powerful');
});

test('Codex adapter declares capabilities instead of making core assumptions', () => {
  const adapter = new CodexRuntimeAdapter({
    models: { cheap: 'c', balanced: 'b', powerful: 'p' }
  });
  assert.equal(adapter.getCapabilities().modelRouting, true);
  assert.equal(adapter.getCapabilities().conversationTransition, false);
});
