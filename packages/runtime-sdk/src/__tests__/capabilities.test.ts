import test from 'node:test';
import assert from 'node:assert/strict';
import type { RuntimeAdapter, RuntimeCapabilities } from '../index.js';

test('runtime adapter may declare explicit capabilities', () => {
  const capabilities: RuntimeCapabilities = {
    modelRouting: true,
    fastMode: false,
    toolExecution: true,
    contextTelemetry: false,
    tokenTelemetry: false,
    contextCompaction: false,
    handoffInjection: false,
    conversationTransition: false,
    persistentMemory: false
  };
  const adapter: RuntimeAdapter = {
    getCapabilities: () => capabilities,
    async invokeModel() { return { text: 'ok' }; },
    async invokeTool() { return { ok: true }; }
  };
  assert.equal(adapter.getCapabilities?.().modelRouting, true);
});
