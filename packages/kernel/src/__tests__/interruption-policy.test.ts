import test from 'node:test';
import assert from 'node:assert/strict';
import { InterruptionPolicy } from '../interruption-policy.js';

const policy = new InterruptionPolicy();

test('routine autonomous action does not interrupt', () => {
  assert.equal(policy.evaluate({
    controlOutcome: 'execute', confidence: 'high', impact: 'low', authorityIncrease: false,
    capabilityFailure: false, durableConflict: false
  }).interrupt, false);
});

test('low confidence high impact action interrupts', () => {
  assert.equal(policy.evaluate({
    controlOutcome: 'execute', confidence: 'low', impact: 'high', authorityIncrease: false,
    capabilityFailure: false, durableConflict: false
  }).interrupt, true);
});

test('assisted action interrupts for approval', () => {
  const result = policy.evaluate({
    controlOutcome: 'request_approval', confidence: 'high', impact: 'medium', authorityIncrease: false,
    capabilityFailure: false, durableConflict: false
  });
  assert.equal(result.interrupt, true);
  assert.ok(result.reasons.includes('assisted action requires approval'));
});

test('group combines low urgency approvals into one digest', () => {
  const grouped = policy.group([
    { id: 'a1', summary: 'switch model' },
    { id: 'a2', summary: 'promote memory' }
  ]);
  assert.equal(grouped.items.length, 2);
  assert.match(grouped.summary, /2 user decisions/);
});

test('manual recommendation is surfaced to the user', () => {
  const result = policy.evaluate({
    controlOutcome: 'recommend', confidence: 'high', impact: 'medium', authorityIncrease: false,
    capabilityFailure: false, durableConflict: false
  });
  assert.equal(result.interrupt, true);
  assert.ok(result.reasons.includes('recommendation requires user action'));
});
