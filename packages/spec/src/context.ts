import type { ContextHealth } from './common.js';
import type { Confidence } from './intelligence.js';

export const CONTEXT_PRESSURES = ['low', 'medium', 'high', 'unknown'] as const;
export type ContextPressure = (typeof CONTEXT_PRESSURES)[number];

export const CONTEXT_RELEVANCES = ['low', 'medium', 'high'] as const;
export type ContextRelevance = (typeof CONTEXT_RELEVANCES)[number];

export interface ContextFacts {
  inputTokens?: number;
  contextWindow?: number;
  cachedTokens?: number;
  completedTasks: number;
  nextTaskIndependent: boolean;
  staleLogs: boolean;
  repeatedContent: boolean;
  activeDependsOnPriorEvidence: boolean;
  handoffPossible: boolean;
}

export type ContextRecommendation = 'continue' | 'compact' | 'create_handoff' | 'start_fresh';

export interface ContextDecision {
  health: ContextHealth;
  pressure: ContextPressure;
  relevance: ContextRelevance;
  confidence: Confidence;
  reasons: string[];
  recommendations: ContextRecommendation[];
}
