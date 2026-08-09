# AES Milestone 4 — Adaptive Learning & Knowledge Runtime Design

Date: 2026-08-09
Status: Approved
Builds on: AES Milestone 3 — Adaptive Runtime & Codex Provider
Primary theme: Evidence-driven adaptive behavior with reversible project-local learning

## 1. Goal

Milestone 4 closes the learning loop that Milestones 2 and 3 prepared but did not fully operationalize.

Milestone 3 can execute work through a provider-neutral adaptive runtime, collect normalized telemetry and `RuntimeDecisionTrace` evidence, enforce authority and resource policies, recover from failures, and convert attributable runtime traces into learning evidence. Milestone 4 turns that evidence into safe, explainable, reversible changes in future AES behavior.

The milestone MUST enable AES to:

- mine repeated patterns from verified real work;
- create typed learning and knowledge candidates with explicit provenance;
- evaluate candidates using quality-first evidence gates;
- validate candidates in shadow mode before they can influence production behavior;
- activate low-risk project-local optimization as reversible soft policy overlays;
- keep hard constraints, safety rules, privacy boundaries, resource limits, and authority boundaries outside learned mutation;
- continuously monitor active learned overlays and automatically degrade or disable them when verified outcomes regress;
- maintain a typed project knowledge base with deduplication, supersession, contradiction handling, bounded retrieval, retention, and deterministic indexes;
- learn when user interruptions are unnecessary without silently increasing AES authority;
- propose broader authority only when repeated evidence supports it and the user explicitly approves it;
- use natural evidence first, replay/offline evaluation second, and budgeted live controlled evaluation only when needed;
- fail safely to the base policy whenever the learning subsystem is unavailable, inconsistent, over budget, or insufficiently supported by evidence;
- explain which learned rule influenced a decision and why AES currently trusts that rule;
- keep the entire learning process provider-neutral.

AES continues to optimize **minimum total cost to a verified quality outcome**, not minimum token consumption in isolation.

Milestone 4 also establishes a documentation Definition of Done: the adaptive learning loop is not considered complete until its architecture, configuration, decision flow, authority behavior, knowledge model, and operational guidance are documented as first-class AES documentation.

## 2. Current Baseline

Milestone 4 extends the existing implementation rather than replacing it.

The Milestone 3 baseline already contains:

- `ExperienceEngine`, which aggregates `DecisionTrace` or attributable `RuntimeExperienceEvidence` by task class;
- `EvaluationGate`, which evaluates simple sample, success, retry, override, and quality-regression thresholds;
- `KnowledgeCompiler`, which validates project-to-user scope promotion, promotes evaluated records, and marks records superseded;
- `MemoryStore`, which creates `.aes/` storage, writes Markdown knowledge plus JSON metadata, appends an `index.md`, and performs simple lexical matching;
- `AuthorityLearning`, which can propose autonomy after repeated verified approvals and can degrade autonomy when regression exceeds policy;
- `InterruptionPolicy`, which decides whether an action should interrupt and can group approval items;
- `ModelRouter`, `ContextEngine`, `ControlEngine`, runtime recovery, Resource Governance, provider-neutral runtime contracts, and the Codex provider edge;
- `RuntimeDecisionTrace` conversion into `RuntimeExperienceEvidence`, including attribution filtering that distinguishes provider failures and cancellation from model-quality evidence.

Milestone 4 generalizes these primitives into a coherent adaptive subsystem while preserving backward compatibility wherever practical.

## 3. Milestone 4 Non-Goals

The following are explicitly out of scope:

- model fine-tuning;
- reinforcement learning that directly updates model weights;
- autonomous rewriting of hard AES policies;
- arbitrary LLM-generated executable policy code;
- a contextual-bandit or production exploration framework that deliberately routes user work through inferior choices merely to gather data;
- a vector database as a mandatory dependency;
- embeddings as the default retrieval path;
- a graph database such as Neo4j;
- a hosted knowledge service;
- distributed quota or distributed learning infrastructure;
- a production analytics dashboard;
- cross-user learning;
- automatic global authority expansion;
- silent promotion of project-specific facts into user/global knowledge;
- a second provider adapter;
- automatic workflow decomposition or multi-agent task DAG execution;
- modification of canonical source files, ADRs, or repository policy files solely because a learned candidate exists.

The contracts MAY leave room for future statistical optimization, vector retrieval, distributed stores, richer experimentation, or additional providers, but Milestone 4 MUST remain deterministic, inspectable, dependency-light, and useful without them.

## 4. Normative Invariants

The following requirements are hard invariants for Milestone 4:

1. Learning MUST NOT be required for base AES execution.
2. A failure in learning MUST fall back to base policy rather than block ordinary work, except when a separate hard policy independently blocks the work.
3. Learned behavior MUST be reversible.
4. A shadow candidate MUST NOT affect the real production decision.
5. Cost or token savings MUST NOT bypass a required quality gate.
6. Hard safety, privacy, authority, capability, quality, and resource constraints MUST NOT be weakened by a learned soft overlay.
7. AES MUST NOT silently increase its own authority.
8. AES MAY automatically reduce its own authority when verified regression or risk evidence warrants a more conservative mode.
9. Project-specific knowledge MUST NOT be promoted to user/global scope without generalization and privacy filtering.
10. Every learned rule MUST have provenance that identifies the evidence used to support it.
11. Unknown evidence MUST remain unknown and MUST NOT be fabricated as zero, success, failure, cost, or confidence.
12. Conflicting durable knowledge MUST NOT be silently resolved by “newest wins”.
13. If conflicting active overlays cannot be deterministically resolved, their conflicting influence MUST be removed and the relevant base policy MUST be used.
14. Global or cross-project promotion MUST fail closed when privacy, provenance, evaluation, or authority checks are unavailable or incomplete.
15. Knowledge retrieval and learning analysis MUST obey explicit resource budgets.
16. An LLM-generated hypothesis MUST NOT become active knowledge or policy without evidence validation.
17. Active overlays MUST be continuously monitored for regression.
18. Provider failure MUST NOT be treated as evidence that a model capability class is poor unless attribution explicitly supports that conclusion.
19. User cancellation MUST NOT be treated as model-quality failure.
20. Controlled live evaluation MUST NOT perform ambiguous or irreversible external side effects.
21. Controlled live evaluation MUST run under Resource Governance and its own bounded learning budget.
22. A user’s explicit current decision MUST outrank learned history.
23. Learned project policy MUST remain a soft advisory overlay rather than mutating the base policy source of truth.
24. Repeated maintenance runs MUST be idempotent: they MUST NOT continuously manufacture duplicate knowledge from unchanged evidence.
25. Indexes MUST be reproducible from canonical typed knowledge records.

## 5. Architectural Position

Milestone 4 does not require a new top-level package. It extends the existing boundaries so the adaptive layer remains easy to test and provider-neutral.

```text
@aes/spec
   ^
   |
@aes/kernel -------------------------------+
   ^                                       |
   | deterministic domain logic            |
   |                                       |
@aes/runtime-sdk                            |
   ^                                       |
   | provider/store contracts               |
   |                                       |
@aes/runtime -------------------------------+
   ^
   |
@aes/adapter-codex
```

### 5.1 `@aes/spec`

Owns normative data contracts for:

- learning evidence;
- task signatures and applicability;
- candidate lifecycle;
- knowledge records and relations;
- overlay effects and overlay status;
- evaluation results;
- interaction evidence;
- learning budgets;
- learning events when they are part of the AES specification.

### 5.2 `@aes/kernel`

Owns deterministic domain decisions for:

- Experience Miner;
- candidate generation from structured evidence;
- Evaluation Engine;
- Policy Overlay Engine;
- conflict resolution;
- Regression Monitor policy decisions;
- Knowledge Compiler decisions;
- Memory lint rules;
- retrieval ranking policy;
- Interruption Learning;
- Authority Learning;
- scope/privacy validation;
- deciding whether controlled evaluation is justified in principle.

