# AES Milestone 3.1 — Runtime Contracts & Model Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add provider-neutral runtime/session/event/telemetry contracts and an explainable model resolver that turns AES capability requirements into a concrete provider model without leaking Codex concepts upward.

**Architecture:** Extend `@aes/spec` with normative runtime vocabulary, extend `@aes/runtime-sdk` with provider-facing interfaces, and introduce `@aes/runtime` with a pure `ModelResolver`. Resolution uses hard filtering first and preference ranking second; quality-degrading fallback is explicit and authorization-ready.

**Tech Stack:** TypeScript 5.8, Node.js 22+, ESM/NodeNext, built-in `node:test` + `node:assert`, no mandatory runtime dependencies.

## Global Constraints

- Node.js MUST remain `>=22`.
- Default tests MUST remain deterministic, offline, and free of model/API cost.
- `@aes/kernel` MUST NOT import Codex-specific types or packages.
- `@aes/runtime-sdk` MUST NOT import Codex protocol types.
- Provider-specific protocol events MUST NOT escape `@aes/adapter-codex`.
- Model fallback MUST NOT silently reduce required quality capability.
- Unknown telemetry/pricing/context values MUST remain unknown.
- Existing Milestone 2 `RuntimeAdapter`, `ExecutionProfile`, `DecisionTrace`, and `.aes/` memory semantics remain compatible.

---

## File Structure

Create or modify these focused units:

```text
packages/spec/src/runtime.ts                     normative runtime vocabulary
packages/spec/src/intelligence.ts                new control action/source values
packages/spec/src/index.ts                       public exports

packages/runtime-sdk/src/provider.ts             RuntimeProvider + capabilities
packages/runtime-sdk/src/session.ts              RuntimeSession + session inputs/state
packages/runtime-sdk/src/events.ts               normalized RuntimeEvent union
packages/runtime-sdk/src/resolution.ts           model requirement/catalog/resolution contracts
packages/runtime-sdk/src/telemetry.ts            usage/runtime telemetry contracts
packages/runtime-sdk/src/control.ts              RuntimeControlBridge
packages/runtime-sdk/src/verification.ts         RuntimeVerificationBridge
packages/runtime-sdk/src/observability.ts        runtime/decision/learning observation sink
packages/runtime-sdk/src/pricing.ts              PricingProvider contracts
packages/runtime-sdk/src/storage.ts              TraceStore + checkpoint-store interfaces
packages/runtime-sdk/src/index.ts                public exports

packages/runtime/package.json                    new provider-neutral runtime package
packages/runtime/tsconfig.json                    package compiler config
packages/runtime/src/model-resolver.ts           pure hard-filter/rank/fallback algorithm
packages/runtime/src/index.ts                    public exports
```

### Task 1: Add normative runtime vocabulary to `@aes/spec`

**Files:**
- Create: `packages/spec/src/runtime.ts`
- Modify: `packages/spec/src/intelligence.ts`
- Modify: `packages/spec/src/index.ts`
- Modify: `packages/kernel/src/kernel.ts`
- Test: `packages/spec/src/__tests__/runtime.test.ts`
- Test: `packages/kernel/src/__tests__/kernel-intelligence.test.ts`

**Interfaces:**
- Consumes: existing `ModelClass`, `Confidence`, `ControlActionType`, `ActionRequest`.
- Produces: `RuntimeFailureKind`, `RuntimeOutcome`, `RuntimeVerification`, `ModelReasoning`, `ModelLatencyPreference`, `ModelContextRequirement`, `ModelCostPreference`, and extended control source/action vocabulary.

- [ ] **Step 1: Write the failing spec test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTROL_ACTION_TYPES,
  RUNTIME_FAILURE_KINDS,
  RUNTIME_OUTCOMES
} from '../index.js';

