# Agent Engineering Specification (AES)

AES is a vendor-neutral specification and TypeScript reference runtime for engineering agents: adaptive model routing, context management, user authority, resource governance, crash recovery, handoffs, verified learning, and provider adapters.

Milestone 3 adds a provider-neutral **Adaptive Runtime** and the first real provider implementation, **Codex App Server**, while preserving the rule that AES core/kernel never depends on a concrete model vendor.

## Architecture

```text
User Task
   |
   v
Task Analyzer / Decision Engine
   |-------------------|
   v                   v
Context Engine      Model Router
                         |
                         v
                 Model Requirement
                         |
                         v
                  Model Resolver
                         |
                         v
              Resource Policy Engine
                         |
                         v
                  Control Engine
                         |
                         v
                  @aes/runtime
                         |
                         v
                RuntimeProvider API
                   /           \
                  v             v
       @aes/adapter-codex    future adapters
                  |
                  v
          Codex App Server
                  |
                  v
        Runtime Telemetry / Trace
                  |
                  v
     Experience -> Evaluation -> Knowledge
```

The kernel never contains concrete vendor model names. AES routes capability classes (`cheap`, `balanced`, `powerful`); provider model resolvers map requirements to models actually available at runtime.

## Packages

- `@aes/spec` — lifecycle, routing, context, control, handoff, learning, runtime, and resource-governance vocabulary.
- `@aes/kernel` — deterministic engines for task analysis, context, model routing, control, handoff, interruption, experience, evaluation, knowledge, and runtime-control composition.
- `@aes/runtime-sdk` — provider-neutral provider/session/event/telemetry/storage/control contracts plus provider contract-test utilities.
- `@aes/runtime` — adaptive orchestration: model resolution, resource policy enforcement, workspace provider supervision, bounded recovery, checkpoints, trace persistence, and experience conversion.
- `@aes/adapter-codex` — the first concrete provider implementation, backed by Codex App Server. It is an edge adapter, not part of AES core architecture.
- `@aes/cli` — document validation plus opt-in live Codex smoke-test composition.

Future providers can implement the same `RuntimeProvider` / `RuntimeSession` contracts without changing the kernel, for example Claude Code, Gemini, or Cursor adapters.

## Core decision rule

AES separates four questions:

1. **Decision:** what should happen?
2. **Resources:** does it fit the configured token/cost/time envelope?
3. **Authority:** may AES perform it automatically?
4. **Capability:** can the current provider technically perform it?

A hard resource limit never silently downgrades required model quality. Exceeding a hard budget requires the `resourceBudgetOverride` authority path. Routine warnings remain observable without forcing user interaction.

## Model routing

`balanced` is the default. `powerful` is reserved for consequential decisions such as architecture planning or invalidated assumptions. Once planning is approved, execution normally de-escalates to `balanced`, and low-risk mechanical work may route to `cheap`.

Fast/low-latency preference is independent from model capability class. `ModelResolver` first enforces hard capabilities/quality requirements and only then ranks acceptable provider models by preferences such as latency and cost.

## Adaptive runtime and recovery

AES keeps one provider process per workspace and may run multiple sessions through it. Provider crashes are recovered automatically only within bounded retry/circuit-breaker limits.

```text
provider crash
    -> restart within budget
    -> resume session/checkpoint
    -> reconcile last known action
       -> safe: continue
       -> ambiguous side effect: request authority, never replay blindly
       -> lost: stop safely
```

Provider infrastructure failures, rate limits, and cancellation are not counted as model-quality failures.

## Resource governance

Milestone 3 includes provider-neutral resource policies for:

- task/session token budgets;
- estimated-cost, retry, and duration budgets when evidence is known;
- warning thresholds (80% by default);
- a simple local sliding token-usage window with deterministic `retryAfterMs` throttling.

Unknown token or pricing values remain unknown; AES does not turn missing telemetry into zero.

## Context and handoff

Context health uses two independent dimensions:

- **pressure** — how expensive/large retained context is;
- **relevance** — how much of it the next action still needs.

High pressure plus high relevance does not force a new chat. When old context has low relevance and the next task is independent, AES can prepare a compact handoff and then apply the configured conversation-transition control mode.

## Learning without model fine-tuning

AES learns from verified outcomes rather than unvalidated self-reflection:

```text
RuntimeDecisionTrace
   -> attributable verified evidence
   -> ExperienceHypothesis
   -> EvaluationGate
   -> trusted guidance
```

Cancellation, provider crashes, transport failures, and other non-model failures are excluded from model-quality statistics. Project-specific content is blocked from silent user/global promotion.

Project memory follows the five-area layout in [`examples/memory/README.md`](examples/memory/README.md): raw evidence, knowledge, decisions, experience, and evals.

## Telemetry and privacy defaults

Project-local traces store normalized evidence such as selected model, model class, token usage when known, duration, retries, verification result, recovery count, resource decisions, and failure classification.

By default AES does **not** persist full prompts, source code, tool output, conversation transcripts, credentials, or provider raw protocol traffic in `RuntimeDecisionTrace`.

```yaml
telemetry:
  providerRawEvents: false
```

The local JSONL trace implementation is intended for `.aes/raw/traces`. Provider-raw recording is opt-in debugging data and must be sanitized before reuse as a fixture.

## Requirements

- Node.js 22+
- TypeScript 5.8+
- pnpm for normal workspace installation (`pnpm@10.14.0` is declared)

Normal setup:

```bash
corepack enable
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

The reference implementation itself keeps the default test suite offline and deterministic.

## Offline verification

A full Milestone 3 offline gate can be run without Codex or API credentials:

```bash
rm -rf packages/*/dist
for p in spec runtime-sdk runtime kernel adapter-codex cli; do
  tsc -p "packages/$p/tsconfig.json"
done
for p in spec runtime-sdk runtime kernel adapter-codex cli; do
  if compgen -G "packages/$p/dist/__tests__/*.test.js" > /dev/null; then
    node --test packages/$p/dist/__tests__/*.test.js
  fi
done
```

Validate the canonical workflow after building:

```bash
node packages/cli/dist/index.js validate examples/workflow.yaml
```

Expected output:

```text
valid Workflow: engineering-default
```

## Opt-in live Codex smoke test

Codex is the first provider implementation, not a dependency of AES core. A live smoke test is intentionally separate from the offline suite:

```bash
npm run test:integration:codex
```

The smoke test detects the local `codex` binary, starts App Server through `CodexProvider`, discovers models, creates a disposable session, runs a minimal non-destructive turn, rejects any unexpected tool approval request, and shuts the provider down.

If the Codex binary/account is unavailable, the live test is reported as **SKIPPED / NOT VERIFIED**, never as a successful live-provider verification.

## Scope boundary

Milestone 3 deliberately does not include Claude/Gemini/Cursor providers, a dynamic plugin marketplace, distributed runtime supervision, Redis/PostgreSQL resource policies, a hosted telemetry backend, dashboard UI, automatic workflow decomposition, or model fine-tuning. Those can be added behind the provider/storage/policy contracts once real usage demonstrates the need.
