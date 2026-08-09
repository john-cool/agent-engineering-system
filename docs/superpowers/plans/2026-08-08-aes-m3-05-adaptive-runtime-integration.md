# AES Milestone 3.5 — Adaptive Runtime Integration & Live Codex Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire model resolution, control authority, workspace-scoped provider lifecycle, recovery, telemetry persistence, Milestone 2 experience feeding, and an opt-in live Codex smoke test into a complete Adaptive Runtime.

**Architecture:** `AdaptiveRuntime` orchestrates one neutral execution request. `WorkspaceRuntimeSupervisor` owns one provider process per workspace and recovery only. A kernel-backed `RuntimeControlBridge` lives in the composition layer, not in `@aes/runtime`, preserving dependency inversion. Real execution writes normalized traces/checkpoints and only verified evidence enters experience aggregation.

**Tech Stack:** TypeScript 5.8, Node.js 22+, ESM, built-in tests, Codex App Server only in opt-in integration command.

## Global Constraints

- Runtime orchestration MUST NOT import concrete `ControlEngine` from `@aes/kernel`.
- Provider approval authority MUST pass through `RuntimeControlBridge`.
- One provider process per workspace; no global Codex process.
- Provider crash recovery is automatic by default but bounded by retry budget/circuit breaker.
- Ambiguous side effects are never automatically repeated.
- Provider failures/rate limits/cancellation are excluded from model-quality success attribution.
- Live integration is opt-in and skipped clearly if Codex is absent.
- Every selected concrete model and fallback is explainable in the persisted trace.

---

## File Structure

```text
packages/runtime/src/workspace-runtime-supervisor.ts    workspace/provider lifecycle
packages/runtime/src/recovery-coordinator.ts            checkpoint reconciliation
packages/runtime/src/adaptive-runtime.ts                top-level orchestration
packages/runtime/src/experience-adapter.ts              runtime trace -> M2 evidence conversion
packages/runtime/src/index.ts                           exports

packages/kernel/src/runtime-control-bridge.ts           kernel-backed bridge implementation
packages/kernel/src/runtime-observation-sink.ts          forwards runtime observations to KernelEventBus
packages/kernel/src/events.ts                            runtime observation event map
packages/kernel/src/experience-engine.ts                consume attributable runtime evidence
packages/kernel/src/index.ts                            exports

packages/cli/src/runtime-config.ts                      minimal runtime config parsing/composition
packages/cli/src/codex-smoke.ts                         opt-in live smoke command helper
packages/cli/src/codex-live.integration.test.ts         opt-in real Codex test entry
packages/cli/src/index.ts                               existing CLI entry point
```

### Task 1: Implement workspace-scoped supervisor reuse and shutdown

**Files:**
- Create: `packages/runtime/src/workspace-runtime-supervisor.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/__tests__/workspace-runtime-supervisor.test.ts`

**Interfaces:**
- Consumes: `RuntimeProvider`, `CircuitBreaker`, retry policy.
- Produces: `WorkspaceRuntimeSupervisor.getProvider(workspaceId)`, `createSession`, `resumeSession`, `shutdownWorkspace`, `shutdownAll`.

- [ ] **Step 1: Write failing process/provider reuse test**

