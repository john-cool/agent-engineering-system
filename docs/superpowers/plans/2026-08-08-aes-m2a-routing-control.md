# AES Milestone 2A — Routing and Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic task analysis, explainable model routing, control authority resolution, runtime capability declarations, and rename the Codex integration to an adapter package.

**Architecture:** Keep semantic classification injectable and optional. The kernel owns decisions; `@aes/runtime-sdk` owns runtime contracts; adapters only translate AES actions into vendor operations. Control resolution is deterministic and separates engineering recommendation, authority, and runtime capability.

**Tech Stack:** TypeScript 5.8+, Node.js 22+, ESM, node:test, pnpm workspace manifests; no new runtime dependency is required.

## Global Constraints

- Core packages MUST remain vendor-neutral and MUST NOT import `@aes/adapter-*`.
- `balanced` is the default model class.
- `powerful` routing requires a concrete consequential-decision reason.
- Approved planning MUST trigger de-escalation for normal execution.
- Fast/latency mode is independent from model class.
- Control resolution precedence is AES default -> user -> project -> session -> explicit current user decision.
- `manual`, `assisted`, and `autonomous` MUST remain distinct outcomes.
- Missing runtime capability MUST fall back without a false execution claim.
- Existing Milestone 1 workflow tests MUST continue to pass.

---

### Task 1: Add Milestone 2 routing/control specification types

**Files:**
- Create: `packages/spec/src/intelligence.ts`
- Modify: `packages/spec/src/index.ts`
- Test: `packages/spec/src/__tests__/intelligence.test.ts`

**Interfaces:**
- Consumes: `LifecycleState`, `ModelClass`, `ContextHealth` from `packages/spec/src/common.ts`.
- Produces: `Confidence`, `PlanStatus`, `TaskComplexity`, `TaskAnalysis`, `ModelDecision`, `ExecutionProfile`, `ControlMode`, `ControlActionType`, `ControlConfig`, `ActionRequest`, `ControlDecision`, `RuntimeCapabilityName`.

- [ ] **Step 1: Write the failing type/runtime-constant test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTROL_ACTION_TYPES,
  CONTROL_MODES,
  PLAN_STATUSES,
  type ActionRequest,
  type ModelDecision,
  type TaskAnalysis
} from '../index.js';

