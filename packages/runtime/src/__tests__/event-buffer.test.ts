import test from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeEventBuffer } from '../index.js';
import { approval, usage } from './fixtures.js';

test('coalesces usage snapshots but never drops approval requests', () => {
  const queue = new RuntimeEventBuffer(2);
  queue.push(usage('e1', 10));
  queue.push(usage('e2', 20));
  queue.push(approval('e3'));
  assert.equal(queue.size, 2);
  assert.equal(queue.shift()?.type, 'usage_updated');
  assert.equal(queue.shift()?.type, 'approval_requested');
});
