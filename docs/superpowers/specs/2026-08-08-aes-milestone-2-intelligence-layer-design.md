# AES Milestone 2 — Intelligence, Control, Context, and Learning Design

Date: 2026-08-08
Status: Implemented in the Milestone 2 reference kernel
Builds on: AES Milestone 1

## 1. Goal

Milestone 2 turns AES from a deterministic workflow kernel into an adaptive engineering decision layer that can:

- classify the current engineering situation without requiring the most capable model for every request;
- choose the minimum sufficient model capability class for each stage;
- monitor context health and recommend or perform compaction/handoff when useful;
- separate engineering decisions from user authority and runtime capability;
- minimize user interruptions while preserving explicit user control;
- accumulate durable project knowledge, decision history, procedural experience, and evaluation evidence;
- improve future routing and workflow decisions from verified outcomes rather than from unvalidated self-reflection;
- reduce total cost to a verified result without sacrificing correctness.

The system optimizes **verified outcome cost**, not raw token count.

## 2. Design Principles

1. **Decision != Authority != Capability.**
   - Engines decide what should happen.
   - Control policy decides whether AES may act automatically.
   - Runtime adapters decide whether the action can technically be performed.

2. **Evidence before escalation.**
   AES SHOULD gather evidence before choosing a more capable model.

3. **Powerful models make consequential decisions; cheaper models execute established decisions.**
   An approved plan is a strong de-escalation signal.

4. **Minimal sufficient context.**
   Context MUST grow incrementally and remain explainable.

5. **Learning requires evaluation.**
   Observed behavior MAY create experience hypotheses. It MUST NOT silently become durable policy without an evaluation/promotion gate.

6. **User authority grows only with consent.**
   AES MAY autonomously reduce its authority when quality deteriorates. It MUST NOT silently promote an action from assisted/manual to autonomous.

7. **Vendor neutrality in the core.**
   Core packages MUST NOT import Codex-, Claude-, Cursor-, Gemini-, or other vendor-specific adapters.

8. **Explainable decisions.**
   Routing, context, control, handoff, and learning outcomes MUST carry machine-readable reasons.

9. **Interruption is a budget.**
   AES SHOULD group low-urgency approvals and interrupt only when user judgment materially changes risk, authority, or outcome quality.

## 3. Package and Boundary Changes

Milestone 1 currently exposes:

- `@aes/spec`
- `@aes/kernel`
- `@aes/runtime-sdk`
- `@aes/runtime-codex`
- `@aes/cli`

Milestone 2 changes the vendor integration naming to make the boundary explicit:

- `@aes/runtime-codex` -> `@aes/adapter-codex`

Future adapters follow the same pattern:

- `@aes/adapter-claude-code`
- `@aes/adapter-cursor`
- `@aes/adapter-gemini`

Dependency rule:

```text
@aes/spec
   ^
   |
@aes/kernel ----> @aes/runtime-sdk
                       ^
                       |
                @aes/adapter-*
```

`@aes/kernel` MUST NOT depend on any `@aes/adapter-*` package.

## 4. High-Level Architecture

```text
User Task
   |
   v
Task Analyzer
   |
   v
Decision Engine
   |\
   | \
   v  v
Context Engine      Model Router
   |                    |
   v                    v
ContextDecision      ModelDecision
   |                    |
   +---------+----------+
             |
             v
       Handoff Engine (when needed)
             |
             v
         ActionRequest
             |
             v
        Control Engine
             |
      authority resolution
             |
             v
       Capability Check
          /       \
         v         v
     Execute    Recommend/Approve
         |
         v
    Runtime Adapter
         |
         v
      Runtime/LLM
         |
         v
     Verification
         |
         v
     DecisionTrace
         |
         v
    Experience Engine
         |
         v
   Knowledge Compiler
         |
         v
    Evaluation Gate
         |
         v
Knowledge / Decisions / Experience / Evals
```

Cross-cutting concerns:

- Interruption Policy
- Event/Audit trail
- User/project/session configuration resolution
- Privacy/scope boundaries

## 5. Task Analyzer

### 5.1 Purpose

The Task Analyzer converts a human request plus known runtime/workflow facts into structured routing facts.

It MUST prefer deterministic facts and rules over LLM classification.

