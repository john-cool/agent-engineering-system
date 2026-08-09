import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  AvailableModel,
  ModelRequirement,
  RuntimeEvent,
  RuntimeProviderCapabilities,
  RuntimeSessionState
} from '../index.js';

const requirement: ModelRequirement = {
  class: 'balanced',
  reasoning: 'medium',
  latency: 'prefer_fast',
  context: 'standard',
  costPreference: 'balanced'
};

const model: AvailableModel = {
  id: 'model-a',
  provider: 'test',
  capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium'] },
  traits: { qualityClass: 'balanced', latencyClass: 'fast' },
  availability: 'available'
};

test('runtime contracts express requirements without provider-specific names', () => {
  assert.equal(requirement.class, 'balanced');
  assert.equal(model.provider, 'test');
  const state: RuntimeSessionState = 'awaiting_approval';
  const event: RuntimeEvent = {
    type: 'turn_started',
    delivery: 'lossless',
    meta: { sessionId: 's1', eventId: 'e1', timestamp: '2026-08-08T00:00:00Z' }
  };
  const caps: RuntimeProviderCapabilities = {
    modelDiscovery: true,
    modelRouting: true,
    fastMode: true,
    streaming: true,
    toolExecution: true,
    approvals: true,
    tokenTelemetry: true,
    contextTelemetry: true,
    contextCompaction: true,
    sessionResume: true,
    sessionCancellation: true,
    conversationTransition: false,
    persistentMemory: false
  };
  assert.equal(state, 'awaiting_approval');
  assert.equal(event.type, 'turn_started');
  assert.equal(caps.modelDiscovery, true);
});
