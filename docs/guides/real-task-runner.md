# Real task runner

The CLI can send a real engineering task through AES and the Codex App Server adapter.

Build the workspace first:

```powershell
corepack pnpm@10.14.0 build
```

Run a task:

```powershell
node packages/cli/dist/index.js run "inspect the top-level folders and summarize them"
```

The final summary is written to stdout. Progress is written separately to stderr so it can be displayed while the task is running without corrupting the result.

## Read-only mode

Use read-only mode for repository inspection:

```powershell
node packages/cli/dist/index.js run --read-only "find the TypeScript packages and describe their responsibilities"
```

In this mode AES configures the Codex adapter with:

- `approvalPolicy: "never"`;
- `sandbox: "read-only"`;
- control authorization for non-mutating tool execution only.

The sandbox is the enforcement boundary. Read-only mode is intended for inspection and analysis; it is not a way to authorize edits, commits, pushes, or other external side effects.

Without `--read-only`, a non-interactive CLI run requests approval for tool actions and may stop when approval is unavailable. Do not use the writable mode for unattended execution.

## Progress and timeout

Progress lines have the form:

```text
[aes] starting: task accepted
[aes] turn_started: provider turn started
[aes] tool_requested: tool requested: ...
[aes] completed: task completed: success
```

The runner has a default timeout of five minutes (`300000` ms). On timeout it emits a failure progress event, shuts down the workspace provider, returns an error, and does not retry or replay the task. The CLI does not currently expose a timeout flag; callers using the `runTask()` API may pass a positive finite `timeoutMs`.

The progress callback is observational. Errors thrown by a progress sink do not change task execution.

## Result

Successful output includes the provider, selected model, normalized outcome, and verification result:

```text
Provider: codex
Model: <provider model>
Outcome: success
Verification: passed
```

Live execution requires an installed, authenticated Codex CLI. It is not part of the offline test suite.