### 5.2 Three-tier analysis

#### Tier 1 — Known facts

No model call is required for facts AES already owns, including:

- current lifecycle stage;
- plan status;
- failed attempts;
- previous/current model class;
- context health;
- runtime capabilities;
- verification state;
- existing user/session overrides.

#### Tier 2 — Deterministic rules

Examples:

- `stage=execution` + `planStatus=approved` strongly favors execution rather than replanning;
- `planStatus=invalidated` requires planning before further execution;
- a successful verification outcome closes the current execution attempt.

#### Tier 3 — Lightweight semantic classification

When facts/rules are insufficient, AES MAY ask a cheap or balanced triage model to classify semantic properties such as:

- whether an architectural decision is required;
- ambiguity level;
- task complexity;
- risk level;
- whether the work is mechanical vs judgment-heavy.

The triage call MUST produce structured output and a confidence level.

### 5.3 Routing facts

```ts
interface TaskAnalysis {
  stage: LifecycleState;
  planStatus: 'none' | 'draft' | 'approved' | 'invalidated';
  ambiguity: 'low' | 'medium' | 'high';
  risk: 'low' | 'medium' | 'high';
  taskComplexity: 'mechanical' | 'standard' | 'complex';
  confidence: 'low' | 'medium' | 'high';
  failedAttempts: number;
  architecturalDecisionRequired: boolean;
  evidenceSufficient: boolean;
  reasons: Reason[];
}
```

## 6. Context Engine

### 6.1 Goal

The Context Engine answers:

> Is the current context still worth carrying into the next action?

It MUST NOT equate a large context window with an unhealthy context.

### 6.2 Inputs

Runtime telemetry MAY include:

- input token count;
- context-window size;
- cached token count;
- compaction support;
- exact token telemetry availability.

Task/workflow facts MAY include:

- completed stages/tasks;
- active task relevance;
- topic changes;
- stale logs;
- repeated content;
- large artifacts;
- next-task independence;
- plan state;
- existing handoff state.

Quality signals MAY include:

- retrieval noise;
- repeated searches;
- contradictions;
- continued dependence on old evidence.

Missing telemetry MUST remain explicitly unknown. AES MUST NOT fabricate percentages or token counts.

### 6.3 Two-axis assessment

Context is assessed on two independent dimensions:

```ts
type ContextPressure = 'low' | 'medium' | 'high' | 'unknown';
type ContextRelevance = 'low' | 'medium' | 'high';
```

- **Pressure**: how costly/large the retained context is.
- **Relevance**: how much of it is required for the next action.

A large but highly relevant context SHOULD NOT automatically trigger a new conversation.

### 6.4 Health output

```ts
interface ContextDecision {
  health: 'good' | 'growing' | 'start_fresh';
  pressure: ContextPressure;
  relevance: ContextRelevance;
  confidence: 'low' | 'medium' | 'high';
  reasons: ContextReason[];
  recommendations: ContextAction[];
}
```

### 6.5 Hard signals

Examples that favor `start_fresh`:

- prior feature/stage completed;
- next task largely independent;
- old debugging logs are stale;
- compact handoff can preserve required state.

Examples that block `start_fresh` despite high pressure:

- unresolved debugging hypothesis depends on prior evidence;
- active architecture discussion uses earlier trade-offs;
- next step directly depends on recent detailed observations.

## 7. Model Router

### 7.1 Model abstraction

AES continues to use vendor-neutral capability classes:

```ts
type ModelClass = 'cheap' | 'balanced' | 'powerful';
```

Runtime adapters map these classes to concrete available models.

### 7.2 Default

`balanced` is the default class.

### 7.3 Cheap

Preferred when all or most of the following hold:

- work is mechanical;
- approved plan exists;
- decisions are already established;
- risk is low;
- confidence is high;
- scope is local/repetitive.

### 7.4 Powerful

Used only when evidence indicates a consequential new decision is required, including:

- architecture/design trade-offs;
- invalidated plan;
- security-sensitive design;
- complex root-cause reasoning;
- multiple interacting subsystems with unresolved choices;
- high ambiguity with meaningful impact.

### 7.5 Mandatory de-escalation principle

When the reason for escalation disappears, especially when planning is completed and approved, AES SHOULD return to `balanced` for execution.

