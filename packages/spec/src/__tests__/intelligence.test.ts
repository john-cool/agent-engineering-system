import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTROL_ACTION_TYPES,
  CONTROL_MODES,
  PLAN_STATUSES,
  type ActionRequest,
  type ModelDecision,
  type TaskAnalysis
} from '../index.js';

test('milestone 2 routing and control constants expose stable values', () => {
  assert.deepEqual(CONTROL_MODES, ['manual', 'assisted', 'autonomous']);
  assert.deepEqual(PLAN_STATUSES, ['none', 'draft', 'approved', 'invalidated']);
  assert.ok(CONTROL_ACTION_TYPES.includes('conversationTransition'));

  const analysis: TaskAnalysis = {
    stage: 'discovery',
    planStatus: 'none',
    ambiguity: 'medium',
    risk: 'low',
    taskComplexity: 'standard',
    confidence: 'medium',
    failedAttempts: 0,
    architecturalDecisionRequired: false,
    evidenceSufficient: false,
    reasons: ['user request not yet inspected']
  };
  const decision: ModelDecision = {
    modelClass: 'balanced',
    confidence: 'high',
    reasons: ['default route'],
    transition: 'keep',
    latencyMode: 'fast'
  };
  const action: ActionRequest = {
    id: 'a-1',
    type: 'modelRouting',
    source: 'model-router',
    reason: 'planning requires deeper reasoning',
    confidence: 'high',
    payload: { to: 'powerful' }
  };
  assert.equal(analysis.stage, 'discovery');
  assert.equal(decision.modelClass, 'balanced');
  assert.equal(action.type, 'modelRouting');
});
