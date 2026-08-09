import type { RuntimeEvent, RuntimeDecisionTrace } from '@aes/runtime-sdk';
import type { RuntimeOutcome, RuntimeVerification } from '@aes/spec';

export interface TraceFinalizeInput {
  outcome: RuntimeOutcome;
  verification: RuntimeVerification;
  durationMs?: number;
  retries?: number;
  compactions?: number;
  providerRecoveries?: number;
  userInterruptions?: number;
}

export class RuntimeTraceAccumulator {
  #inputTokens: number | undefined;
  #outputTokens: number | undefined;
  #cachedInputTokens: number | undefined;
  #compactions: number;
  #lastContextRevision: number | undefined;

  constructor(private readonly seed: RuntimeDecisionTrace) {
    this.#inputTokens = seed.telemetry.inputTokens;
    this.#outputTokens = seed.telemetry.outputTokens;
    this.#cachedInputTokens = seed.telemetry.cachedInputTokens;
    this.#compactions = seed.telemetry.compactions;
  }

  record(event: RuntimeEvent): void {
    switch (event.type) {
      case 'usage_updated':
        if (event.data.inputTokens !== undefined) this.#inputTokens = event.data.inputTokens;
        if (event.data.outputTokens !== undefined) this.#outputTokens = event.data.outputTokens;
        if (event.data.cachedInputTokens !== undefined) this.#cachedInputTokens = event.data.cachedInputTokens;
        break;
      case 'context_updated':
        this.#lastContextRevision = event.data.contextRevision;
        if (event.data.inputTokens !== undefined) this.#inputTokens = event.data.inputTokens;
        break;
      case 'compaction_completed':
        this.#compactions += 1;
        this.#lastContextRevision = event.data.contextRevision;
        break;
      default:
        break;
    }
  }

  finalize(input: TraceFinalizeInput): RuntimeDecisionTrace {
    const telemetry = {
      provider: this.seed.telemetry.provider,
      model: this.seed.telemetry.model,
      ...(this.#inputTokens !== undefined ? { inputTokens: this.#inputTokens } : {}),
      ...(this.#outputTokens !== undefined ? { outputTokens: this.#outputTokens } : {}),
      ...(this.#cachedInputTokens !== undefined ? { cachedInputTokens: this.#cachedInputTokens } : {}),
      durationMs: input.durationMs ?? this.seed.telemetry.durationMs,
      retries: input.retries ?? this.seed.telemetry.retries,
      compactions: input.compactions ?? this.#compactions,
      ...(this.seed.telemetry.estimatedCost !== undefined ? { estimatedCost: this.seed.telemetry.estimatedCost } : {}),
      outcome: input.outcome,
      verification: input.verification
    };

    return {
      traceId: this.seed.traceId,
      ...(this.seed.taskId !== undefined ? { taskId: this.seed.taskId } : {}),
      ...(this.seed.taskClass !== undefined ? { taskClass: this.seed.taskClass } : {}),
      sessionId: this.seed.sessionId,
      ...(this.seed.turnId !== undefined ? { turnId: this.seed.turnId } : {}),
      timestamp: this.seed.timestamp,
      requirement: this.seed.requirement,
      resolution: this.seed.resolution,
      telemetry,
      providerRecoveries: input.providerRecoveries ?? this.seed.providerRecoveries,
      userInterruptions: input.userInterruptions ?? this.seed.userInterruptions,
      ...(this.seed.failure !== undefined ? { failure: this.seed.failure } : {}),
      ...(this.seed.cancellation !== undefined ? { cancellation: this.seed.cancellation } : {}),
      ...(this.seed.context !== undefined ? { context: this.seed.context } : {})
    };
  }

  get contextRevision(): number | undefined {
    return this.#lastContextRevision;
  }
}