`powerful` MUST NOT remain sticky merely because it was needed earlier.

### 7.6 Failure escalation

A failed execution attempt alone MUST NOT imply `powerful`.

Escalation occurs when failure evidence indicates that the plan/assumptions require a new consequential decision.

### 7.7 Fast/latency mode

Model capability and latency preference are independent:

```ts
interface ExecutionProfile {
  modelClass: ModelClass;
  latencyMode: 'fast' | 'standard';
}
```

Adapters determine how a latency preference maps to their runtime.

### 7.8 Explainable decision

```ts
interface ModelDecision {
  modelClass: ModelClass;
  confidence: 'low' | 'medium' | 'high';
  reasons: ModelReason[];
  previousClass?: ModelClass;
  transition: 'keep' | 'upgrade' | 'downgrade';
  latencyMode: 'fast' | 'standard';
}
```

### 7.9 Hysteresis

Model switching MUST NOT oscillate due to small score changes.

- upgrades require a concrete escalation reason;
- downgrades occur at stage boundaries or when the escalation reason is resolved;
- repeated upgrade/downgrade churn SHOULD be treated as an evaluation signal.

## 8. Handoff Engine

### 8.1 Purpose

A handoff is not a summary of the whole conversation. It is the minimum sufficient working state for the next session/task.

### 8.2 Handoff content

```text
Goal
Current State
Active Plan
Key Decisions
Relevant Files
Constraints
Open Problems
Verification State
Next Action
```

### 8.3 Exclusions

Handoff SHOULD exclude:

- finished reasoning chains;
- stale logs;
- rejected options that no longer constrain the design;
- large copied code blocks when file references are sufficient;
- duplicated specifications that have canonical sources.

### 8.4 Sufficiency validation

After generation, AES evaluates:

> Can the next task be performed using only the handoff + repository + canonical project documents?

If not, only the missing facts SHOULD be added.

### 8.5 Handoff vs durable memory

- **Handoff**: transient cross-session working state.
- **Project Memory**: durable knowledge that remains useful after the current task.

Handoff generation MAY identify memory-promotion candidates, but durable promotion is controlled separately.

## 9. Control Engine

### 9.1 Purpose

The Control Engine answers:

> Given a decision, what is AES authorized to do automatically?

It MUST NOT make engineering decisions.

### 9.2 Modes

```ts
type ControlMode = 'manual' | 'assisted' | 'autonomous';
```

- `manual`: analyze and recommend only;
- `assisted`: prepare action and request approval;
- `autonomous`: execute without per-action approval when capability and policy allow.

### 9.3 Default plus per-action overrides

```yaml
control:
  default: assisted
  actions:
    modelRouting: autonomous
    fastMode: autonomous
    toolExecution: autonomous
    contextCompaction: autonomous
    handoffCreation: autonomous
    memoryPromotion: assisted
    conversationTransition: assisted
```

### 9.4 Controlled action types

```ts
type ControlActionType =
  | 'modelRouting'
  | 'fastMode'
  | 'toolExecution'
  | 'contextCompaction'
  | 'handoffCreation'
  | 'memoryPromotion'
  | 'conversationTransition';
```

### 9.5 Configuration scopes and precedence

Lowest to highest precedence:

```text
AES default
  -> user config
  -> project config
  -> session override
  -> explicit current user decision
```

A more specific scope overrides a less specific one.

### 9.6 Runtime capabilities

```ts
interface RuntimeCapabilities {
  modelRouting: boolean;
  fastMode: boolean;
  toolExecution: boolean;
  contextTelemetry: boolean;
  tokenTelemetry: boolean;
  contextCompaction: boolean;
  handoffInjection: boolean;
  conversationTransition: boolean;
  persistentMemory: boolean;
}
```

Capabilities MUST come from the adapter/runtime, not assumptions in the core.

### 9.7 Capability fallback

If `autonomous` action is permitted but the runtime lacks the required capability, AES MUST NOT pretend to execute it.

It falls back to a recommendation/approval surface while preserving the original engineering decision.

### 9.8 Action and control results

