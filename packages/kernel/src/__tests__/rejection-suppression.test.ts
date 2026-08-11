import test from 'node:test';
import assert from 'node:assert/strict';
import { RejectionSuppression } from '../rejection-suppression.js';
test('suppression is scoped and expires after the configured run window', () => { const tracker = new RejectionSuppression({ runs: 5 }); tracker.record({ actionType: 'conversationTransition', applicabilityKey: 'session:a', decision: 'rejected', run: 10 }); assert.equal(tracker.shouldSuppress({ actionType: 'conversationTransition', applicabilityKey: 'session:a', run: 13 }), true); assert.equal(tracker.shouldSuppress({ actionType: 'conversationTransition', applicabilityKey: 'session:changed', run: 13 }), false); assert.equal(tracker.shouldSuppress({ actionType: 'conversationTransition', applicabilityKey: 'session:a', run: 16 }), false); });
