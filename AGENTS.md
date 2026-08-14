# AES Agent Instructions

## Mission

Build AES correctly with the minimum necessary reasoning, context, latency, cost, and user interruption.

Preserve verified quality first. Optimize cost only after required quality and safety constraints are satisfied.

## Current Project State

- Milestones 1–4 are implemented in the current `main` baseline.
- Milestone 4 design is approved, and the implementation evidence is present through the adaptive lifecycle, configuration, and documentation commits.
- Current work is verification/audit and maintenance; do not restart Milestone 4 implementation from the beginning.
- Primary M4 spec:
  `docs/superpowers/specs/2026-08-09-aes-milestone-4-adaptive-learning-knowledge-design.md`
- Primary M4 implementation plan:
  `docs/superpowers/plans/2026-08-09-aes-milestone-4-adaptive-learning-knowledge.md`
- Read `HANDOFF.md` before starting M4 work.

### Current verification baseline

- Node.js `v24.19.0` satisfies the project requirement of `>=22`.
- `corepack pnpm@10.14.0 --version` reports `10.14.0`.
- `corepack pnpm@10.14.0 -r --sort build` passes.
- `corepack pnpm@10.14.0 -r test` passes: **223/223 offline tests**.
- Live Codex execution remains opt-in and must be freshly verified before claiming it is green; prior smoke results were intermittent.

## Required Workflow

Use Superpowers skills when available.

For implementation work:

1. Read the approved spec.
2. Read the current implementation-plan task only; do not load the whole plan unless needed.
3. Use an isolated worktree/feature branch.
4. Use TDD: RED -> verify RED -> GREEN -> verify GREEN -> refactor.
5. Commit after independently testable tasks.
6. Run verification before any completion claim.
7. Request/review code review at meaningful checkpoints when subagents are available.

Do not redesign approved architecture during execution unless evidence invalidates the plan.
If architecture is invalidated, stop execution, document the evidence, and return to planning.

For post-M4 work, audit the approved spec and Definition of Done first. Implement only evidence-backed gaps or maintenance changes.

## Golden Loop

Discovery -> Planning -> Execution -> Verification -> Context Health -> Continue/Handoff

At stage boundaries ask:

1. What stage am I in?
2. What evidence is missing?
3. What is the minimum context needed?
4. Is a new difficult decision required?
5. Can a cheaper model perform the next work without reducing required quality?
6. Does the approved plan remain valid?
7. Is current context still useful to the next action?

## Model Strategy

AES uses capability classes, not vendor model names:

- `cheap`: mechanical, repetitive, low-risk work after decisions are made.
- `balanced`: default for discovery, implementation, debugging, testing, and review.
- `powerful`: only for difficult new decisions: architecture, major trade-offs, high-risk reasoning, or invalidated plans.

Core rule:

> Powerful decides. Balanced/Cheap execute.

After planning is approved, downgrade from Powerful unless a new difficult decision is required.
Repository size and file count are not model-routing signals by themselves.

Fast/low-latency mode is independent from model class. Prefer it for interactive execution when quality is preserved.

## Evidence Before Escalation

Never escalate just because a task sounds hard.

Search -> Evidence -> Decision -> Reasoning -> Plan -> Execution

Escalate only when gathered evidence shows a new difficult decision is required.

## Context Strategy

Treat context as a managed resource.

- Search before broad reading.
- Read incrementally.
- Prefer canonical project docs and targeted retrieval over loading whole files/repositories.
- Do not duplicate context already available in canonical sources.
- Summarize completed work instead of carrying raw logs forward.

Context health semantics:

- `good`: current context is focused and useful.
- `growing`: stale/finished material is accumulating; minimize additions.
- `start_fresh`: next work is sufficiently independent and retained context is mostly irrelevant.

Large context alone does not imply a new conversation. Relevance matters as much as pressure.

## Handoff Rule

Never recommend a new conversation without a compact handoff.

A handoff contains only:

- Goal
- Current state
- Active plan/task
- Key decisions
- Relevant files
- Constraints/invariants
- Verification state
- Open problems
- Exact next action

Do not copy old reasoning, stale logs, or large code blocks when canonical files can be referenced.

## Control and Authority

Decision, authority, capability, and execution are separate.

Decision Engine: what should happen.
Control Engine: what AES is allowed to do automatically.
Runtime capability: what the provider can technically do.
Adapter: how the provider-specific action is executed.

Control modes:

- `manual`: recommend only.
- `assisted`: ask before executing.
- `autonomous`: execute if allowed and supported.