test('milestone 3 runtime vocabulary is provider-neutral and exported', () => {
  assert.ok(CONTROL_ACTION_TYPES.includes('modelQualityDegradation'));
  assert.ok(RUNTIME_FAILURE_KINDS.includes('provider_crashed'));
  assert.ok(RUNTIME_FAILURE_KINDS.includes('action_ambiguous'));
  assert.deepEqual(RUNTIME_OUTCOMES, ['success', 'failed', 'cancelled', 'recovered']);
});
```

- [ ] **Step 2: Build `@aes/spec` and verify RED**

Run:
```bash
tsc -p packages/spec/tsconfig.json && node --test packages/spec/dist/__tests__/runtime.test.js
```
Expected: TypeScript/test failure because the new exports do not exist.

- [ ] **Step 3: Add the minimal runtime vocabulary**

Create `packages/spec/src/runtime.ts` with exact unions/constants:

```ts
export const RUNTIME_FAILURE_KINDS = [
  'transport_failed',
  'provider_crashed',
  'provider_unavailable',
  'model_unavailable',
  'rate_limited',
  'session_lost',
  'approval_failed',
  'action_ambiguous',
  'execution_failed',
  'context_exhausted',
  'verification_failed',
  'cancelled'
] as const;
export type RuntimeFailureKind = (typeof RUNTIME_FAILURE_KINDS)[number];

export const RUNTIME_OUTCOMES = ['success', 'failed', 'cancelled', 'recovered'] as const;
export type RuntimeOutcome = (typeof RUNTIME_OUTCOMES)[number];

export type RuntimeVerification = 'passed' | 'failed' | 'not_run';
export type ModelReasoning = 'low' | 'medium' | 'high';
export type ModelLatencyPreference = 'prefer_fast' | 'balanced' | 'quality_first';
export type ModelContextRequirement = 'standard' | 'large';
export type ModelCostPreference = 'minimize' | 'balanced' | 'quality_first';
```

Extend `CONTROL_ACTION_TYPES` with `modelQualityDegradation` and extend `ActionRequest.source` with `runtime-provider`. Re-export from `packages/spec/src/index.ts`.

Because `AESKernel.capabilityAvailable()` currently exhaustively maps every `ControlActionType`, update it in the same task so adding the new action does not break Milestone 2. Treat quality-degradation authorization as an AES policy decision rather than a provider capability:

```ts
if (action === 'handoffCreation' || action === 'modelQualityDegradation') return true;
```

Then type the remaining capability mapping as:

```ts
const mapping: Record<
  Exclude<ActionRequest['type'], 'handoffCreation' | 'modelQualityDegradation'>,
  keyof RuntimeCapabilities