```ts
interface ActionRequest {
  id: string;
  type: ControlActionType;
  source:
    | 'context-engine'
    | 'model-router'
    | 'handoff-engine'
    | 'policy-engine'
    | 'experience-engine'
    | 'user';
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  payload: unknown;
}

interface ControlDecision {
  actionId: string;
  mode: ControlMode;
  outcome: 'recommend' | 'request_approval' | 'execute' | 'blocked';
  reason: string;
}
```

### 9.9 Rejected approval

If the user rejects an assisted action, the underlying engineering decision MUST remain auditable.

Example:

```text
Decision: powerful recommended
Authority: rejected by user
Actual runtime: balanced
```

### 9.10 Idempotency

Action IDs MUST be idempotent at the adapter boundary for actions where duplicate execution could cause side effects.

## 10. Interruption Policy

### 10.1 Goal

Users SHOULD NOT be required to supervise routine model routing, compaction, tool use, and handoff generation.

### 10.2 Interrupt when

AES SHOULD interrupt when one or more of these conditions hold:

- new authority is required;
- action is consequential and policy is assisted/manual;
- confidence is low while expected impact is high;
- durable knowledge conflicts with other durable knowledge;
- requirements are materially ambiguous and cannot be safely inferred;
- runtime capability failure changes what the user must do next.

### 10.3 Do not interrupt for routine autonomous actions

Examples:

- known model routing patterns;
- fast-mode preference;
- routine file/tool operations permitted by policy;
- context compaction;
- handoff preparation;
- retrieval of trusted project knowledge.

### 10.4 Approval grouping

Low-urgency approvals SHOULD be grouped at stage boundaries rather than surfaced one by one.

AES MAY emit a digest such as:

```text
Handled automatically:
- 2 model transitions
- 1 context compaction
- 7 tool actions

Needs user decision:
- 1 architectural conflict
```

## 11. Learning Architecture

Milestone 2 introduces an adaptive layer that learns from verified engineering outcomes without changing model weights.

### 11.1 Decision Trace

Each meaningful task/stage produces a structured trace:

```ts
interface DecisionTrace {
  taskClass: string;
  analysis: TaskAnalysis;
  modelDecisions: ModelDecision[];
  contextDecisions: ContextDecision[];
  controlOutcomes: ControlDecision[];
  retries: number;
  verificationOutcome: 'passed' | 'failed' | 'partial';
  userOverrides: UserOverrideEvent[];
  cost?: CostTelemetry;
  timestamp: string;
}
```

### 11.2 Experience Engine

The Experience Engine aggregates traces into patterns such as:

- approved-plan TypeScript refactors usually succeed with `balanced + fast`;
- multi-subsystem debugging often requires planning after a specific failure pattern;
- context handoffs after completed independent features reduce repeated retrieval.

It produces **experience hypotheses**, not immediate policy mutations.

### 11.3 Evaluation Gate

Experience hypotheses require evaluation before durable promotion.

Possible evidence includes:

- sample count;
- verified success rate;
- retry rate;
- quality regression rate;
- escalation rate;
- user override rate;
- cost-to-verified-outcome change.

The initial implementation SHOULD use conservative deterministic thresholds configurable by policy. It MUST preserve underlying evidence references.

### 11.4 Authority learning

AES MAY observe repeated approval/rejection patterns.

Example:

- 12/12 similar model-routing approvals accepted;
- all 12 tasks verified successfully.

AES MAY then propose a one-time authority promotion:

> Allow autonomous model routing for this task class?

AES MUST NOT silently promote `manual`/`assisted` to `autonomous`.

If autonomous behavior shows quality regressions, AES MAY automatically degrade to `assisted` and record the reason.

## 12. AES Knowledge & Experience Base

### 12.1 Project layout

```text
.aes/
├── raw/
├── knowledge/
├── decisions/
├── experience/
├── evals/
├── index.md
├── log.md
└── MEMORY.md
```

This structure follows the broader principle of separating raw evidence, maintained knowledge, durable decisions, experiential learning, and evaluation evidence.

### 12.2 `raw/`

Immutable or append-only evidence, for example:

```text
raw/
├── sessions/
├── sources/
├── reports/
├── benchmarks/
└── telemetry/
```

Generated knowledge MUST reference raw evidence where practical.

### 12.3 `knowledge/`

Maintained semantic project knowledge:

```text
knowledge/
├── project/
├── concepts/
├── architecture/
├── conventions/
├── components/
└── constraints/
```

Knowledge SHOULD be concise, linked, canonical, and optimized for selective retrieval rather than bulk loading.

### 12.4 `decisions/`

Durable rationale, normally ADRs or ADR-like records.

Knowledge answers **what is true now**. Decisions answer **what was chosen and why**.

### 12.5 `experience/`

Procedural learning:

```text
experience/
├── routing/
├── context/
├── workflows/
├── failures/
└── preferences/
```

Experience is evidence-backed guidance about what tends to work.

### 12.6 `evals/`

Evaluation artifacts used to decide whether an experience hypothesis can be promoted into trusted guidance or policy.

### 12.7 Index and log

- `index.md`: compact navigation map for selective retrieval.
- `log.md`: append-only record of notable knowledge/experience changes.
- `MEMORY.md`: concise entrypoint describing memory conventions and currently important durable project context.

## 13. Memory Scopes and Privacy Boundary

AES distinguishes:

### Session scope

Ephemeral active state and transient handoff data.

### Project scope

Architecture, project decisions, constraints, project experience, and project-specific knowledge.

### User/global scope

General user preferences and generalized procedural experience that does not disclose project content.

Default rule:

> Project content MUST NOT be promoted into global/user memory automatically.

Generalized procedural learning MAY be promoted when project-specific identifiers/content are removed and policy allows it.

## 14. Knowledge Lifecycle

Durable knowledge follows:

```text
Capture -> Distill -> Validate -> Promote -> Use -> Review -> Keep/Supersede
```

AES SHOULD prefer superseding outdated durable knowledge over destructive deletion when historical rationale remains useful.

Every durable record SHOULD support metadata such as:

```ts
interface KnowledgeMetadata {
  id: string;
  status: 'candidate' | 'trusted' | 'superseded';
  scope: 'session' | 'project' | 'user';
  confidence: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  evidenceRefs: string[];
  supersededBy?: string;
}
```

## 15. Knowledge Retrieval Strategy

Retrieval MUST remain context-efficient.

Default sequence:

```text
1. index / metadata
2. lexical search
3. read 1-3 relevant notes
4. follow explicit links when needed
5. semantic/vector retrieval only when simpler retrieval is insufficient
```

AES MUST NOT load the full knowledge base into each model call.

Vector/RAG infrastructure is deferred until evidence shows it is necessary.

## 16. Events and Audit Trail

New event families include:

```text
analysis.*
context.*
model.*
control.*
approval.*
handoff.*
experience.*
knowledge.*
eval.*
interruption.*
```

Examples:

```text
control.action.received
control.mode.resolved
control.approval.requested
control.approval.approved
control.capability.unavailable
control.action.executed
context.health.changed
model.route.changed
handoff.generated
experience.hypothesis.created
knowledge.promotion.requested
knowledge.promoted
eval.completed
```

Audit events SHOULD preserve the difference between:

- recommended action;
- authorized action;
- actual runtime action;
- verified outcome.

## 17. Error Handling

Milestone 2 adds structured errors for:

- task-analysis failures;
- malformed semantic classifier output;
- context telemetry unavailable;
- unsupported runtime capabilities;
- approval expiry/rejection;
- handoff validation failure;
- idempotency conflicts;
- memory scope violations;
- knowledge conflicts;
- evaluation/promotion rejection.

Unavailable optional telemetry is not an error; it lowers confidence or produces `unknown` fields.

## 18. Testing Strategy

Milestone 2 MUST be testable without live vendor APIs.

### Unit tests

- deterministic task-analysis rules;
- context pressure/relevance matrix;
- hard-signal overrides;
- model routing and mandatory de-escalation;
- hysteresis;
- control scope precedence;
- manual/assisted/autonomous outcomes;
- capability fallback;
- idempotent actions;
- interruption decision rules;
- handoff filtering and sufficiency validation;
- memory-scope boundaries;
- experience aggregation;
- evaluation/promotion gates.

### Contract tests

- runtime capability declaration;
- adapter action execution/fallback;
- renamed `adapter-codex` package boundary;
- core never imports adapter package.

### Integration scenarios