test('milestone 2 routing and control constants expose stable values', () => {
  assert.deepEqual(CONTROL_MODES, ['manual', 'assisted', 'autonomous']);
  assert.deepEqual(PLAN_STATUSES, ['none', 'draft', 'approved', 'invalidated']);
  assert.ok(CONTROL_ACTION_TYPES.includes('conversationTransition'));

  const analysis: TaskAnalysis = {
    stage: 'discovery',
    planStatus: 'none',
    ambiguity: 'medium',
    risk: 'low',
    taskComplexity: 'standard',
    confidence: 'medium',
    failedAttempts: 0,
    architecturalDecisionRequired: false,
    evidenceSufficient: false,
    reasons: ['user request not yet inspected']
  };
  const decision: ModelDecision = {
    modelClass: 'balanced',
    confidence: 'high',
    reasons: ['default route'],
    transition: 'keep',
    latencyMode: 'fast'
  };
  const action: ActionRequest = {
    id: 'a-1',
    type: 'modelRouting',
    source: 'model-router',
    reason: 'planning requires deeper reasoning',
    confidence: 'high',
    payload: { to: 'powerful' }
  };
  assert.equal(analysis.stage, 'discovery');
  assert.equal(decision.modelClass, 'balanced');
  assert.equal(action.type, 'modelRouting');
});
```

- [ ] **Step 2: Run the spec test to verify RED**

Run: `npm exec -- tsc -p packages/spec/tsconfig.json && node --test packages/spec/dist/__tests__/intelligence.test.js`

Expected: FAIL because `CONTROL_ACTION_TYPES` / Milestone 2 types are not exported.

- [ ] **Step 3: Implement the minimal specification module**

```ts
import type { LifecycleState, ModelClass } from './common.js';

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];
export const PLAN_STATUSES = ['none', 'draft', 'approved', 'invalidated'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export const TASK_COMPLEXITIES = ['mechanical', 'standard', 'complex'] as const;
export type TaskComplexity = (typeof TASK_COMPLEXITIES)[number];
export const CONTROL_MODES = ['manual', 'assisted', 'autonomous'] as const;
export type ControlMode = (typeof CONTROL_MODES)[number];
export const CONTROL_ACTION_TYPES = [
  'modelRouting', 'fastMode', 'toolExecution', 'contextCompaction',
  'handoffCreation', 'memoryPromotion', 'conversationTransition'
] as const;
export type ControlActionType = (typeof CONTROL_ACTION_TYPES)[number];

export interface TaskAnalysis {
  stage: LifecycleState;
  planStatus: PlanStatus;
  ambiguity: Confidence;
  risk: Confidence;
  taskComplexity: TaskComplexity;
  confidence: Confidence;
  failedAttempts: number;
  architecturalDecisionRequired: boolean;
  evidenceSufficient: boolean;
  reasons: string[];
}

export interface ModelDecision {
  modelClass: ModelClass;
  confidence: Confidence;
  reasons: string[];
  previousClass?: ModelClass;
  transition: 'keep' | 'upgrade' | 'downgrade';
  latencyMode: 'fast' | 'standard';
}

export interface ExecutionProfile { modelClass: ModelClass; latencyMode: 'fast' | 'standard'; }
export interface ControlConfig { default: ControlMode; actions?: Partial<Record<ControlActionType, ControlMode>>; }
export interface ActionRequest {
  id: string;
  type: ControlActionType;
  source: 'context-engine' | 'model-router' | 'handoff-engine' | 'policy-engine' | 'experience-engine' | 'user';
  reason: string;
  confidence: Confidence;
  payload: unknown;
}
export interface ControlDecision {
  actionId: string;
  mode: ControlMode;
  outcome: 'recommend' | 'request_approval' | 'execute' | 'blocked';
  reason: string;
}
export type RuntimeCapabilityName = ControlActionType | 'contextTelemetry' | 'tokenTelemetry' | 'handoffInjection' | 'persistentMemory';
```

Add `export * from './intelligence.js';` to `packages/spec/src/index.ts`.

- [ ] **Step 4: Re-run the test and full spec test set**

Run: `npm exec -- tsc -p packages/spec/tsconfig.json && node --test packages/spec/dist/__tests__/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/spec/src/intelligence.ts packages/spec/src/index.ts packages/spec/src/__tests__/intelligence.test.ts
git commit -m "feat(spec): add milestone 2 routing and control types"
```

---

### Task 2: Add deterministic TaskAnalyzer and injectable semantic classifier

**Files:**
- Create: `packages/kernel/src/task-analyzer.ts`
- Create: `packages/kernel/src/__tests__/task-analyzer.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: `TaskAnalysis`, `PlanStatus`, lifecycle facts.
- Produces: `SemanticTaskClassifier`, `TaskAnalyzerInput`, `TaskAnalyzer.analyze(input): Promise<TaskAnalysis>`.

- [ ] **Step 1: Write failing tests for deterministic priority and semantic fallback**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskAnalyzer } from '../task-analyzer.js';

test('approved execution plan resolves without semantic classifier', async () => {
  let calls = 0;
  const analyzer = new TaskAnalyzer({ classify: async () => { calls++; throw new Error('should not call'); } });
  const result = await analyzer.analyze({ stage: 'execution', planStatus: 'approved', failedAttempts: 0 });
  assert.equal(result.taskComplexity, 'standard');
  assert.equal(result.evidenceSufficient, true);
  assert.equal(calls, 0);
});

test('unknown discovery request uses semantic classifier when rules are insufficient', async () => {
  const analyzer = new TaskAnalyzer({
    classify: async () => ({
      ambiguity: 'high', risk: 'medium', taskComplexity: 'complex', confidence: 'high',
      architecturalDecisionRequired: true, reasons: ['cross-system design requested']
    })
  });
  const result = await analyzer.analyze({ stage: 'discovery', planStatus: 'none', failedAttempts: 0, request: 'redesign auth' });
  assert.equal(result.architecturalDecisionRequired, true);
  assert.equal(result.confidence, 'high');
});
```

- [ ] **Step 2: Run targeted test to verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because `task-analyzer.ts` does not exist.

- [ ] **Step 3: Implement deterministic-first analyzer**

```ts
import type { Confidence, LifecycleState, PlanStatus, TaskAnalysis, TaskComplexity } from '@aes/spec';

