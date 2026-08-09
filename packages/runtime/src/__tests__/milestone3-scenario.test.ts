import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  AvailableModel,
  RuntimeProvider,
  RuntimeSession
} from '@aes/runtime-sdk';
import {
  FixedVerificationBridge,
  InMemoryCheckpointStore,
  InMemoryTraceStore,
  RecordingControlBridge,
  createInMemoryProvider
} from '@aes/runtime-sdk/testing';
import { AdaptiveRuntime, ModelResolver, WorkspaceRuntimeSupervisor } from '../index.js';

const MODEL: AvailableModel = {
  id: 'fake-codex-balanced',
  provider: 'codex',
  capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium'] },
  traits: { qualityClass: 'balanced', latencyClass: 'fast' },
  availability: 'available'
};

function fakeCodexProvider(): RuntimeProvider {
  const base = createInMemoryProvider();
  return {
    ...base,
    id: 'codex',
    async discoverModels() { return [MODEL]; }
  };
}

function crashAfterTurnStart(): RuntimeProvider {
  const base = fakeCodexProvider();
  return {
    ...base,
    async createSession(input) {
      const session = await base.createSession(input);
      return {
        ...session,
        async *runTurn(request) {
          yield {
            type: 'turn_started', delivery: 'lossless',
            meta: {
              sessionId: input.sessionId, turnId: request.turnId,
              eventId: 'crash-start', timestamp: '2026-08-08T10:00:00Z'
            }
          } as const;
          const error = new Error('synthetic codex provider crash') as Error & { kind: string };
          error.kind = 'provider_crashed';
          throw error;
        }
      };
    }
  };
}

function ambiguousSideEffectProvider(onEffect: () => void): RuntimeProvider {
  const base = fakeCodexProvider();
  return {
    ...base,
    async createSession(input) {
      const session = await base.createSession(input);
      let lastActionId: string | undefined;
      const wrapped: RuntimeSession = {
        ...session,
        async *runTurn(request) {
          yield {
            type: 'turn_started', delivery: 'lossless',
            meta: {
              sessionId: input.sessionId, turnId: request.turnId,
              eventId: 'ambiguous-start', timestamp: '2026-08-08T10:00:00Z'
            }
          } as const;
          onEffect();
          lastActionId = 'tool-1';
          yield {
            type: 'tool_completed', delivery: 'lossless', actionId: 'tool-1', ok: true,
            meta: {
              sessionId: input.sessionId, turnId: request.turnId,
              eventId: 'tool-complete', timestamp: '2026-08-08T10:00:01Z'
            }
          } as const;
          const error = new Error('crash after side effect') as Error & { kind: string };
          error.kind = 'provider_crashed';
          throw error;
        },
        async checkpoint() {
          const checkpoint = await session.checkpoint();
          return lastActionId ? { ...checkpoint, lastActionId } : checkpoint;
        }
      };
      return wrapped;
    }
  };
}

function request(text = 'synthetic task body') {
  return {
    workspaceId: '/workspace/a',
    taskId: 'task-m3',
    taskClass: 'approved-plan/typescript/execution',
    requirement: {
      class: 'balanced' as const,
      reasoning: 'medium' as const,
      latency: 'prefer_fast' as const,
      context: 'standard' as const
    },
    turn: { turnId: 'turn-m3', input: { kind: 'text' as const, text } }
  };
}

test('milestone 3 executes a provider-neutral task, recovers once, and persists privacy-safe evidence', async () => {
  let created = 0;
  const traceStore = new InMemoryTraceStore();
  const runtime = new AdaptiveRuntime({
    resolver: new ModelResolver(),
    supervisor: new WorkspaceRuntimeSupervisor({
      providerFactory: async () => (++created === 1 ? crashAfterTurnStart() : fakeCodexProvider()),
      recovery: { providerRestartRetries: 2, circuitBreakerThreshold: 2 }
    }),
    control: new RecordingControlBridge('execute'),
    traceStore,
    checkpointStore: new InMemoryCheckpointStore(),
    verification: new FixedVerificationBridge('passed')
  });

  const result = await runtime.execute(request());

  assert.equal(result.resolution?.selected.traits.qualityClass, 'balanced');
  assert.equal(result.outcome, 'recovered');
  assert.equal(result.trace?.providerRecoveries, 1);
  assert.equal(result.trace?.telemetry.verification, 'passed');
  assert.equal(traceStore.items.length, 1);
  assert.equal(JSON.stringify(traceStore.items[0]).includes('synthetic task body'), false);
});

test('ambiguous side effect is never replayed after provider recovery', async () => {
  let sideEffects = 0;
  let created = 0;
  const control = new RecordingControlBridge('request_approval');
  const runtime = new AdaptiveRuntime({
    resolver: new ModelResolver(),
    supervisor: new WorkspaceRuntimeSupervisor({
      providerFactory: async () => (++created === 1
        ? ambiguousSideEffectProvider(() => { sideEffects += 1; })
        : fakeCodexProvider()),
      recovery: { providerRestartRetries: 2, circuitBreakerThreshold: 2 }
    }),
    control,
    traceStore: new InMemoryTraceStore(),
    checkpointStore: new InMemoryCheckpointStore(),
    verification: new FixedVerificationBridge('passed')
  });

  const result = await runtime.execute(request('sensitive synthetic task body'));

  assert.equal(result.outcome, 'awaiting_approval');
  assert.equal(result.failure?.kind, 'action_ambiguous');
  assert.equal(sideEffects, 1);
  assert.equal(control.requests.filter((item) => item.type === 'toolExecution').length, 1);
});