Kernel code MUST NOT invoke a provider, start a live eval, read a vendor model catalog, or import Codex-specific types.

### 5.3 `@aes/runtime-sdk`

Owns neutral interfaces for:

- knowledge/trace/evaluation persistence;
- optional LLM pattern-analysis capability;
- optional controlled-evaluation executor;
- optional clock or metric abstractions when required for deterministic testing.

### 5.4 `@aes/runtime`

Owns orchestration and side effects for:

- feeding completed traces into the learning pipeline;
- scheduling incremental maintenance;
- invoking optional LLM candidate analysis;
- performing replay or live controlled evals through safe runtime boundaries;
- persisting candidates, evaluations, overlays, and knowledge;
- applying active overlays to future runtime decisions;
- collecting post-activation evidence;
- triggering degradation or rollback;
- rebuilding materialized indexes;
- enforcing learning and retrieval budgets through Resource Governance.

### 5.5 Provider adapters

Provider adapters continue to own provider-specific execution only. They MUST NOT decide which learned rule is valid or which authority level AES should grant itself.

## 6. High-Level Architecture

```text
                           REAL WORK
                              |
                              v
                      RuntimeDecisionTrace
                              |
                              v
                       Evidence Adapter
                              |
                              v
                       Experience Miner
                         /          \
                        /            \
            deterministic patterns   LLM Pattern Analyst
                        |                    |
                        |               hypothesis only
                        |                    |
                        +---------+----------+
                                  v
                           Evidence Query
                                  |
                                  v
                          Candidate Record
                                  |
                                  v
                            Shadow Mode
                                  |
                                  v
                          Evaluation Engine
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
                 reject                      validated
                                                |
                                                v
                                     Project Soft Overlay
                                                |
                    +---------------------------+------------------+
                    |                           |                  |
                    v                           v                  v
               Model Router               Context Engine      Interruption /
                                                              Retry/Replan
                    |                           |                  |
                    +---------------------------+------------------+
                                                |
                                                v
                                           NEXT WORK
                                                |
                                                v
                                         Regression Monitor
                                                |
                                  +-------------+-------------+
                                  |                           |
                                  v                           v
                                keep                      degrade /
                                                         disable /
                                                        supersede

             Knowledge / Memory path runs alongside the policy path:

Candidate Knowledge -> Evaluation -> Typed Knowledge -> Memory Compiler
       -> index.json + index.md -> Budgeted Retrieval -> Future Decisions
```

The core architectural principle is that **evidence may influence future behavior only through typed, validated, scoped, reversible artifacts**.

## 7. Learning Scope and Trust Boundary

Milestone 4 defines three scopes:

```ts
type LearningScope = 'session' | 'project' | 'user';
```

### 7.1 Session scope

Session knowledge is transient and useful for the current run or conversation. It MAY be discarded when the session ends unless promoted.

### 7.2 Project scope

Project scope is the default home for adaptive learning. Low-risk, validated soft optimization MAY activate automatically at project scope.

Examples:

- model preference for a well-defined class of project tasks;
- context compaction preference;
- retry versus replan preference;
- interruption suppression for routine reversible situations;
- provider-neutral latency preference.

### 7.3 User scope

User scope represents generalized cross-project experience or preferences. In this design, informal references to **global** learning mean this user-level generalized scope; Milestone 4 does not introduce a separate `global` scope value. Promotion into user scope requires stronger evidence and controlled promotion. Project-specific identifiers, code facts, repository paths, customer names, internal architecture facts, and other local context MUST NOT be silently generalized into user scope.

### 7.4 Authority is separate from learning scope

A project-level learned recommendation is not equivalent to authority to execute it. The Control Engine remains the source of authority. Learning can recommend an action or generate an authority-promotion candidate, but authority escalation requires explicit user consent.

## 8. Task Signature and Applicability Model

The existing `taskClass` is too coarse for adaptive policy. Milestone 4 introduces a normalized task signature that captures only stable, decision-relevant context.

Conceptual contract:

```ts
interface TaskSignature {
  taskClass: string;
  stage?: 'discovery' | 'planning' | 'execution' | 'verification';
  planStatus?: 'none' | 'draft' | 'approved';
  taskComplexity?: string;
  risk?: string;
  architecturalDecisionRequired?: boolean;
  language?: string;
  stackTags?: string[];
  operationTags?: string[];
}
```

The exact set of tags MUST remain bounded and normalized. It MUST NOT contain raw prompts, source code, secrets, arbitrary filesystem content, or provider-specific free text.

An applicability predicate is a partial match over normalized fields:

```ts
interface Applicability {
  taskClass?: string;
  stage?: string;
  planStatus?: string;
  taskComplexity?: string[];
  risk?: string[];
  architecturalDecisionRequired?: boolean;
  language?: string;
  stackTags?: string[];
  operationTags?: string[];
}
```

A learned rule is valid only inside its applicability boundary. AES MUST NOT generalize “Balanced worked well on these TypeScript approved-plan execution tasks” into “Balanced is always best”.

## 9. Runtime Evidence Model

Milestone 4 expands experience evidence so evaluation can optimize verified outcome rather than count successes only.

Conceptually:

```ts
interface LearningEvidence {
  id: string;
  traceId: string;
  signature: TaskSignature;
  verification: 'passed' | 'failed' | 'partial' | 'not_run';
  attributable: boolean;
  modelClass?: 'cheap' | 'balanced' | 'powerful';
  latencyMode?: 'fast' | 'standard';
  retries: number;
  replans?: number;
  userInterruptions: number;
  providerRecoveries: number;
  fallbackKind?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  durationMs?: number;
  qualityRegression?: boolean;
  timestamp: string;
}
```

Optional telemetry remains optional. Absence of cost or token data MUST reduce metric coverage, not become an implicit zero.

Evidence used to compare model classes MUST exclude traces whose failure is known to be provider availability, transport, cancellation, or another unrelated cause unless the candidate being evaluated is specifically about recovery or availability.

## 10. Experience Miner

The Experience Miner converts normalized evidence into candidate patterns.

It MUST:

- operate on attributable evidence only for model-quality recommendations;
- group evidence by normalized task signature or a stable generalized projection of that signature;
- maintain comparable statistics for alternative choices where evidence exists;
- preserve exact evidence references;
- expose metric coverage when optional measurements are missing;
- avoid promoting a single trace into a generalized rule;
- create candidates, not active policy.

Recommended aggregated metrics include:

- sample count;
- verified success count/rate;
- partial verification rate;
- first-pass success rate;
- retry rate;
- replan rate;
- average and quantile duration when available;
- average total tokens when available;
- average estimated cost when available;
- interruption count/rate;
- provider recovery rate;
- fallback rate;
- quality regression count/rate;
- measurement coverage for every optional metric.

Milestone 4 does not require statistically sophisticated estimators. Deterministic aggregation and conservative thresholds are preferred over premature complexity.

## 11. Candidate Types

Learning produces typed candidates rather than unstructured prose.

Recommended candidate categories:

```ts
type CandidateKind =
  | 'model_preference'
  | 'latency_preference'
  | 'context_preference'
  | 'retry_preference'
  | 'replan_preference'
  | 'interruption_preference'
  | 'knowledge'
  | 'authority_promotion';
```

Every candidate includes:

- stable ID;
- kind;
- scope;
- applicability;
- proposed effect or statement;
- source (`experience_miner` or `llm_pattern_analyst`);
- evidence references;
- evidence class;
- current lifecycle status;
- creation/update timestamps;
- evaluation history;
- optional relation to an existing rule it may supersede.

Candidates do not carry self-declared trust. Trust is assigned only by evaluation.

## 12. Optional LLM Pattern Analyst

