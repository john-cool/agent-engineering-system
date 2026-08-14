# AES Bounded Task Runner Design

## Goal

Make the real-task CLI safe and diagnosable for long-running Codex tasks. A task must either finish with a normalized result or stop within a bounded time with an actionable error; it must not wait indefinitely without visible progress.

## Scope

Extend the existing command:

```text
node packages/cli/dist/index.js run [--read-only] "<task>"
```

The change applies to the CLI composition layer only. The provider-neutral runtime contracts and the approved Milestone 4 architecture remain unchanged.

## User-visible behavior

### Progress

Progress is written to stderr so stdout remains suitable for capturing the assistant result. The CLI reports only normalized lifecycle information, never raw provider protocol payloads or task contents.

The minimum progress stages are:

- `starting` — task accepted and runtime initialization begins;
- `model_selected` — AES selected a provider model;
- `turn_started` — the provider turn started;
- `tool_requested` — the provider requested a tool operation;
- `approval_requested` — an approval boundary was observed;
- `completed` — the task finished;
- `failed` — the task failed or timed out.

Progress is best-effort and must not change runtime decisions or cause a task to fail when the progress sink itself throws.

### Timeout

- Default timeout: 5 minutes (`300_000` ms).
- `runTask` accepts an optional positive `timeoutMs` for deterministic tests and callers that need a smaller bound.
- The CLI does not expose a second timeout flag in this increment; the default protects the user-facing command.
- Invalid timeout values are rejected before a provider is created.
- A timeout produces a non-zero process exit code and an error that identifies the configured duration.

### Cancellation and cleanup

When the timeout expires, the runner:

1. emits `failed` progress with reason `timeout`;
2. requests provider/session shutdown through `WorkspaceRuntimeSupervisor.shutdownAll()`;
3. waits for the in-flight runtime promise to settle when possible;
4. returns a structured timeout error without printing a false success summary.

Cleanup is attempted exactly once in a `finally` path. The runner must not retry the task or replay an ambiguous side effect after timeout.

Explicit process interruption remains handled by the shell/process; this change does not add an interactive approval or signal-management UI.

### Read-only mode

The existing `--read-only` behavior is preserved:

- Codex receives `approvalPolicy: "never"` and `sandbox: "read-only"`;
- read-only tool requests may proceed through the runtime control bridge;
- the sandbox remains the enforcement boundary for preventing writes;
- ordinary `run` continues to require explicit approval for provider tool requests.

## Architecture

`packages/cli/src/run-command.ts` remains the composition boundary. It adds a small execution guard around the existing `AdaptiveRuntime.execute()` call, maps normalized runtime events to progress records, and owns timeout-specific cleanup. `@aes/runtime`, `@aes/runtime-sdk`, and `@aes/spec` remain provider-neutral and receive no Codex-specific types.

The progress sink is an injected callback in tests and a stderr formatter in `index.ts`. The runtime event stream is the source of truth; no provider-specific inspection is added.

## Errors and exit codes

- Empty tasks and invalid timeout values fail before provider creation.
- Provider/authentication failures retain the existing error path.
- Runtime failures retain the existing non-success summary and non-zero exit behavior.
- Timeout failures are distinguishable from model-quality failures and include the timeout duration.
- No error path reports `success` after the timeout cleanup begins.

## Testing

Offline tests must cover:

- default and custom timeout validation;
- progress records for a successful task;
- timeout rejection with a deliberately stalled fake provider;
- provider shutdown on timeout and on ordinary completion;
- preservation of ordinary approval behavior;
- preservation of read-only approval behavior;
- CLI output keeping progress on stderr and the final result on stdout where the entry point is exercised.

The full offline suite, build, live Codex smoke test, and `git diff --check` remain required verification gates. A manual live check must include both a short no-tool task and a bounded read-only repository task.

## Non-goals

This increment does not add:

- an interactive approval UI;
- a configurable provider selector;
- persistent task queues or background jobs;
- retries or automatic task decomposition;
- a second provider;
- embeddings, vector databases, graph databases, or a hosted control plane;
- changes to the approved Milestone 4 learning architecture.
