# AES Real Task Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** Add a minimal `run` CLI command that executes one user task through `AdaptiveRuntime` and the real `CodexProvider`.

**Architecture:** Keep CLI composition at the edge. `run` creates an `AdaptiveRuntime` with `CodexProvider`, `ModelResolver`, workspace supervision, in-memory trace/checkpoint stores, a rejecting control bridge, and a verification bridge. The runtime remains provider-neutral and the Codex adapter remains the only provider-specific boundary.

**Tech Stack:** TypeScript, Node.js test runner, pnpm 10.14.0, existing AES runtime SDK and Codex App Server adapter.

## Global Constraints

- Node.js must remain `>=22`.
- Use the repository package manager version `pnpm@10.14.0`.
- Offline tests must not require a live provider.
- Unexpected provider approvals must be rejected; the CLI must not grant authority silently.
- Do not add a second provider, embeddings, vector database, graph database, or hosted control plane.
- Preserve provider-neutral `@aes/spec`, `@aes/kernel`, `@aes/runtime-sdk`, and `@aes/runtime` boundaries.
- Verify with build, affected tests, full offline tests, live smoke, and `git diff --check` before completion.

### Task 1: Add the provider-neutral real-task CLI composition

**Files:**
- Create: `packages/cli/src/run-command.ts`
- Create: `packages/cli/src/__tests__/run-command.test.ts`
- Modify: `packages/cli/src/index.ts`
- Modify: `packages/cli/package.json` only if the existing CLI test/build scripts require it

**Interfaces:**
- `runTask(task: string, options?: { workspaceId?: string }): Promise<RunTaskResult>`
- `RunTaskResult` contains normalized output text, runtime outcome, verification, provider, and model.
- `main()` dispatches `run <task>` and prints the result; missing task text prints usage and exits non-zero.

- [ ] **Step 1: Write the failing CLI test**

Test that `runTask('inspect repository')` composes the runtime with a deterministic fake provider seam and returns output plus successful status. Test that empty task text is rejected. Keep live Codex out of the offline test.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
corepack pnpm@10.14.0 exec tsc -p packages/cli/tsconfig.json
```

Expected: the test source cannot import the not-yet-created `run-command.js` module.

- [ ] **Step 3: Implement the smallest composition**

Create `run-command.ts` using `AdaptiveRuntime.execute()` with:

```ts
workspaceId: options.workspaceId ?? process.cwd()
taskId: `cli-run-${Date.now()}`
taskClass: 'user-task'
requirement: { class: 'balanced', reasoning: 'medium', latency: 'prefer_fast', context: 'standard' }
turn: { turnId: `turn-${Date.now()}`, input: { kind: 'text', text: task } }
```

Use `CodexProvider` in `WorkspaceRuntimeSupervisor`, `InMemoryTraceStore`, `InMemoryCheckpointStore`, and `FixedVerificationBridge('passed')`. Use a control bridge that returns `{ outcome: 'blocked', reason: 'non-interactive real-task command rejects provider approvals' }` for action requests. Collect `output_delta` text in order and return the final trace data without exposing raw provider protocol messages.

- [ ] **Step 4: Add CLI dispatch and output**

Update `index.ts` so `run <task>` calls `runTask`, prints output followed by provider/model/outcome/verification, and sets `process.exitCode = 1` for failed, awaiting-approval, or unavailable outcomes. Preserve existing `demo` and `validate` behavior.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run:

```powershell
corepack pnpm@10.14.0 exec tsc -p packages/cli/tsconfig.json
corepack pnpm@10.14.0 exec node --test packages/cli/dist/__tests__/run-command.test.js packages/cli/dist/__tests__/demo-command.test.js
```

Expected: all focused tests pass.

- [ ] **Step 6: Run regression verification**

Run:

```powershell
corepack pnpm@10.14.0 test
corepack pnpm@10.14.0 run test:integration:codex
git diff --check
```

Expected: offline tests and live smoke pass with zero failures; only the known Node Windows-shell deprecation warning may remain.

- [ ] **Step 7: Manual read-only task check**

After building, run from the repository worktree:

```powershell
node packages/cli/dist/index.js run "List the top-level files and folders in this repository. Do not modify files or run commands."
```

Confirm the command reaches the real Codex adapter, prints normalized output, and does not request or grant an approval.

- [ ] **Step 8: Review the diff and hand off**

Run `git status --short --branch` and inspect the diff. Leave commit and push to the user, as requested.
