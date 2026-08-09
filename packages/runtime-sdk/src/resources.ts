import type { Money } from './pricing.js';

export type ResourceDecisionOutcome = 'allow' | 'warn' | 'throttle' | 'deny';

export interface ResourceBudget {
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxTotalTokens?: number;
  maxEstimatedCost?: Money;
  maxRetries?: number;
  maxDurationMs?: number;
  warningThreshold?: number;
}

export interface ResourceUsageSnapshot {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: Money;
  retries?: number;
  durationMs?: number;
}

export interface ResourceRemaining {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: Money;
  retries?: number;
  durationMs?: number;
}

export interface ResourceDecision {
  outcome: ResourceDecisionOutcome;
  reasons: string[];
  remaining?: ResourceRemaining;
  retryAfterMs?: number;
}

export interface ResourcePolicyContext {
  scopeKey: string;
  budget?: ResourceBudget;
  usage: ResourceUsageSnapshot;
  projected?: ResourceUsageSnapshot;
  now?: number;
}

export interface ResourcePolicy {
  evaluate(context: ResourcePolicyContext): ResourceDecision | Promise<ResourceDecision>;
}

export interface ResourceUsageWindowSnapshot {
  usedTokens: number;
  windowMs: number;
  retryAfterMs?: number;
}

export interface ResourceUsageWindowStore {
  record(scopeKey: string, tokens: number, at: number): Promise<void> | void;
  snapshot(scopeKey: string, now: number): Promise<ResourceUsageWindowSnapshot> | ResourceUsageWindowSnapshot;
}
