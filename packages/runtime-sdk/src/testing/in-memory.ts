import type { ActionRequest, RuntimeVerification } from '@aes/spec';
import type {
  AvailableModel,
  CreateRuntimeSessionInput,
  RuntimeAuthorizationResult,
  RuntimeControlBridge,
  RuntimeDecisionTrace,
  RuntimeProvider,
  RuntimeSession,
  RuntimeVerificationBridge,
  SessionCheckpoint,
  SessionCheckpointStore,
  TraceStore
} from '../index.js';

const MODEL: AvailableModel = {
  id: 'memory-balanced',
  provider: 'memory',
  capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium'] },
  traits: { qualityClass: 'balanced', latencyClass: 'fast' },
  availability: 'available'
};

function createSession(input: CreateRuntimeSessionInput, providerSessionId = 'provider-session-1'): RuntimeSession {
  let state: SessionCheckpoint['state'] = 'ready';
  let contextRevision = 0;
  let cancelled = false;
  return {
    sessionId: input.sessionId,
    providerSessionId,
    async *runTurn(request) {
      state = 'running';
      yield {
        type: 'turn_started', delivery: 'lossless',
        meta: { sessionId: input.sessionId, turnId: request.turnId, eventId: 'e1', timestamp: '2026-08-08T10:00:00Z' }
      };
      if (!cancelled) {
        yield {
          type: 'usage_updated', delivery: 'coalescible',
          meta: { sessionId: input.sessionId, turnId: request.turnId, eventId: 'e-usage', timestamp: '2026-08-08T10:00:00Z' },
          data: { inputTokens: 10, outputTokens: 2 }
        };
      }
      state = cancelled ? 'cancelled' : 'completed';
      yield {
        type: 'turn_completed', delivery: 'lossless',
        meta: { sessionId: input.sessionId, turnId: request.turnId, eventId: 'e2', timestamp: '2026-08-08T10:00:01Z' },
        data: { outcome: cancelled ? 'cancelled' : 'success' }
      };
    },
    async respondToApproval() {},
    async compact() { state = 'compacting'; contextRevision += 1; state = 'ready'; },
    async cancel() { cancelled = true; state = 'cancelled'; },
    async checkpoint() {
      return {
        sessionId: input.sessionId,
        provider: 'memory',
        providerSessionId,
        state,
        modelProfile: input.model,
        contextRevision,
        checkpointAt: '2026-08-08T10:00:01Z'
      };
    },
    async close() {}
  };
}

export function createInMemoryProvider(): RuntimeProvider {
  return {
    id: 'memory',
    async getCapabilities() {
      return {
        modelDiscovery: true, modelRouting: true, fastMode: true, streaming: true,
        toolExecution: true, approvals: true, tokenTelemetry: true, contextTelemetry: true,
        contextCompaction: true, sessionResume: true, sessionCancellation: true,
        conversationTransition: false, persistentMemory: false
      };
    },
    async discoverModels() { return [MODEL]; },
    async createSession(input) { return createSession(input); },
    async resumeSession(checkpoint) {
      return createSession(
        { sessionId: checkpoint.sessionId, workspaceId: '/test', model: checkpoint.modelProfile },
        checkpoint.providerSessionId
      );
    },
    async shutdown() {}
  };
}

export class InMemoryTraceStore implements TraceStore {
  readonly items: RuntimeDecisionTrace[] = [];
  async append(trace: RuntimeDecisionTrace) { this.items.push(trace); }
  async query() { return [...this.items]; }
  async aggregate() {
    return {
      count: this.items.length,
      successCount: this.items.filter((x) => x.telemetry.outcome === 'success').length,
      retryCount: this.items.reduce((sum, x) => sum + x.telemetry.retries, 0)
    };
  }
}

export class InMemoryCheckpointStore implements SessionCheckpointStore {
  readonly items = new Map<string, SessionCheckpoint>();
  async save(checkpoint: SessionCheckpoint) { this.items.set(checkpoint.sessionId, checkpoint); }
  async load(sessionId: string) { return this.items.get(sessionId); }
  async remove(sessionId: string) { this.items.delete(sessionId); }
}

export class RecordingControlBridge implements RuntimeControlBridge {
  readonly requests: ActionRequest[] = [];
  constructor(private readonly outcome: RuntimeAuthorizationResult['outcome'] = 'execute') {}
  async authorize(request: ActionRequest): Promise<RuntimeAuthorizationResult> {
    this.requests.push(request);
    return { outcome: this.outcome, reason: `test:${this.outcome}` };
  }
}

export class FixedVerificationBridge implements RuntimeVerificationBridge {
  constructor(private readonly outcome: RuntimeVerification = 'passed') {}
  async verify(): Promise<RuntimeVerification> { return this.outcome; }
}
