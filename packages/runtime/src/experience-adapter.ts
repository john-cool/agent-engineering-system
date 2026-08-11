import type { RuntimeDecisionTrace, RuntimeExperienceEvidence } from '@aes/runtime-sdk';
import type { LearningEvidence, TaskSignature } from '@aes/spec';
import { normalizeTaskSignature } from '@aes/kernel';

export function toExperienceEvidence(trace: RuntimeDecisionTrace): RuntimeExperienceEvidence {
  const attributableToModelQuality =
    trace.telemetry.verification !== 'not_run' &&
    trace.telemetry.outcome !== 'cancelled' &&
    trace.failure?.attributableToModelQuality !== false;

  return {
    id: trace.traceId,
    taskClass: trace.taskClass ?? 'unclassified',
    verification: trace.telemetry.verification,
    retries: trace.telemetry.retries,
    userInterruptions: trace.userInterruptions,
    attributableToModelQuality,
    providerRecoveries: trace.providerRecoveries,
    ...(trace.telemetry.durationMs !== undefined ? { durationMs: trace.telemetry.durationMs } : {}),
    ...(trace.telemetry.estimatedCost !== undefined ? { estimatedCost: trace.telemetry.estimatedCost } : {})
  };
}

export function toLearningEvidence(trace: RuntimeDecisionTrace, signature: TaskSignature): LearningEvidence {
  const normalized = normalizeTaskSignature(signature);
  const attributable =
    trace.telemetry.verification !== 'not_run' &&
    trace.telemetry.outcome !== 'cancelled' &&
    trace.failure?.attributableToModelQuality !== false;
  const totalTokens = trace.telemetry.inputTokens !== undefined && trace.telemetry.outputTokens !== undefined
    ? trace.telemetry.inputTokens + trace.telemetry.outputTokens
    : undefined;
  return {
    id: `learning:${trace.traceId}`,
    traceId: trace.traceId,
    signature: normalized,
    verification: trace.telemetry.verification,
    attributable,
    origin: 'natural',
    modelClass: trace.resolution.selected.traits.qualityClass,
    latencyMode: trace.resolution.selected.traits.latencyClass === 'fast' ? 'fast' : 'standard',
    retries: trace.telemetry.retries,
    userInterruptions: trace.userInterruptions,
    providerRecoveries: trace.providerRecoveries,
    ...(trace.resolution.fallback.type !== 'none' ? { fallbackKind: trace.resolution.fallback.type } : {}),
    ...(trace.telemetry.inputTokens !== undefined ? { inputTokens: trace.telemetry.inputTokens } : {}),
    ...(trace.telemetry.outputTokens !== undefined ? { outputTokens: trace.telemetry.outputTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
    ...(trace.telemetry.estimatedCost
      ? { estimatedCost: { amount: trace.telemetry.estimatedCost.amount, currency: trace.telemetry.estimatedCost.currency } }
      : {}),
    ...(trace.telemetry.durationMs !== undefined ? { durationMs: trace.telemetry.durationMs } : {}),
    timestamp: trace.timestamp
  };
}
