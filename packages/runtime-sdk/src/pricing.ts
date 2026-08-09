export interface Money {
  amount: number;
  currency: string;
}

export type CostEstimate = Money;

export interface UsageRecord {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
}

export interface PricingProvider {
  estimate(usage: UsageRecord): CostEstimate | undefined;
}