> = {
  modelRouting: 'modelRouting',
  fastMode: 'fastMode',
  toolExecution: 'toolExecution',
  contextCompaction: 'contextCompaction',
  memoryPromotion: 'persistentMemory',
  conversationTransition: 'conversationTransition'
};
```

Add this regression assertion to `kernel-intelligence.test.ts` using the existing kernel fixture in that file:

```ts
const decision = kernel.controlAction({
  id: 'degrade-1',
  type: 'modelQualityDegradation',
  source: 'runtime-provider',
  reason: 'powerful unavailable',
  confidence: 'high',
  payload: { requested: 'powerful', available: 'balanced' }
}, { aes: { default: 'assisted' } });
assert.equal(decision.outcome, 'request_approval');
```

- [ ] **Step 4: Re-run the focused test and existing spec/kernel suites**

Run:
```bash
tsc -p packages/spec/tsconfig.json && node --test packages/spec/dist/__tests__/*.test.js
tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/kernel-intelligence.test.js
```
Expected: all spec tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/spec/src/runtime.ts packages/spec/src/intelligence.ts packages/spec/src/index.ts packages/spec/src/__tests__/runtime.test.ts packages/kernel/src/kernel.ts packages/kernel/src/__tests__/kernel-intelligence.test.ts
git commit -m "feat(spec): add provider-neutral runtime vocabulary"
```

### Task 2: Define provider/session/event contracts in `@aes/runtime-sdk`

**Files:**
- Create: `packages/runtime-sdk/src/provider.ts`
- Create: `packages/runtime-sdk/src/session.ts`
- Create: `packages/runtime-sdk/src/events.ts`
- Create: `packages/runtime-sdk/src/resolution.ts`
- Create: `packages/runtime-sdk/src/control.ts`
- Create: `packages/runtime-sdk/src/verification.ts`
- Create: `packages/runtime-sdk/src/observability.ts`
- Modify: `packages/runtime-sdk/src/capabilities.ts`
- Modify: `packages/runtime-sdk/src/index.ts`
- Test: `packages/runtime-sdk/src/__tests__/runtime-contracts.test.ts`

**Interfaces:**
- Consumes: `ModelClass`, runtime vocabulary from `@aes/spec`, existing `RuntimeCapabilities`.
- Produces: `RuntimeProvider`, `RuntimeProviderCapabilities`, `RuntimeSession`, `RuntimeSessionState`, `RuntimeEvent`, `ModelRequirement`, `AvailableModel`, `ModelResolution`, `RuntimeControlBridge`, `RuntimeVerificationBridge`, `RuntimeObservation`, `RuntimeObservationSink`.

- [ ] **Step 1: Write compile/runtime tests for the neutral contract surface**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  AvailableModel,
  ModelRequirement,
  RuntimeEvent,
  RuntimeProviderCapabilities,
  RuntimeSessionState
} from '../index.js';

const requirement: ModelRequirement = {
  class: 'balanced',
  reasoning: 'medium',
  latency: 'prefer_fast',
  context: 'standard',
  costPreference: 'balanced'
};

const model: AvailableModel = {
  id: 'model-a',
  provider: 'test',
  capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium'] },
  traits: { qualityClass: 'balanced', latencyClass: 'fast' },
  availability: 'available'
};

test('runtime contracts express requirements without provider-specific names', () => {
  assert.equal(requirement.class, 'balanced');
  assert.equal(model.provider, 'test');
  const state: RuntimeSessionState = 'awaiting_approval';
  const event: RuntimeEvent = {
    type: 'turn_started',
    delivery: 'lossless',
    meta: { sessionId: 's1', eventId: 'e1', timestamp: '2026-08-08T00:00:00Z' }
  };
  const caps: RuntimeProviderCapabilities = {
    modelDiscovery: true,
    modelRouting: true,
    fastMode: true,
    streaming: true,
    toolExecution: true,
    approvals: true,
    tokenTelemetry: true,
    contextTelemetry: true,
    contextCompaction: true,
    sessionResume: true,
    sessionCancellation: true,
    conversationTransition: false,
    persistentMemory: false
  };
  assert.equal(state, 'awaiting_approval');
  assert.equal(event.type, 'turn_started');
  assert.equal(caps.modelDiscovery, true);
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime-sdk/tsconfig.json
```
Expected: compile failure for missing contract exports.

- [ ] **Step 3: Implement the minimal contract files**

Use these exact core signatures:

```ts
export interface RuntimeProvider {
  readonly id: string;
  getCapabilities(): Promise<RuntimeProviderCapabilities>;
  discoverModels(options?: { forceRefresh?: boolean }): Promise<AvailableModel[]>;
  createSession(input: CreateRuntimeSessionInput): Promise<RuntimeSession>;
  resumeSession(checkpoint: SessionCheckpoint): Promise<RuntimeSession>;
  shutdown(): Promise<void>;
}
```

```ts
export interface RuntimeSession {
  readonly sessionId: string;
  readonly providerSessionId: string;
  runTurn(request: RuntimeTurnRequest): AsyncIterable<RuntimeEvent>;
  respondToApproval(requestId: string, resolution: RuntimeApprovalResolution): Promise<void>;
  compact(): Promise<void>;
  cancel(reason?: string): Promise<void>;
  checkpoint(): Promise<SessionCheckpoint>;
  close(): Promise<void>;
}
```

Define `RuntimeEvent` with these stable shapes in `events.ts`:

```ts
export interface RuntimeEventMeta {
  taskId?: string;
  sessionId: string;
  turnId?: string;
  eventId: string;
  timestamp: string;
}

interface RuntimeEventBase {
  meta: RuntimeEventMeta;
  delivery: 'lossless' | 'coalescible';
}

export type RuntimeEvent =
  | (RuntimeEventBase & { type: 'turn_started'; delivery: 'lossless' })
  | (RuntimeEventBase & { type: 'output_delta'; delivery: 'coalescible'; data: { text: string } })
  | (RuntimeEventBase & { type: 'tool_requested'; delivery: 'lossless'; requestId: string; actionId?: string; toolName: string })
  | (RuntimeEventBase & { type: 'tool_completed'; delivery: 'lossless'; actionId?: string; ok: boolean })
  | (RuntimeEventBase & { type: 'approval_requested'; delivery: 'lossless'; requestId: string; action: ActionRequest })
  | (RuntimeEventBase & { type: 'usage_updated'; delivery: 'coalescible'; data: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } })
  | (RuntimeEventBase & { type: 'context_updated'; delivery: 'coalescible'; data: { contextRevision: number; inputTokens?: number; contextWindow?: number } })
  | (RuntimeEventBase & { type: 'compaction_started'; delivery: 'lossless' })
  | (RuntimeEventBase & { type: 'compaction_completed'; delivery: 'lossless'; data: { contextRevision: number } })
  | (RuntimeEventBase & { type: 'turn_completed'; delivery: 'lossless'; data: { outcome: RuntimeOutcome } })
  | (RuntimeEventBase & { type: 'runtime_warning'; delivery: 'lossless'; data: { code?: string; message: string } })
  | (RuntimeEventBase & { type: 'runtime_failed'; delivery: 'lossless'; data: { kind: RuntimeFailureKind; message: string } });
```

Add these exact supporting contracts in `session.ts`/`control.ts` so no later task invents names:

```ts
export type RuntimeSessionState =
  | 'created' | 'starting' | 'ready' | 'running'
  | 'awaiting_approval' | 'compacting' | 'recovering'
  | 'failed' | 'cancelled' | 'completed';

export interface RuntimeTurnRequest {
  turnId: string;
  input: { kind: 'text'; text: string };
}

export interface RuntimeApprovalResolution {
  decision: 'approved' | 'rejected';
}

export interface CreateRuntimeSessionInput {
  sessionId: string;
  workspaceId: string;
  model: ResolvedModelProfile;
}

export interface SessionCheckpoint {
  sessionId: string;
  provider: string;
  providerSessionId: string;
  state: RuntimeSessionState;
  lastEventId?: string;
  lastActionId?: string;
  modelProfile: ResolvedModelProfile;
  contextRevision: number;
  checkpointAt: string;
}

export interface RuntimeAuthorizationResult {
  outcome: 'recommend' | 'request_approval' | 'execute' | 'blocked';
  reason: string;
}

export interface RuntimeControlBridge {
  authorize(request: ActionRequest): Promise<RuntimeAuthorizationResult>;
}
```

Add a neutral verification bridge in `verification.ts` so runtime evidence can become verified without importing kernel/workflow classes:

```ts
export interface RuntimeVerificationInput {
  taskId: string;
  sessionId: string;
  turnId?: string;
  provider: string;
  model: string;
}

export interface RuntimeVerificationBridge {
  verify(input: RuntimeVerificationInput): Promise<RuntimeVerification>;
}
```

When no verification bridge is supplied by the composition root, runtime telemetry MUST use `verification: 'not_run'` rather than inventing success.

Add the observation contract in `observability.ts` so `@aes/runtime` can publish audit events without importing the kernel bus:

```ts
export type RuntimeObservation =
  | { type: 'runtime.session.started'; sessionId: string; workspaceId: string }
  | { type: 'runtime.provider.failed'; workspaceId: string; kind: RuntimeFailureKind }
  | { type: 'runtime.session.recovering'; sessionId: string }
  | { type: 'runtime.session.recovered'; sessionId: string }
  | { type: 'decision.model.selected'; resolution: ModelResolution }
  | { type: 'decision.model.fallback'; resolution: ModelResolution }
  | { type: 'experience.trace.recorded'; traceId: string };

export interface RuntimeObservationSink {
  emit(event: RuntimeObservation): void;
}
```

Define `RuntimeProviderCapabilities` as the exact capability set in the approved spec. Keep the old synchronous `RuntimeCapabilities` exported for the compatibility `RuntimeAdapter` rather than deleting it.

Define the resolution contracts in `resolution.ts` with these stable names:

```ts
export type ModelCapability = 'coding' | 'toolUse';

export interface ModelRequirement {
  class: ModelClass;
  reasoning: ModelReasoning;
  latency: ModelLatencyPreference;
  context: ModelContextRequirement;
  capabilities?: ModelCapability[];
  costPreference?: ModelCostPreference;
}

export interface PricingMetadata {
  inputPerMillion?: number;
  outputPerMillion?: number;
  cachedInputPerMillion?: number;
  currency?: string;
}

export interface AvailableModel {
  id: string;
  provider: string;
  capabilities: {
    coding: boolean;
    toolUse: boolean;
    reasoningLevels?: ModelReasoning[];
    contextWindow?: number;
  };
  traits: {
    qualityClass: ModelClass;
    latencyClass?: 'fast' | 'standard' | 'slow';
  };
  availability: 'available' | 'unavailable' | 'unknown';
  pricing?: PricingMetadata;
}

export interface ResolvedModelProfile extends AvailableModel {
  selectedReasoning?: ModelReasoning;
}

export interface ModelAlternative {
  modelId: string;
  status: 'candidate' | 'rejected';
  reasons: string[];
}

export interface ModelFallbackResult {
  used: boolean;
  type: 'none' | 'equivalent' | 'acceptable_degradation' | 'quality_degradation' | 'request_replan';
  reason?: string;
}

export interface ModelResolution {
  requested: ModelRequirement;
  selected: ResolvedModelProfile;
  reasons: string[];
  alternatives: ModelAlternative[];
  fallback: ModelFallbackResult;
}
```

- [ ] **Step 4: Build and run all runtime-sdk tests**

Run:
```bash
tsc -p packages/spec/tsconfig.json
tsc -p packages/runtime-sdk/tsconfig.json
node --test packages/runtime-sdk/dist/__tests__/*.test.js
```
Expected: all runtime-sdk tests PASS, including the existing `RuntimeAdapter` contract test.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime-sdk/src packages/runtime-sdk/src/__tests__/runtime-contracts.test.ts
git commit -m "feat(runtime-sdk): define provider session and event contracts"
```

### Task 3: Add telemetry, pricing, trace-store, and checkpoint-store interfaces

**Files:**
- Create: `packages/runtime-sdk/src/telemetry.ts`
- Create: `packages/runtime-sdk/src/pricing.ts`
- Create: `packages/runtime-sdk/src/storage.ts`
- Modify: `packages/runtime-sdk/src/index.ts`
- Test: `packages/runtime-sdk/src/__tests__/telemetry-storage-contracts.test.ts`

**Interfaces:**
- Consumes: `RuntimeFailureKind`, `RuntimeOutcome`, `RuntimeVerification`, `ModelRequirement`, `ModelResolution`.
- Produces: `RuntimeTelemetry`, `RuntimeExperienceEvidence`, `UsageRecord`, `Money`, `CostEstimate`, `PricingProvider`, `RuntimeDecisionTrace`, `TraceQuery`, `AggregateQuery`, `AggregateResult`, `TraceStore`, `SessionCheckpoint`, `SessionCheckpointStore`, `KnowledgeStore`.

- [ ] **Step 1: Write failing tests proving unknown values stay unknown**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type { PricingProvider, RuntimeTelemetry, UsageRecord } from '../index.js';

class NoPricing implements PricingProvider {
  estimate(_usage: UsageRecord) { return undefined; }
}

test('missing pricing and token telemetry remain unknown', () => {
  const telemetry: RuntimeTelemetry = {
    provider: 'test',
    model: 'm1',
    durationMs: 10,
    retries: 0,
    compactions: 0,
    outcome: 'success',
    verification: 'not_run'
  };
  assert.equal(telemetry.inputTokens, undefined);
  assert.equal(new NoPricing().estimate({ provider: 'test', model: 'm1' }), undefined);
});
```

- [ ] **Step 2: Verify RED with TypeScript**

Run:
```bash
tsc -p packages/runtime-sdk/tsconfig.json
```
Expected: missing telemetry/storage/pricing symbols.

- [ ] **Step 3: Implement exact neutral interfaces**

Use optional numeric telemetry fields; do not substitute zero for unavailable values. Define these exact evidence contracts:

```ts
export interface Money {
  amount: number;
  currency: string;
}

export interface RuntimeTelemetry {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  durationMs: number;
  retries: number;
  compactions: number;
  estimatedCost?: Money;
  outcome: RuntimeOutcome;
  verification: RuntimeVerification;
}

export interface RuntimeFailureEvidence {
  kind: RuntimeFailureKind;
  attributableToModelQuality: boolean;
  fingerprint?: string;
}

export interface RuntimeExperienceEvidence {
  id: string;
  taskClass: string;
  verification: RuntimeVerification;
  retries: number;
  userInterruptions: number;
  attributableToModelQuality: boolean;
  providerRecoveries: number;
  durationMs?: number;
  estimatedCost?: Money;
}

export interface RuntimeDecisionTrace {
  traceId: string;
  taskId?: string;
  taskClass?: string;
  sessionId: string;
  turnId?: string;
  timestamp: string;
  requirement: ModelRequirement;
  resolution: ModelResolution;
  telemetry: RuntimeTelemetry;
  providerRecoveries: number;
  userInterruptions: number;
  failure?: RuntimeFailureEvidence;
  cancellation?: { initiator: 'user' | 'runtime' };
  context?: { before?: 'good' | 'growing' | 'start_fresh'; after?: 'good' | 'growing' | 'start_fresh' };
}
```

Define query/aggregate shapes before `TraceStore`:

```ts
export interface TraceQuery {
  provider?: string;
  model?: string;
  outcome?: RuntimeOutcome;
  verification?: RuntimeVerification;
  taskClass?: string;
  from?: string;
  to?: string;
}

export interface AggregateQuery extends TraceQuery {}

export interface AggregateResult {
  count: number;
  successCount: number;
  retryCount: number;
}
```

Define `TraceStore` as:

```ts
export interface TraceStore {
  append(trace: RuntimeDecisionTrace): Promise<void>;
  query(query: TraceQuery): Promise<RuntimeDecisionTrace[]>;
  aggregate(query: AggregateQuery): Promise<AggregateResult>;
}
```

Define `SessionCheckpointStore` as:

```ts
export interface SessionCheckpointStore {
  save(checkpoint: SessionCheckpoint): Promise<void>;
  load(sessionId: string): Promise<SessionCheckpoint | undefined>;
  remove(sessionId: string): Promise<void>;
}
```

Formalize the Milestone 2 knowledge boundary without moving knowledge semantics into runtime code:

```ts
export interface KnowledgeSearchResult<TMetadata = unknown> {
  path: string;
  content: string;
  metadata?: TMetadata;
}

export interface KnowledgeStore<TMetadata = unknown> {
  initialize(): Promise<void>;
  searchKnowledge(query: string, limit?: number): Promise<KnowledgeSearchResult<TMetadata>[]>;
  writeKnowledge(path: string, content: string, metadata: TMetadata): Promise<void>;
  appendLog(message: string): Promise<void>;
}
```

`RuntimeDecisionTrace` MUST contain only normalized evidence fields and MUST NOT include prompt/source/tool-output properties.

- [ ] **Step 4: Build and run runtime-sdk suite**

Run:
```bash
tsc -p packages/runtime-sdk/tsconfig.json && node --test packages/runtime-sdk/dist/__tests__/*.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime-sdk/src/telemetry.ts packages/runtime-sdk/src/pricing.ts packages/runtime-sdk/src/storage.ts packages/runtime-sdk/src/index.ts packages/runtime-sdk/src/__tests__/telemetry-storage-contracts.test.ts
git commit -m "feat(runtime-sdk): add telemetry pricing and storage contracts"
```

### Task 4: Scaffold `@aes/runtime` and implement hard filtering

**Files:**
- Create: `packages/runtime/package.json`
- Create: `packages/runtime/tsconfig.json`
- Create: `packages/runtime/src/model-resolver.ts`
- Create: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/__tests__/model-resolver.test.ts`

**Interfaces:**
- Consumes: `ModelRequirement`, `AvailableModel`, `ModelResolution` from `@aes/runtime-sdk`.
- Produces: `ModelResolver.resolve(input): ModelResolution` and `ModelResolutionError`.

- [ ] **Step 1: Write failing hard-filter tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ModelResolver } from '../index.js';

const models = [
  {
    id: 'cheap-fast', provider: 'test',
    capabilities: { coding: true, toolUse: true, reasoningLevels: ['low'] },
    traits: { qualityClass: 'cheap', latencyClass: 'fast' },
    availability: 'available'
  },
  {
    id: 'balanced', provider: 'test',
    capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium'] },
    traits: { qualityClass: 'balanced', latencyClass: 'standard' },
    availability: 'available'
  }
] as const;

test('hard filtering never selects a lower quality model for a balanced requirement', () => {
  const resolution = new ModelResolver().resolve({
    requirement: {
      class: 'balanced', reasoning: 'medium', latency: 'balanced', context: 'standard'
    },
    models: [...models]
  });
  assert.equal(resolution.selected.id, 'balanced');
  assert.ok(resolution.alternatives.some((x) => x.modelId === 'cheap-fast' && x.status === 'rejected'));
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: missing package/source implementation.

- [ ] **Step 3: Implement package scaffold and hard constraints**

Create `packages/runtime/package.json` exactly as:

```json
{
  "name": "@aes/runtime",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./dist/index.js" },
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "node --test dist/__tests__/*.test.js"
  },
  "dependencies": {
    "@aes/runtime-sdk": "workspace:*",
    "@aes/spec": "workspace:*"
  }
}
```

Create `packages/runtime/tsconfig.json` as:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist" },
  "include": ["src/**/*.ts"]
}
```

`ModelResolver.resolve` must first reject models that are unavailable, lack mandatory capabilities, cannot meet required reasoning, or have a lower `qualityClass` than requested. Use an explicit quality order:

```ts
const QUALITY_RANK = { cheap: 0, balanced: 1, powerful: 2 } as const;
```

Do not compute ranking until the hard candidate set is known.

- [ ] **Step 4: Build and run focused tests**

Run:
```bash
tsc -p packages/spec/tsconfig.json
tsc -p packages/runtime-sdk/tsconfig.json
tsc -p packages/runtime/tsconfig.json
node --test packages/runtime/dist/__tests__/model-resolver.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime
git commit -m "feat(runtime): add hard-constrained model resolver"
```

### Task 5: Add preference ranking and classified fallback

**Files:**
- Modify: `packages/runtime/src/model-resolver.ts`
- Test: `packages/runtime/src/__tests__/model-resolver.test.ts`

**Interfaces:**
- Consumes: hard-filtered candidates from Task 4.
- Produces: deterministic ranking, `equivalent`, `acceptable_degradation`, `quality_degradation`, or `request_replan` fallback metadata.

- [ ] **Step 1: Add failing ranking/fallback tests**

```ts
test('prefer_fast chooses fast candidate after hard filtering', () => {
  const resolver = new ModelResolver();
  const resolution = resolver.resolve({
    requirement: {
      class: 'balanced', reasoning: 'medium', latency: 'prefer_fast', context: 'standard'
    },
    models: [
      balanced('slow', 'standard'),
      balanced('fast', 'fast')
    ]
  });
  assert.equal(resolution.selected.id, 'fast');
});