1. **Simple mechanical task**
   - balanced discovery -> cheap/balanced execution -> verify;
   - no user interruption.

2. **Architecture task**
   - balanced discovery -> powerful planning -> mandatory downgrade -> balanced execution.

3. **Context growth with active relevance**
   - high pressure + high relevance -> continue/growing; no forced fresh chat.

4. **Independent next task**
   - low relevance -> handoff -> assisted conversation transition.

5. **Unsupported autonomous capability**
   - autonomous decision -> capability missing -> recommendation fallback.

6. **Learning authority**
   - repeated successful approvals -> propose autonomous promotion; do not self-promote.

7. **Learning regression**
   - autonomous learned pattern degrades quality -> automatic downgrade to assisted.

8. **Knowledge privacy**
   - project-specific fact blocked from global promotion.

## 19. Migration from Milestone 1

1. Rename package directory and manifest:
   - `packages/runtime-codex` -> `packages/adapter-codex`
   - `@aes/runtime-codex` -> `@aes/adapter-codex`

2. Preserve existing runtime SDK interfaces while adding capabilities/actions incrementally.

3. Extend `@aes/spec` with control, context, task-analysis, handoff, knowledge, experience, and evaluation types.

4. Add Milestone 2 engines to `@aes/kernel` as focused modules rather than expanding `kernel.ts` into a monolith.

5. Existing Milestone 1 deterministic workflows MUST continue to run.

## 20. Suggested Kernel Module Boundaries

```text
packages/kernel/src/
├── task-analyzer.ts
├── context-engine.ts
├── model-router.ts
├── control-engine.ts
├── handoff-engine.ts
├── interruption-policy.ts
├── experience-engine.ts
├── knowledge-compiler.ts
├── evaluation-gate.ts
└── memory-store.ts
```

Each module should expose a narrow deterministic interface. LLM-assisted classification/generation is injected through runtime-neutral interfaces rather than hard-coded provider calls.

## 21. Non-Goals for Milestone 2

Milestone 2 does NOT require:

- model fine-tuning;
- a hosted database;
- vector database/RAG infrastructure;
- a web UI;
- autonomous multi-agent orchestration;
- live integrations for every adapter;
- remote synchronization of user memory;
- billing/payment logic;
- silent expansion of user-granted authority.

Local filesystem-backed knowledge/experience storage is sufficient for the reference implementation.

## 22. Success Criteria

Milestone 2 is successful when the reference implementation can deterministically demonstrate:

1. task facts are resolved from known state/rules before optional semantic classification;
2. architecture planning can trigger `balanced -> powerful` routing and plan approval triggers downgrade;
3. context decisions distinguish pressure from relevance;
4. a compact handoff is generated and validated for an independent next task;
5. `default + action override + scope precedence` control resolution works;
6. unsupported runtime capabilities fall back without false execution claims;
7. routine autonomous decisions do not produce unnecessary approval requests;
8. repeated verified outcomes produce experience hypotheses;
9. hypotheses cannot become trusted knowledge/policy without evaluation;
10. project-specific knowledge cannot silently leak into global scope;
11. adapter naming and dependencies keep the AES core vendor-neutral;
12. all behavior is covered by offline tests without requiring a live LLM API.

## 23. Self-Review

### Placeholder scan

No TBD/TODO placeholders or undefined mandatory decisions remain.

### Consistency

- Decision, authority, capability, and execution are distinct throughout the design.
- `assisted` remains the default while per-action overrides allow autonomous routine behavior.
- Learning improves recommendations and may propose authority changes, but cannot silently expand authority.
- Context telemetry is optional and never fabricated.
- Model names remain outside the core.
- Knowledge storage is retrieval-oriented and does not imply loading the whole memory into context.

### Scope

The design is large but forms one coherent milestone: adaptive decision/control/context/learning behavior. UI, multi-agent orchestration, vector RAG, and hosted persistence are explicitly deferred.

### Ambiguity resolution

- `memoryPromotion` defaults to assisted.
- `conversationTransition` defaults to assisted under the sample config.
- authority may auto-degrade but not auto-promote;
- project-to-global memory promotion is blocked by default;
- adapter capability absence changes execution, not the underlying recommendation;
- semantic classification is optional and used only when deterministic evidence is insufficient.
