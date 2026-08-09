import test from 'node:test';
import assert from 'node:assert/strict';
import { HandoffEngine } from '../handoff-engine.js';

test('handoff preserves actionable state without conversation transcript', async () => {
  const engine = new HandoffEngine();
  const handoff = await engine.create({
    goal: 'finish context engine',
    currentState: 'execution',
    activePlan: 'm2b',
    keyDecisions: ['core stays vendor neutral'],
    relevantFiles: ['packages/kernel/src/context-engine.ts'],
    constraints: ['offline tests'],
    openProblems: ['handoff tests missing'],
    verificationState: 'partial',
    nextAction: 'implement handoff tests'
  });
  assert.deepEqual(handoff.keyDecisions, ['core stays vendor neutral']);
  assert.equal('transcript' in handoff, false);
});

test('handoff validation reports exact missing fields', () => {
  const engine = new HandoffEngine();
  const result = engine.validate({
    goal: '',
    currentState: 'execution',
    keyDecisions: [],
    relevantFiles: [],
    constraints: [],
    openProblems: [],
    verificationState: '',
    nextAction: ''
  });
  assert.deepEqual(result.missingFacts, ['goal', 'verificationState', 'nextAction']);
});
