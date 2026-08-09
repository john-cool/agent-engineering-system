import { AesValidationError } from './errors.js';
import { LIFECYCLE_STATES, isLifecycleState, type LifecycleState } from './common.js';

export interface WorkflowStateDefinition {
  next: LifecycleState[];
}

export interface WorkflowDocument {
  kind: 'Workflow';
  version: 1;
  name: string;
  initial: LifecycleState;
  states: Record<LifecycleState, WorkflowStateDefinition>;
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AesValidationError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function validateWorkflowDocument(value: unknown): WorkflowDocument {
  const input = asRecord(value, 'workflow');
  if (input.kind !== 'Workflow' || input.version !== 1) {
    throw new AesValidationError('Invalid Workflow kind or version');
  }
  if (typeof input.name !== 'string' || input.name.length === 0) {
    throw new AesValidationError('Workflow name must be a non-empty string');
  }
  if (!isLifecycleState(input.initial)) {
    throw new AesValidationError('Workflow initial state is invalid');
  }

  const rawStates = asRecord(input.states, 'workflow states');
  const states = {} as Record<LifecycleState, WorkflowStateDefinition>;
  for (const state of LIFECYCLE_STATES) {
    const rawState = asRecord(rawStates[state], `workflow state ${state}`);
    if (!Array.isArray(rawState.next) || !rawState.next.every(isLifecycleState)) {
      throw new AesValidationError(`Workflow state ${state}.next must contain lifecycle states`);
    }
    states[state] = { next: [...rawState.next] };
  }

  return {
    kind: 'Workflow',
    version: 1,
    name: input.name,
    initial: input.initial,
    states
  };
}
