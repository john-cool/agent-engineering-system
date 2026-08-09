import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  ResourcePolicy,
  RuntimeEvent,
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
import {
  AdaptiveRuntime,
  BudgetResourcePolicy,
  ModelResolver,
  ResourcePolicyEngine,
  WorkspaceRuntimeSupervisor
} from '../index.js';

const standardRequirement = {
  class: 'balanced' as const,
  reasoning: 'medium' as const,
  latency: 'prefer_fast' as const,
  context: 'standard' as const
};

function standardRequest() {
  return {
    workspaceId: '/workspace/a',
    taskId: 'task-1',
    taskClass: 'approved-plan/typescript/execution',
    requirement: standardRequirement,
    turn: { turnId: 'turn-1', input: { kind: 'text' as const, text: 'synthetic task' } }
  };
}

function createRuntime(options: {
  traceStore?: InMemoryTraceStore;
  control?: RecordingControlBridge;
  providerFactory?: () => Promise<RuntimeProvider>;
  resources?: ResourcePolicyEngine;
  pricing?: { estimate(): { amount: number; currency: string } | undefined };
} = {}) {
  const traceStore = options.traceStore ?? new InMemoryTraceStore();
  const control = options.control ?? new RecordingControlBridge('execute');
  return {
    traceStore,
    control,
    runtime: new AdaptiveRuntime({
      resolver: new ModelResolver(),
      supervisor: new WorkspaceRuntimeSupervisor({
        providerFactory: async () => options.providerFactory ? options.providerFactory() : createInMemoryProvider()
      }),
      control,
      traceStore,
      checkpointStore: new InMemoryCheckpointStore(),
      verification: new FixedVerificationBridge('passed'),
      ...(options.resources ? { resources: options.resources } : {}),
      ...(options.pricing ? { pricing: options.pricing } : {})
    })
  };
}

test('adaptive runtime resolves model, forwards events, and persists one normalized trace', async () => {
  const { runtime, traceStore } = createRuntime();
  const seen: string[] = [];
  const result = await runtime.execute({
    ...standardRequest(),
    onEvent: (event) => seen.push(event.type)
  });

  assert.equal(result.outcome, 'success');
  assert.ok(seen.includes('turn_started'));
  assert.equal(traceStore.items.length, 1);
  assert.equal(traceStore.items[0]?.resolution.selected.traits.qualityClass, 'balanced');
  assert.equal(traceStore.items[0]?.telemetry.verification, 'passed');
});

test('quality degradation requests authority before creating the session', async () => {
  let sessions = 0;
  const providerFactory = async () => {
    const base = createInMemoryProvider();
    return {
      ...base,
      async createSession(input: Parameters<RuntimeProvider['createSession']>[0]) {
        sessions += 1;
        return base.createSession(input);
      }
    };
  };
  const control = new RecordingControlBridge('request_approval');
  const { runtime } = createRuntime({ control, providerFactory });
  const result = await runtime.execute({
    ...standardRequest(),
    taskId: 'task-powerful',
    taskClass: 'architecture/planning',
    requirement: { class: 'powerful', reasoning: 'high', latency: 'quality_first', context: 'standard' }
  });

  assert.equal(result.outcome, 'awaiting_approval');
  assert.equal(control.requests[0]?.type, 'modelQualityDegradation');
  assert.equal(sessions, 0);
});

test('hard resource deny blocks provider session creation when override is not authorized', async () => {
  let sessions = 0;
  const providerFactory = async () => {
    const base = createInMemoryProvider();
    return {
      ...base,
      async createSession(input: Parameters<RuntimeProvider['createSession']>[0]) {
        sessions += 1;
        return base.createSession(input);
      }
    };
  };
  const control = new RecordingControlBridge('blocked');
  const { runtime } = createRuntime({
    control,
    providerFactory,
    resources: new ResourcePolicyEngine([new BudgetResourcePolicy()])
  });
  const result = await runtime.execute({
    ...standardRequest(),
    resource: {
      scopeKey: 'task:task-1',
      budget: { maxTotalTokens: 100 },
      usage: { totalTokens: 90 },
      projected: { totalTokens: 20 }
    }
  });

  assert.equal(result.outcome, 'resource_denied');
  assert.equal(result.resource?.outcome, 'deny');
  assert.equal(control.requests[0]?.type, 'resourceBudgetOverride');
  assert.equal(sessions, 0);
});

