# AES Bounded Task Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add progress reporting, bounded execution, and deterministic timeout cleanup to the real-task CLI without changing AES provider-neutral architecture.

**Architecture:** Keep the guard in `packages/cli/src/run-command.ts` around `AdaptiveRuntime.execute()`. Convert normalized runtime events into an injected progress callback, use a positive timeout option with a 5-minute default, and shut down the workspace supervisor exactly once when execution completes or times out. Keep Codex-specific sandbox and approval configuration inside `@aes/adapter-codex`.

**Tech Stack:** TypeScript, Node.js test runner, pnpm 10.14.0, existing AES runtime SDK and Codex App Server adapter.

## Global Constraints

- Node.js must remain `>=22`.
- Use `pnpm@10.14.0` through `corepack`.
- Offline tests must not require a live provider.
- The default `run` mode must not silently grant provider tool authority.
- `--read-only` may approve provider tool requests only with Codex's `sandbox: "read-only"` policy.
- Timeout cleanup must not retry or replay a task.
- Keep `@aes/spec`, `@aes/kernel`, `@aes/runtime-sdk`, and `@aes/runtime` provider-neutral.
- Do not add a second provider, embeddings, vector DB, graph DB, hosted control plane, or interactive approval UI.
- Verify build, affected tests, full offline tests, live smoke, and `git diff --check` before handoff.

---

### Task 1: Define the timeout and progress contracts with failing tests

**Files:**
- Modify: `packages/cli/src/__tests__/run-command.test.ts`
- Modify: `packages/cli/src/run-command.ts`

**Interfaces:**
- `RunTaskOptions.timeoutMs?: number` — positive finite timeout in milliseconds.
- `RunTaskOptions.onProgress?: (event: RunProgressEvent) => void` — optional best-effort sink.
- `RunProgressEvent` is a discriminated union with `stage: 'starting' | 'model_selected' | 'turn_started' | 'tool_requested' | 'approval_requested' | 'completed' | 'failed'` and a safe `message`.
- `DEFAULT_RUN_TIMEOUT_MS` is `300_000`.

- [ ] **Step 1: Add tests for timeout validation and progress capture**

Add tests that call `runTask` with `timeoutMs: 0` and `timeoutMs: -1` and assert `timeoutMs must be a positive finite number` before the provider factory runs. Add a successful fake-provider test that captures progress and asserts `starting`, `turn_started`, and `completed` in order.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```powershell
corepack pnpm@10.14.0 -r build
corepack pnpm@10.14.0 exec node --test packages/cli/dist/__tests__/run-command.test.js
```

Expected: the new tests fail because the timeout option, progress contract, and validation do not exist.

- [ ] **Step 3: Implement the smallest contracts and event mapping**

Add the exported type, constant, and options. Validate `options.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS` before constructing `WorkspaceRuntimeSupervisor`. Add a safe `emitProgress` helper that catches sink exceptions. In the existing `onEvent`, map only normalized event types to progress records and keep output collection unchanged.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run the build and focused test command from Step 2. Expected: the validation and success-progress tests pass.

### Task 2: Add timeout enforcement and deterministic cleanup

**Files:**
- Modify: `packages/cli/src/run-command.ts`
- Modify: `packages/cli/src/__tests__/run-command.test.ts`

**Interfaces:**
- `runTask` continues returning `Promise<RunTaskResult>` for successful and normal runtime outcomes.
- Timeout rejects with an `Error` whose message is `task timed out after <N> ms`.

- [ ] **Step 1: Add a deliberately stalled provider test**

Create a fake provider whose `runTurn` never completes until its session is closed. Call `runTask('inspect repository', { timeoutMs: 10, providerFactory })`, assert rejection matching `task timed out after 10 ms`, and assert the provider's `shutdown` was called exactly once. Capture progress and assert the final stage is `failed` with a timeout message.

- [ ] **Step 2: Run the focused test to verify RED**

Run:

```powershell
corepack pnpm@10.14.0 -r build
corepack pnpm@10.14.0 exec node --test packages/cli/dist/__tests__/run-command.test.js
```

Expected: the stalled test fails because `runTask` currently waits indefinitely.

- [ ] **Step 3: Implement the timeout guard**

Create one runtime promise and one timeout promise. On timeout, emit the failure progress event, call `supervisor.shutdownAll()` once, and reject with the specified error. Keep the existing `finally` cleanup idempotent so ordinary completion and timeout cannot double-shutdown the provider. Clear the timer in every settlement path.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run the build and focused test command from Step 2. Expected: all CLI run-command tests pass, including timeout cleanup.

### Task 3: Wire CLI progress and preserve command behavior

**Files:**
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/src/__tests__/run-command.test.ts` only if a formatter seam is needed

**Interfaces:**
- `index.ts` sends progress messages to `console.error` with an `[aes]` prefix.
- Final assistant output and summary remain on stdout.

- [ ] **Step 1: Add the CLI progress formatter test seam**

Expose or test a small formatter that converts a progress event to one line such as `[aes] starting: task accepted`. Assert it never includes raw task text or provider payloads.

- [ ] **Step 2: Run the focused test to verify RED**

Run the CLI build and focused test command. Expected: the formatter test fails because no progress formatter exists.

- [ ] **Step 3: Wire progress and timeout errors in `index.ts`**

Pass `onProgress` to `runTask` and write each formatted event to stderr. Catch timeout errors through the existing error path, set `process.exitCode = 1`, and preserve the current success summary for completed tasks.

- [ ] **Step 4: Run focused CLI tests to verify GREEN**

Run:

```powershell
corepack pnpm@10.14.0 -r build
corepack pnpm@10.14.0 exec node --test packages/cli/dist/__tests__/*.test.js
```

Expected: all CLI tests pass.

### Task 4: Regression verification and manual handoff

**Files:**
- No source changes expected unless a verification failure identifies a scoped defect.

- [ ] **Step 1: Run the complete offline suite**

```powershell
corepack pnpm@10.14.0 -r test
```

Expected: every package test passes without requiring live Codex.

- [ ] **Step 2: Run the live smoke test**

```powershell
corepack pnpm@10.14.0 run test:integration:codex
```

Expected: the one live smoke test passes or reports an environment/authentication skip; transient provider failures must be recorded rather than hidden.

- [ ] **Step 3: Run repository hygiene checks**

```powershell
git diff --check
git status --short --branch
```

- [ ] **Step 4: Perform bounded manual checks**

From `D:\SynologyDrive\my_projects\AES-for-Codex\.worktrees\aes-m4-task1`, run the existing short read-only task and a repository task limited to first-level folders. Confirm progress appears while the final summary remains readable and a deliberately small timeout exits promptly.

- [ ] **Step 5: Hand off without committing or pushing**

Report the verification evidence and leave all changes for the user to review, commit, and push.
