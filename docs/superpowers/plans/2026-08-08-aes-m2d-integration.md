# AES Milestone 2D — Integration, Interruptions, and Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Milestone 2 engines into the AES kernel, minimize unnecessary user interruptions, expose auditable events, and prove all design scenarios offline.

**Architecture:** `AESKernel` remains a thin orchestrator. Engines stay focused modules. The interruption policy converts control decisions into user-facing approval/recommendation needs; the event bus records recommended, authorized, executed, and verified states separately.

**Tech Stack:** TypeScript 5.8+, Node.js 22+, ESM, node:test, existing workspace.

## Global Constraints

- Routine autonomous decisions MUST NOT request approval.
- Low-urgency approvals SHOULD be groupable at stage boundaries.
- Events MUST distinguish recommendation, authority, runtime execution, and verification outcome.
- Existing Milestone 1 deterministic workflow behavior MUST remain compatible.
- All Milestone 2 integration scenarios MUST run without live LLM/vendor APIs.

---

### Task 1: Add InterruptionPolicy and approval grouping contracts

**Files:**
- Create: `packages/kernel/src/interruption-policy.ts`
- Create: `packages/kernel/src/__tests__/interruption-policy.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Produces `InterruptionInput`, `InterruptionDecision`, `InterruptionPolicy.evaluate()`, `group()`.

- [ ] **Step 1: Write failing interruption tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { InterruptionPolicy } from '../interruption-policy.js';

const policy = new InterruptionPolicy();

test('routine autonomous action does not interrupt', () => {
  assert.equal(policy.evaluate({ controlOutcome: 'execute', confidence: 'high', impact: 'low', authorityIncrease: false, capabilityFailure: false, durableConflict: false }).interrupt, false);
});

test('low confidence high impact action interrupts', () => {
  assert.equal(policy.evaluate({ controlOutcome: 'execute', confidence: 'low', impact: 'high', authorityIncrease: false, capabilityFailure: false, durableConflict: false }).interrupt, true);
});

test('group combines low urgency approvals into one digest', () => {
  const grouped = policy.group([
    { id: 'a1', summary: 'switch model' }, { id: 'a2', summary: 'promote memory' }
  ]);
  assert.equal(grouped.items.length, 2);
  assert.match(grouped.summary, /2 user decisions/);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because policy is absent.

- [ ] **Step 3: Implement deterministic interruption rules**

```ts
import type { Confidence } from '@aes/spec';
export interface InterruptionInput {
  controlOutcome: 'recommend' | 'request_approval' | 'execute' | 'blocked';
  confidence: Confidence; impact: Confidence; authorityIncrease: boolean; capabilityFailure: boolean; durableConflict: boolean;
}
export interface InterruptionDecision { interrupt: boolean; reasons: string[]; }
export interface ApprovalDigest { items: { id: string; summary: string }[]; summary: string; }
export class InterruptionPolicy {
  evaluate(input: InterruptionInput): InterruptionDecision {
    const reasons: string[] = [];
    if (input.authorityIncrease) reasons.push('new authority requires user consent');
    if (input.durableConflict) reasons.push('durable knowledge conflict requires judgment');
    if (input.capabilityFailure) reasons.push('runtime capability failure changes the next user action');
    if (input.controlOutcome === 'request_approval') reasons.push('assisted action requires approval');
    if (input.confidence === 'low' && input.impact === 'high') reasons.push('low confidence high impact');
    return { interrupt: reasons.length > 0, reasons };
  }
  group(items: readonly { id: string; summary: string }[]): ApprovalDigest { return { items: [...items], summary: `${items.length} user decisions need review` }; }
}
```

- [ ] **Step 4: Run tests**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/interruption-policy.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/interruption-policy.ts packages/kernel/src/__tests__/interruption-policy.test.ts packages/kernel/src/index.ts
git commit -m "feat(kernel): add interruption policy"
```

---

### Task 2: Expand event map and integrate engines into AESKernel without monolith growth

**Files:**
- Modify: `packages/kernel/src/events.ts`
- Modify: `packages/kernel/src/kernel.ts`
- Create: `packages/kernel/src/__tests__/kernel-intelligence.test.ts`

**Interfaces:**
- `AESKernel` exposes narrow methods: `analyzeTask`, `evaluateContext`, `routeModel`, `controlAction`, `createHandoff`.
- Events add `analysis.completed`, `context.health.changed`, `model.route.changed`, `control.decision`, `handoff.generated`, `experience.hypothesis.created`, `eval.completed`.

