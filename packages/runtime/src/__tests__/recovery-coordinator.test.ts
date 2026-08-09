import assert from 'node:assert/strict';
import test from 'node:test';
import { RecordingControlBridge } from '@aes/runtime-sdk/testing';
import { RecoveryCoordinator } from '../recovery-coordinator.js';
import { checkpoint } from './fixtures.js';

test('safe reconciliation accepts matching resumable provider state with no ambiguous side effect', async () => {
  const bridge = new RecordingControlBridge('execute');
  const recovery = new RecoveryCoordinator({ control: bridge });
  const result = await recovery.reconcile({
    checkpoint: checkpoint({ state: 'recovering', lastEventId: 'e8' }),
    providerState: {
      sessionAvailable: true,
      providerSessionId: 'provider-session-1',
      lastEventId: 'e9',
      actionState: 'none'
    }
  });

  assert.equal(result.kind, 'safe');
  assert.equal(bridge.requests.length, 0);
});

test('ambiguous completed tool boundary is not replayed automatically', async () => {
  const bridge = new RecordingControlBridge('request_approval');
  const recovery = new RecoveryCoordinator({ control: bridge });
  const result = await recovery.reconcile({
    checkpoint: checkpoint({ lastActionId: 'a1', state: 'recovering' }),
    providerState: {
      sessionAvailable: true,
      providerSessionId: 'provider-session-1',
      lastEventId: 'e9',
      actionState: 'unknown'
    }
  });

  assert.equal(result.kind, 'ambiguous');
  assert.equal(bridge.requests.length, 1);
  assert.equal(bridge.requests[0]?.type, 'toolExecution');
  assert.equal(result.authorization?.outcome, 'request_approval');
});

test('irreconcilable provider session is lost', async () => {
  const bridge = new RecordingControlBridge('execute');
  const recovery = new RecoveryCoordinator({ control: bridge });
  const result = await recovery.reconcile({
    checkpoint: checkpoint({ state: 'recovering' }),
    providerState: {
      sessionAvailable: false,
      actionState: 'none'
    }
  });

  assert.equal(result.kind, 'lost');
  assert.equal(bridge.requests.length, 0);
});
