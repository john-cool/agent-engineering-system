import assert from 'node:assert/strict';
import test from 'node:test';
import { ControlEngine } from '../control-engine.js';
import { KernelRuntimeControlBridge } from '../runtime-control-bridge.js';

test('runtime provider approval is resolved through ControlEngine mode', async () => {
  const bridge = new KernelRuntimeControlBridge({
    controlEngine: new ControlEngine(),
    scopes: { aes: { default: 'assisted' } },
    capabilityAvailable: () => true
  });
  const result = await bridge.authorize({
    id: 'a1',
    type: 'toolExecution',
    source: 'runtime-provider',
    reason: 'provider requested tool authority',
    confidence: 'high',
    payload: {}
  });

  assert.equal(result.outcome, 'request_approval');
  assert.equal(result.reason, 'assisted control mode');
});

test('runtime bridge respects missing runtime capability in autonomous mode', async () => {
  const bridge = new KernelRuntimeControlBridge({
    controlEngine: new ControlEngine(),
    scopes: { aes: { default: 'autonomous' } },
    capabilityAvailable: () => false
  });
  const result = await bridge.authorize({
    id: 'a2', type: 'toolExecution', source: 'runtime-provider',
    reason: 'test capability', confidence: 'high', payload: {}
  });

  assert.equal(result.outcome, 'recommend');
  assert.equal(result.reason, 'runtime capability unavailable');
});