```ts
test('supervisor creates one provider per workspace and reuses it across sessions', async () => {
  let created = 0;
  const supervisor = new WorkspaceRuntimeSupervisor({
    providerFactory: async () => { created += 1; return createInMemoryProvider(); }
  });
  await supervisor.getProvider('/workspace/a');
  await supervisor.getProvider('/workspace/a');
  await supervisor.getProvider('/workspace/b');
  assert.equal(created, 2);
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: missing supervisor.

- [ ] **Step 3: Implement lazy keyed provider lifecycle**

Use this constructor contract:

```ts
new WorkspaceRuntimeSupervisor({
  providerFactory: (workspaceId: string) => Promise<RuntimeProvider>,
  recovery?: { providerRestartRetries: number; circuitBreakerThreshold: number }
})
```

Use normalized absolute workspace ID as the key supplied by the caller. The supervisor owns provider instances, active session metadata, circuit breaker, and restart counts; it does not select model class or authority mode.

- [ ] **Step 4: Add shutdown test and run suite**

Run:
```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/workspace-runtime-supervisor.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/workspace-runtime-supervisor.ts packages/runtime/src/index.ts packages/runtime/src/__tests__/workspace-runtime-supervisor.test.ts
git commit -m "feat(runtime): supervise one provider per workspace"
```

### Task 2: Implement recovery reconciliation with ambiguous side-effect guard

**Files:**
- Create: `packages/runtime/src/recovery-coordinator.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/__tests__/recovery-coordinator.test.ts`

**Interfaces:**
- Consumes: `SessionCheckpoint`, provider resume result, retry budget, `RuntimeControlBridge` for ambiguous actions.
- Produces: `RecoveryCoordinator.recover(input): 'safe' | 'ambiguous' | 'lost'` plus resumed session when safe.

- [ ] **Step 1: Write failing safe/ambiguous/lost tests**

```ts
import { RecordingControlBridge } from '@aes/runtime-sdk/testing';
import { checkpoint } from './fixtures.js';

