# AES Fake Provider Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an offline `aes demo` CLI command that executes one deterministic turn through the existing in-memory provider and prints a useful AES runtime summary.

**Architecture:** Compose `AdaptiveRuntime` with `ModelResolver`, the existing `createInMemoryProvider`, in-memory trace/checkpoint stores, and a fixed verification bridge. Keep the demo in the CLI package; do not add provider-specific behavior to core runtime packages.

**Tech Stack:** TypeScript, Node.js 22+, pnpm 10.14.0, Node test runner, existing AES runtime contracts.

## Global Constraints

- Node.js version: `>=22`.
- Package manager: `pnpm@10.14.0`.
- The demo must remain offline and deterministic.
- No API keys, network calls, live providers, or irreversible side effects.
- `@aes/kernel`, `@aes/runtime`, and `@aes/spec` remain provider-neutral.

---

### Task 1: Implement and document the fake-provider demo

**Files:**
- Create: `packages/cli/src/demo-command.ts`
- Create: `packages/cli/src/__tests__/demo-command.test.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `docs/getting-started/quick-start.md`

**Interfaces:**
- Consumes: `createInMemoryProvider`, `AdaptiveRuntime`, `ModelResolver`, `InMemoryTraceStore`, `InMemoryCheckpointStore`, and `FixedVerificationBridge`.
- Produces: `runDemo(): Promise<DemoSummary>` and the CLI command `aes demo`.

- [x] **Step 1: Write the failing test**

Add a test that calls `runDemo()` and asserts the returned summary includes `provider: 'memory'`, `model: 'memory-balanced'`, `outcome: 'success'`, `verification: 'passed'`, and `totalTokens: 12`.

- [x] **Step 2: Run the focused test to verify RED**

Run:

```powershell
corepack pnpm@10.14.0 --filter @aes/cli build
node --test packages/cli/dist/__tests__/demo-command.test.js
```

Expected: the test cannot compile or execute because `demo-command.ts` and `runDemo` do not exist.

- [x] **Step 3: Implement the minimal demo composition**

Create `runDemo()` using the existing in-memory provider and runtime contracts. Execute one balanced turn with a deterministic task and return only the summary fields required by the test. Add `demo` dispatch to `packages/cli/src/index.ts` and print the summary in the documented format.

- [x] **Step 4: Run the focused test to verify GREEN**

Run the focused build and test again. Expected: the demo test passes with zero failures.

- [x] **Step 5: Update the quick-start guide**

Add the `aes demo` build/run commands and explain that the output is offline and uses the fake provider.

- [x] **Step 6: Run final verification**

Run:

```powershell
corepack pnpm@10.14.0 typecheck
corepack pnpm@10.14.0 test
node packages/cli/dist/index.js demo
git diff --check
```

Expected: all commands exit with code 0, the complete offline suite passes, and the demo reports the memory provider with a successful outcome.
