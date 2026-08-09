import type { LifecycleState, ModelClass, PolicyDocument } from '@aes/spec';
import { PolicyEngine, type Facts } from './policy-engine.js';

export interface ModelDecision {
  modelClass: ModelClass;
  fastMode: boolean;
  reason: string;
}

export type DecisionInput = Facts & { stage: LifecycleState };

export class DecisionEngine {
  readonly #policies: PolicyEngine;

  constructor(policies: readonly PolicyDocument[]) {
    this.#policies = new PolicyEngine(policies);
  }

  chooseModel(input: DecisionInput): ModelDecision {
    const matched = this.#policies.evaluate(input);
    const explicitModelMatch = matched.find((item) => item.action.modelClass !== undefined);
    const explicitFastMatch = matched.find((item) => item.action.fastMode !== undefined);

    if (explicitModelMatch?.action.modelClass) {
      return {
        modelClass: explicitModelMatch.action.modelClass,
        fastMode: explicitFastMatch?.action.fastMode ?? true,
        reason: `matched policy: ${explicitModelMatch.policy}`
      };
    }

    if (input.stage === 'planning') {
      return { modelClass: 'balanced', fastMode: true, reason: 'default planning routing' };
    }

    return { modelClass: 'balanced', fastMode: true, reason: 'default execution routing' };
  }
}
