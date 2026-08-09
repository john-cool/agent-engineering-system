import type {
  RuntimeDecisionTrace,
  RuntimeEvent,
  SessionCheckpoint
} from '@aes/runtime-sdk';

export function sampleTrace(overrides: Partial<RuntimeDecisionTrace> = {}): RuntimeDecisionTrace {
  const requirement = {
    class: 'balanced' as const,
    reasoning: 'medium' as const,
    latency: 'prefer_fast' as const,
    context: 'standard' as const
  };
  const selected = {
    id: 'model-balanced',
    provider: 'test',
    capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium' as const] },
    traits: { qualityClass: 'balanced' as const, latencyClass: 'fast' as const },
    availability: 'available' as const,
    selectedReasoning: 'medium' as const
  };
  return {
    traceId: 'trace-1',
    taskId: 'task-1',
    taskClass: 'approved-plan/typescript/execution',
    sessionId: 'session-1',
    turnId: 'turn-1',
    timestamp: '2026-08-08T10:00:00Z',
    requirement,
    resolution: {
      requested: requirement,
      selected,
      reasons: ['exact balanced fit'],
      alternatives: [],
      fallback: { used: false, type: 'none' }
    },
    telemetry: {
      provider: 'test', model: selected.id,
      durationMs: 10, retries: 0, compactions: 0,
      outcome: 'success', verification: 'passed'
    },
    providerRecoveries: 0,
    userInterruptions: 0,
    ...overrides
  };
}

export function checkpoint(overrides: Partial<SessionCheckpoint> = {}): SessionCheckpoint {
  const trace = sampleTrace();
  return {
    sessionId: trace.sessionId,
    provider: 'test',
    providerSessionId: 'provider-session-1',
    state: 'ready',
    modelProfile: trace.resolution.selected,
    contextRevision: 0,
    checkpointAt: '2026-08-08T10:00:00Z',
    ...overrides
  };
}

function meta(eventId: string) {
  return { sessionId: 'session-1', turnId: 'turn-1', eventId, timestamp: '2026-08-08T10:00:00Z' };
}

export function usage(eventId: string, inputTokens: number): RuntimeEvent {
  return { type: 'usage_updated', delivery: 'coalescible', meta: meta(eventId), data: { inputTokens } };
}

export function approval(eventId: string): RuntimeEvent {
  return {
    type: 'approval_requested', delivery: 'lossless', meta: meta(eventId), requestId: `request-${eventId}`,
    action: { id: `action-${eventId}`, type: 'toolExecution', source: 'runtime-provider', reason: 'test', confidence: 'high', payload: {} }
  };
}

export function outputDelta(text: string): RuntimeEvent {
  return { type: 'output_delta', delivery: 'coalescible', meta: meta('output-1'), data: { text } };
}

export function usageUpdated(data: { inputTokens?: number; outputTokens?: number }): RuntimeEvent {
  return { type: 'usage_updated', delivery: 'coalescible', meta: meta('usage-1'), data };
}