test('authorized resource override bypasses one hard preflight deny and creates exactly one session', async () => {
  let sessions = 0;
  const providerFactory = async () => {
    const base = createInMemoryProvider();
    return {
      ...base,
      async createSession(input: Parameters<RuntimeProvider['createSession']>[0]) {
        sessions += 1;
        return base.createSession(input);
      }
    };
  };
  const control = new RecordingControlBridge('execute');
  const { runtime } = createRuntime({
    control,
    providerFactory,
    resources: new ResourcePolicyEngine([new BudgetResourcePolicy()])
  });
  const result = await runtime.execute({
    ...standardRequest(),
    resource: {
      scopeKey: 'task:task-1',
      budget: { maxTotalTokens: 100 },
      usage: { totalTokens: 90 },
      projected: { totalTokens: 20 }
    }
  });

  assert.equal(result.outcome, 'success');
  assert.equal(control.requests.filter((request) => request.type === 'resourceBudgetOverride').length, 1);
  assert.equal(sessions, 1);
});

test('resource warning is observable without blocking and remains on final trace', async () => {
  const { runtime, traceStore } = createRuntime({
    resources: new ResourcePolicyEngine([new BudgetResourcePolicy()])
  });
  const seen: RuntimeEvent[] = [];
  const result = await runtime.execute({
    ...standardRequest(),
    resource: {
      scopeKey: 'task:task-1',
      budget: { maxTotalTokens: 100 },
      usage: { totalTokens: 60 },
      projected: { totalTokens: 20 }
    },
    onEvent: (event) => seen.push(event)
  });

  assert.equal(result.outcome, 'success');
  assert.equal(traceStore.items[0]?.resource?.outcome, 'warn');
  assert.ok(seen.some((event) => event.type === 'runtime_warning' && event.data.code === 'resource_warn'));
});

test('throttled resource preflight returns retry guidance without creating a model-quality failure', async () => {
  let sessions = 0;
  const providerFactory = async () => {
    const base = createInMemoryProvider();
    return {
      ...base,
      async createSession(input: Parameters<RuntimeProvider['createSession']>[0]) {
        sessions += 1;
        return base.createSession(input);
      }
    };
  };
  const throttle: ResourcePolicy = {
    evaluate: () => ({ outcome: 'throttle', reasons: ['window exceeded'], retryAfterMs: 750 })
  };
  const { runtime } = createRuntime({
    providerFactory,
    resources: new ResourcePolicyEngine([throttle])
  });
  const result = await runtime.execute({
    ...standardRequest(),
    resource: { scopeKey: 'session:s1', usage: {}, projected: { totalTokens: 10 } }
  });

  assert.equal(result.outcome, 'throttled');
  assert.equal(result.resource?.retryAfterMs, 750);
  assert.equal(result.failure, undefined);
  assert.equal(sessions, 0);
});

test('pricing estimate is attached after real usage is observed', async () => {
  const { runtime, traceStore } = createRuntime({
    pricing: { estimate: () => ({ amount: 0.004, currency: 'USD' }) }
  });
  await runtime.execute(standardRequest());

  assert.deepEqual(traceStore.items[0]?.telemetry.estimatedCost, { amount: 0.004, currency: 'USD' });
});

test('provider approval event is authorized through control bridge and resolved on the session', async () => {
  let approvalDecision: string | undefined;
  const providerFactory = async (): Promise<RuntimeProvider> => {
    const base = createInMemoryProvider();
    return {
      ...base,
      async createSession(input) {
        const session = await base.createSession(input);
        const wrapped: RuntimeSession = {
          ...session,
          async *runTurn(turn) {
            yield {
              type: 'approval_requested', delivery: 'lossless',
              meta: { sessionId: input.sessionId, turnId: turn.turnId, eventId: 'approval-e1', timestamp: '2026-08-08T10:00:00Z' },
              requestId: 'provider-approval-1',
              action: { id: 'tool-a1', type: 'toolExecution', source: 'runtime-provider', reason: 'test tool', confidence: 'high', payload: {} }
            } as const;
            yield* session.runTurn(turn);
          },
          async respondToApproval(requestId, resolution) {
            assert.equal(requestId, 'provider-approval-1');
            approvalDecision = resolution.decision;
          }
        };
        return wrapped;
      }
    };
  };
  const control = new RecordingControlBridge('execute');
  const { runtime } = createRuntime({ providerFactory, control });
  const result = await runtime.execute(standardRequest());

  assert.equal(result.outcome, 'success');
  assert.equal(approvalDecision, 'approved');
  assert.ok(control.requests.some((request) => request.id === 'tool-a1'));
});
