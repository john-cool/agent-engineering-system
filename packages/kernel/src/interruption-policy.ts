import type { Confidence } from '@aes/spec';

export interface InterruptionInput {
  controlOutcome: 'recommend' | 'request_approval' | 'execute' | 'blocked';
  confidence: Confidence;
  impact: Confidence;
  authorityIncrease: boolean;
  capabilityFailure: boolean;
  durableConflict: boolean;
}

export interface InterruptionDecision {
  interrupt: boolean;
  reasons: string[];
}

export interface ApprovalDigest {
  items: { id: string; summary: string }[];
  summary: string;
}

export class InterruptionPolicy {
  evaluate(input: InterruptionInput): InterruptionDecision {
    const reasons: string[] = [];
    if (input.authorityIncrease) reasons.push('new authority requires user consent');
    if (input.durableConflict) reasons.push('durable knowledge conflict requires judgment');
    if (input.capabilityFailure) reasons.push('runtime capability failure changes the next user action');
    if (input.controlOutcome === 'request_approval') reasons.push('assisted action requires approval');
    if (input.controlOutcome === 'recommend') reasons.push('recommendation requires user action');
    if (input.confidence === 'low' && input.impact === 'high') reasons.push('low confidence high impact');
    return { interrupt: reasons.length > 0, reasons };
  }

  group(items: readonly { id: string; summary: string }[]): ApprovalDigest {
    return {
      items: [...items],
      summary: `${items.length} user decisions need review`
    };
  }
}