- [ ] **Step 1: Write failing kernel integration test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { AESKernel } from '../kernel.js';

// use the same sample workflow/policies and a mock RuntimeAdapter from existing tests

test('kernel can route architecture planning then downgrade after approved plan', async () => {
  const kernel = createTestKernel();
  const analysis = await kernel.analyzeTask({ stage: 'planning', planStatus: 'none', failedAttempts: 0, request: 'redesign auth boundary' });
  const first = kernel.routeModel(analysis, 'balanced');
  assert.equal(first.modelClass, 'powerful');
  const execution = { ...analysis, stage: 'execution', planStatus: 'approved', architecturalDecisionRequired: false, taskComplexity: 'standard', ambiguity: 'low', risk: 'low' } as const;
  const second = kernel.routeModel(execution, 'powerful');
  assert.equal(second.modelClass, 'balanced');
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because orchestration methods/events are absent.

- [ ] **Step 3: Integrate focused engines by composition**

`AESKernel` constructor may accept optional injected engines/classifiers but MUST instantiate deterministic defaults. Do not move engine logic into `kernel.ts`. Each public method delegates to one engine and emits a structured event.

- [ ] **Step 4: Run full kernel suite**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/events.ts packages/kernel/src/kernel.ts packages/kernel/src/__tests__/kernel-intelligence.test.ts
git commit -m "feat(kernel): integrate milestone 2 intelligence engines"
```

---

### Task 3: Add offline end-to-end milestone scenarios and documentation/examples

**Files:**
- Create: `packages/kernel/src/__tests__/milestone2-scenarios.test.ts`
- Create: `examples/control.yaml`
- Create: `examples/memory/README.md`
- Modify: `README.md`
- Modify: `docs/rfcs/RFC-0001-vision-and-scope.md` only to link the Milestone 2 design/spec, not rewrite RFC scope.

**Interfaces:**
- End-to-end tests exercise public package interfaces only.

- [ ] **Step 1: Write eight failing/partially failing scenario tests from design section 18**

Tests MUST cover exactly:

```text
1 simple mechanical task -> no interruption
2 architecture task -> balanced discovery, powerful planning, balanced execution
3 high pressure + high relevance -> no forced fresh chat
4 independent next task -> handoff + assisted transition
5 autonomous unsupported capability -> recommendation fallback
6 repeated approvals -> authority promotion proposal only
7 learned regression -> authority may degrade to assisted
8 project fact -> blocked from user/global promotion unless generalized
```

Each test asserts both decision output and at least one audit/event artifact.

- [ ] **Step 2: Run scenario tests to verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/milestone2-scenarios.test.js`

Expected: FAIL until integration gaps from the scenario coverage are closed.

- [ ] **Step 3: Implement only missing integration glue required by the scenarios**

Use existing engine APIs. If a scenario requires a new helper, place it in the owning focused module, not in `kernel.ts`.

- [ ] **Step 4: Add example control document**

```yaml
control:
  default: assisted
  actions:
    modelRouting: autonomous
    fastMode: autonomous
    toolExecution: autonomous
    contextCompaction: autonomous
    handoffCreation: autonomous
    memoryPromotion: assisted
    conversationTransition: assisted
```

Document `.aes/` layout and explain that user/global promotion requires generalization and policy authorization.

- [ ] **Step 5: Run full repository verification**

Run:

```bash
npm exec -- tsc -p packages/spec/tsconfig.json
npm exec -- tsc -p packages/runtime-sdk/tsconfig.json
npm exec -- tsc -p packages/kernel/tsconfig.json
npm exec -- tsc -p packages/adapter-codex/tsconfig.json
npm exec -- tsc -p packages/cli/tsconfig.json
node --test packages/spec/dist/__tests__/*.test.js
node --test packages/runtime-sdk/dist/__tests__/*.test.js
node --test packages/kernel/dist/__tests__/*.test.js
node --test packages/adapter-codex/dist/__tests__/*.test.js
node --test packages/cli/dist/__tests__/*.test.js
```

Expected: 0 failures.

- [ ] **Step 6: Commit**

```bash
git add packages/kernel/src examples README.md docs/rfcs/RFC-0001-vision-and-scope.md
git commit -m "test: verify AES milestone 2 intelligence scenarios"
```