A model MAY be used to discover non-obvious hypotheses from an evidence bundle, but the LLM is only a candidate generator.

The allowed flow is:

```text
Evidence Bundle
    -> LLM Pattern Analyst
    -> Hypothesis
    -> deterministic Evidence Query
    -> Candidate
    -> Shadow / Evaluation
```

The forbidden flow is:

```text
LLM observes traces
    -> LLM edits production policy directly
```

The LLM Pattern Analyst MUST NOT:

- grant confidence to itself;
- activate an overlay;
- expand authority;
- create user/global durable knowledge without scope checks;
- bypass Resource Governance;
- rely on raw sensitive material when a normalized evidence bundle is sufficient.

If the LLM analyzer is unavailable or over budget, deterministic mining continues normally.

## 13. Evidence Strength Classes

Milestone 4 distinguishes evidence quality:

```ts
type EvidenceStrength =
  | 'observational'
  | 'comparative'
  | 'controlled';
```

### 13.1 Observational

Evidence for one choice exists from natural work, but there is no comparable real evidence for an alternative.

Example: 40 verified `balanced` runs and almost no `cheap` runs.

Observational evidence can support descriptive knowledge and low-risk heuristics but is insufficient by itself to prove a counterfactual model substitution.

### 13.2 Comparative

Natural or replay evidence exists for multiple choices under sufficiently similar applicability conditions.

Example: comparable approved-plan TypeScript execution has verified evidence for both `cheap` and `balanced`.

A model-routing overlay that changes the preferred capability class SHOULD require at least comparative evidence.

### 13.3 Controlled

A bounded, isolated evaluation intentionally compares alternatives on safe fixtures or benchmark tasks.

Controlled evidence is strongest but costs resources and MUST not be the default route to learning.

## 14. Candidate Lifecycle

All adaptive candidates follow an explicit lifecycle:

```text
discovered
    |
    v
candidate
    |
    v
shadow
    |
    v
validated
    |
    v
active
   / \
  v   v
degraded  superseded
  |
  v
disabled
```

Not every candidate reaches every state. Rejected candidates MAY move directly from `candidate` or `shadow` to `disabled`/`rejected` depending on the final contract naming.

Normative lifecycle rules:

- `candidate` MUST NOT influence production decisions;
- `shadow` MUST NOT influence production decisions;
- `validated` indicates evidence passed evaluation, but activation still depends on scope and authority rules;
- `active` may influence only the allowed soft decision surface;
- `degraded` MUST reduce or remove effective influence;
- `superseded` retains provenance and links to its replacement;
- `disabled` MUST have no effect.

## 15. Shadow Mode

Shadow mode is mandatory for learned soft overlays before automatic project-local activation.

A shadow overlay receives the same normalized decision context as the active policy and computes what it **would** recommend. That result is recorded as shadow evidence but is never substituted for the production choice.

Conceptual trace extension:

```ts
interface ShadowDecisionTrace {
  candidateId: string;
  baselineDecision: unknown;
  shadowDecision: unknown;
  comparable: boolean;
  observedOutcome?: unknown;
}
```

Shadow mode is useful for:

- confirming applicability frequency;
- detecting conflicts;
- measuring how often a candidate would actually change the decision;
- evaluating interruption suppression when the real outcome remains observable;
- checking deterministic policy behavior before activation.

Shadow mode cannot magically establish a counterfactual outcome. If the baseline chose `balanced` and the candidate would choose `cheap`, the real `balanced` outcome is not evidence that `cheap` would have succeeded.

Therefore model-substitution candidates require natural comparative evidence or controlled evaluation before automatic activation.

## 16. Evaluation Engine

The current threshold-only `EvaluationGate` becomes a richer deterministic Evaluation Engine while preserving a simple, inspectable policy surface.

Evaluation MUST consider at least four dimensions independently:

1. **Evidence volume** — is there enough applicable evidence?
2. **Outcome quality** — does the candidate preserve the required verified outcome?
3. **Efficiency** — does it improve cost, tokens, retries, interruptions, or latency when those measurements are available?
4. **Stability** — is the effect consistent rather than a short-lived anomaly?

A candidate MUST NOT receive one opaque “magic confidence number” that hides failed dimensions. The evaluation result SHOULD expose per-dimension findings and metric coverage.

Conceptual result:

```ts
interface LearningEvaluation {
  candidateId: string;
  outcome: 'keep_candidate' | 'enter_shadow' | 'validate' | 'reject';
  evidenceStrength: EvidenceStrength;
  quality: EvaluationDimension;
  efficiency: EvaluationDimension;
  stability: EvaluationDimension;
  evidenceVolume: EvaluationDimension;
  reasons: string[];
  evaluatedAt: string;
}
```

## 17. Quality-First Objective

The optimization order is normative:

```text
1. Preserve required quality and safety.
2. Minimize total cost to verified outcome.
3. Minimize unnecessary interruptions.
4. Improve latency and operational efficiency.
```

A cheaper candidate that materially degrades verification quality MUST be rejected or require a separately controlled quality-degradation authority path. Learning MUST NOT redefine “acceptable quality” by itself.

The Evaluation Engine MAY support a configured non-inferiority margin for noisy metrics, but the margin must be explicit and bounded.

Example:

```text
Baseline verified success: 96%
Candidate: 95%, cost -35%
```

This is only eligible if the configured quality policy says a 1 percentage-point difference is within the tolerated non-inferiority margin and evidence volume/stability are sufficient.

Example:

```text
Baseline: 96%
Candidate: 82%, cost -70%
```

The candidate MUST NOT auto-promote merely because it is much cheaper.

## 18. Controlled Evaluation Strategy

Milestone 4 uses the following preference order:

```text
1. Natural evidence from real work
2. Replay/offline evaluation
3. Budgeted live controlled evaluation
4. User interruption only when a higher-risk or over-budget eval is required
```

### 18.1 Natural evidence

Natural evidence is preferred because it does not add separate model spend beyond ordinary work.

### 18.2 Replay/offline evaluation

Replay SHOULD use sanitized fixtures, recorded normalized traces, fake providers, and deterministic runtime scenarios whenever these can answer the candidate question.

### 18.3 Live controlled evaluation

Live controlled evals are allowed only when:

- comparative evidence is insufficient;
- the candidate is likely to materially affect future cost, quality, or interruptions;
- the expected learning value exceeds configured minimum thresholds;
- an isolated safe task/fixture exists;
- the eval is inside the learning budget;
- there are no ambiguous or irreversible external side effects.

A simple deterministic value heuristic is sufficient in Milestone 4. AES does not need a full economic optimizer.

Example factors:

```text
expected reuse
× estimated saving per future task
× confidence that the candidate is actionable
compared with
evaluation cost
```

## 19. Controlled Evaluation Budget and Authority

Learning itself is a resource consumer and MUST be governed.

Recommended configuration shape:

```yaml
learning:
  controlledEvals:
    enabled: true
    defaultMode: autonomous
    maxRunsPerCandidate: 5
    maxCostPerDay: 0.50
    maxTokensPerDay: 100000
    sandboxOnly: true
```

These values are the Milestone 4 reference defaults. Callers MAY override them explicitly, but tests and configuration documentation MUST encode these defaults so runtime behavior is not environment-dependent.

The authority model is:

- safe controlled eval inside the configured sandbox and budget MAY run autonomously if the relevant control action is autonomous;
- exceeding the learning budget requires a separate controlled authority path such as `controlledEvaluationBudgetOverride`;
- any eval involving material side effects MUST NOT be treated as a normal autonomous learning eval.

Resource Governance MUST be able to return allow/warn/throttle/deny for learning activity just as it does for normal runtime resources.

## 20. Policy Overlay Model

Validated learning influences behavior through reversible **soft overlays** rather than by mutating base policy.

Resolution precedence is explicit. Highest-precedence inputs are listed first:

