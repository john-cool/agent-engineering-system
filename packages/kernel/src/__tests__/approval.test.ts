import test from 'node:test';
import assert from 'node:assert/strict';
import { recordApproval } from '../approval.js';

test('rejection preserves underlying action audit link', () => {
  const record = recordApproval({
    id: 'approval-1', actionId: 'a-1', summary: 'switch to powerful', reason: 'architecture planning'
  }, 'rejected', '2026-08-08T00:00:00Z');
  assert.equal(record.decision, 'rejected');
  assert.equal(record.actionId, 'a-1');
  assert.equal(record.decidedAt, '2026-08-08T00:00:00Z');
});
