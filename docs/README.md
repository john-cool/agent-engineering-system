# AES documentation

Agent Engineering Specification (AES) is a vendor-neutral specification and TypeScript reference runtime for engineering agents.

AES helps an agent answer four separate questions:

1. What should happen?
2. Does it fit the resource limits?
3. Is the agent allowed to do it automatically?
4. Can the current provider technically do it?

Keeping these questions separate makes decisions observable, reversible, and safe to improve over time.

## Start here

If you are new to the project, follow this order:

1. [What is AES?](getting-started/what-is-aes.md) — the short explanation.
2. [Quick start](getting-started/quick-start.md) — install dependencies and run the offline checks.
3. [Mental model](getting-started/mental-model.md) — how the main pieces fit together.
4. [How AES makes a decision](architecture/how-aes-makes-a-decision.md) — the end-to-end flow.

## Run the reference implementation

Requirements:

- Node.js 22 or newer;
- pnpm 10.14.0 through Corepack.

From the repository root:

```powershell
corepack enable
corepack pnpm@10.14.0 install
corepack pnpm@10.14.0 typecheck
corepack pnpm@10.14.0 test
```

The default suite is offline and deterministic. It uses fakes and replay fixtures, so it does not require a provider account or API credentials.

To validate the example workflow after the packages are built:

```powershell
node packages/cli/dist/index.js validate examples/workflow.yaml
```

Live Codex integration is separate and opt-in:

```powershell
corepack pnpm@10.14.0 run test:integration:codex
```

## How AES is organized

```text
task
  -> analysis and context
  -> model capability class
  -> resource policy
  -> authority and control
  -> runtime provider
  -> verification and trace
  -> evidence, experience, and bounded learning
```

The core routes capability classes such as `cheap`, `balanced`, and `powerful`. Provider-specific model names stay inside adapters such as `@aes/adapter-codex`.

The main packages are:

- `@aes/spec` — provider-neutral types and contracts;
- `@aes/kernel` — deterministic decision, context, control, handoff, knowledge, and learning engines;
- `@aes/runtime-sdk` — provider, session, event, telemetry, and storage contracts;
- `@aes/runtime` — runtime orchestration, recovery, resource enforcement, traces, and learning coordination;
- `@aes/adapter-codex` — the Codex App Server adapter;
- `@aes/cli` — validation and opt-in integration-test composition.

## Learn by topic

### Architecture and lifecycle

- [Architecture overview](architecture/overview.md)
- [Kernel](architecture/kernel.md)
- [Adaptive runtime](architecture/adaptive-runtime.md)
- [Provider model](architecture/provider-model.md)
- [Codex adapter](architecture/codex-adapter.md)

### Core behavior

- [Context management](concepts/context-management.md)
- [Model routing](concepts/model-routing.md)
- [Control and authority](concepts/control-and-authority.md)
- [Resource governance](concepts/resource-governance.md)
- [Workflows](concepts/workflows.md)

### Knowledge and learning

- [Knowledge and memory](concepts/knowledge-and-memory.md)
- [Adaptive learning](concepts/adaptive-learning.md)
- [Learning loop](architecture/learning-loop.md)
- [Knowledge-base guide](guides/knowledge-base.md)
- [Learning lifecycle example](examples/learning-lifecycle.md)

### Configuration and integration

- [Configure AES](guides/configure-aes.md)
- [Configuration reference](reference/configuration.md)
- [Runtime API](reference/runtime-api.md)
- [Policy API](reference/policy-api.md)
- [Events](reference/events.md)
- [Schemas](reference/schemas.md)
- [Write a provider adapter](guides/write-an-adapter.md)

### Operations and safety

- [Autonomy](guides/autonomy.md)
- [Budgets](guides/budgets.md)
- [Debugging](guides/debugging.md)
- [Authority promotion](examples/authority-promotion.md)

## Current scope

The implementation includes Milestones 1–4: the provider-neutral specification, deterministic kernel, adaptive runtime, Codex adapter, typed project knowledge, bounded learning, shadow evaluation, regression monitoring, and scoped authority evidence.

The offline suite remains the default quality gate. Learning is advisory and cannot weaken hard resource, security, privacy, provider-permission, authority, or quality boundaries.

The project does not currently require a second live provider adapter, a dynamic plugin marketplace, vector or graph databases, distributed runtime supervision, a hosted control plane, or model fine-tuning.

For architecture decisions, use the [ADRs](adrs/) and approved [Superpowers specifications](superpowers/specs/).
