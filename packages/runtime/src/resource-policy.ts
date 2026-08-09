import type {
  Money,
  ResourceBudget,
  ResourceDecision,
  ResourcePolicy,
  ResourcePolicyContext,
  ResourceRemaining,
  ResourceUsageSnapshot
} from '@aes/runtime-sdk';

const OUTCOME_RANK = { allow: 0, warn: 1, throttle: 2, deny: 3 } as const;

function addKnown(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined || b === undefined) return undefined;
  return a + b;
}

function totalTokens(usage: ResourceUsageSnapshot): number | undefined {
  if (usage.totalTokens !== undefined) return usage.totalTokens;
  if (usage.inputTokens !== undefined && usage.outputTokens !== undefined) {
    return usage.inputTokens + usage.outputTokens;
  }
  return undefined;
}

function addMoney(a: Money | undefined, b: Money | undefined): Money | undefined {
  if (!a || !b || a.currency !== b.currency) return undefined;
  return { amount: a.amount + b.amount, currency: a.currency };
}

function combinedUsage(usage: ResourceUsageSnapshot, projected?: ResourceUsageSnapshot): ResourceUsageSnapshot {
  const result: ResourceUsageSnapshot = {};
  if (!projected) {
    if (usage.inputTokens !== undefined) result.inputTokens = usage.inputTokens;
    if (usage.outputTokens !== undefined) result.outputTokens = usage.outputTokens;
    const total = totalTokens(usage);
    if (total !== undefined) result.totalTokens = total;
    if (usage.estimatedCost !== undefined) result.estimatedCost = usage.estimatedCost;
    if (usage.retries !== undefined) result.retries = usage.retries;
    if (usage.durationMs !== undefined) result.durationMs = usage.durationMs;
    return result;
  }

  const inputTokens = addKnown(usage.inputTokens, projected.inputTokens);
  const outputTokens = addKnown(usage.outputTokens, projected.outputTokens);
  const total = addKnown(totalTokens(usage), totalTokens(projected));
  const estimatedCost = addMoney(usage.estimatedCost, projected.estimatedCost);
  const retries = addKnown(usage.retries, projected.retries);
  const durationMs = addKnown(usage.durationMs, projected.durationMs);

  if (inputTokens !== undefined) result.inputTokens = inputTokens;
  if (outputTokens !== undefined) result.outputTokens = outputTokens;
  if (total !== undefined) result.totalTokens = total;
  if (estimatedCost !== undefined) result.estimatedCost = estimatedCost;
  if (retries !== undefined) result.retries = retries;
  if (durationMs !== undefined) result.durationMs = durationMs;
  return result;
}

function clampRemaining(limit: number, used: number): number {
  return Math.max(0, limit - used);
}

function sameCurrencyRemaining(limit: Money, used: Money | undefined): Money | undefined {
  if (!used || limit.currency !== used.currency) return undefined;
  return { amount: clampRemaining(limit.amount, used.amount), currency: limit.currency };
}

function threshold(budget: ResourceBudget): number {
  const value = budget.warningThreshold ?? 0.8;
  if (!(value > 0 && value < 1)) {
    throw new RangeError('warningThreshold must be greater than 0 and less than 1');
  }
  return value;
}

function numericCheck(
  label: string,
  limit: number | undefined,
  used: number | undefined,
  warningThreshold: number,
  reasons: string[]
): 'allow' | 'warn' | 'deny' {
  if (limit === undefined || used === undefined) return 'allow';
  if (used > limit) {
    reasons.push(`${label} exceeded`);
    return 'deny';
  }
  if (used >= limit * warningThreshold) {
    reasons.push(`${label} reached warning threshold`);
    return 'warn';
  }
  return 'allow';
}

export class BudgetResourcePolicy implements ResourcePolicy {
  evaluate(context: ResourcePolicyContext): ResourceDecision {
    const budget = context.budget;
    if (!budget) return { outcome: 'allow', reasons: [] };

    const used = combinedUsage(context.usage, context.projected);
    const warningThreshold = threshold(budget);
    const reasons: string[] = [];
    let outcome: ResourceDecision['outcome'] = 'allow';

    const checks: Array<'allow' | 'warn' | 'deny'> = [
      numericCheck('input token budget', budget.maxInputTokens, used.inputTokens, warningThreshold, reasons),
      numericCheck('output token budget', budget.maxOutputTokens, used.outputTokens, warningThreshold, reasons),
      numericCheck('total token budget', budget.maxTotalTokens, used.totalTokens, warningThreshold, reasons),
      numericCheck('retry budget', budget.maxRetries, used.retries, warningThreshold, reasons),
      numericCheck('duration budget', budget.maxDurationMs, used.durationMs, warningThreshold, reasons)
    ];

    if (budget.maxEstimatedCost && used.estimatedCost && budget.maxEstimatedCost.currency === used.estimatedCost.currency) {
      checks.push(
        numericCheck(
          'estimated cost budget',
          budget.maxEstimatedCost.amount,
          used.estimatedCost.amount,
          warningThreshold,
          reasons
        )
      );
    }

    for (const check of checks) {
      if (OUTCOME_RANK[check] > OUTCOME_RANK[outcome]) outcome = check;
    }

    const remaining: ResourceRemaining = {};
    if (budget.maxInputTokens !== undefined && used.inputTokens !== undefined) {
      remaining.inputTokens = clampRemaining(budget.maxInputTokens, used.inputTokens);
    }
    if (budget.maxOutputTokens !== undefined && used.outputTokens !== undefined) {
      remaining.outputTokens = clampRemaining(budget.maxOutputTokens, used.outputTokens);
    }
    if (budget.maxTotalTokens !== undefined && used.totalTokens !== undefined) {
      remaining.totalTokens = clampRemaining(budget.maxTotalTokens, used.totalTokens);
    }
    if (budget.maxEstimatedCost) {
      const costRemaining = sameCurrencyRemaining(budget.maxEstimatedCost, used.estimatedCost);
      if (costRemaining !== undefined) remaining.estimatedCost = costRemaining;
    }
    if (budget.maxRetries !== undefined && used.retries !== undefined) {
      remaining.retries = clampRemaining(budget.maxRetries, used.retries);
    }
    if (budget.maxDurationMs !== undefined && used.durationMs !== undefined) {
      remaining.durationMs = clampRemaining(budget.maxDurationMs, used.durationMs);
    }

    return {
      outcome,
      reasons,
      ...(Object.keys(remaining).length > 0 ? { remaining } : {})
    };
  }
}

export class ResourcePolicyEngine {
  constructor(private readonly policies: readonly ResourcePolicy[]) {}

  async evaluate(context: ResourcePolicyContext): Promise<ResourceDecision> {
    let outcome: ResourceDecision['outcome'] = 'allow';
    const reasons: string[] = [];
    let retryAfterMs: number | undefined;
    let remaining: ResourceRemaining | undefined;

    for (const policy of this.policies) {
      const decision = await policy.evaluate(context);
      reasons.push(...decision.reasons);
      if (OUTCOME_RANK[decision.outcome] > OUTCOME_RANK[outcome]) {
        outcome = decision.outcome;
      }
      if (decision.retryAfterMs !== undefined) {
        retryAfterMs = retryAfterMs === undefined
          ? decision.retryAfterMs
          : Math.max(retryAfterMs, decision.retryAfterMs);
      }
      if (decision.remaining) remaining = decision.remaining;
    }

    return {
      outcome,
      reasons,
      ...(remaining ? { remaining } : {}),
      ...(retryAfterMs !== undefined ? { retryAfterMs } : {})
    };
  }
}
