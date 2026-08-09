import type { HandoffDocument, HandoffInput, HandoffValidation } from '@aes/spec';

export interface HandoffGenerator {
  generate(input: HandoffInput): Promise<HandoffDocument>;
}

export class HandoffEngine {
  constructor(private readonly generator?: HandoffGenerator) {}

  async create(input: HandoffInput): Promise<HandoffDocument> {
    return this.generator ? this.generator.generate(input) : { ...input };
  }

  validate(handoff: HandoffDocument): HandoffValidation {
    const missingFacts: string[] = [];
    if (!handoff.goal.trim()) missingFacts.push('goal');
    if (!handoff.verificationState.trim()) missingFacts.push('verificationState');
    if (!handoff.nextAction.trim()) missingFacts.push('nextAction');
    return { sufficient: missingFacts.length === 0, missingFacts };
  }
}
