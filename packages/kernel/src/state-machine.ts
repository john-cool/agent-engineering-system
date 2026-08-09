import type { LifecycleState, WorkflowDocument } from '@aes/spec';
import { AesWorkflowTransitionError } from './errors.js';

export class WorkflowStateMachine {
  #state: LifecycleState;

  constructor(private readonly workflow: WorkflowDocument) {
    this.#state = workflow.initial;
  }

  current(): LifecycleState {
    return this.#state;
  }

  canTransition(to: LifecycleState): boolean {
    return this.workflow.states[this.#state].next.includes(to);
  }

  transition(to: LifecycleState): LifecycleState {
    if (!this.canTransition(to)) {
      throw new AesWorkflowTransitionError(this.#state, to);
    }
    this.#state = to;
    return this.#state;
  }
}