```text
Hard constraints
Explicit current user decision
Explicit session / project / user configuration
Validated learned overlay advice
Base heuristic / default policy
```

The resolved preferences then flow into the relevant Decision Engine, Router, Context Engine, or Interruption Policy. Hard constraints are validated again at the decision boundary so a learned or configured preference cannot create an invalid action.

The Control Engine remains independent: an overlay may recommend an action but does not grant permission to perform it.

Conceptual overlay:

```ts
interface PolicyOverlay {
  id: string;
  scope: 'project' | 'user';
  status: 'shadow' | 'validated' | 'active' | 'degraded' | 'superseded' | 'disabled';
  applicability: Applicability;
  effect: OverlayEffect;
  evidenceRefs: string[];
  evaluationRefs: string[];
  evidenceStrength: EvidenceStrength;
  createdAt: string;
  updatedAt: string;
  supersedes?: string[];
}
```

## 21. Allowed Overlay Effects

Milestone 4 MUST use a closed, typed effect vocabulary. Learned records MUST NOT contain arbitrary executable instructions.

Conceptually:

```ts
type OverlayEffect =
  | ModelPreferenceEffect
  | LatencyPreferenceEffect
  | ContextPreferenceEffect
  | RetryPreferenceEffect
  | ReplanPreferenceEffect
  | InterruptionPreferenceEffect;
```

Examples:

### Model preference

```yaml
effect:
  kind: model_preference
  prefer: balanced
  avoid: cheap
```

### Context preference

```yaml
effect:
  kind: context_preference
  preferCompactionBeforeHandoff: true
```

### Retry/replan preference

```yaml
effect:
  kind: replan_preference
  afterRepeatedFailureFingerprint: true
  prefer: replan
```

### Interruption preference

```yaml
effect:
  kind: interruption_preference
  suppressRoutinePrompt: true
```

An overlay MUST NOT directly alter:

- safety rules;
- privacy rules;
- hard resource budgets;
- provider capability truth;
- minimum required model quality;
- authority grants;
- permission to perform external side effects.

## 22. Overlay Conflict Resolution

Applicable overlays can conflict. Conflict resolution MUST be deterministic and explainable.

Recommended precedence:

1. hard constraints;
2. explicit current user decision;
3. explicit session override;
4. explicit project/user configuration;
5. more specific applicability;
6. stronger evidence class;
7. stronger validated evaluation result;
8. more recent validated evidence;
9. base policy as the final tie-breaker.

A higher confidence value alone MUST NOT automatically beat a more specific rule.

If two equally applicable, equally supported overlays still disagree, AES MUST mark the conflict and remove their conflicting influence rather than pick an arbitrary winner.

## 23. Overlay Integration Points

### 23.1 Model Router

The Router receives base task analysis plus applicable model-preference advice. It retains responsibility for hard capability requirements and quality constraints.

An overlay may say “prefer `balanced` in this applicability scope”; it may not force `cheap` if the task requires `powerful` capability.

### 23.2 Context Engine

Overlays may influence soft decisions such as:

- earlier compaction;
- retrieval preference;
- handoff preference;
- acceptable amount of historical context;
- whether a known project fact should be retrieved from memory rather than reloaded from conversation history.

### 23.3 Retry/Replan logic

Overlays may recommend a bounded change such as “replan after repeated identical failure fingerprint” when evidence supports that retries are ineffective.

### 23.4 Interruption Policy

Overlays may reduce low-value routine interruptions, schedule them at a workflow boundary, or place non-blocking information into a digest.

They may not suppress an interruption required by authority, irreversible impact, hard resource failure, or unresolved durable conflict.

## 24. Explainability

Every decision affected by learning SHOULD expose a compact explanation.

Example:

```text
Model: balanced

Reasons:
- execution stage with approved plan
- no new architecture decision required
- project overlay ov-routing-17 applied
  - 47 comparable observations
  - 97% verified success
  - 28% lower average cost than baseline in this applicability scope
```

The explanation MUST distinguish:

- base-policy reasons;
- hard-constraint reasons;
- learned-overlay reasons;
- user override reasons;
- missing evidence.

Users and tests SHOULD be able to inspect why an overlay is active, which evidence supports it, and which decision it changed.

## 25. Regression Monitor

Promotion is not the end of learning. Every active overlay remains under observation.

At activation, AES records a baseline snapshot using metrics that are actually available:

```yaml
baseline:
  verifiedRate: 0.96
  retryRate: 0.18
  averageCost: 1.00
  interruptionRate: 0.24
```

Subsequent applicable runs produce a rolling post-activation window.

If quality or another hard evaluation dimension regresses beyond policy:

```text
active
  -> degraded
  -> removed from effective policy
  -> base policy restored
```

AES MAY perform this degradation automatically because it reduces learned influence and authority rather than expanding it.

The monitor MUST not treat temporary provider outages as proof that the learned model preference is bad unless attribution supports that conclusion.

## 26. Typed Knowledge Records

Milestone 4 evolves `.aes` from mostly Markdown notes plus metadata into a typed knowledge system with human-readable renderings.

Recommended kinds:

```ts
type KnowledgeKind =
  | 'fact'
  | 'decision'
  | 'experience'
  | 'preference';
```

Conceptual canonical record:

```ts
interface KnowledgeRecord {
  id: string;
  kind: KnowledgeKind;
  scope: 'session' | 'project' | 'user';
  status: 'candidate' | 'shadow' | 'active' | 'degraded' | 'superseded' | 'disabled';
  statement: string;
  applicability?: Applicability;
  evidenceRefs: string[];
  evaluationRefs: string[];
  confidence?: string;
  provenance: KnowledgeProvenance;
  relations: KnowledgeRelation[];
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
}
```

Examples:

- **fact** — `@aes/kernel` does not import provider-specific adapter types;
- **decision** — one App Server process is supervised per workspace;
- **experience** — approved-plan TypeScript execution is more reliably completed with `balanced` than `cheap` in this project scope;
- **preference** — Fast latency mode is preferred for a specific low-risk execution class.

A learned statement MUST express its applicability instead of pretending to be universal.

## 27. Provenance

Every durable learned record answers: **why does AES believe this?**

Provenance distinguishes sources such as:

```ts
type KnowledgeSource =
  | 'user'
  | 'project_source'
  | 'decision_trace'
  | 'experience_miner'
  | 'llm_pattern_analyst'
  | 'controlled_eval'
  | 'compiler';
```

A record derived from runtime evidence references the source traces or a durable evidence bundle.

An LLM-generated candidate references the evidence bundle and the subsequent deterministic evidence query. The LLM’s prose alone is not provenance sufficient for activation.

## 28. Lightweight Knowledge Graph Relations

Milestone 4 uses graph semantics without a graph database.

Recommended relations:

```ts
type KnowledgeRelationKind =
  | 'depends_on'
  | 'supports'
  | 'contradicts'
  | 'supersedes'
  | 'derived_from'
  | 'applies_to';
```

Relations are stored by record ID in the canonical record metadata.

Example:

```text
Experience E17 --supports--> Overlay O4
ADR D5       --constrains--> conceptual applicability of O4
Overlay O2   --superseded--> Overlay O4
```

No mandatory graph infrastructure is introduced in Milestone 4.

## 29. Memory Compiler

The Memory Compiler prevents `.aes/` from becoming an append-only pile of notes.

Every incoming durable candidate passes through:

```text
ingest
  -> normalize
  -> deduplicate
  -> compare applicability
  -> validate
  -> consolidate
```

The compiler produces one of four semantic outcomes:

```ts
type KnowledgeCompileResult =
  | 'create'
  | 'merge'
  | 'supersede'
  | 'conflict';
```

### 29.1 Create

The information is materially new.

### 29.2 Merge

The information reinforces an existing record and can be represented by extending evidence/provenance rather than creating a duplicate.

