import type { ShadowDecisionTrace } from '@aes/spec';

export class ShadowEvaluator {
  record<TDecision>(input: ShadowDecisionTrace<TDecision>): ShadowDecisionTrace<TDecision> {
    return {
      ...input,
      baselineDecision: structuredClone(input.baselineDecision),
      shadowDecision: structuredClone(input.shadowDecision)
    };
  }
}
