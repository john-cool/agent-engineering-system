import assert from 'node:assert/strict';
import test from 'node:test';
import type { RuntimeProvider } from '@aes/runtime-sdk';
import {
  FixedVerificationBridge,
  InMemoryCheckpointStore,
  InMemoryTraceStore,
  RecordingControlBridge,
  createInMemoryProvider
} from '@aes/runtime-sdk/testing';
import { AdaptiveRuntime, ModelResolver, WorkspaceRuntimeSupervisor } from '../index.js';

function makeCrashingProvider(): RuntimeProvider {
  const base = createInMemoryProvider();
  const createSession = base.createSession.bind(base);
  const resumeSession = base.resumeSession.bind(base);
  const crashSession = async (sessionPromise: ReturnType<typeof createSession>) => {
    const session = await sessionPromise;
    return {
      ...session,
      async *runTurn(request: Parameters<typeof session.runTurn>[0]) {
        yield {
          type: 'turn_started', delivery: 'lossless',
          meta: {
            sessionId: session.sessionId,
            turnId: request.turnId,
            eventId: 'crash-e1',
            timestamp: '2026-08-08T10:00:00Z'
          }
        } as const;
        const error = new Error('synthetic provider crash') as Error & { kind: string };
        error.kind = 'provider_crashed';
        throw error;
      }
    };
  };
  return {
    ...base,
    async createSession(input) {
      return crashSession(createSession(input));
    },
    async resumeSession(checkpoint) {
      return crashSession(resumeSession(checkpoint));
    }
  };
}

function standardRequest() {
  return {
    workspaceId: '/workspace/a', taskId: 'task-1', taskClass: 'approved-plan/typescript/execution',
    requirement: {
      class: 'balanced' as const,
      reasoning: 'medium' as const,
      latency: 'prefer_fast' as const,
      context: 'standard' as const
    },
    turn: { turnId: 'turn-1', input: { kind: 'text' as const, text: 'synthetic task' } }
  };
}

function makeRuntime(providerFactory: (workspaceId: string) => Promise<RuntimeProvider>) {
  return new AdaptiveRuntime({
    resolver: new ModelResolver(),
    supervisor: new WorkspaceRuntimeSupervisor({
      providerFactory,
      recovery: { providerRestartRetries: 2, circuitBreakerThreshold: 2 }
    }),
    control: new RecordingControlBridge('execute'),
    traceStore: new InMemoryTraceStore(),
    checkpointStore: new InMemoryCheckpointStore(),
    verification: new FixedVerificationBridge('passed')
  });
}

test('provider crash restarts once and resumes a safe session', async () => {
  let created = 0;
  const runtime = makeRuntime(async () => (++created === 1 ? makeCrashingProvider() : createInMemoryProvider()));

  const result = await runtime.execute(standardRequest());

  assert.equal(result.outcome, 'recovered');
  assert.equal(created, 2);
  assert.equal(result.trace?.providerRecoveries, 1);
  assert.equal(result.trace?.telemetry.verification, 'passed');
});

test('repeated provider crashes open the circuit instead of restarting forever', async () => {
  let created = 0;
  const runtime = makeRuntime(async () => {
    created += 1;
    return makeCrashingProvider();
  });

  const result = await runtime.execute(standardRequest());

  assert.equal(result.failure?.kind, 'provider_unavailable');
  assert.equal(result.failure?.attributableToModelQuality, false);
  assert.equal(result.recovery?.circuitState, 'open');
  assert.equal(created, 2);
});
