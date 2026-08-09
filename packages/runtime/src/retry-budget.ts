import type { RuntimeFailureKind } from '@aes/spec';

export type RetryBudgetPolicy = Partial<Record<RuntimeFailureKind, number>>;

export interface RetryBudgetDecision {
  allowed: boolean;
  attempts: number;
  remaining: number;
}

export class RetryBudget {
  readonly #counts = new Map<RuntimeFailureKind, number>();

  constructor(private readonly policy: RetryBudgetPolicy) {}

  consume(kind: RuntimeFailureKind): RetryBudgetDecision {
    const limit = Math.max(0, this.policy[kind] ?? 0);
    const attempts = (this.#counts.get(kind) ?? 0) + 1;
    this.#counts.set(kind, attempts);
    return {
      allowed: attempts <= limit,
      attempts,
      remaining: Math.max(0, limit - attempts)
    };
  }

  reset(kind?: RuntimeFailureKind): void {
    if (kind) this.#counts.delete(kind);
    else this.#counts.clear();
  }
}
