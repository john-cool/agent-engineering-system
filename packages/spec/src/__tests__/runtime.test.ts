import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTROL_ACTION_TYPES,
  RUNTIME_FAILURE_KINDS,
  RUNTIME_OUTCOMES
} from '../index.js';

test('milestone 3 runtime vocabulary is provider-neutral and exported', () => {
  assert.ok(CONTROL_ACTION_TYPES.includes('modelQualityDegradation'));
  assert.ok(RUNTIME_FAILURE_KINDS.includes('provider_crashed'));
  assert.ok(RUNTIME_FAILURE_KINDS.includes('action_ambiguous'));
  assert.deepEqual(RUNTIME_OUTCOMES, ['success', 'failed', 'cancelled', 'recovered']);
});

test('resource budget override is a provider-neutral control action', () => {
  assert.ok(CONTROL_ACTION_TYPES.includes('resourceBudgetOverride'));
});