### 29.3 Supersede

A stronger or more current record replaces the applicability of an older record. The old record remains present and points to the replacement.

### 29.4 Conflict

Two records make incompatible claims in the same applicability scope and available evidence does not justify silent replacement.

## 30. Contradiction Semantics

Contradictions MUST NOT be resolved simply because one record is newer.

If two records differ only because their applicability is different, they may coexist.

Example:

```text
Record A: execution + approved plan -> balanced
Record B: planning + architecture required -> powerful
```

This is not a conflict.

But:

```text
same applicability
A -> balanced
B -> powerful
```

is a real conflict and must be evaluated by evidence strength, specificity, and quality results. If the result is still ambiguous, both learned influences are degraded/disabled for that overlapping applicability and AES falls back to base policy.

## 31. Consolidation

The Memory Compiler periodically consolidates semantically equivalent records.

Instead of retaining four active records that express the same pattern, AES SHOULD produce one canonical record with merged provenance and mark old records superseded.

Consolidation MUST preserve:

- original record IDs in provenance/relations;
- evidence references;
- scope;
- applicability boundaries;
- audit history.

Consolidation MUST NOT broaden applicability merely to reduce file count.

## 32. Memory Lint

A deterministic `MemoryLint` reports and, where safe, fixes knowledge hygiene problems.

Checks include:

- duplicate active records;
- unresolved contradictions;
- orphan relations;
- stale active knowledge;
- missing provenance;
- low-evidence active records;
- broken index references;
- oversized records;
- records outside retention policy;
- project-specific material accidentally marked for broader scope.

Safe automatic repairs include:

- rebuilding indexes;
- merging exact duplicates when semantics and scope match;
- archiving stale candidates;
- repairing derived index metadata from canonical records.

Any repair that would change the meaning of a conflicting durable record requires normal evaluation/authority handling rather than a hidden lint rewrite.

## 33. Materialized Indexes

`index.json` and `index.md` become derived artifacts, not the canonical source of truth.

```text
Typed Knowledge Records
        |
        v
   Index Compiler
      /      \
     v        v
index.json  index.md
```

`index.json` is compact machine-readable retrieval metadata.

Example:

```json
{
  "id": "K42",
  "kind": "experience",
  "scope": "project",
  "status": "active",
  "tags": ["typescript", "execution"],
  "confidence": "high"
}
```

`index.md` is a human-readable summary generated from the same canonical records.

Because both are reproducible, corruption or manual drift in an index can be repaired without changing source knowledge.

## 34. Retrieval Pipeline

Milestone 4 keeps retrieval explainable and bounded.

Preferred pipeline:

```text
current TaskSignature
      |
      v
scope filter
      |
      v
status filter
      |
      v
kind filter
      |
      v
applicability filter
      |
      v
lexical / metadata ranking
      |
      v
confidence + evidence + recency weighting
      |
      v
budget enforcement
      |
      v
small KnowledgePacket
```

Vector retrieval and embeddings are not required in this milestone.

The retrieval result SHOULD explain which records were selected and their approximate contribution. AES SHOULD prefer 1–8 highly applicable records over loading the full `.aes` corpus.

## 35. Knowledge Retrieval Budget

Retrieval receives an explicit budget.

Example shape:

```yaml
knowledgeRetrieval:
  maxRecords: 8
  maxEstimatedTokens: 2500
```

The implementation MUST support deterministic trimming when more relevant candidates are found than fit the budget.

A knowledge base is not allowed to become a hidden context-window leak.

## 36. Knowledge Storage Layout

Recommended project-local layout:

```text
.aes/
├── raw/
│   └── traces/
├── knowledge/
│   ├── facts/
│   └── conventions/
├── decisions/
├── experience/
│   ├── candidates/
│   ├── shadow/
│   └── active/
├── overlays/
│   └── project/
├── evals/
├── index.json
├── index.md
├── log.md
└── MEMORY.md
```

Exact file partitioning MAY vary during implementation if it preserves the typed contracts and compatibility needs.

Human-readable Markdown remains important, but machine-readable metadata is authoritative for lifecycle, scope, applicability, provenance, and relations.

## 37. Retention and Storage Hygiene

Raw traces do not need to live forever.

The Milestone 4 default retention policy is:

```yaml
memory:
  retention:
    rawTraces: 90d
    failedTraces: 180d
    promotedEvidence: keep
```

Projects MAY override these durations, but the defaults above MUST be used when no project override is present.

Before removing raw evidence referenced by active knowledge, AES MUST preserve sufficient durable provenance, for example through a compact evidence snapshot or retained referenced trace.

Cleanup MUST NOT leave an active learned rule whose supporting evidence cannot be inspected.

### 37.1 Staleness and decay

Knowledge is not assumed to remain correct forever. Staleness is evaluated from evidence freshness, superseding decisions, applicability drift, and recent contradictory outcomes. A record MAY lose effective weight or move from `active` to `degraded` when fresh evidence contradicts it, but age alone MUST NOT silently rewrite a durable fact or decision. Stale records are preserved for audit and can be superseded or disabled; they are not automatically deleted merely because time passed.

For learned experience, recent verified evidence SHOULD have more influence than very old evidence when the evaluation policy explicitly enables recency weighting. The weighting rule must be deterministic and visible in evaluation output.

## 38. Knowledge Size Budget

The knowledge base itself receives the following Milestone 4 default health budgets:

```yaml
knowledge:
  budgets:
    maxActiveRecords: 500
    maxRecordTokens: 800
    maxIndexTokens: 4000
```

Projects MAY override these values explicitly. When no override exists, the values above are normative defaults.

When the active set approaches budget, AES SHOULD prefer:

1. consolidation;
2. supersession;
3. archiving low-value inactive candidates;
4. trimming derived summaries;

before deleting evidence or important durable decisions.

## 39. Incremental and Full Maintenance

A full Memory Compiler pass SHOULD NOT run after every turn.

Two modes are defined:

- **incremental maintenance** after a completed task: bounded, cheap, deterministic;
- **full maintenance** when a threshold is reached, for example N new traces, N candidates, a size budget warning, or a manual request.

Full maintenance remains subject to learning resource budgets.

## 40. Interruption Learning

Interruption Learning answers: **when is asking the user valuable?**

It is deliberately separate from Authority Learning.

The system may observe repeated contexts where the same assisted recommendation is approved and verified. That history can lower the value of repeating the same immediate interruption, but it does not itself grant autonomy.

Possible learned effects:

- suppress a non-blocking informational prompt;
- delay a routine question to a workflow boundary;
- group multiple routine approvals into one batch;
- stop re-proposing a recently rejected optional action until the context materially changes;
- create an authority-promotion candidate when repeated approvals show the user may prefer autonomy.

Interruption Learning MUST NOT suppress:

- authority increase consent;
- high-impact irreversible action requiring approval;
- unresolved durable conflict that blocks safe progress;
- ambiguous side effect after recovery;
- required hard-budget override;
- high-impact/low-confidence decision when no safe continuation exists.

## 41. Interruption Urgency and Scheduling

Milestone 4 introduces three urgency classes:

```ts
type InterruptionUrgency = 'immediate' | 'boundary' | 'digest';
```

### Immediate

AES cannot safely continue without the user’s decision.

Examples: ambiguous side effects, required authority for an irreversible action, a blocking privacy conflict.

### Boundary

The question is meaningful but can wait until the next natural workflow transition.

Examples: quality-degrading fallback, global knowledge promotion, authority promotion.

### Digest

The information is non-blocking.

Examples: learned candidate created, overlay degraded and reverted, memory health report.

An `InterruptionScheduler` SHOULD group compatible pending items while preserving immediate blockers.

## 42. Interruption Value Signals

A deterministic interruption-value decision MAY consider:

