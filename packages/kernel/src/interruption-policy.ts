import type { Confidence, InterruptionPreferenceEffect, InterruptionUrgency } from '@aes/spec';

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
  urgency: InterruptionUrgency;
  reasons: string[];
}

export interface ApprovalDigest {
  items: { id: string; summary: string }[];
  summary: string;
}

export class InterruptionPolicy {
  evaluate(input: InterruptionInput, advice?: InterruptionPreferenceEffect): InterruptionDecision {
    const reasons: string[] = [];
    if (input.authorityIncrease) reasons.push('new authority requires user consent');
    if (input.durableConflict) reasons.push('durable knowledge conflict requires judgment');
    if (input.capabilityFailure) reasons.push('runtime capability failure changes the next user action');
    if (input.controlOutcome === 'request_approval') reasons.push('assisted action requires approval');
    if (input.controlOutcome === 'recommend') reasons.push('recommendation requires user action');
    if (input.confidence === 'low' && input.impact === 'high') reasons.push('low confidence high impact');
    const hardBlocker = reasons.length > 0;
    if (hardBlocker) return { interrupt: true, urgency: 'immediate', reasons };
    if (input.controlOutcome === 'request_approval') {
      return { interrupt: true, urgency: 'boundary', reasons: ['assisted action requires approval'] };
    }
    if (input.controlOutcome === 'recommend') {
      if (advice?.suppressRoutinePrompt) {
        return { interrupt: false, urgency: advice.schedule ?? 'digest', reasons: ['learned routine prompt suppression'] };
      }
      return { interrupt: true, urgency: advice?.schedule ?? 'boundary', reasons: ['recommendation requires user action'] };
    }
    return { interrupt: false, urgency: 'digest', reasons: [] };
  }

  group(items: readonly { id: string; summary: string }[]): ApprovalDigest {
    return {
      items: [...items],
      summary: `${items.length} user decisions need review`
    };
  }
}