export interface SemanticTaskClassification {
  ambiguity: Confidence;
  risk: Confidence;
  taskComplexity: TaskComplexity;
  confidence: Confidence;
  architecturalDecisionRequired: boolean;
  reasons: string[];
}
export interface SemanticTaskClassifier { classify(request: string): Promise<SemanticTaskClassification>; }
export interface TaskAnalyzerInput {
  stage: LifecycleState;
  planStatus: PlanStatus;
  failedAttempts: number;
  request?: string;
}

export class TaskAnalyzer {
  constructor(private readonly classifier?: SemanticTaskClassifier) {}

  async analyze(input: TaskAnalyzerInput): Promise<TaskAnalysis> {
    if (input.planStatus === 'invalidated') {
      return {
        ...base(input), ambiguity: 'high', risk: 'medium', taskComplexity: 'complex', confidence: 'high',
        architecturalDecisionRequired: true, evidenceSufficient: true,
        reasons: ['existing plan is invalidated']
      };
    }
    if (input.stage === 'execution' && input.planStatus === 'approved') {
      return {
        ...base(input), ambiguity: 'low', risk: 'low', taskComplexity: 'standard', confidence: 'high',
        architecturalDecisionRequired: false, evidenceSufficient: true,
        reasons: ['approved plan exists for execution']
      };
    }
    if (input.request && this.classifier) {
      const semantic = await this.classifier.classify(input.request);
      return { ...base(input), ...semantic, evidenceSufficient: semantic.confidence !== 'low' };
    }
    return {
      ...base(input), ambiguity: 'medium', risk: 'medium', taskComplexity: 'standard', confidence: 'low',
      architecturalDecisionRequired: false, evidenceSufficient: false,
      reasons: ['insufficient deterministic evidence and no semantic classification']
    };
  }
}

function base(input: TaskAnalyzerInput) {
  return { stage: input.stage, planStatus: input.planStatus, failedAttempts: input.failedAttempts };
}
```

- [ ] **Step 4: Run analyzer tests**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/task-analyzer.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/task-analyzer.ts packages/kernel/src/__tests__/task-analyzer.test.ts packages/kernel/src/index.ts
git commit -m "feat(kernel): add deterministic task analyzer"
```

---

### Task 3: Replace legacy model decision logic with explainable ModelRouter

**Files:**
- Create: `packages/kernel/src/model-router.ts`
- Create: `packages/kernel/src/__tests__/model-router.test.ts`
- Modify: `packages/kernel/src/decision-engine.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: `TaskAnalysis`, current `ModelClass`, optional escalation reason state.
- Produces: `ModelRouter.route(analysis, currentClass): ModelDecision`.

- [ ] **Step 1: Write failing route/de-escalation tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ModelRouter } from '../model-router.js';

const router = new ModelRouter();

test('architecture planning upgrades balanced to powerful', () => {
  const decision = router.route({
    stage: 'planning', planStatus: 'none', ambiguity: 'high', risk: 'medium', taskComplexity: 'complex',
    confidence: 'high', failedAttempts: 0, architecturalDecisionRequired: true, evidenceSufficient: true,
    reasons: ['architecture choice required']
  }, 'balanced');
  assert.equal(decision.modelClass, 'powerful');
  assert.equal(decision.transition, 'upgrade');
});

test('approved execution plan downgrades powerful to balanced', () => {
  const decision = router.route({
    stage: 'execution', planStatus: 'approved', ambiguity: 'low', risk: 'low', taskComplexity: 'standard',
    confidence: 'high', failedAttempts: 0, architecturalDecisionRequired: false, evidenceSufficient: true,
    reasons: ['approved plan exists']
  }, 'powerful');
  assert.equal(decision.modelClass, 'balanced');
  assert.equal(decision.transition, 'downgrade');
  assert.equal(decision.latencyMode, 'fast');
});
```

- [ ] **Step 2: Run targeted compile to verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because `ModelRouter` is missing.

- [ ] **Step 3: Implement minimal routing rules with hysteresis**