- impact;
- uncertainty;
- reversibility;
- authority change;
- repeated user approval/rejection history;
- whether AES can safely continue;
- whether the question can be grouped at a boundary;
- whether the same optional proposal was recently rejected.

A learned low interruption value is a soft signal and never outranks hard control requirements.

## 43. Authority Learning

Authority Learning answers a different question: **should AES propose a broader control mode?**

The existing invariant remains:

> AES MAY automatically reduce its own authority, but MUST NOT automatically increase authority.

Repeated evidence such as:

```text
modelRouting
27 approvals
0 rejections
27 verified successes
```

may create an `AuthorityCandidate` that proposes:

```text
assisted -> autonomous
```

The actual mode does not change until the user explicitly accepts the proposal.

## 44. Scoped Authority

Authority grants SHOULD be as narrow as practical.

Conceptually:

```yaml
scope:
  project: aes
appliesWhen:
  action: modelRouting
  stage: planning
  architecturalDecisionRequired: true
mode: autonomous
```

One approval of a powerful model does not become global autonomy for all routing decisions.

If the user repeatedly grants the same narrow authority in multiple projects, AES MAY propose a generalized user-level default. The proposal still requires explicit user approval.

## 45. Automatic Authority Degradation

If an action currently runs autonomously and post-decision evidence shows material regression, AES MAY degrade:

```text
autonomous -> assisted
```

without prior user approval because this makes the system more conservative.

The change SHOULD be recorded and surfaced in a digest with the evidence that triggered it.

Automatic reverse promotion back to autonomous is not allowed; it must again be user-approved.

## 46. Rejection Learning and Suppression Window

User rejection is valuable evidence.

If the user rejects the same optional proposal repeatedly, AES SHOULD suppress near-identical proposals for a configured window or until relevant context materially changes.

The suppression state MUST be scoped. A rejection of conversation transition in one session does not mean the user rejects all future transitions globally.

Hard blockers are not suppressible merely because a prior unrelated prompt was rejected.

## 47. Interaction Evidence

Milestone 4 introduces a compact interaction evidence record rather than inferring everything from generic trace text.

Conceptually:

```ts
interface InteractionEvidence {
  id: string;
  actionType: string;
  applicability: Applicability;
  currentMode: 'manual' | 'assisted' | 'autonomous';
  proposedMode?: 'manual' | 'assisted' | 'autonomous';
  userDecision: 'approved' | 'rejected' | 'modified' | 'not_asked';
  urgency: InterruptionUrgency;
  verifiedOutcome?: 'passed' | 'failed' | 'partial';
  timestamp: string;
}
```

The purpose is not psychological profiling. It is a narrow operational signal for reducing unnecessary interruptions and generating scoped authority candidates.

## 48. Privacy and Cross-Project Generalization

Project-local learning may contain project-specific context. Promotion to user scope requires:

```text
Project Record
    -> Generalizer
    -> remove project-specific identifiers/content
    -> Privacy Filter
    -> cross-project or controlled evidence check
    -> User-level Candidate
    -> User approval where required
```

The generalized candidate SHOULD retain abstract applicability such as:

```text
approved-plan TypeScript execution
```

while removing repository paths, internal service names, customer details, prompt content, code excerpts, and other project-specific material.

If the privacy filter or generalizer cannot prove the record is safe to broaden, promotion is blocked.

## 49. Learning Failure Semantics

Learning is advisory. Base behavior remains executable without it.

### Experience Miner unavailable

Continue the task using base policy and record learning unavailability if useful.

### Evaluation Engine unavailable

Do not activate new candidates. Existing safe active overlays may remain active only if their required monitor state is still valid; otherwise conservative configuration MAY degrade them.

### Knowledge Store unavailable or corrupt

Do not fabricate retrieved knowledge. Ignore unavailable learned overlays and use base policy. Hard project configuration that is stored elsewhere remains independent.

### Overlay conflict unresolved

Remove the conflicting learned influence and use base policy for the affected decision surface.

### Regression Monitor unavailable

No new automatic activation SHOULD occur if the system cannot perform the monitoring required by policy. Existing overlays MAY remain or degrade according to conservative configuration, but AES must not pretend they are being monitored.

### Global promotion dependency unavailable

Block promotion. Global promotion fails closed.

### LLM Pattern Analyst unavailable

Skip LLM hypothesis generation and continue deterministic learning.

### Controlled eval unavailable

Keep the candidate unresolved rather than manufacturing confidence.

## 50. Learning Resource Governance

Learning receives a dedicated budget envelope layered over existing Resource Governance.

Milestone 4 default learning resource configuration:

```yaml
learning:
  analysis:
    maxCandidatesPerTask: 3
    maxAnalysisTokensPerTask: 3000
    maxIncrementalWorkMs: 500

  retrieval:
    maxRecords: 8
    maxEstimatedTokens: 2500

  controlledEvals:
    enabled: true
    maxRunsPerCandidate: 5
    maxTokensPerDay: 100000
    maxCostPerDay: 0.50
```

These limits are normative defaults and MUST be translated into the existing Resource Policy model during implementation. Project configuration MAY tighten or relax them through normal Control/Resource Governance rules; unknown usage remains unknown rather than being treated as free.

Deterministic mining and maintenance SHOULD be preferred over invoking a model for routine aggregation.

## 51. Events and Audit Trail

The event-driven kernel SHOULD expose learning lifecycle events sufficient for auditing without storing sensitive raw content.

Recommended event concepts:

```text
learning.evidence.accepted
learning.candidate.created
learning.candidate.shadowed
learning.evaluation.completed
learning.overlay.activated
learning.overlay.degraded
learning.overlay.disabled
learning.overlay.superseded
knowledge.record.created
knowledge.record.merged
knowledge.conflict.detected
knowledge.index.rebuilt
interaction.authority_candidate.created
authority.degraded
controlled_eval.requested
controlled_eval.completed
```

Events SHOULD carry IDs, scopes, outcome metadata, metric summaries, and provenance references rather than full prompts/code/tool output.

## 52. Configuration Model

Milestone 4 configuration SHOULD remain declarative and provider-neutral.

Logical groups:

```yaml
learning:
  enabled: true

  projectAutoActivation:
    enabled: true
    requireShadow: true
    minimumEvidenceStrengthByKind:
      model_preference: comparative
      latency_preference: comparative
      context_preference: observational
      retry_preference: comparative
      replan_preference: comparative
      interruption_preference: observational

  evaluation:
    minSamples: 20
    minComparableSamplesPerAlternative: 5
    qualityNonInferiorityMargin: 0.01
    minRelativeImprovement: 0.05
    regressionWindow: 20

  controlledEvals:
    enabled: true
    sandboxOnly: true
    maxRunsPerCandidate: 5
    maxTokensPerDay: 100000
    maxCostPerDay: 0.50

  interactionLearning:
    authorityProposalMinApprovals: 15
    authorityProposalMaxRejections: 0
    rejectionSuppressionRuns: 5

  maintenance:
    incremental: true
    fullCompileAfterNewTraces: 20

knowledge:
  retrieval:
    maxRecords: 8
    maxEstimatedTokens: 2500

control:
  actions:
    controlledEvaluation: autonomous
    controlledEvaluationBudgetOverride: assisted
```

The values shown above are the Milestone 4 reference defaults and MUST be covered by configuration tests. A project MAY override them explicitly. Auto-activation requires preservation of quality plus at least one applicable efficiency/interaction metric meeting `minRelativeImprovement`; knowledge-only candidates do not need an efficiency improvement to become durable knowledge. `rejectionSuppressionRuns` is cleared early when the normalized applicability context materially changes.

### 52.1 Control action extensions

Milestone 4 extends the control vocabulary with `controlledEvaluation` and `controlledEvaluationBudgetOverride`. The former governs safe sandboxed live eval execution; the latter governs attempts to exceed the configured learning budget. Existing `memoryPromotion` continues to govern durable scope promotion where applicable.

