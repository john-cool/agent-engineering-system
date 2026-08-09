import type {
  ResourceDecision,
  ResourcePolicy,
  ResourcePolicyContext,
  ResourceUsageSnapshot,
  ResourceUsageWindowSnapshot,
  ResourceUsageWindowStore
} from '@aes/runtime-sdk';

interface WindowEntry {
  at: number;
  tokens: number;
}

export class InMemoryUsageWindowStore implements ResourceUsageWindowStore {
  private readonly entries = new Map<string, WindowEntry[]>();

  constructor(readonly windowMs: number) {
    if (!(windowMs > 0)) throw new RangeError('windowMs must be greater than 0');
  }

  record(scopeKey: string, tokens: number, at: number): void {
    if (tokens < 0) throw new RangeError('tokens must not be negative');
    const current = this.entries.get(scopeKey) ?? [];
    current.push({ at, tokens });
    current.sort((a, b) => a.at - b.at);
    this.entries.set(scopeKey, current);
  }

  snapshot(scopeKey: string, now: number): ResourceUsageWindowSnapshot {
    const cutoff = now - this.windowMs;
    const active = (this.entries.get(scopeKey) ?? []).filter((entry) => entry.at > cutoff);
    if (active.length > 0) this.entries.set(scopeKey, active);
    else this.entries.delete(scopeKey);

    const usedTokens = active.reduce((sum, entry) => sum + entry.tokens, 0);
    const first = active[0];
    return {
      usedTokens,
      windowMs: this.windowMs,
      ...(first ? { retryAfterMs: Math.max(0, first.at + this.windowMs - now) } : {})
    };
  }
}

function projectedTokens(projected: ResourceUsageSnapshot | undefined): number | undefined {
  if (!projected) return undefined;
  if (projected.totalTokens !== undefined) return projected.totalTokens;
  if (projected.inputTokens !== undefined && projected.outputTokens !== undefined) {
    return projected.inputTokens + projected.outputTokens;
  }
  return undefined;
}

export class SlidingWindowResourcePolicy implements ResourcePolicy {
  private readonly maxTokens: number;
  private readonly windowMs: number;
  private readonly store: ResourceUsageWindowStore;

  constructor(options: { maxTokens: number; windowMs: number; store: ResourceUsageWindowStore }) {
    if (!(options.maxTokens > 0)) throw new RangeError('maxTokens must be greater than 0');
    if (!(options.windowMs > 0)) throw new RangeError('windowMs must be greater than 0');
    this.maxTokens = options.maxTokens;
    this.windowMs = options.windowMs;
    this.store = options.store;
  }

  async evaluate(context: ResourcePolicyContext): Promise<ResourceDecision> {
    const now = context.now ?? Date.now();
    const snapshot = await this.store.snapshot(context.scopeKey, now);
    if (snapshot.windowMs !== this.windowMs) {
      throw new Error(`usage window mismatch: policy=${this.windowMs} store=${snapshot.windowMs}`);
    }

    const pending = projectedTokens(context.projected);
    const effectiveTokens = snapshot.usedTokens + (pending ?? 0);
    if (effectiveTokens <= this.maxTokens) {
      return { outcome: 'allow', reasons: [] };
    }

    return {
      outcome: 'throttle',
      reasons: [`sliding token window exceeded: ${effectiveTokens}/${this.maxTokens}`],
      ...(snapshot.retryAfterMs !== undefined ? { retryAfterMs: snapshot.retryAfterMs } : {})
    };
  }
}
