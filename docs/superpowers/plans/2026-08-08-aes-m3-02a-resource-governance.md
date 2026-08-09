# AES Milestone 3 Resource Governance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add provider-neutral task/session resource budgets and a simple sliding token-usage window without coupling model quality decisions to token limits.

**Architecture:** `@aes/runtime-sdk` owns neutral budget/policy contracts. `@aes/runtime` implements `ResourcePolicyEngine`, `BudgetResourcePolicy`, and an in-memory sliding-window tracker/policy. Hard budget override remains an AES Control Engine decision via `resourceBudgetOverride`; the provider never grants this authority.

**Tech Stack:** TypeScript, Node.js 22+, ESM, `node:test`, existing AES workspace packages, no new external runtime dependency.

## Global Constraints

- Unknown token/pricing values MUST remain unknown and MUST NOT be coerced to zero.
- Resource governance MUST NOT silently lower required model quality.
- Hard-budget override MUST route through `resourceBudgetOverride` authority in composition/integration code.
- Milestone 3 implements task/session budgets and one simple sliding token window only; Token Bucket, Leaky Bucket, distributed quotas, Redis/Postgres, and alert integrations remain out of scope.
- Production code follows TDD: failing test first, minimal implementation, full package gate, commit.

---

### Task 1: Add neutral resource-policy vocabulary and authority action

**Files:**
- Create: `packages/runtime-sdk/src/resources.ts`
- Modify: `packages/runtime-sdk/src/index.ts`
- Modify: `packages/spec/src/intelligence.ts`
- Modify: `packages/spec/src/__tests__/runtime.test.ts`
- Create: `packages/runtime-sdk/src/__tests__/resource-contracts.test.ts`
- Modify: `packages/kernel/src/kernel.ts`

**Interfaces:**
- Consumes: existing `Money`, `ControlActionType`, `RuntimeControlBridge`.
- Produces: `ResourceBudget`, `ResourceUsageSnapshot`, `ResourceRemaining`, `ResourceDecision`, `ResourcePolicyContext`, `ResourcePolicy`, `ResourceUsageWindowStore`, plus `resourceBudgetOverride` control action.

- [ ] **Step 1: Write failing vocabulary/contract tests**

Assert that `CONTROL_ACTION_TYPES` contains `resourceBudgetOverride`, optional unknown usage stays `undefined`, and a minimal custom `ResourcePolicy` can return `allow`.

- [ ] **Step 2: Run tests and verify RED**

Run:
```bash
tsc -p packages/spec/tsconfig.json && tsc -p packages/runtime-sdk/tsconfig.json
```
Expected: FAIL because the new action/resource contracts do not exist.

- [ ] **Step 3: Implement minimal neutral contracts**

Define exact outcomes `allow | warn | throttle | deny`. `ResourceBudget` includes optional input/output/total-token, estimated-cost, retry, duration, and warning-threshold fields. `ResourceUsageWindowStore` exposes `record(scopeKey, tokens, at)` and `snapshot(scopeKey, now)` so later persistent implementations can replace the in-memory store.

Update kernel capability resolution so `resourceBudgetOverride` is treated as an AES authority decision rather than a provider capability.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:
```bash
tsc -p packages/spec/tsconfig.json && node --test packages/spec/dist/__tests__/runtime.test.js && \
tsc -p packages/runtime-sdk/tsconfig.json && node --test packages/runtime-sdk/dist/__tests__/resource-contracts.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/spec packages/runtime-sdk packages/kernel/src/kernel.ts
git commit -m "feat(runtime-sdk): define resource governance contracts"
```

### Task 2: Implement hard budget and warning policy

**Files:**
- Create: `packages/runtime/src/resource-policy.ts`
- Create: `packages/runtime/src/__tests__/resource-policy.test.ts`
- Modify: `packages/runtime/src/index.ts`

**Interfaces:**
- Consumes: `ResourceBudget`, `ResourcePolicyContext`, `ResourcePolicy`, `ResourceDecision`.
- Produces: `BudgetResourcePolicy`, `ResourcePolicyEngine`.

- [ ] **Step 1: Write failing tests**

Cover: total-token hard deny, 80% warning before denial, estimated-cost deny with matching currency, unknown token/cost evidence staying non-enforcing, and engine precedence `deny > throttle > warn > allow`.

- [ ] **Step 2: Run focused test and verify RED**

```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: FAIL because `BudgetResourcePolicy` / `ResourcePolicyEngine` do not exist.

- [ ] **Step 3: Implement minimal policy engine**

Evaluate only known comparable dimensions. Compute remaining values only when both limit and usage are known. Do not convert missing telemetry to zero. `warningThreshold` defaults to `0.8` and must be within `(0, 1)`.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/resource-policy.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/resource-policy.ts packages/runtime/src/__tests__/resource-policy.test.ts packages/runtime/src/index.ts
git commit -m "feat(runtime): enforce resource budgets"
```

### Task 3: Implement simple sliding token-usage window

**Files:**
- Create: `packages/runtime/src/usage-window.ts`
- Create: `packages/runtime/src/__tests__/usage-window.test.ts`
- Modify: `packages/runtime/src/index.ts`

**Interfaces:**
- Consumes: `ResourceUsageWindowStore`, `ResourcePolicyContext`, `ResourceDecision`.
- Produces: `InMemoryUsageWindowStore`, `SlidingWindowResourcePolicy`.

- [ ] **Step 1: Write failing tests**

Record timestamped token entries, prove expired entries leave the window, prove a projected request above the window limit returns `throttle`, and prove `retryAfterMs` points to the earliest relevant expiry.

- [ ] **Step 2: Run focused test and verify RED**

```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: FAIL because usage-window classes do not exist.

- [ ] **Step 3: Implement minimal in-memory window**

Store only `{at, tokens}` per scope key. Prune entries with `at <= now - windowMs`. The policy must not record usage during `evaluate`; recording happens explicitly after actual usage is observed.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/usage-window.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/usage-window.ts packages/runtime/src/__tests__/usage-window.test.ts packages/runtime/src/index.ts
git commit -m "feat(runtime): add sliding token usage window"
```

### Task 4: Preserve integration hook in Adaptive Runtime plan

**Files:**
- Modify: `docs/superpowers/plans/2026-08-08-aes-m3-05-adaptive-runtime-integration.md`

**Interfaces:**
- Consumes: `ResourcePolicyEngine`, `ResourceDecision`, `RuntimeControlBridge`.
- Produces: an explicit preflight/post-usage integration requirement for future `AdaptiveRuntime.execute()`.

- [ ] **Step 1: Add plan tests/requirements**

The Adaptive Runtime test must assert: `deny` blocks provider session creation; `resourceBudgetOverride` can authorize a single explicit bypass; `warn` is observable without blocking; `throttle` returns retry guidance; resource decisions are attached to the normalized trace when present.

- [ ] **Step 2: Verify plan consistency**

```bash
grep -n "resourceBudgetOverride\|ResourcePolicyEngine\|throttle" docs/superpowers/plans/2026-08-08-aes-m3-05-adaptive-runtime-integration.md
git diff --check
```
Expected: matching integration requirements and clean diff.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-08-08-aes-m3-05-adaptive-runtime-integration.md
git commit -m "docs: integrate resource governance into adaptive runtime plan"
```

### Final Gate

Run all offline package builds/tests. Resource governance is complete only when existing runtime/provider tests still pass and no new external dependency is required.
