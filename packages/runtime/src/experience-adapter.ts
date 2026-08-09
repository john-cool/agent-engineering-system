import type { RuntimeDecisionTrace, RuntimeExperienceEvidence } from '@aes/runtime-sdk';

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
