import type { DecisionTrace } from '@aes/spec';

export class DecisionTraceBuilder {
  build(input: DecisionTrace): DecisionTrace {
    return {
      ...input,
      modelDecisions: input.modelDecisions.map((decision) => ({ ...decision, reasons: [...decision.reasons] })),
      contextDecisions: input.contextDecisions.map((decision) => ({ ...decision, reasons: [...decision.reasons], recommendations: [...decision.recommendations] })),
      controlOutcomes: input.controlOutcomes.map((decision) => ({ ...decision })),
      userOverrides: input.userOverrides.map((event) => ({ ...event }))
    };
  }
}
