import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintFailure } from '../index.js';

test('failure fingerprint is stable without embedding raw secret text', () => {
  const a = fingerprintFailure({ kind: 'execution_failed', code: 'E_FAIL', normalizedMessage: 'TypeError at worker', strategyId: 'fix-a' });
  const b = fingerprintFailure({ kind: 'execution_failed', code: 'E_FAIL', normalizedMessage: 'TypeError at worker', strategyId: 'fix-a' });
  assert.equal(a, b);
  assert.equal(a.includes('TypeError at worker'), false);
});
