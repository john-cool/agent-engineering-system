import type { EvaluationDecision, EvaluationEvidence, ExperienceHypothesis } from '@aes/spec';

export interface EvaluationPolicy {
  minSamples: number;
  minSuccessRate: number;
  maxRetryRate: number;
  maxOverrideRate: number;
  maxQualityRegressionRate: number;
}

export class EvaluationGate {
  constructor(private readonly policy: EvaluationPolicy) {}

  evaluate(hypothesis: ExperienceHypothesis, evidence: EvaluationEvidence): EvaluationDecision {
    const reasons: string[] = [];
    if (evidence.sampleCount < this.policy.minSamples) reasons.push('insufficient sample count');
    if (evidence.successRate < this.policy.minSuccessRate) reasons.push('success rate below threshold');
    if (evidence.retryRate > this.policy.maxRetryRate) reasons.push('retry rate above threshold');
    if (evidence.overrideRate > this.policy.maxOverrideRate) reasons.push('override rate above threshold');
    if (evidence.qualityRegressionRate > this.policy.maxQualityRegressionRate) reasons.push('quality regression rate above threshold');

    return {
      hypothesisId: hypothesis.id,
      outcome: reasons.length === 0
        ? 'promote'
        : evidence.sampleCount < this.policy.minSamples
          ? 'keep_candidate'
          : 'reject',
      reasons
    };
  }

  shouldProposeAuthorityPromotion(input: {
    approvals: number;
    rejections: number;
    verifiedSuccesses: number;
  }): boolean {
    return input.approvals >= this.policy.minSamples &&
      input.rejections === 0 &&
      input.verifiedSuccesses === input.approvals;
  }
}
