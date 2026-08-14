# AES Handoff — ChatGPT to Codex

Date: 2026-08-14
Status: Milestone 4 implemented; ready for specification audit and maintenance

## Goal

Continue development of **Agent Engineering Specification (AES)** in Codex by auditing and maintaining the implemented **Milestone 4 — Adaptive Learning & Knowledge Runtime** against the approved design, implementation plan, and Definition of Done.

AES is a provider-neutral engineering-agent runtime/specification. Its objective is to preserve verified quality while minimizing total cost, tokens, retries, latency, and unnecessary user interruptions.

## Current State

Milestones 1–4 are implemented in this snapshot.

Milestone 3 includes the provider-neutral Adaptive Runtime, runtime/provider contracts, model resolution, resource governance, trace/telemetry storage, recovery/circuit-breaker behavior, a Codex App Server adapter boundary, fake/replay/chaos harnesses, and an opt-in live Codex smoke path.

A fresh baseline on 2026-08-14 passed **223/223 offline tests with 0 failures**. The canonical build/typecheck command also passed:
`corepack pnpm@10.14.0 -r --sort build`.

The verified toolchain is Node.js `v24.19.0` and pnpm `10.14.0` (Node.js `>=22` is required). `pnpm install` was needed to restore workspace links in the local environment; it produced an untracked root `pnpm-lock.yaml`, which has intentionally not been committed.

The current main baseline contains the M4 implementation evidence in commits `97b5ea4`, `0ef785f`, `246f57a`, `66561a8`, `4e54fcd`, `b9f1099`, `ac61ebe`, `0811a7c`, `d865c46`, `5a25a4f`, `2e9f8d9`, `f54121b`, `1bbc04f`, `3a4aea2`, and `7300403`.

The live Codex path remains opt-in. A manual read-only real-task run succeeded in the isolated worktree, while the automated live smoke has had intermittent failures; do not treat live execution as green without a fresh successful run.

Milestone 4 architecture has been discussed in depth and explicitly approved by the user.

Milestone 4 implementation is complete in the current main baseline. The next action is a bounded audit against the approved specification and Definition of Done; any follow-up implementation must be evidence-backed.

## Canonical Files

Read in this order:

1. `AGENTS.md`
2. `docs/superpowers/specs/2026-08-09-aes-milestone-4-adaptive-learning-knowledge-design.md`
3. `docs/superpowers/plans/2026-08-09-aes-milestone-4-adaptive-learning-knowledge.md`
4. Relevant M3 contracts/code for the first task only.

Do not reopen already approved architecture unless repository evidence contradicts the M4 spec.

## Approved Milestone 4 Architecture

The central learning loop is:

`DecisionTrace -> Experience Miner -> Candidate -> Shadow -> Evaluation -> Reversible Project Overlay -> Future Decisions -> New Evidence`

Optional LLM analysis may generate hypotheses, but LLM output is never knowledge by itself. Hypotheses must be backed by deterministic evidence queries and pass the same Evaluation Engine as deterministic candidates.

### Project-local vs global learning

Project-local, low-risk, verified learning may activate automatically as reversible **soft overlays**.

Global/cross-project promotion and any authority increase require controlled promotion and explicit user approval where specified.

AES may automatically become more conservative. It may not silently become more autonomous.

### Overlay constraints

Learned overlays may influence only closed, reversible soft preferences such as:

- model preference
- latency/Fast preference
- context compaction/handoff preference
- retry/replan preference
- interruption timing/suppression

They may not weaken:

- resource budgets
- safety/security/privacy rules
- provider/tool permissions
- quality gates
- user authority requirements

### Evaluation principle

Quality is the hard gate.

Optimization order:

1. Preserve required verified quality.
2. Reduce total cost/tokens/retries.
3. Reduce unnecessary user interruptions.
4. Improve latency.

Shadow mode is mandatory before project-local activation where the spec requires it. Shadow decisions must never replace real production decisions.

Counterfactual routing claims cannot be considered proven merely because a shadow policy would have chosen another model; model-routing activation requires real comparative or controlled evidence as specified.

### Evidence priority

1. Natural evidence from normal work.
2. Offline/replay evaluation.
3. Budgeted controlled live evaluation only when needed.

Controlled evals are sandboxed, resource-governed, and forbidden from irreversible external side effects.

### Typed knowledge

Milestone 4 evolves `.aes/` into typed knowledge records with provenance, applicability, confidence/evaluation data, lifecycle state, and lightweight graph relations.

