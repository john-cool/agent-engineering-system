import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTEXT_PRESSURES,
  CONTEXT_RELEVANCES,
  type ContextDecision,
  type HandoffDocument
} from '../index.js';

test('context and handoff types expose stable vocabulary', () => {
  assert.deepEqual(CONTEXT_PRESSURES, ['low', 'medium', 'high', 'unknown']);
  assert.deepEqual(CONTEXT_RELEVANCES, ['low', 'medium', 'high']);
  const decision: ContextDecision = {
    health: 'good', pressure: 'low', relevance: 'high', confidence: 'high', reasons: [], recommendations: ['continue']
  };
  const handoff: HandoffDocument = {
    goal: 'implement M2', currentState: 'planning', activePlan: 'm2b', keyDecisions: [], relevantFiles: [],
    constraints: [], openProblems: [], verificationState: 'not_started', nextAction: 'implement context engine'
  };
  assert.equal(decision.health, 'good');
  assert.equal(handoff.goal, 'implement M2');
});