test('ambiguous completed tool boundary is not replayed automatically', async () => {
  const bridge = new RecordingControlBridge('request_approval');
  const recovery = new RecoveryCoordinator({ control: bridge });
  const result = await recovery.reconcile({
    checkpoint: checkpoint({ lastActionId: 'a1', state: 'recovering' }),
    providerState: { lastEventId: 'e9', actionState: 'unknown' }
  });
  assert.equal(result.kind, 'ambiguous');
  assert.equal(bridge.requests[0]?.type, 'toolExecution');
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: missing coordinator.

- [ ] **Step 3: Implement reconciliation rules**

`safe`: provider/session identity recovered and no unknown side-effect completion exists. `ambiguous`: last known side-effect action completion cannot be established; emit an authorization request and do not call execution again. `lost`: provider session cannot resume or checkpoint identity is irreconcilable. Never classify provider crash as verification failure.

- [ ] **Step 4: Run tests and commit**

```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/recovery-coordinator.test.js
```
Expected: PASS.

```bash
git add packages/runtime/src/recovery-coordinator.ts packages/runtime/src/index.ts packages/runtime/src/__tests__/recovery-coordinator.test.ts
git commit -m "feat(runtime): reconcile provider crashes without replaying ambiguous effects"
```

### Task 3: Add kernel-backed RuntimeControlBridge without circular dependency

**Files:**
- Create: `packages/kernel/src/runtime-control-bridge.ts`
- Create: `packages/kernel/src/runtime-observation-sink.ts`
- Modify: `packages/kernel/src/events.ts`
- Modify: `packages/kernel/src/index.ts`
- Test: `packages/kernel/src/__tests__/runtime-control-bridge.test.ts`
- Test: `packages/kernel/src/__tests__/runtime-observation-sink.test.ts`
- Modify: `packages/kernel/src/__tests__/vendor-boundary.test.ts`

**Interfaces:**
- Consumes: `ControlEngine`, `ControlScopes`, `RuntimeControlBridge`.
- Produces: `KernelRuntimeControlBridge.authorize(request)` and `KernelRuntimeObservationSink.emit(event)`.

- [ ] **Step 1: Write failing bridge authority test**

```ts
test('runtime provider approval is resolved through ControlEngine mode', async () => {
  const bridge = new KernelRuntimeControlBridge({
    controlEngine: new ControlEngine(),
    scopes: { aes: { default: 'assisted' } },
    capabilityAvailable: () => true
  });
  const result = await bridge.authorize({
    id: 'a1', type: 'toolExecution', source: 'runtime-provider',
    reason: 'provider requested tool authority', confidence: 'high', payload: {}
  });
  assert.equal(result.outcome, 'request_approval');
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/kernel/tsconfig.json
```
Expected: missing bridge.

- [ ] **Step 3: Implement bridge as composition adapter**

The control bridge delegates `resolveMode`/`decide` to `ControlEngine` and returns neutral authorization data. Do not import `@aes/runtime` from kernel; import only interfaces from `@aes/runtime-sdk`.

Add `KernelRuntimeObservationSink` with this exact behavior:

```ts
export class KernelRuntimeObservationSink implements RuntimeObservationSink {
  constructor(private readonly events: KernelEventBus) {}
  emit(event: RuntimeObservation): void {
    this.events.emit('runtime.observation', event);
  }
}
```

Extend `KernelEventMap` with:

```ts
'runtime.observation': RuntimeObservation;
```

Add a test that emits `decision.model.selected` through the sink and receives the same normalized observation from `KernelEventBus`. Extend vendor-boundary test so `packages/runtime/src` also cannot import `@aes/adapter-*` or `@aes/kernel`.

- [ ] **Step 4: Run kernel tests and commit**

```bash
tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/runtime-control-bridge.test.js packages/kernel/dist/__tests__/runtime-observation-sink.test.js packages/kernel/dist/__tests__/vendor-boundary.test.js
```
Expected: PASS.

```bash
git add packages/kernel/src/runtime-control-bridge.ts packages/kernel/src/runtime-observation-sink.ts packages/kernel/src/events.ts packages/kernel/src/index.ts packages/kernel/src/__tests__/runtime-control-bridge.test.ts packages/kernel/src/__tests__/runtime-observation-sink.test.ts packages/kernel/src/__tests__/vendor-boundary.test.ts
git commit -m "feat(kernel): bridge runtime authority through control engine"
```

### Task 4: Implement AdaptiveRuntime orchestration, resource governance, and quality-degradation authorization

**Files:**
- Create: `packages/runtime/src/adaptive-runtime.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/__tests__/adaptive-runtime.test.ts`

**Interfaces:**
- Consumes: `ModelResolver`, `ResourcePolicyEngine`, `WorkspaceRuntimeSupervisor`, `RuntimeControlBridge`, `RuntimeVerificationBridge?`, `RuntimeObservationSink?`, `TraceStore`, `SessionCheckpointStore`, `PricingProvider?`, `RuntimeTraceAccumulator`.
- Produces: `AdaptiveRuntime.execute(request): Promise<AdaptiveRuntimeResult>` with event forwarding through `request.onEvent?`, plus `cancel(sessionId, reason?)`.

- [ ] **Step 1: Write failing happy-path test**

Use the neutral test doubles exported from `@aes/runtime-sdk` in Plan 3.3:

```ts
import {
  InMemoryCheckpointStore,
  InMemoryTraceStore,
  RecordingControlBridge,
  FixedVerificationBridge,
  createInMemoryProvider
} from '@aes/runtime-sdk/testing';

function createRuntime(traceStore = new InMemoryTraceStore(), control = new RecordingControlBridge('execute')) {
  return {
    traceStore,
    runtime: new AdaptiveRuntime({
      resolver: new ModelResolver(),
      supervisor: new WorkspaceRuntimeSupervisor({ providerFactory: async () => createInMemoryProvider() }),
      control,
      traceStore,
      checkpointStore: new InMemoryCheckpointStore(),
      verification: new FixedVerificationBridge('passed')
    })
  };
}

test('adaptive runtime resolves model, forwards events, and persists one normalized trace', async () => {
  const { runtime, traceStore } = createRuntime();
  const seen: string[] = [];
  const result = await runtime.execute({
    workspaceId: '/workspace/a', taskId: 'task-1', taskClass: 'approved-plan/typescript/execution',
    requirement: { class: 'balanced', reasoning: 'medium', latency: 'prefer_fast', context: 'standard' },
    turn: { turnId: 'turn-1', input: { kind: 'text', text: 'synthetic task' } },
    onEvent: (event) => seen.push(event.type)
  });
  assert.equal(result.outcome, 'success');
  assert.ok(seen.includes('turn_started'));
  assert.equal(traceStore.items.length, 1);
  assert.equal(traceStore.items[0]?.resolution.selected.traits.qualityClass, 'balanced');
});
```

- [ ] **Step 2: Add failing quality-degradation authorization test**

```ts
test('quality degradation requests authority before creating the session', async () => {
  const control = new RecordingControlBridge('request_approval');
  const { runtime } = createRuntime(new InMemoryTraceStore(), control);
  const result = await runtime.execute({
    workspaceId: '/workspace/a', taskId: 'task-powerful', taskClass: 'architecture/planning',
    requirement: { class: 'powerful', reasoning: 'high', latency: 'quality_first', context: 'standard' },
    turn: { turnId: 'turn-1', input: { kind: 'text', text: 'synthetic architecture task' } }
  });
  assert.equal(result.outcome, 'awaiting_approval');
  assert.equal(control.requests[0]?.type, 'modelQualityDegradation');
});
```

- [ ] **Step 3: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: missing `AdaptiveRuntime`.

- [ ] **Step 4: Implement orchestration in the approved order**

Use these public shapes:

```ts
export interface AdaptiveRuntimeRequest {
  workspaceId: string;
  taskId: string;
  taskClass: string;
  requirement: ModelRequirement;
  turn: RuntimeTurnRequest;
  onEvent?: (event: RuntimeEvent) => void;
}

export interface AdaptiveRuntimeResult {
  outcome: RuntimeOutcome | 'awaiting_approval';
  resolution?: ModelResolution;
  trace?: RuntimeDecisionTrace;
  failure?: RuntimeFailureEvidence;
  recovery?: { circuitState: 'closed' | 'open' | 'half_open' };
}

export class AdaptiveRuntime {
  constructor(options: {
    resolver: ModelResolver;
    supervisor: WorkspaceRuntimeSupervisor;
    control: RuntimeControlBridge;
    traceStore: TraceStore;
    checkpointStore: SessionCheckpointStore;
    pricing?: PricingProvider;
    verification?: RuntimeVerificationBridge;
    observations?: RuntimeObservationSink;
  });
  execute(request: AdaptiveRuntimeRequest): Promise<AdaptiveRuntimeResult>;
  cancel(sessionId: string, reason?: string): Promise<void>;
}
```

Exact order: provider capabilities/catalog -> resolver with `allowQualityDegradationCandidate: true` so a lower-quality candidate is classified rather than executed -> emit `decision.model.selected`/`decision.model.fallback` -> quality-degradation authorization when `resolution.fallback.type === 'quality_degradation'` -> supervisor/session -> emit `runtime.session.started` -> event stream -> control bridge for provider approval events -> checkpoint updates -> trace accumulation -> optional verification bridge (`not_run` when absent) -> pricing estimate if available -> final trace append -> emit `experience.trace.recorded`. Do not interpret `rate_limited`, `provider_crashed`, `transport_failed`, or `cancelled` as model-quality failure.

- [ ] **Step 5: Run focused runtime tests and commit**

```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/adaptive-runtime.test.js
```
Expected: PASS.

```bash
git add packages/runtime/src/adaptive-runtime.ts packages/runtime/src/index.ts packages/runtime/src/__tests__/adaptive-runtime.test.ts
git commit -m "feat(runtime): orchestrate adaptive provider execution"
```


Resource-governance requirements for this task:

- evaluate task/session resource policies before provider session creation and after meaningful usage updates;
- `deny` MUST block provider execution unless one explicit `resourceBudgetOverride` action is authorized through `RuntimeControlBridge`;
- `warn` MUST remain observable without blocking execution;
- `throttle` MUST return deterministic retry guidance and MUST NOT be converted into an execution/model-quality failure;
- a resource-budget constraint MUST NOT silently trigger a lower-quality model than the existing `ModelRequirement`;
- when present, the final normalized trace MUST retain the resource decision/outcome without prompt/source/tool payloads.

Add focused tests before implementation: one denied preflight proving `createSession()` is never called, one approved override proving exactly one bypass, one warning path, and one throttled-window path with `retryAfterMs`.

### Task 5: Wire bounded automatic provider recovery into AdaptiveRuntime

**Files:**
- Modify: `packages/runtime/src/workspace-runtime-supervisor.ts`
- Modify: `packages/runtime/src/adaptive-runtime.ts`
- Test: `packages/runtime/src/__tests__/adaptive-runtime-recovery.test.ts`

**Interfaces:**
- Consumes: retry budget, circuit breaker, recovery coordinator, checkpoint store.
- Produces: automatic safe restart/resume and normalized recovered/ambiguous/lost outcomes.

- [ ] **Step 1: Write failing crash/resume test**

```ts
import type { RuntimeProvider } from '@aes/runtime-sdk';
import {
  InMemoryCheckpointStore,
  InMemoryTraceStore,
  RecordingControlBridge,
  FixedVerificationBridge,
  createInMemoryProvider
} from '@aes/runtime-sdk/testing';

function makeCrashingProvider(): RuntimeProvider {
  const base = createInMemoryProvider();
  const createSession = base.createSession.bind(base);
  return {
    ...base,
    async createSession(input) {
      const session = await createSession(input);
      return {
        ...session,
        async *runTurn(request) {
          yield {
            type: 'turn_started', delivery: 'lossless',
            meta: { sessionId: input.sessionId, turnId: request.turnId, eventId: 'crash-e1', timestamp: '2026-08-08T10:00:00Z' }
          } as const;
          const error = new Error('synthetic provider crash') as Error & { kind: string };
          error.kind = 'provider_crashed';
          throw error;
        }
      };
    }
  };
}

function standardRequest() {
  return {
    workspaceId: '/workspace/a', taskId: 'task-1', taskClass: 'approved-plan/typescript/execution',
    requirement: { class: 'balanced' as const, reasoning: 'medium' as const, latency: 'prefer_fast' as const, context: 'standard' as const },
    turn: { turnId: 'turn-1', input: { kind: 'text' as const, text: 'synthetic task' } }
  };
}

test('provider crash restarts once and resumes a safe session', async () => {
  let created = 0;
  const providerFactory = async () => (++created === 1 ? makeCrashingProvider() : createInMemoryProvider());
  const runtime = new AdaptiveRuntime({
    resolver: new ModelResolver(),
    supervisor: new WorkspaceRuntimeSupervisor({ providerFactory, recovery: { providerRestartRetries: 2, circuitBreakerThreshold: 2 } }),
    control: new RecordingControlBridge('execute'),
    traceStore: new InMemoryTraceStore(),
    checkpointStore: new InMemoryCheckpointStore(),
    verification: new FixedVerificationBridge('passed')
  });
  const result = await runtime.execute(standardRequest());
  assert.equal(result.outcome, 'recovered');
  assert.equal(created, 2);
  assert.equal(result.trace?.providerRecoveries, 1);
});
```

- [ ] **Step 2: Write failing circuit-breaker test**

```ts
test('repeated provider crashes open the circuit instead of restarting forever', async () => {
  const runtime = new AdaptiveRuntime({
    resolver: new ModelResolver(),
    supervisor: new WorkspaceRuntimeSupervisor({
      providerFactory: async () => makeCrashingProvider(),
      recovery: { providerRestartRetries: 2, circuitBreakerThreshold: 2 }
    }),
    control: new RecordingControlBridge('execute'),
    traceStore: new InMemoryTraceStore(),
    checkpointStore: new InMemoryCheckpointStore(),
    verification: new FixedVerificationBridge('passed')
  });
  const result = await runtime.execute(standardRequest());
  assert.equal(result.failure?.kind, 'provider_unavailable');
  assert.equal(result.recovery?.circuitState, 'open');
});
```

- [ ] **Step 3: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/adaptive-runtime-recovery.test.js
```
Expected: new recovery assertions FAIL.

- [ ] **Step 4: Integrate supervisor restart and reconciliation**

Consume exactly one retry-budget entry per restart attempt. On safe reconcile, resume. On ambiguous reconcile, return/await authority without replay. On lost session, stop safely. Circuit breaker prevents further automatic restart when open.

- [ ] **Step 5: Run runtime suite and commit**

```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/*.test.js
```
Expected: PASS.

```bash
git add packages/runtime/src/workspace-runtime-supervisor.ts packages/runtime/src/adaptive-runtime.ts packages/runtime/src/__tests__/adaptive-runtime-recovery.test.ts
git commit -m "feat(runtime): recover workspace providers within bounded budgets"
```

### Task 6: Feed attributable verified runtime evidence into Milestone 2 Experience Engine

**Files:**
- Create: `packages/runtime/src/experience-adapter.ts`
- Modify: `packages/kernel/src/experience-engine.ts`
- Test: `packages/kernel/src/__tests__/experience-runtime-evidence.test.ts`
- Test: `packages/runtime/src/__tests__/experience-adapter.test.ts`

**Interfaces:**
- Consumes: `RuntimeDecisionTrace`.
- Produces: `toExperienceEvidence(trace)` and Experience Engine filtering of non-attributable infrastructure outcomes.

- [ ] **Step 1: Write failing attribution test**

```ts
import { sampleTrace } from './fixtures.js';

test('provider crash is excluded from model-quality success statistics', () => {
  const base = sampleTrace();
  const evidence = toExperienceEvidence(sampleTrace({
    telemetry: { ...base.telemetry, outcome: 'failed', verification: 'not_run' },
    failure: { kind: 'provider_crashed', attributableToModelQuality: false }
  }));
  assert.equal(evidence.attributableToModelQuality, false);
});
```

- [ ] **Step 2: Write failing cancellation test in Experience Engine**

```ts
import type { RuntimeExperienceEvidence } from '@aes/runtime-sdk';

const cancelled: RuntimeExperienceEvidence = {
  id: 'ev-cancelled', taskClass: 'approved-plan/typescript/execution',
  verification: 'not_run', retries: 0, userInterruptions: 1,
  attributableToModelQuality: false, providerRecoveries: 0
};
const passed: RuntimeExperienceEvidence = {
  id: 'ev-passed', taskClass: 'approved-plan/typescript/execution',
  verification: 'passed', retries: 0, userInterruptions: 0,
  attributableToModelQuality: true, providerRecoveries: 0
};

test('cancelled runtime evidence does not count as a failed model result', () => {
  const hypothesis = new ExperienceEngine().aggregateRuntimeEvidence([cancelled, passed], 'prefer-balanced');
  assert.equal(hypothesis.sampleCount, 1);
  assert.equal(hypothesis.successCount, 1);
});
```

- [ ] **Step 3: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
tsc -p packages/kernel/tsconfig.json
```
Expected: missing adapter/new aggregation path.

- [ ] **Step 4: Implement additive runtime-evidence aggregation**

Keep existing `ExperienceEngine.aggregate()` behavior for M2 deterministic traces. Add `aggregateRuntimeEvidence()` rather than changing old semantics. Only records with `attributableToModelQuality === true` enter the existing hypothesis `sampleCount`/`successCount`; cancelled/provider-infrastructure records are excluded from quality statistics. Recovery/infrastructure counts remain available in raw runtime traces and trace aggregation rather than being misrepresented as model-quality samples.

- [ ] **Step 5: Run tests and commit**

```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/experience-adapter.test.js
tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/experience-runtime-evidence.test.js packages/kernel/dist/__tests__/experience-engine.test.js
```
Expected: PASS.

```bash
git add packages/runtime/src/experience-adapter.ts packages/runtime/src/__tests__/experience-adapter.test.ts packages/kernel/src/experience-engine.ts packages/kernel/src/__tests__/experience-runtime-evidence.test.ts
git commit -m "feat(learning): consume attributable runtime evidence"
```

### Task 7: Add minimal runtime configuration and opt-in live Codex smoke test

**Files:**
- Modify: `package.json`
- Modify: `packages/cli/package.json`
- Create: `packages/cli/src/runtime-config.ts`
- Create: `packages/cli/src/codex-smoke.ts`
- Create: `packages/cli/src/codex-live.integration.test.ts`
- Test: `packages/cli/src/__tests__/runtime-config.test.ts`
- Test: `packages/cli/src/__tests__/codex-smoke.test.ts`

**Interfaces:**
- Consumes: `CodexProvider`, `AdaptiveRuntime`, config semantics from spec.
- Produces: opt-in `test:integration:codex` script and skip behavior when `codex` is unavailable.

- [ ] **Step 1: Write failing config-default test**

```ts
test('runtime config defaults raw provider event capture off and quality degradation to assisted', () => {
  const config = normalizeRuntimeConfig({ runtime: { provider: 'codex' } });
  assert.equal(config.telemetry.providerRawEvents, false);
  assert.equal(config.modelResolution.qualityDegradation, 'assisted');
  assert.equal(config.codex.processScope, 'workspace');
});
```

- [ ] **Step 2: Write failing live-smoke skip test with injected binary detector**

```ts
test('codex smoke skips cleanly when binary is unavailable', async () => {
  const result = await runCodexSmoke({ findBinary: async () => undefined });
  assert.deepEqual(result, { status: 'skipped', reason: 'codex binary not found' });
});
```

- [ ] **Step 3: Verify RED**

Run:
```bash
tsc -p packages/cli/tsconfig.json
```
Expected: missing config/smoke helpers.

- [ ] **Step 4: Implement config normalization and safe smoke runner**

The real smoke path detects `codex`, starts App Server through `CodexProvider`, discovers models, creates one disposable session, runs a minimal non-destructive turn, observes normalized events/available usage, and shuts down. No destructive command/tool request is approved automatically in the smoke test.

Update `packages/cli/package.json` dependencies so the composition package can legally import the runtime pieces:

```json
"dependencies": {
  "@aes/spec": "workspace:*",
  "@aes/kernel": "workspace:*",
  "@aes/runtime-sdk": "workspace:*",
  "@aes/runtime": "workspace:*",
  "@aes/adapter-codex": "workspace:*"
}
```

Create `packages/cli/src/codex-live.integration.test.ts` outside `src/__tests__` so the default CLI glob does not run it:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { runCodexSmoke } from './codex-smoke.js';

test('live Codex App Server smoke', async (t) => {
  const result = await runCodexSmoke();
  if (result.status === 'skipped') {
    t.skip(result.reason);
    return;
  }
  assert.equal(result.status, 'passed');
});
```

Add root script:

```json
"test:integration:codex": "tsc -p packages/spec/tsconfig.json && tsc -p packages/runtime-sdk/tsconfig.json && tsc -p packages/runtime/tsconfig.json && tsc -p packages/adapter-codex/tsconfig.json && tsc -p packages/cli/tsconfig.json && node --test packages/cli/dist/codex-live.integration.test.js"
```

The live integration test file must use Node test skip semantics when detection/configuration is unavailable; it must never run as part of the default package test glob unless named outside `__tests__/*.test.ts` or explicitly filtered by script.

- [ ] **Step 5: Run offline CLI tests and commit**

```bash
tsc -p packages/cli/tsconfig.json && node --test packages/cli/dist/__tests__/runtime-config.test.js packages/cli/dist/__tests__/codex-smoke.test.js
```
Expected: PASS without Codex installed.

```bash
git add package.json packages/cli/package.json packages/cli/src/runtime-config.ts packages/cli/src/codex-smoke.ts packages/cli/src/codex-live.integration.test.ts packages/cli/src/__tests__/runtime-config.test.ts packages/cli/src/__tests__/codex-smoke.test.ts
git commit -m "feat(cli): add adaptive runtime config and opt-in codex smoke"
```

### Task 8: Add Milestone 3 end-to-end deterministic scenario and final architecture gate

**Files:**
- Create: `packages/runtime/src/__tests__/milestone3-scenario.test.ts`
- Modify: `packages/kernel/src/__tests__/vendor-boundary.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: all Milestone 3 contracts/components.
- Produces: deterministic executable proof of normal execution + crash recovery + trace persistence + experience attribution.

- [ ] **Step 1: Write the end-to-end failing scenario**

The test must execute a provider-neutral request against the fake Codex provider and assert:

```ts
assert.equal(result.resolution.selected.traits.qualityClass, 'balanced');
assert.equal(result.outcome, 'recovered');
assert.equal(result.trace?.providerRecoveries, 1);
assert.equal(result.trace?.telemetry.verification, 'passed');
assert.equal(traceStore.items.length, 1);
assert.equal(JSON.stringify(traceStore.items[0]).includes('synthetic task body'), false);
```

Also add a separate ambiguous-side-effect scenario asserting that `executeAction`/provider tool side effect count remains `1` after recovery and Control Bridge receives an approval/recovery request instead of a replay.

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/milestone3-scenario.test.js
```
Expected: any uncovered integration gap fails explicitly.

- [ ] **Step 3: Add the minimal composition wiring exercised by the scenario**

If the test is RED because the runtime components are not exported/composed, make only these permitted changes: export existing `AdaptiveRuntime`, `WorkspaceRuntimeSupervisor`, `ModelResolver`, stores, and recovery primitives from `packages/runtime/src/index.ts`; export `CodexProvider` from `packages/adapter-codex/src/index.ts`; and construct them in the test with `RecordingControlBridge`, `InMemoryTraceStore`, and `InMemoryCheckpointStore`. Do not add a new orchestration layer or new state machine in this step.

- [ ] **Step 4: Update README with exact offline/live commands and privacy defaults**

Document:
- `@aes/runtime` purpose;
- Codex is first provider, not core architecture;
- default offline test command sequence;
- opt-in `npm run test:integration:codex`/equivalent script;
- `.aes/raw/traces` stores normalized evidence only by default;
- `providerRawEvents: false` default.

- [ ] **Step 5: Run complete final gate**

```bash
rm -rf packages/*/dist
for p in spec runtime-sdk runtime kernel adapter-codex cli; do tsc -p "packages/$p/tsconfig.json"; done
for p in spec runtime-sdk runtime kernel adapter-codex cli; do
  if compgen -G "packages/$p/dist/__tests__/*.test.js" > /dev/null; then node --test packages/$p/dist/__tests__/*.test.js; fi
done
git diff --check
```

Expected: all offline tests PASS, zero architecture violations, `git diff --check` clean. Do not claim live Codex success unless `npm run test:integration:codex` is actually run in an environment with a working Codex binary/account.

- [ ] **Step 6: Commit**

```bash
git add packages/runtime/src/__tests__/milestone3-scenario.test.ts packages/kernel/src/__tests__/vendor-boundary.test.ts README.md
git commit -m "test: verify milestone 3 adaptive runtime end to end"
```

## Plan 3.5 Final Verification Gate

The completion claim for Milestone 3 requires fresh evidence from:

```bash
rm -rf packages/*/dist
for p in spec runtime-sdk runtime kernel adapter-codex cli; do tsc -p "packages/$p/tsconfig.json"; done
for p in spec runtime-sdk runtime kernel adapter-codex cli; do
  if compgen -G "packages/$p/dist/__tests__/*.test.js" > /dev/null; then node --test packages/$p/dist/__tests__/*.test.js; fi
done
git diff --check
```

Additionally, if a functioning local Codex environment is available:

```bash
npm run test:integration:codex
```

If unavailable, report the live test as **SKIPPED/NOT VERIFIED**, never as passed.
