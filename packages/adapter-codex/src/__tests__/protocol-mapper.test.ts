import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mapCodexMessage,
  mapCodexServerRequest,
  parseCodexProtocolMessage
} from '../index.js';

test('malformed provider message is rejected without unchecked casting', () => {
  assert.throws(() => parseCodexProtocolMessage({ method: 42 }), /invalid codex protocol message/i);
});

test('unknown non-critical notification is preserved but ignored by normal mapper', () => {
  const parsed = parseCodexProtocolMessage({ method: 'future/newNotification', params: { x: 1 } });
  assert.equal(parsed.kind, 'unknown_notification');
  assert.equal(mapCodexMessage(parsed), undefined);
});

test('usage notification becomes normalized usage_updated event without inventing missing values', () => {
  const event = mapCodexMessage(parseCodexProtocolMessage({
    method: 'thread/tokenUsage/updated',
    params: {
      threadId: 'thread-1',
      turnId: 'turn-1',
      tokenUsage: { total: { inputTokens: 12, outputTokens: 3, cachedInputTokens: 4 } }
    }
  }));
  assert.equal(event?.type, 'usage_updated');
  if (event?.type !== 'usage_updated') throw new Error('expected usage event');
  assert.deepEqual(event.data, { inputTokens: 12, outputTokens: 3, cachedInputTokens: 4 });
});

test('agent message delta and completed turn become normalized events', () => {
  const delta = mapCodexMessage(parseCodexProtocolMessage({
    method: 'item/agentMessage/delta',
    params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'item-1', delta: 'hello' }
  }));
  assert.equal(delta?.type, 'output_delta');

  const completed = mapCodexMessage(parseCodexProtocolMessage({
    method: 'turn/completed',
    params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'interrupted', items: [] } }
  }));
  assert.equal(completed?.type, 'turn_completed');
  if (completed?.type !== 'turn_completed') throw new Error('expected completed event');
  assert.equal(completed.data.outcome, 'cancelled');
});

test('command approval request becomes an AES approval request without granting authority', () => {
  const event = mapCodexServerRequest({
    id: 'approval-1',
    method: 'item/commandExecution/requestApproval',
    params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'cmd-1', command: 'npm test', reason: 'needs execution' }
  });
  assert.equal(event?.type, 'approval_requested');
  if (event?.type !== 'approval_requested') throw new Error('expected approval event');
  assert.equal(event.requestId, 'approval-1');
  assert.equal(event.action.type, 'toolExecution');
  assert.equal(event.action.source, 'runtime-provider');
});
