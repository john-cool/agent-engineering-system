import test from 'node:test';
import assert from 'node:assert/strict';
import { ControlEngine } from '../control-engine.js';

test('session action override wins over project and defaults', () => {
  const engine = new ControlEngine();
  const mode = engine.resolveMode('modelRouting', {
    aes: { default: 'assisted' },
    project: { default: 'manual', actions: { modelRouting: 'assisted' } },
    session: { default: 'assisted', actions: { modelRouting: 'autonomous' } }
  });
  assert.equal(mode, 'autonomous');
});

test('explicit current decision wins over every config scope', () => {
  const engine = new ControlEngine();
  const mode = engine.resolveMode('modelRouting', {
    aes: { default: 'assisted' },
    user: { default: 'autonomous' },
    project: { default: 'autonomous' },
    session: { default: 'autonomous' },
    explicit: { modelRouting: 'manual' }
  });
  assert.equal(mode, 'manual');
});

test('autonomous action without runtime capability falls back to recommendation', () => {
  const engine = new ControlEngine();
  const result = engine.decide({
    request: { id: 'a-1', type: 'conversationTransition', source: 'handoff-engine', reason: 'fresh context preferred', confidence: 'high', payload: {} },
    mode: 'autonomous',
    capabilityAvailable: false
  });
  assert.equal(result.outcome, 'recommend');
});

test('assisted action requests approval even when capability exists', () => {
  const engine = new ControlEngine();
  const result = engine.decide({
    request: { id: 'a-2', type: 'modelRouting', source: 'model-router', reason: 'architecture planning', confidence: 'high', payload: { to: 'powerful' } },
    mode: 'assisted', capabilityAvailable: true
  });
  assert.equal(result.outcome, 'request_approval');
});