Authority expansion itself is a dedicated explicit-consent transition, not an action that can be made autonomous through ordinary control configuration. No `authorityPromotion: autonomous` setting may bypass the invariant that authority increase requires the user’s explicit approval.

## 53. Determinism and Clocking

All domain decisions MUST be deterministic for the same normalized inputs and policy configuration.

Where recency, retention, rolling windows, or suppression windows depend on time, the domain layer SHOULD accept explicit timestamps or a clock abstraction so tests do not depend on wall-clock timing.

Random exploration is not part of Milestone 4.

## 54. Compatibility with Existing Milestone 2/3 APIs

Implementation SHOULD evolve existing types rather than unnecessarily replace them.

Recommended compatibility approach:

- retain `DecisionTrace` and `RuntimeDecisionTrace` as source evidence;
- extend or adapt `RuntimeExperienceEvidence` into the richer learning evidence model;
- keep `ExperienceEngine.aggregate*` behavior available where tests or callers depend on it, while adding a richer miner API;
- evolve `EvaluationGate` into an Evaluation Engine or preserve `EvaluationGate` as a compatibility facade;
- evolve `KnowledgeMetadata` toward typed `KnowledgeRecord` metadata while providing migration from existing `.meta.json` files;
- keep `KnowledgeStore` provider-neutral;
- retain current Control Engine precedence and place learned authority proposals outside `resolveMode` until explicitly accepted;
- keep base Model Router behavior valid when zero overlays exist.

A project with no `.aes` learning data MUST behave like Milestone 3 except for deliberate bug fixes and documented compatibility changes.

## 55. Existing `.aes` Migration

On first use of the Milestone 4 knowledge runtime:

1. existing `.aes/knowledge/*.meta.json` records are read using a compatibility adapter;
2. existing `candidate`, `trusted`, and `superseded` knowledge states are mapped to the new knowledge lifecycle without inventing unsupported evidence; `trusted` may become active **knowledge**, but an old trusted recommendation MUST NOT become an active policy overlay merely because of migration;
3. `index.json` is generated from canonical records;
4. `index.md` is rebuilt or reconciled from canonical knowledge;
5. existing raw files remain untouched unless retention policy later applies;
6. no project record is promoted to user scope as part of migration.

Migration SHOULD be idempotent.

## 56. Testing Strategy

Milestone 4 requires strong deterministic tests because unsafe learning failures can be subtle.

### 56.1 Experience Miner tests

Synthetic traces MUST verify that:

- attributable evidence is grouped correctly;
- provider failures and cancellations are excluded from model-quality comparisons;
- different applicability scopes are not accidentally merged;
- metric coverage is preserved when cost/tokens are missing;
- recommendation changes deterministically when the evidence changes;
- empty or invalid groups fail explicitly rather than manufacture a rule.

### 56.2 Shadow Mode tests

Tests MUST prove that:

- a shadow overlay never changes the real decision;
- the shadow decision is recorded separately;
- a counterfactual model choice is not treated as verified simply because baseline execution succeeded;
- applicability and conflict data are recorded correctly.

### 56.3 Evaluation tests

Tests MUST cover:

- insufficient evidence -> keep candidate;
- adequate observational evidence without comparison -> no unsupported counterfactual activation;
- comparative evidence + preserved quality + better efficiency -> validation;
- large savings + unacceptable quality regression -> rejection;
- missing cost telemetry does not become zero cost;
- stability/regression window behavior;
- controlled evidence is recognized as stronger than observational evidence.

### 56.4 Overlay conflict tests

Tests MUST cover:

- specific applicability outranks generic applicability;
- hard model requirement outranks a cheaper learned preference;
- explicit user/session override outranks learned history;
- unresolved equal conflict falls back to base policy;
- disabled/degraded/shadow overlays do not influence production decisions.

### 56.5 Regression Monitor tests

Tests MUST demonstrate:

- baseline snapshot creation;
- healthy active overlay remains active;
- quality regression triggers degradation;
- degraded overlay no longer affects effective policy;
- provider outage does not incorrectly degrade model-quality advice when attribution is false.

### 56.6 Knowledge Compiler tests

Tests MUST cover:

- true duplicate -> merge;
- same topic but different applicability -> coexist;
- stronger replacement -> supersede;
- real incompatible claim -> conflict;
- repeated compile is idempotent;
- merged evidence/provenance is preserved;
- broken derived index can be rebuilt from canonical records.

### 56.7 Retrieval tests

Tests MUST prove:

- scope filtering;
- applicability filtering;
- inactive/superseded filtering;
- deterministic ranking;
- record-count budget;
- estimated-token budget;
- highly relevant records beat broad lexical matches;
- absence of embeddings does not break retrieval.

### 56.8 Privacy tests

Fixtures containing project-specific service names, customer paths, repository paths, and local identifiers MUST NOT survive automatic promotion into user-level generalized records.

Promotion MUST fail closed when generalization or privacy filtering is unavailable.

### 56.9 Authority tests

Tests MUST prove:

- repeated approvals create an authority candidate;
- `assisted -> autonomous` does not happen without explicit user approval;
- `autonomous -> assisted` may happen automatically on verified regression;
- degradation does not immediately re-promote itself;
- authority scope remains narrow and does not leak to unrelated actions/tasks.

### 56.10 Interruption tests

Tests MUST cover:

- immediate blockers remain immediate;
- routine boundary prompts can be grouped;
- digest items do not block execution;
- recent rejection suppresses repeated optional proposals;
- suppression expires or is invalidated by material context change;
- learned interruption preference cannot suppress a hard authority prompt.

### 56.11 Controlled evaluation tests

Offline tests MUST cover:

- expected-learning-value threshold;
- budget allow/warn/throttle/deny;
- max runs per candidate;
- sandbox requirement;
- no external side-effect path;
- controlled evidence is attributed to the candidate;
- over-budget request routes through Control Engine rather than running silently.

### 56.12 Failure tests

Tests MUST inject:

- missing/corrupt knowledge index;
- unavailable KnowledgeStore;
- evaluator failure;
- LLM analyzer failure;
- controlled-eval executor failure;
- regression-monitor state loss;
- contradictory active overlays;

and prove that ordinary execution falls back to base behavior where safe.

## 57. End-to-End Adaptive Simulation

Milestone 4 MUST include at least one deterministic end-to-end learning simulation.

Example progression:

```text
Tasks 1-30
  base policy only
  -> evidence accumulates

Tasks 31-50
  candidate discovered
  -> shadow decisions recorded

Tasks 51-70
  comparable evidence reaches threshold
  -> candidate validated
  -> project overlay activates

Tasks 71-100
  overlay affects eligible decisions
  -> verified outcomes measured
  -> regression monitor evaluates the active rule
```

The scenario MUST assert all of the following:

- verified quality is not materially worse than baseline according to configured policy;
- total cost to verified outcome improves or another declared efficiency target improves;
- interruption count decreases where the candidate targets interruption behavior;
- the active rule is explainable with evidence references;
- a later injected regression can degrade the overlay and restore base behavior.

This test is the primary proof that AES does not merely store learning data; it changes behavior safely and can undo that change.

## 58. Documentation Architecture

Milestone 4 adds comprehensive documentation as part of the engineering deliverable rather than treating README updates as sufficient.

The long-term documentation structure SHOULD be:

```text
docs/
├── getting-started/
│   ├── what-is-aes.md
│   ├── quick-start.md
│   └── mental-model.md
├── concepts/
│   ├── workflows.md
│   ├── context-management.md
│   ├── model-routing.md
│   ├── control-and-authority.md
│   ├── resource-governance.md
│   ├── knowledge-and-memory.md
│   └── adaptive-learning.md
├── architecture/
│   ├── overview.md
│   ├── kernel.md
│   ├── adaptive-runtime.md
│   ├── provider-model.md
│   ├── codex-adapter.md
│   └── learning-loop.md
├── guides/
│   ├── configure-aes.md
│   ├── budgets.md
│   ├── autonomy.md
│   ├── knowledge-base.md
│   ├── write-an-adapter.md
│   └── debugging.md
├── reference/
│   ├── configuration.md
│   ├── events.md
│   ├── schemas.md
│   ├── runtime-api.md
│   └── policy-api.md
├── examples/
├── rfcs/
└── adrs/
```

