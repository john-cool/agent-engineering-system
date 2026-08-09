import test from 'node:test';
import assert from 'node:assert/strict';
import type { WorkflowDocument } from '@aes/spec';
import { AesWorkflowTransitionError, WorkflowStateMachine } from '../index.js';

const workflow: WorkflowDocument = {
  kind: 'Workflow', version: 1, name: 'default', initial: 'discovery',
  states: {
    discovery: { next: ['planning'] },
    planning: { next: ['execution', 'discovery'] },
    execution: { next: ['verification', 'planning'] },
    verification: { next: ['completed', 'execution', 'planning'] },
    completed: { next: [] }
  }
};

test('starts in the workflow initial state', () => {
  assert.equal(new WorkflowStateMachine(workflow).current(), 'discovery');
});

test('performs a legal transition', () => {
  const machine = new WorkflowStateMachine(workflow);
  assert.equal(machine.transition('planning'), 'planning');
});

test('rejects an illegal transition', () => {
  const machine = new WorkflowStateMachine(workflow);
  assert.throws(() => machine.transition('completed'), AesWorkflowTransitionError);
});