```ts
import type { ModelClass, ModelDecision, TaskAnalysis } from '@aes/spec';

const rank: Record<ModelClass, number> = { cheap: 0, balanced: 1, powerful: 2 };

export class ModelRouter {
  route(analysis: TaskAnalysis, current: ModelClass = 'balanced'): ModelDecision {
    let target: ModelClass = 'balanced';
    const reasons: string[] = [];
    if (analysis.stage === 'planning' && analysis.architecturalDecisionRequired && analysis.evidenceSufficient) {
      target = 'powerful'; reasons.push('planning requires a consequential architectural decision');
    } else if (analysis.stage === 'execution' && analysis.planStatus === 'approved' && analysis.taskComplexity === 'mechanical' && analysis.risk === 'low' && analysis.confidence === 'high') {
      target = 'cheap'; reasons.push('approved low-risk mechanical execution');
    } else if (analysis.stage === 'execution' && analysis.planStatus === 'approved') {
      target = 'balanced'; reasons.push('approved plan shifts work from reasoning to execution');
    } else {
      target = 'balanced'; reasons.push('balanced is the default sufficient capability class');
    }
    const transition = rank[target] > rank[current] ? 'upgrade' : rank[target] < rank[current] ? 'downgrade' : 'keep';
    return { modelClass: target, confidence: analysis.confidence, reasons, previousClass: current, transition, latencyMode: target === 'powerful' ? 'standard' : 'fast' };
  }
}
```

Update `DecisionEngine` to delegate routing to `ModelRouter` after policy overrides, while preserving Milestone 1 policy behavior.