Milestone 4 includes a documentation pass over the **entire current AES system**, not only the new learning subsystem. Every documentation page that corresponds to an implemented Milestone 1–4 capability MUST be populated or deliberately consolidated into another documented page. Pages for genuinely future/non-implemented capabilities may be omitted rather than created as empty placeholders. The documentation pack MUST therefore cover the specification/kernel/runtime boundaries, workflows, model routing, context and handoff, control and authority, resource governance, provider/runtime behavior, Codex adapter boundary, knowledge/memory, adaptive learning, failure semantics, configuration, and extension points.

## 59. Required “How AES Makes a Decision” Documentation

The documentation pack MUST contain a walkthrough that traces one request through the full decision lifecycle:

```text
User Task
   -> Task Analyzer
   -> Context Engine
   -> Knowledge Retrieval
   -> Model Router
   -> Learned Overlays
   -> Resource Governance
   -> Control Engine
   -> Adaptive Runtime
   -> Provider
   -> Verification
   -> DecisionTrace
   -> Experience Miner
   -> Future Learning
```

The walkthrough MUST distinguish:

- deterministic base rules;
- learned soft advice;
- hard policy enforcement;
- user authority;
- provider execution;
- telemetry/evidence;
- rollback and failure behavior.

This page is intended to be the canonical mental model for maintainers and adapter authors.

## 60. Documentation Source of Truth

Documentation MUST be generated or maintained from the same normative concepts as specs, ADRs, configuration contracts, and code interfaces.

The project SHOULD avoid creating a separate narrative that contradicts the implementation.

At minimum, Milestone 4 documentation must cover:

- lifecycle of evidence, candidate, shadow, validated, active, degraded, superseded;
- overlay precedence and hard-boundary rules;
- evidence-strength classes;
- controlled-eval policy and budgets;
- knowledge record kinds, scopes, provenance, and relations;
- retrieval budget and why AES does not load the entire knowledge base;
- interruption versus authority learning;
- global promotion and privacy filtering;
- failure semantics;
- inspect/disable/revoke workflows for learned rules;
- examples of explanations shown for learned decisions.

## 61. Expected End-to-End Runtime Flow

For a normal completed task:

```text
1. Adaptive Runtime completes execution and verification.
2. RuntimeDecisionTrace is finalized.
3. Evidence Adapter extracts normalized learning evidence.
4. Experience Miner performs bounded incremental aggregation.
5. Existing candidates receive new evidence.
6. New patterns may create candidates.
7. Optional LLM Pattern Analyst may propose a hypothesis only if policy/budget allows.
8. Candidate enters shadow state when eligible.
9. Shadow evaluation records hypothetical decisions without changing production behavior.
10. Evaluation Engine assesses evidence volume, quality, efficiency, and stability.
11. Project-local low-risk candidate may become an active soft overlay when all gates pass.
12. Authority-changing/global candidates remain proposals pending controlled promotion.
13. Future decisions retrieve only applicable knowledge and overlays within budget.
14. Runtime executes under hard policy + base policy + allowed effective preferences.
15. Regression Monitor compares post-activation verified outcomes with baseline.
16. Regressing overlays are degraded/disabled and base behavior resumes.
17. Memory Compiler incrementally consolidates records and rebuilds indexes when thresholds require it.
```

## 62. Recommended Implementation Decomposition

The implementation plan SHOULD decompose Milestone 4 into small independently verifiable slices rather than one large learning subsystem.

Recommended sequence:

1. normative learning/knowledge/overlay contracts and compatibility adapters;
2. richer evidence adapter and task signature normalization;
3. Experience Miner and metric aggregation;
4. Evaluation Engine and evidence-strength handling;
5. shadow overlay execution path;
6. Policy Overlay Engine and conflict resolution;
7. regression monitoring and rollback;
8. typed KnowledgeStore evolution, Memory Compiler, indexes, and retrieval budgets;
9. interruption evidence, scheduler, and rejection suppression;
10. authority candidates and scoped promotion/degradation;
11. controlled-evaluation policy and safe runtime executor integration;
12. optional LLM Pattern Analyst boundary;
13. end-to-end adaptive runtime integration;
14. documentation pack and examples;
15. full deterministic verification and optional live evaluation smoke where available.

The exact plan may split these further if tests reveal large responsibilities.

## 63. Success Criteria

Milestone 4 is complete only when all of the following are true:

- real verified runtime evidence can produce a typed learning candidate;
- candidate applicability is narrower than or equal to its supporting evidence scope;
- shadow candidates cannot affect production decisions;
- comparative/controlled evidence rules prevent unsupported model counterfactuals;
- an eligible project-local soft candidate can pass evaluation and activate automatically;
- hard constraints still outrank learned overlays;
- active overlay influence is explainable;
- active overlays are monitored and can automatically degrade/rollback;
- typed knowledge records preserve provenance and lifecycle state;
- Memory Compiler handles create/merge/supersede/conflict deterministically;
- materialized indexes are reproducible;
- retrieval obeys record/token budgets;
- project-to-user generalization is privacy-filtered and fail-closed;
- repeated approvals can produce an authority-promotion candidate without changing authority;
- authority can degrade automatically after verified regression;
- interruption scheduling can reduce routine interruptions without suppressing hard blockers;
- controlled live evals are optional, isolated, budgeted, and Resource-Governed;
- learning failures do not break base execution;
- offline test suite remains deterministic and network-independent;
- end-to-end simulation demonstrates safe behavior improvement followed by rollback under injected regression;
- comprehensive adaptive-learning documentation exists and matches the implemented contracts.

## 64. Definition of Done for Documentation

Milestone 4 MUST NOT be marked complete on tests alone.

Documentation DoD requires:

1. README architecture and package descriptions updated to describe the complete current Milestone 1–4 system;
2. architecture page for the learning loop;
3. concept page for knowledge and memory;
4. concept page for adaptive learning;
5. concept or guide page for control/authority learning;
6. configuration reference for learning, knowledge, retrieval, evaluation, and controlled-eval budgets;
7. events/reference updates for new learning lifecycle events;
8. “How AES Makes a Decision” walkthrough;
9. at least one worked example showing candidate -> shadow -> active -> regression/degrade;
10. at least one worked example showing repeated approvals -> authority proposal -> explicit user approval;
11. explicit documentation of privacy and cross-project promotion boundaries;
12. explicit documentation of failure fallback semantics;
13. docs checked against tests/config/types for stale names or unsupported claims;
14. implemented Milestone 1–3 concepts that are prerequisites for Milestone 4 are documented in the same pack so a new maintainer does not need to reconstruct the architecture from historical milestone specs.

## 65. Final Architectural Principle

Milestone 4 makes AES adaptive without making it self-authorizing.

The system learns from verified outcomes, not from confidence theater. It may automatically optimize low-risk project-local preferences when evidence is sufficient, but it preserves hard constraints, keeps global promotion controlled, and never silently expands authority.

The desired steady state is:

```text
more verified experience
        -> better project-local decisions
        -> lower cost / fewer retries / fewer interruptions
        -> same required quality
        -> less user supervision for routine work
        -> no hidden privilege growth
```

When evidence becomes weak, contradictory, stale, or regressive, AES gives up the optimization and returns to the known base policy.

**Learning is an evidence-backed, reversible advisory layer. Authority remains explicit. Quality remains the hard gate.**