test('lower quality availability produces explicit quality degradation instead of silent selection', () => {
  const resolver = new ModelResolver();
  const resolution = resolver.resolve({
    requirement: {
      class: 'powerful', reasoning: 'high', latency: 'quality_first', context: 'standard'
    },
    models: [balanced('only-balanced', 'standard')],
    allowQualityDegradationCandidate: true
  });
  assert.equal(resolution.fallback.type, 'quality_degradation');
  assert.equal(resolution.selected.traits.qualityClass, 'balanced');
});
```

Define this local helper in the test file; do not add it to production code:

```ts
function balanced(id: string, latencyClass: 'fast' | 'standard' | 'slow') {
  return {
    id,
    provider: 'test',
    capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium'] },
    traits: { qualityClass: 'balanced' as const, latencyClass },
    availability: 'available' as const
  };
}
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/model-resolver.test.js
```
Expected: at least the new fallback/ranking assertions FAIL.

- [ ] **Step 3: Implement deterministic ranking and fallback classification**

Ranking order for equal hard-fit candidates:
1. exact quality-class fit before excess quality;
2. latency fit;
3. known lower estimated cost when `costPreference === 'minimize'`;
4. stable lexical model ID as final deterministic tie-breaker.

Historical evidence hooks may be accepted as optional input but MUST NOT be required in this slice. `quality_degradation` candidates are returned only when explicitly requested through the resolver input so the caller can authorize them through Control Engine.

- [ ] **Step 4: Run runtime package suite and root architecture tests**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
node --test packages/runtime/dist/__tests__/*.test.js
tsc -p packages/kernel/tsconfig.json
node --test packages/kernel/dist/__tests__/vendor-boundary.test.js
```
Expected: PASS; vendor boundary remains green.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/model-resolver.ts packages/runtime/src/__tests__/model-resolver.test.ts
git commit -m "feat(runtime): classify model fallback and ranking"
```

## Plan 3.1 Verification Gate

Run all offline package builds/tests without live Codex:

```bash
for p in spec runtime-sdk runtime kernel adapter-codex cli; do
  tsc -p "packages/$p/tsconfig.json"
done
for p in spec runtime-sdk runtime kernel adapter-codex cli; do
  if compgen -G "packages/$p/dist/__tests__/*.test.js" > /dev/null; then
    node --test packages/$p/dist/__tests__/*.test.js
  fi
done
```

Expected: zero failures. No test may require a Codex binary, network access, API credentials, or mutable public pricing data.
