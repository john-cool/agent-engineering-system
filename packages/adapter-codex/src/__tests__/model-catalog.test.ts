import test from 'node:test';
import assert from 'node:assert/strict';
import type { CodexTransport } from '../transport.js';
import { CodexModelCatalog } from '../index.js';

function modelListTransport(): CodexTransport & { calls(): number } {
  let callCount = 0;
  const responses = [
    { data: [{ id: 'm1', model: 'm1', supportedReasoningEfforts: [{ reasoningEffort: 'medium' }], isDefault: true }] },
    { data: [{ id: 'm2', model: 'm2', supportedReasoningEfforts: [{ reasoningEffort: 'high' }], isDefault: true }] }
  ];
  return {
    calls: () => callCount,
    async request(method) {
      assert.equal(method, 'model/list');
      return responses[Math.min(callCount++, responses.length - 1)]!;
    },
    async notify() {},
    async *notifications() {},
    async *serverRequests() {},
    async respond() {},
    async close() {}
  };
}

test('model catalog normalizes provider models and refreshes once when forced', async () => {
  const transport = modelListTransport();
  const catalog = new CodexModelCatalog(transport, { ttlMs: 60_000 });
  const first = await catalog.discover();
  assert.equal(first[0]?.id, 'm1');
  assert.equal(first[0]?.provider, 'codex');
  assert.deepEqual(first[0]?.capabilities.reasoningLevels, ['medium']);
  assert.equal(first[0]?.traits.qualityClass, 'balanced');
  assert.equal((await catalog.discover())[0]?.id, 'm1');
  assert.equal(transport.calls(), 1);
  assert.equal((await catalog.discover({ forceRefresh: true }))[0]?.id, 'm2');
  assert.equal(transport.calls(), 2);
});

test('model classification remains adapter-local and normalizes provider effort vocabulary', async () => {
  const transport = modelListTransport();
  const catalog = new CodexModelCatalog(transport, {
    ttlMs: 60_000,
    classify: (model) => model.id === 'm1'
      ? { qualityClass: 'powerful', latencyClass: 'slow' }
      : { qualityClass: 'cheap', latencyClass: 'fast' }
  });
  const model = (await catalog.discover())[0]!;
  assert.deepEqual(model.traits, { qualityClass: 'powerful', latencyClass: 'slow' });
});