Knowledge kinds:

- fact
- decision
- experience
- preference

No mandatory embeddings/vector DB/graph DB in M4. Retrieval uses structured filters + lexical ranking + budgets first.

### Memory Compiler

Memory maintenance includes:

- normalize
- deduplicate
- merge
- supersede
- conflict detection
- consolidation
- index generation
- lint
- retention/budgets

Structural cleanup may be automatic. Semantic conflicts must not be silently resolved.

### Interruption / authority learning

AES learns when a user interruption has low value and may batch/schedule routine assisted decisions.

Interruption urgency:

- immediate
- boundary
- digest

Repeated approvals can produce an **AuthorityCandidate**, but `assisted -> autonomous` always requires explicit user approval.

Regression may automatically reduce authority, for example `autonomous -> assisted`.

## Important Architectural Invariants

- Learning failure must not break base execution.
- Learned rules are reversible.
- Shadow rules never affect live decisions.
- Savings never bypass quality gates.
- Authority never increases automatically.
- Project knowledge never leaks to global scope silently.
- Every learned rule has provenance.
- Unknown evidence is never fabricated or converted to zero.
- Conflicting knowledge is never silently resolved.
- Global promotion fails closed.
- Learning/retrieval obey resource budgets.
- Provider failures are not model-quality failures.
- Vendor-specific types remain inside adapters.

## M4 Implementation Plan

The plan contains 18 TDD tasks:

1. Normative M4 spec contracts.
2. Provider-neutral learning SDK + richer runtime evidence.
3. Experience metrics and candidate mining.
4. Quality-first Evaluation Engine.
5. Reversible Policy Overlay Engine.
6. Shadow evaluation and soft advice integration.
7. Regression monitoring and rollback.
8. Typed `.aes` knowledge storage + M3 migration.
9. Memory Compiler, lint, retrieval, storage hygiene.
10. Interruption timing learning.
11. Scoped authority evidence/promotion/degradation.
12. Natural -> replay -> controlled evidence acquisition.
13. Optional LLM Pattern Analyst boundary.
14. Full adaptive learning lifecycle coordinator.
15. M4 config/events/examples.
16. Architecture/concept documentation for M1–M4.
17. Configuration/API/operations docs + worked examples.
18. Final deterministic verification/compatibility audit/live smoke.

Follow the plan task-by-task. Do not try to implement all M4 in one edit.

## Documentation Requirement

The user explicitly wants detailed documentation derived from the architecture we designed.

M4 Definition of Done therefore includes a comprehensive documentation pack covering the **whole AES system through Milestone 4**, including a central page:

**How AES Makes a Decision**

It should trace one task through:

`Task Analyzer -> Context -> Knowledge Retrieval -> Base Policies -> Learned Overlays -> Model Router -> Resource Governance -> Control -> Adaptive Runtime -> Provider -> Verification -> DecisionTrace -> Learning`

The approved M4 implementation plan already includes documentation tasks 16 and 17. Do not drop them as optional cleanup.

## Future Work Preserved but Out of M4 Scope

After M4, likely directions include:

- second live provider adapter to validate provider neutrality
- intelligent workflow decomposition
- richer eval/research platform capabilities
- possible AES whitepaper explaining philosophy and architecture
- UI/observability/dashboard only after core behavior is stable

Do not pull these into M4 without a new design/spec decision.

## First Action in Codex

1. Verify the repo is clean and inspect current branch/history.
2. Confirm Node >=22 and pnpm 10.14.0 availability.
3. Run the complete baseline build/offline test suite before changing code.
4. If baseline is green, use Superpowers and start **Task 1** of the M4 implementation plan with TDD.
5. If baseline is not green, use systematic debugging and fix/understand the environment before M4 work.

## Context Discipline

Do not load the entire 4,740-line implementation plan into working context for every task. Read the global constraints once, then retrieve only the current task and the exact neighboring interfaces it consumes/produces.

Use fresh subagents per independent task/review when Codex supports them. This is preferable to carrying all implementation history in one agent context.

## What Not to Do

- Do not redesign M4 from scratch.
- Do not add a second provider during M4.
- Do not use LLM-generated rules as truth.
- Do not permit silent authority escalation.
- Do not add embeddings/graph DB because the knowledge system “sounds like RAG.”
- Do not skip shadow/evaluation/regression gates to make the learning demo appear faster.
- Do not treat lower token usage as success when verification quality falls.