- [ ] **Step 4: Run kernel tests**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/*.test.js`

Expected: PASS, including legacy decision tests.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/model-router.ts packages/kernel/src/decision-engine.ts packages/kernel/src/index.ts packages/kernel/src/__tests__/model-router.test.ts
git commit -m "feat(kernel): add explainable model router"
```

---

### Task 4: Add runtime capabilities, generic runtime actions, and ControlEngine

**Files:**
- Create: `packages/runtime-sdk/src/capabilities.ts`
- Create: `packages/runtime-sdk/src/actions.ts`
- Modify: `packages/runtime-sdk/src/adapter.ts`
- Modify: `packages/runtime-sdk/src/index.ts`
- Test: `packages/runtime-sdk/src/__tests__/capabilities.test.ts`
- Create: `packages/kernel/src/control-engine.ts`
- Create: `packages/kernel/src/__tests__/control-engine.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Produces `RuntimeCapabilities`, `RuntimeAction`, `RuntimeActionResult`, optional `RuntimeAdapter.getCapabilities()`, `RuntimeAdapter.executeAction()`.
- Produces `ControlScopes`, `ControlEngine.resolveMode()`, `ControlEngine.decide()`.

- [ ] **Step 1: Write failing contract and control precedence tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ControlEngine } from '../control-engine.js';

test('session action override wins over project and defaults', () => {
  const engine = new ControlEngine();
  const mode = engine.resolveMode('modelRouting', {
    aes: { default: 'assisted' },
    project: { default: 'manual', actions: { modelRouting: 'assisted' } },
    session: { default: 'assisted', actions: { modelRouting: 'autonomous' } }
  });
  assert.equal(mode, 'autonomous');
});

test('autonomous action without runtime capability falls back to recommendation', () => {
  const engine = new ControlEngine();
  const result = engine.decide({
    request: { id: 'a-1', type: 'conversationTransition', source: 'handoff-engine', reason: 'fresh context preferred', confidence: 'high', payload: {} },
    mode: 'autonomous',
    capabilityAvailable: false
  });
  assert.equal(result.outcome, 'recommend');
});
```

- [ ] **Step 2: Run compile to verify RED**

Run: `npm exec -- tsc -p packages/runtime-sdk/tsconfig.json && npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because capabilities/actions/control engine do not exist.

- [ ] **Step 3: Implement runtime capability/action contracts**

```ts
import type { ControlActionType } from '@aes/spec';

export interface RuntimeCapabilities {
  modelRouting: boolean;
  fastMode: boolean;
  toolExecution: boolean;
  contextTelemetry: boolean;
  tokenTelemetry: boolean;
  contextCompaction: boolean;
  handoffInjection: boolean;
  conversationTransition: boolean;
  persistentMemory: boolean;
}
export interface RuntimeAction { id: string; type: ControlActionType; payload: unknown; }
export interface RuntimeActionResult { actionId: string; executed: boolean; output?: unknown; error?: string; }
```

Extend `RuntimeAdapter` with optional methods:

```ts
getCapabilities?(): RuntimeCapabilities;
executeAction?(action: RuntimeAction): Promise<RuntimeActionResult>;
```

- [ ] **Step 4: Implement deterministic control resolution**

```ts
import type { ActionRequest, ControlActionType, ControlConfig, ControlDecision, ControlMode } from '@aes/spec';

export interface ControlScopes {
  aes: ControlConfig;
  user?: ControlConfig;
  project?: ControlConfig;
  session?: ControlConfig;
  explicit?: Partial<Record<ControlActionType, ControlMode>>;
}

export class ControlEngine {
  resolveMode(action: ControlActionType, scopes: ControlScopes): ControlMode {
    const ordered = [scopes.aes, scopes.user, scopes.project, scopes.session].filter(Boolean) as ControlConfig[];
    let mode: ControlMode = scopes.aes.default;
    for (const config of ordered) mode = config.actions?.[action] ?? config.default ?? mode;
    return scopes.explicit?.[action] ?? mode;
  }

  decide(input: { request: ActionRequest; mode: ControlMode; capabilityAvailable: boolean }): ControlDecision {
    if (input.mode === 'manual') return { actionId: input.request.id, mode: input.mode, outcome: 'recommend', reason: 'manual control mode' };
    if (input.mode === 'assisted') return { actionId: input.request.id, mode: input.mode, outcome: 'request_approval', reason: 'assisted control mode' };
    if (!input.capabilityAvailable) return { actionId: input.request.id, mode: input.mode, outcome: 'recommend', reason: 'runtime capability unavailable' };
    return { actionId: input.request.id, mode: input.mode, outcome: 'execute', reason: 'autonomous control mode and capability available' };
  }
}
```

- [ ] **Step 5: Run runtime SDK and kernel tests**

Run: `npm exec -- tsc -p packages/runtime-sdk/tsconfig.json && node --test packages/runtime-sdk/dist/__tests__/*.test.js && npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/*.test.js`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/runtime-sdk/src packages/kernel/src/control-engine.ts packages/kernel/src/index.ts packages/kernel/src/__tests__/control-engine.test.ts
git commit -m "feat: add control engine and runtime capabilities"
```

---

### Task 5: Rename Codex runtime package to vendor adapter and prove dependency boundary

**Files:**
- Rename: `packages/runtime-codex` -> `packages/adapter-codex`
- Modify: `packages/adapter-codex/package.json`
- Modify: `packages/adapter-codex/src/index.ts`
- Modify: `packages/adapter-codex/src/__tests__/mapping.test.ts`
- Create: `packages/kernel/src/__tests__/vendor-boundary.test.ts`
- Modify: `pnpm-workspace.yaml` only if paths are enumerated rather than globbed.

**Interfaces:**
- Produces package `@aes/adapter-codex` implementing `RuntimeAdapter` capability declaration.

- [ ] **Step 1: Write failing adapter capability/boundary tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { CodexRuntimeAdapter } from '../index.js';

test('Codex adapter declares capabilities instead of making core assumptions', () => {
  const adapter = new CodexRuntimeAdapter({ models: { cheap: 'c', balanced: 'b', powerful: 'p' } });
  assert.equal(adapter.getCapabilities().modelRouting, true);
  assert.equal(adapter.getCapabilities().conversationTransition, false);
});
```

Boundary test:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

test('kernel source never imports adapter packages', async () => {
  for await (const path of glob('packages/kernel/src/**/*.ts')) {
    const source = await readFile(path, 'utf8');
    assert.equal(source.includes('@aes/adapter-'), false, path);
  }
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npm exec -- tsc -p packages/runtime-codex/tsconfig.json`

Expected: old package still exists and new adapter contract is absent.

- [ ] **Step 3: Rename package and add capabilities**

Run:

```bash
mv packages/runtime-codex packages/adapter-codex
```

Change manifest name to `@aes/adapter-codex` and add:

```ts
getCapabilities() {
  return {
    modelRouting: true,
    fastMode: false,
    toolExecution: false,
    contextTelemetry: false,
    tokenTelemetry: false,
    contextCompaction: false,
    handoffInjection: false,
    conversationTransition: false,
    persistentMemory: false
  } as const;
}
```

- [ ] **Step 4: Build/test all affected packages**

Run: `npm exec -- tsc -p packages/spec/tsconfig.json && npm exec -- tsc -p packages/runtime-sdk/tsconfig.json && npm exec -- tsc -p packages/kernel/tsconfig.json && npm exec -- tsc -p packages/adapter-codex/tsconfig.json && node --test packages/adapter-codex/dist/__tests__/*.test.js packages/kernel/dist/__tests__/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A packages/adapter-codex packages/runtime-codex packages/kernel/src/__tests__/vendor-boundary.test.ts
git commit -m "refactor: rename codex runtime to adapter"
```

---

### Task 6: Add approval outcomes and idempotent runtime action execution

**Files:**
- Create: `packages/runtime-sdk/src/idempotency.ts`
- Create: `packages/runtime-sdk/src/__tests__/idempotency.test.ts`
- Modify: `packages/runtime-sdk/src/index.ts`
- Create: `packages/kernel/src/approval.ts`
- Create: `packages/kernel/src/__tests__/approval.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Produces `ApprovalRequest`, `ApprovalDecision`, `ApprovalRecord`, `IdempotentActionExecutor.execute(adapter, action)`.

- [ ] **Step 1: Write failing approval/idempotency tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { IdempotentActionExecutor } from '../idempotency.js';

test('same runtime action id executes only once', async () => {
  let calls = 0;
  const adapter = {
    executeAction: async (action: { id: string }) => { calls++; return { actionId: action.id, executed: true }; }
  };
  const executor = new IdempotentActionExecutor();
  const action = { id: 'a-1', type: 'toolExecution' as const, payload: {} };
  await executor.execute(adapter, action);
  await executor.execute(adapter, action);
  assert.equal(calls, 1);
});
```

Kernel approval test:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { recordApproval } from '../approval.js';

test('rejection preserves underlying recommendation', () => {
  const record = recordApproval({ id: 'approval-1', actionId: 'a-1', summary: 'switch to powerful', reason: 'architecture planning' }, 'rejected');
  assert.equal(record.decision, 'rejected');
  assert.equal(record.actionId, 'a-1');
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/runtime-sdk/tsconfig.json && npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because idempotency and approval contracts are absent.

- [ ] **Step 3: Implement idempotent execution cache and approval records**

```ts
import type { RuntimeAction, RuntimeActionResult } from './actions.js';
import type { RuntimeAdapter } from './adapter.js';
export class IdempotentActionExecutor {
  readonly #results = new Map<string, RuntimeActionResult>();
  async execute(adapter: Pick<RuntimeAdapter, 'executeAction'>, action: RuntimeAction): Promise<RuntimeActionResult> {
    const previous = this.#results.get(action.id);
    if (previous) return previous;
    if (!adapter.executeAction) return { actionId: action.id, executed: false, error: 'runtime action execution unavailable' };
    const result = await adapter.executeAction(action);
    this.#results.set(action.id, result);
    return result;
  }
}
```

```ts
export interface ApprovalRequest { id: string; actionId: string; summary: string; reason: string; expiresAt?: string; }
export type ApprovalDecision = 'approved' | 'rejected';
export interface ApprovalRecord extends ApprovalRequest { decision: ApprovalDecision; decidedAt: string; }
export const recordApproval = (request: ApprovalRequest, decision: ApprovalDecision, decidedAt = new Date().toISOString()): ApprovalRecord => ({ ...request, decision, decidedAt });
```

- [ ] **Step 4: Run affected tests**

Run: `npm exec -- tsc -p packages/runtime-sdk/tsconfig.json && node --test packages/runtime-sdk/dist/__tests__/*.test.js && npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime-sdk/src packages/kernel/src/approval.ts packages/kernel/src/__tests__/approval.test.ts packages/kernel/src/index.ts
git commit -m "feat: add approval audit and idempotent runtime actions"
```
