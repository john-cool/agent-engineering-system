import type { ControlMode } from '@aes/spec';

export interface AuthorityLearningResult {
  action: 'keep' | 'propose_autonomous' | 'degrade_to_assisted';
  reason: string;
}

export class AuthorityLearning {
  constructor(private readonly policy: { promotionSamples: number; regressionRate: number }) {}

  evaluate(input: {
    current: ControlMode;
    approvals: number;
    rejections: number;
    verifiedSuccesses: number;
    regressions: number;
  }): AuthorityLearningResult {
    const total = Math.max(input.approvals, input.verifiedSuccesses + input.regressions);
    const observedRegressionRate = total === 0 ? 0 : input.regressions / total;

    if (input.current === 'autonomous' && observedRegressionRate > this.policy.regressionRate) {
      return {
        action: 'degrade_to_assisted',
        reason: 'verified quality regression exceeded threshold'
      };
    }

    if (
      input.current !== 'autonomous' &&
      input.approvals >= this.policy.promotionSamples &&
      input.rejections === 0 &&
      input.verifiedSuccesses === input.approvals
    ) {
      return {
        action: 'propose_autonomous',
        reason: 'repeated approved actions verified successfully'
      };
    }

    return {
      action: 'keep',
      reason: 'insufficient evidence for authority change'
    };
  }
}
