import test from 'node:test';
import assert from 'node:assert/strict';
import type { RuntimeAdapter } from '../index.js';

class MockAdapter implements RuntimeAdapter {
  async invokeModel(request: Parameters<RuntimeAdapter['invokeModel']>[0]) {
    return {
      text: `mock:${request.modelClass}:${request.prompt}`,
      usage: { inputTokens: 0, outputTokens: 0 }
    };
  }

  async invokeTool(request: Parameters<RuntimeAdapter['invokeTool']>[0]) {
    return { ok: true, output: request.input };
  }
}

test('RuntimeAdapter routes capability classes without concrete model names', async () => {
  const adapter = new MockAdapter();
  const result = await adapter.invokeModel({ modelClass: 'balanced', fastMode: true, prompt: 'hello' });
  assert.equal(result.text, 'mock:balanced:hello');
});
