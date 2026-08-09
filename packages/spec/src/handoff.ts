export interface HandoffInput {
  goal: string;
  currentState: string;
  activePlan?: string;
  keyDecisions: string[];
  relevantFiles: string[];
  constraints: string[];
  openProblems: string[];
  verificationState: string;
  nextAction: string;
}

export type HandoffDocument = Omit<HandoffInput, 'activePlan'> & { activePlan?: string };

export interface HandoffValidation {
  sufficient: boolean;
  missingFacts: string[];
}