AES may automatically reduce authority when quality regresses.
AES MUST NOT automatically increase authority.
`assisted -> autonomous` always requires explicit user approval.

Explicit current user instruction outranks session, project, learned, and global defaults.

## Resource Governance

Hard resource constraints are separate from model optimization.

Resource policy defines what is allowed.
Model routing chooses the best option among allowed choices.

Do not silently weaken quality to fit a budget.
Hard budget override must pass through Control Engine.
Unknown token/cost values remain unknown; never treat them as zero.

## Runtime / Provider Boundary

`@aes/spec`, `@aes/kernel`, `@aes/runtime-sdk`, and `@aes/runtime` are provider-neutral.

Vendor-specific types must stay inside adapters such as `@aes/adapter-codex`.
Core/kernel/runtime MUST NOT import vendor adapters.

Provider may request authority but may never grant itself authority.

Ambiguous side effects after crash MUST NOT be replayed automatically.
Provider/network/rate-limit failures MUST NOT be interpreted as model-quality failures.

## Milestone 4 Learning Invariants

Learning is advisory; base AES execution must remain functional without it.

Project-local, low-risk learning may auto-activate only as reversible soft overlays after required evidence and shadow evaluation.

Hard policies cannot be weakened by learned overlays. This includes:

- resource budgets
- security/privacy boundaries
- provider/tool permissions
- authority escalation
- mandatory quality gates

Shadow candidates MUST NOT alter real decisions.

Every learned rule must have:

- bounded applicability
- provenance
- evidence references
- lifecycle status
- evaluation history

Savings never bypass quality gates.

LLM-generated pattern hypotheses are candidates only. They become knowledge only after deterministic evidence validation.

Active overlays must be regression-monitored and automatically degrade/disable when quality regresses.

Project-specific knowledge must not enter user/global scope without generalization, privacy filtering, evidence, and required user approval.

Global promotion fails closed when provenance, privacy, evidence, or authority is uncertain.

## Knowledge Strategy

Use typed knowledge records rather than unstructured memory as the source of truth.

Kinds:

- fact
- decision
- experience
- preference

Knowledge must support lifecycle and relations such as:

- supports
- contradicts
- supersedes
- derived_from
- applies_to

Use structured metadata + lexical retrieval first.
Do not add embeddings/vector DB/graph DB in M4 unless the approved spec changes.

Retrieval is budgeted. Never load the whole knowledge base into context.

Memory Compiler may safely reorganize/merge/index knowledge automatically, but must not silently resolve semantic conflicts.

## Learning Evidence Priority

1. Natural production evidence.
2. Offline/replay evaluation.
3. Budgeted controlled live evaluation only when necessary.

Controlled evaluation must be sandboxed, resource-governed, and free of irreversible external side effects.

Do not spend more learning resources than the expected value of the decision reasonably justifies.

## Interruption Strategy

Minimize interruptions after quality/safety constraints.

Urgency classes:

- `immediate`: work cannot safely continue.
- `boundary`: ask at a natural stage boundary.
- `digest`: non-blocking summary/notification.

Routine decisions should be grouped where possible.
Recent user rejection should suppress repeated identical routine prompts until context materially changes.

## Testing and Verification

Offline tests must not require a live provider.

Use deterministic unit/contract/fake/replay/chaos tests for normal CI.
Live Codex integration remains opt-in.

Before completion of any task:

- build/typecheck affected packages
- run affected tests
- run broader regression suite at checkpoints
- run `git diff --check`
- verify architecture/vendor boundaries when touched

Do not claim success from code inspection alone.

## Documentation Requirement

Milestone 4 Definition of Done includes comprehensive documentation for current AES Milestones 1–4, not only M4.

Documentation must explain:

- mental model
- architecture
- workflow/state lifecycle
- context management
- model routing
- control/authority
- resource governance
- adaptive runtime/provider boundary
- knowledge/memory
- adaptive learning
- configuration/API/events
- worked examples
- "How AES Makes a Decision" end-to-end flow

Specs/ADRs/contracts are canonical sources. User documentation must not create conflicting architecture.

## Scope Discipline

Do not add in Milestone 4 unless the approved spec changes:

- second live provider adapter
- dynamic plugin marketplace
- vector database / graph database requirement
- contextual-bandit exploration
- model fine-tuning
- hosted control plane/dashboard
- distributed runtime

Prefer the smallest implementation that satisfies the approved spec and tests.
