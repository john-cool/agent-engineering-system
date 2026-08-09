import type { PolicyDocument } from '@aes/spec';

export type Facts = Readonly<Record<string, string | number | boolean | undefined>>;

export interface MatchedPolicyAction {
  policy: string;
  action: PolicyDocument['action'];
}

export class PolicyEngine {
  constructor(private readonly policies: readonly PolicyDocument[]) {}

  evaluate(facts: Facts): MatchedPolicyAction[] {
    return this.policies
      .filter((policy) => Object.entries(policy.when).every(([key, value]) => facts[key] === value))
      .map((policy) => ({ policy: policy.name, action: policy.action }));
  }
}
