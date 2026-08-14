# AES Real Task Runner Design

## Goal

Provide a minimal CLI entry point that sends one user-supplied task through AES's provider-neutral `AdaptiveRuntime` to the real Codex App Server.

## Scope

The first version adds a `run` command to the existing CLI:

```text
node packages/cli/dist/index.js run "<task>"
```

The command uses the current working directory as the workspace and the Codex adapter as its provider. The existing `demo` and `validate` commands remain unchanged.

## Architecture

The command composes `AdaptiveRuntime`, `ModelResolver`, `WorkspaceRuntimeSupervisor`, `CodexProvider`, a trace store, checkpoint store, control bridge, and verification bridge. The task text becomes a provider-neutral runtime turn; provider events remain normalized by the adapter and are consumed by the runtime.

The CLI owns composition only. Provider-specific types remain inside `@aes/adapter-codex`; `@aes/runtime` and `@aes/runtime-sdk` remain provider-neutral.

## Safety

- The Codex session uses the existing adapter policy `approvalPolicy: "on-request"` and `sandbox: "workspace-write"`.
- The CLI control bridge rejects provider approval requests by default for this first non-interactive command; the command must not silently grant tool authority.
- The first task runner does not add retries, autonomous authority, or persistent memory.
- Live execution is opt-in and requires the locally installed, authenticated `codex` CLI.

## Output and errors

The command prints the normalized assistant text events returned by the runtime/provider and a concise final status. Missing task text, unavailable Codex, authentication errors, and failed verification produce a non-zero process exit code with an actionable message.

## Testing

- CLI unit tests use a fake provider/runtime seam and verify argument validation and successful task output without a live provider.
- Existing offline tests remain unchanged and must pass.
- The existing live smoke remains the separate check for the real Codex App Server boundary.
- A manual live task check uses a read-only request such as: `List the top-level files and folders in this repository. Do not modify files or run commands.`

## Non-goals

This change does not add provider selection, configuration files, an interactive approval UI, a global package installation, a second provider, or changes to the approved Milestone 4 learning architecture.
