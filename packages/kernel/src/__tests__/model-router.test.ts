import test from 'node:test';
import assert from 'node:assert/strict';
import { ModelRouter } from '../model-router.js';

const router = new ModelRouter();

test('architecture planning upgrades balanced to powerful', () => {
  const decision = router.route({
    stage: 'planning',
    planStatus: 'none',
    ambiguity: 'high',
    risk: 'medium',
    taskComplexity: 'complex',
    confidence: 'high',
    failedAttempts: 0,
    architecturalDecisionRequired: true,
    evidenceSufficient: true,
    reasons: ['architecture choice required']
  }, 'balanced');
  assert.equal(decision.modelClass, 'powerful');
  assert.equal(decision.transition, 'upgrade');
  assert.equal(decision.latencyMode, 'standard');
});

test('approved execution plan downgrades powerful to balanced', () => {
  const decision = router.route({
    stage: 'execution',
    planStatus: 'approved',
    ambiguity: 'low',
    risk: 'low',
    taskComplexity: 'standard',
    confidence: 'high',
    failedAttempts: 0,
    architecturalDecisionRequired: false,
    evidenceSufficient: true,
    reasons: ['approved plan exists']
  }, 'powerful');
  assert.equal(decision.modelClass, 'balanced');
  assert.equal(decision.transition, 'downgrade');
  assert.equal(decision.latencyMode, 'fast');
});

test('approved low-risk mechanical execution may use cheap', () => {
  const decision = router.route({
    stage: 'execution', planStatus: 'approved', ambiguity: 'low', risk: 'low', taskComplexity: 'mechanical',
    confidence: 'high', failedAttempts: 0, architecturalDecisionRequired: false, evidenceSufficient: true, reasons: ['mechanical']
  }, 'balanced');
  assert.equal(decision.modelClass, 'cheap');
});

test('failed attempt alone does not escalate to powerful', () => {
  const decision = router.route({
    stage: 'execution', planStatus: 'approved', ambiguity: 'medium', risk: 'medium', taskComplexity: 'standard',
    confidence: 'medium', failedAttempts: 2, architecturalDecisionRequired: false, evidenceSufficient: true, reasons: ['execution retry']
  }, 'balanced');
  assert.equal(decision.modelClass, 'balanced');
});
