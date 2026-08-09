import test from 'node:test';
import assert from 'node:assert/strict';
import type { PolicyDocument } from '@aes/spec';
import { DecisionEngine, PolicyEngine } from '../index.js';

const architecturePolicy: PolicyDocument = {
  kind: 'Policy', version: 1, name: 'architecture-escalation',
  when: { architecture: true }, action: { modelClass: 'powerful' }
};

test('PolicyEngine returns actions from matching policies', () => {
  const actions = new PolicyEngine([architecturePolicy]).evaluate({ architecture: true });
  assert.deepEqual(actions, [{ policy: 'architecture-escalation', action: { modelClass: 'powerful' } }]);
});

test('PolicyEngine does not return non-matching policies', () => {
  assert.deepEqual(new PolicyEngine([architecturePolicy]).evaluate({ architecture: false }), []);
});

test('DecisionEngine defaults execution to balanced + fast mode', () => {
  assert.deepEqual(new DecisionEngine([]).chooseModel({ stage: 'execution' }), {
    modelClass: 'balanced', fastMode: true, reason: 'default execution routing'
  });
});

test('DecisionEngine uses powerful for a matching architecture policy', () => {
  const decision = new DecisionEngine([architecturePolicy]).chooseModel({ stage: 'planning', architecture: true });
  assert.equal(decision.modelClass, 'powerful');
});
