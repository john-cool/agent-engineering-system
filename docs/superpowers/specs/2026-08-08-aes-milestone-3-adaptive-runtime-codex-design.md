# AES Milestone 3 — Adaptive Runtime & Codex Provider Design

Date: 2026-08-08
Status: Approved for implementation planning
Builds on: AES Milestone 2
First real provider: Codex via Codex App Server

## 1. Goal

Milestone 3 turns AES from a tested decision kernel into a runtime that can drive a real coding-agent provider, observe what actually happened, recover safely from provider failures, and feed verified runtime evidence back into the learning loop.

The first production integration is Codex. The architecture remains provider-neutral so future Claude, Gemini, Cursor, or other providers can implement the same contracts without changing AES core behavior.

The milestone MUST:

- execute real agent sessions through Codex App Server;
- keep Codex-specific protocol details below the adapter boundary;
- discover available models and resolve AES capability requirements to concrete provider models;
- route provider approval requests through the AES Control Engine;
- collect normalized token, latency, recovery, retry, context, and verification telemetry;
- persist raw execution traces locally without storing prompts or source code by default;
- safely recover provider processes and sessions after crashes;
- avoid duplicate or ambiguous side effects during recovery;
- support compaction, cancellation, streaming events, and session checkpoints;
- preserve deterministic offline tests and make live Codex tests opt-in;
- improve future routing decisions from verified evidence rather than from provider self-assessment.

AES continues to optimize **total cost to a verified quality outcome**, not token count in isolation.

## 2. External Codex Assumptions

The Codex adapter is designed against the current Codex App Server integration model documented by OpenAI as of 2026-08-08:

- Codex App Server is a long-lived process that hosts Codex core threads.
- Client/server communication uses bidirectional JSON-RPC over stdio with JSONL framing.
- One client request can produce many server notifications.
- The server can initiate requests such as approvals and pause a turn until the client responds.
- TypeScript protocol definitions can be generated from the Codex protocol with `codex app-server generate-ts`; JSON Schema generation is also available.
- The App Server protocol is intended to be a stable client integration surface, while provider-specific protocol types remain implementation details of the adapter.

Reference:

- OpenAI, “Unlocking the Codex harness: how we built the App Server”, 2026-02-04: https://openai.com/index/unlocking-the-codex-harness/

AES MUST treat these as adapter-layer assumptions, not core-domain concepts. If the Codex protocol evolves, only the Codex transport/protocol mapping layer and its fixtures/contract tests should require modification.

## 3. Milestone 3 Non-Goals

The following are explicitly out of scope:

- Claude, Gemini, Cursor, or other concrete provider adapters;
- dynamic plugin marketplace or third-party adapter loading;
- distributed runtime scheduling;
- remote telemetry backend;
- production dashboard/UI;
- Postgres or a mandatory database;
- automatic workflow decomposition when a model is unavailable;
- model fine-tuning;
- storing complete prompts, source code, transcripts, or tool output in telemetry by default;
- cross-project promotion of project-specific knowledge.

Interfaces MAY leave room for these capabilities, but Milestone 3 MUST NOT implement them unless required by the provider-neutral contracts below.

## 4. Normative Invariants

The following requirements are hard invariants:

1. `@aes/kernel` MUST NOT import Codex-specific types or packages.
2. A provider MUST NOT grant itself authority. Provider approval requests MUST be normalized and resolved through AES control policy.
3. Runtime recovery MUST NOT automatically repeat an ambiguous side effect.
4. Runtime retry loops MUST be bounded.
5. Model fallback MUST NOT silently reduce required quality capability.
6. Unknown token, pricing, or context telemetry MUST remain unknown.
7. Provider failures MUST NOT be interpreted as model-quality failures.
8. Project prompts, source code, transcripts, and raw tool output MUST NOT be promoted to user/global experience by default.
9. Every automatic concrete-model selection MUST be explainable.
10. Every learned routing recommendation MUST be backed by verified evidence.
11. Provider-specific protocol events MUST NOT escape the provider adapter boundary.
12. User cancellation MUST be recorded as cancellation, not model failure.
13. A provider crash MUST NOT silently change the requested model quality requirement.
14. AES MAY automatically reduce its own authority after quality degradation, but MUST NOT silently increase authority.
15. A runtime session MUST remain recoverable from a compact checkpoint without requiring the previous in-memory JavaScript object graph.

## 5. Package Boundaries

Milestone 3 introduces a provider-neutral runtime orchestration package while retaining the existing specification, kernel, SDK, and Codex adapter packages.

```text
@aes/spec
   ^
   |
@aes/kernel ----------------------+
   ^                              |
   |                              |
   |                       control / decision APIs
   |                              |
@aes/runtime-sdk                  |
   ^                              |
   |                              |
@aes/runtime ---------------------+
   ^
   |
@aes/adapter-codex
```

### 5.1 `@aes/spec`

Owns normative data contracts shared across layers, including:

- model requirement vocabulary;
- normalized runtime failure taxonomy;
- normalized runtime telemetry shape;
- trace metadata;
- control action types such as model-quality degradation;
- provider-neutral event names where they are part of the AES specification.

### 5.2 `@aes/runtime-sdk`

Owns provider-facing interfaces and neutral runtime contracts:

- `RuntimeProvider`;
- `RuntimeSession`;
- `RuntimeEvent`;
- `RuntimeProviderCapabilities`;
- `AvailableModel`;
- `ModelRequirement`;
- `ModelResolution`;
- `RuntimeControlBridge`;
- `TraceStore`;
- `SessionCheckpointStore`;
- pricing interfaces;
- provider contract-test helpers where appropriate.

It MUST NOT import Codex protocol types.

### 5.3 `@aes/runtime`

Owns provider-neutral orchestration:

- `AdaptiveRuntime`;
- `ModelResolver`;
- `WorkspaceRuntimeSupervisor`;
- retry budgets;
- circuit breaker;
- event backpressure/coalescing;
- trace accumulation;
- local JSONL trace storage;
- local checkpoint storage;
- provider contract test utilities if those require orchestration behavior.

`@aes/runtime` MAY depend on `@aes/runtime-sdk` and `@aes/spec`.

To avoid circular dependencies with `@aes/kernel`, it MUST NOT directly import concrete kernel classes such as `ControlEngine`. Instead, control and decision dependencies are injected through neutral interfaces such as `RuntimeControlBridge`.

The application composition root (initially CLI/tests) MAY import both `@aes/kernel` and `@aes/runtime` to wire a kernel-backed `RuntimeControlBridge` into `AdaptiveRuntime`. This keeps dependency inversion explicit and prevents runtime orchestration from creating a kernel/runtime import cycle.

### 5.4 `@aes/adapter-codex`

Owns all Codex-specific integration details:

- spawning and communicating with `codex app-server`;
- Codex protocol parsing and validation;
- generated Codex protocol types or schemas;
- provider-specific model discovery;
- provider-specific thread/session mapping;
- normalization of Codex events to `RuntimeEvent`;
- translation of normalized AES operations to Codex requests;
- Codex-specific resume, compaction, cancellation, and approval response operations;
- provider protocol record/replay sanitization.

No package above this adapter may depend on Codex JSON-RPC method names or generated Codex protocol types.

## 6. High-Level Architecture

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
Context Engine          Model Router
   |                        |
   |                        v
   |                 ModelRequirement
   |                        |
   +------------+-----------+
                |
                v
         Adaptive Runtime
                |
                v
          Model Resolver
                |
                v
     Resource Policy Engine
                |
                v
        RuntimeControlBridge
                |
                v
   WorkspaceRuntimeSupervisor
                |
                v
         RuntimeProvider
                |
                v
          CodexProvider
                |
                v
   CodexAppServerTransport
                |
                v
      codex app-server
                |
                v
       real agent work
                |
                v
       RuntimeTelemetry
                |
                v
        DecisionTrace
                |
                v
          TraceStore
                |
                v
       Experience Engine
                |
                v
        Evaluation Gate
                |
                v
           Knowledge
                |
                +-----------------------> future decisions
```

The runtime executes decisions; it does not replace the kernel's engineering judgment.

## 7. Adaptive Runtime Responsibilities

`AdaptiveRuntime` coordinates one provider-neutral execution request without owning provider-specific protocol logic.

It MUST:

1. accept an AES `ModelRequirement` plus session/workspace information;
2. ask the active `RuntimeProvider` for current capabilities and model catalog;
3. invoke `ModelResolver` to obtain a concrete model profile;
4. evaluate provider-neutral resource policies before execution and after meaningful usage updates;
5. request control authorization when resolution requires a quality-degrading fallback, a hard resource budget needs an explicit override, or provider events request authority;
6. obtain or create a `RuntimeSession` through the workspace supervisor;
7. stream normalized runtime events;
8. update telemetry, resource usage, and checkpoints;
9. persist a final normalized trace;
10. report final outcome to the caller without interpreting provider infrastructure failures as model-quality outcomes.

It SHOULD remain mostly orchestration code. Task analysis, context health, authority learning, and experience promotion remain in their Milestone 2 owners.

## 8. Runtime Provider Contract

A provider represents one implementation family such as Codex.

```ts
interface RuntimeProvider {
  readonly id: string;

  getCapabilities(): Promise<RuntimeProviderCapabilities>;
  discoverModels(options?: { forceRefresh?: boolean }): Promise<AvailableModel[]>;

  createSession(input: CreateRuntimeSessionInput): Promise<RuntimeSession>;
  resumeSession(checkpoint: SessionCheckpoint): Promise<RuntimeSession>;

  shutdown(): Promise<void>;
}
```

The exact interface may be split into smaller contracts during implementation, but these responsibilities MUST remain provider-neutral.

### 8.1 Provider capabilities

Provider capabilities are technical abilities, not user authority:

```ts
interface RuntimeProviderCapabilities {
  modelDiscovery: boolean;
  modelRouting: boolean;
  fastMode: boolean;
  streaming: boolean;
  toolExecution: boolean;
  approvals: boolean;
  tokenTelemetry: boolean;
  contextTelemetry: boolean;
  contextCompaction: boolean;
  sessionResume: boolean;
  sessionCancellation: boolean;
  conversationTransition: boolean;
  persistentMemory: boolean;
}
```

The existing `RuntimeCapabilities` contract MAY be migrated or aliased to this richer contract. Capability naming MUST remain provider-neutral.

## 9. Runtime Session Contract

A session is a first-class stateful entity. `prompt -> response` is not sufficient for coding-agent runtimes.

```ts
interface RuntimeSession {
  readonly sessionId: string;
  readonly providerSessionId: string;

  runTurn(request: RuntimeTurnRequest): AsyncIterable<RuntimeEvent>;
  respondToApproval(requestId: string, resolution: RuntimeApprovalResolution): Promise<void>;
  compact(): Promise<void>;
  cancel(reason?: string): Promise<void>;
  checkpoint(): Promise<SessionCheckpoint>;
  close(): Promise<void>;
}
```

`invokeModel()` MAY remain in `RuntimeAdapter` as a compatibility convenience API. When backed by Milestone 3 it SHOULD be implemented as an ephemeral session:

```text
invokeModel(request)
   -> create ephemeral session
   -> run one turn
   -> collect final result
   -> close session
```

This preserves simple consumers while the main runtime adopts session semantics.

## 10. Runtime Session State Machine

The normalized session lifecycle is:

```text
created
   |
   v
starting
   |
   v
ready
   |
   v
running
   +----> awaiting_approval
   +----> compacting
   +----> recovering
   +----> failed
   +----> cancelled
   +----> completed
```

Allowed recovery behavior MUST be explicit. A session MUST NOT jump from `failed` to `running` without a successful provider resume/reconciliation step.

## 11. Codex Provider Process Lifetime

Milestone 3 uses **one Codex App Server process per workspace/project**.

```text
Workspace A
└─ Codex App Server
   ├─ RuntimeSession A1
   ├─ RuntimeSession A2
   └─ RuntimeSession A3

Workspace B
└─ Codex App Server
   ├─ RuntimeSession B1
   └─ RuntimeSession B2
```

Rationale:

- avoids starting a provider process per turn/session;
- avoids a global process sharing runtime state across unrelated projects;
- aligns provider lifecycle with filesystem/project isolation;
- makes crash/restart ownership clear.

The reference implementation MUST NOT use one global Codex process for all workspaces.

## 12. Workspace Runtime Supervisor

`WorkspaceRuntimeSupervisor` owns infrastructure lifecycle only.

Responsibilities:

- lazy provider startup on first session;
- one active Codex App Server process per workspace;
- process health/exit monitoring;
- active session registry;
- restart/backoff;
- circuit breaker;
- session recovery coordination;
- graceful workspace shutdown.

It MUST NOT:

- choose model capability class;
- decide whether a user approval is required;
- classify task complexity;
- promote experience or memory;
- treat provider crash as verification failure.

## 13. Codex Transport and Protocol Boundary

Codex communication uses a dedicated transport/protocol layer:

```text
CodexProvider
   |
   v
CodexProtocolMapper
   |
   v
CodexAppServerTransport
   |
   v
stdio JSONL
   |
   v
codex app-server
```

### 13.1 Protocol validation

Incoming JSON MUST be parsed and validated before normalization.

The adapter MUST NOT use unchecked casts such as:

```ts
JSON.parse(line) as CodexEvent
```

Unknown provider notifications SHOULD be ignored or preserved for debugging when safe. Unknown non-critical notifications MUST NOT crash the runtime.

### 13.2 Generated protocol types

Milestone 3 MAY generate Codex TypeScript protocol definitions or JSON Schema from the installed Codex binary.

Generated/provider types MUST remain below the adapter boundary:

```text
Codex generated types
        |
        v
CodexProtocolMapper
        |
        v
AES RuntimeEvent / RuntimeSession contracts
```

The repository SHOULD pin fixtures or the tested protocol generation output needed for deterministic tests. Live generation MUST NOT be required for the default offline unit suite.

## 14. Normalized Runtime Events

Provider events are normalized to a stable AES event vocabulary.

```ts
type RuntimeEvent =
  | TurnStartedEvent
  | OutputDeltaEvent
  | ToolRequestedEvent
  | ToolCompletedEvent
  | ApprovalRequestedEvent
  | UsageUpdatedEvent
  | ContextUpdatedEvent
  | CompactionStartedEvent
  | CompactionCompletedEvent
  | TurnCompletedEvent
  | RuntimeWarningEvent
  | RuntimeFailedEvent;
```

Every event SHOULD carry correlation metadata:

```ts
interface RuntimeEventMeta {
  taskId?: string;
  sessionId: string;
  turnId?: string;
  eventId: string;
  timestamp: string;
}
```

Provider-specific fields may be retained only inside a namespaced adapter/debug payload that is not part of normal AES decision logic.

## 15. Event Delivery and Backpressure

Runtime event delivery MUST distinguish lossless from coalescible events.

```ts
type EventDelivery = 'lossless' | 'coalescible';
```

Examples:

- `OutputDelta`: coalescible;
- `UsageUpdated`: coalescible by replacing older pending usage snapshots;
- `ContextUpdated`: coalescible when only the latest state matters;
- `ApprovalRequested`: lossless;
- `ToolCompleted`: lossless;
- `TurnCompleted`: lossless;
- `RuntimeFailed`: lossless.

The runtime SHOULD use a bounded queue. Backpressure MUST NOT drop lossless events. Under pressure, coalescible events MAY be merged or replaced by the latest state.

## 16. Provider Approvals and AES Authority

Provider approval requests are requests for authority, not decisions.

```text
Codex approval request
       |
       v
CodexProtocolMapper
       |
       v
Normalized ActionRequest
       |
       v
RuntimeControlBridge
       |
       v
AES Control Engine
       |
 manual / assisted / autonomous
       |
       v
normalized approval resolution
       |
       v
Codex adapter response
```

The provider MUST NOT auto-approve on its own. Provider-originated approvals MUST use an `ActionRequest.source` value such as `runtime-provider`; Milestone 3 therefore extends the existing source vocabulary without introducing a provider-specific source name.

The runtime control bridge is an injected interface so `@aes/runtime` does not import a concrete kernel class:

```ts
interface RuntimeControlBridge {
  authorize(request: ActionRequest): Promise<RuntimeAuthorizationResult>;
}
```

Routine approvals MAY become autonomous only through existing AES authority policy and learning rules. Authority promotion remains user-consented.

## 17. Model Requirement

`ModelRouter` selects required capabilities, not provider model IDs.

Milestone 3 expands the requested execution profile into a provider-neutral requirement:

```ts
interface ModelRequirement {
  class: 'cheap' | 'balanced' | 'powerful';
  reasoning: 'low' | 'medium' | 'high';
  latency: 'prefer_fast' | 'balanced' | 'quality_first';
  context: 'standard' | 'large';
  capabilities?: ModelCapability[];
  costPreference?: 'minimize' | 'balanced' | 'quality_first';
}
```

The current Milestone 2 `ExecutionProfile` remains a valid upstream simplification and may be expanded into `ModelRequirement` by the runtime/model-routing integration layer.

## 18. Provider Model Discovery

Providers expose a normalized model catalog:

```ts
interface AvailableModel {
  id: string;
  provider: string;

  capabilities: {
    coding: boolean;
    toolUse: boolean;
    reasoningLevels?: string[];
    contextWindow?: number;
  };

  traits: {
    qualityClass: 'cheap' | 'balanced' | 'powerful';
    latencyClass?: 'fast' | 'standard' | 'slow';
  };

  availability: 'available' | 'unavailable' | 'unknown';
  pricing?: PricingMetadata;
}
```

Provider-specific model metadata may be richer but MUST be normalized before reaching `ModelResolver`.

### 18.1 Catalog freshness

The provider SHOULD cache discovery results with a bounded freshness policy.

If a model selected from cache is rejected as unavailable:

1. force-refresh the catalog;
2. resolve again once;
3. if resolution still fails, enter the normal fallback path.

The runtime MUST NOT loop indefinitely refreshing catalog data.

## 19. Model Resolver

Resolution has two distinct phases.

### 19.1 Hard filtering

Candidates are eliminated if they fail mandatory requirements:

- required capabilities;
- required minimum reasoning/quality class;
- minimum context needs when known;
- user/project provider policy;
- current provider availability.

A preference score MUST NOT override a hard constraint.

### 19.2 Preference ranking

Remaining candidates may be ranked by:

- quality fit;
- latency fit;
- estimated cost;
- verified historical success for the task/stage pattern;
- retry rate;
- provider preference;
- experience-derived evidence quality.

The resolver MUST return reasons and rejected alternatives sufficient to explain the choice.

```ts
interface ModelResolution {
  requested: ModelRequirement;
  selected: ResolvedModelProfile;
  reasons: string[];
  alternatives: ModelAlternative[];
  fallback: ModelFallbackResult;
}
```

## 20. Model Fallback Policy

Fallback is explicit and classified.

### 20.1 Equivalent fallback

A different concrete model satisfies the same hard requirements.

```text
Powerful A unavailable
  -> Powerful B available
  -> automatic equivalent fallback
```

No user interruption is required unless local policy says otherwise.

### 20.2 Acceptable degradation

Quality capability is preserved but another preference degrades, for example:

```text
balanced + prefer_fast
  -> balanced + standard latency
```

This MAY proceed automatically and MUST be recorded in the resolution trace.

### 20.3 Quality degradation

The requested quality capability cannot be met, for example:

```text
requested: powerful
available: balanced only
```

This MUST NOT happen silently.

Milestone 3 adds a control action type such as:

```text
modelQualityDegradation
```

The default behavior SHOULD be `assisted` unless the user/project has explicitly configured a different authority mode.

### 20.4 Workflow fallback

The resolver MAY return `request_replan` instead of selecting a lower-quality model. Automatic intelligent task decomposition is out of scope for this milestone.

## 21. Telemetry Normalization

Provider telemetry is evidence; Experience Engine is interpretation.

```ts
interface RuntimeTelemetry {
  provider: string;
  model: string;

  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;

  durationMs: number;
  retries: number;
  compactions: number;

  estimatedCost?: Money;

  outcome: 'success' | 'failed' | 'cancelled' | 'recovered';
  verification: 'passed' | 'failed' | 'not_run';
}
```

All unavailable measurements remain `undefined`/unknown. AES MUST NOT derive fake exact values from heuristics.

## 22. Pricing

Pricing is independent from provider protocol parsing.

```ts
interface UsageRecord {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
}

interface PricingProvider {
  estimate(usage: UsageRecord): CostEstimate | undefined;
}
```

The Codex adapter MUST NOT hard-code mutable public pricing tables into protocol logic.

A missing price MUST produce:

```text
usage = known
estimatedCost = unknown
```

rather than blocking trace generation.

## 22.1 Resource Governance

Token/cost governance is a separate concern from model optimization. The Model Router and Model Resolver answer **which execution profile is preferable**; the Resource Policy Engine answers **which execution is permitted by the configured resource envelope**.

Milestone 3 MUST provide a provider-neutral `ResourcePolicyEngine` with an extensible policy contract. The initial built-ins are deliberately narrow:

- hard task/session budgets for total/input/output tokens, estimated cost, retries, and duration when those measurements are known;
- configurable warning thresholds before hard budget exhaustion;
- one simple sliding token-usage window suitable for local/runtime protection;
- deterministic short-circuit outcomes: `allow`, `warn`, `throttle`, or `deny`.

Conceptually:

```ts
interface ResourceBudget {
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxTotalTokens?: number;
  maxEstimatedCost?: Money;
  maxRetries?: number;
  maxDurationMs?: number;
  warningThreshold?: number;
}

interface ResourceDecision {
  outcome: 'allow' | 'warn' | 'throttle' | 'deny';
  reasons: string[];
  remaining?: ResourceRemaining;
  retryAfterMs?: number;
}
```

Unknown usage or pricing MUST remain unknown and MUST NOT be silently converted to zero. A policy MAY only enforce a dimension for which comparable evidence exists.

Hard resource limits are constraints, not routing preferences. A model that is cheaper but fails required quality constraints MUST NOT be selected merely to satisfy a budget. Conversely, a preferred model that exceeds a hard budget MUST NOT be invoked unless an explicit `resourceBudgetOverride` is authorized through the Control Engine.

The initial sliding-window implementation MAY be in-memory, but usage-window state MUST be hidden behind a neutral contract so later Redis/SQLite/Postgres-backed policies do not require changes to `AdaptiveRuntime` callers. Token Bucket, Leaky Bucket, distributed quota accounting, enterprise alert integrations, and production database backends are deferred.

The runtime SHOULD first attempt non-disruptive adaptation when approaching a warning threshold (for example preserving quality while using an equivalent lower-cost/latency profile, stopping exhausted retries, or compacting context when justified) before interrupting the user.

## 23. Runtime Trace Accumulation

Streaming provider updates are accumulated in memory for the active turn:

```text
Runtime events
   |
   v
RuntimeTraceAccumulator
   |
   +--> meaningful checkpoints
   |
   v
normalized final trace
   |
   v
TraceStore
```

The persistent store MUST NOT receive one record for every token/output delta.

A turn-level trace SHOULD record:

- correlation IDs;
- provider and concrete model ID;
- requested model requirement;
- model resolution and fallback type;
- normalized usage;
- wall-clock duration;
- retries;
- compactions;
- provider recovery count;
- verification outcome;
- failure taxonomy;
- user interruptions/overrides;
- context health before/after when available.

## 24. Trace Storage

Milestone 3 uses a hybrid local storage design.

```text
.aes/
├── raw/
│   ├── traces/
│   │   ├── 2026-08.jsonl
│   │   └── ...
│   └── runtime/
│       └── checkpoints/
│
├── knowledge/
├── decisions/
├── experience/
├── evals/
├── index.md
├── log.md
└── MEMORY.md
```

### 24.1 `TraceStore`

Storage is hidden behind a neutral interface:

```ts
interface TraceStore {
  append(trace: RuntimeDecisionTrace): Promise<void>;
  query(query: TraceQuery): Promise<RuntimeDecisionTrace[]>;
  aggregate(query: AggregateQuery): Promise<AggregateResult>;
}
```

The Milestone 3 reference implementation is `LocalJsonlTraceStore`.

Future implementations may use SQLite, Postgres, or remote storage without changing the Experience Engine contract.

### 24.2 Append-only raw traces

Raw trace files are append-only JSONL. They are technical evidence, not human-authored knowledge.

Default trace payloads MUST NOT include:

- full prompts;
- source-code bodies;
- conversation transcripts;
- raw terminal/tool output;
- secrets;
- arbitrary file contents.

## 25. Knowledge Store Boundary

Milestone 2's `MemoryStore` remains the reference file-backed project knowledge implementation.

Milestone 3 MUST formalize the subset used by learning/promotion behind a provider-neutral contract conceptually equivalent to:

```ts
interface KnowledgeStore {
  initialize(): Promise<void>;
  searchKnowledge(query: string, limit?: number): Promise<KnowledgeSearchResult[]>;
  writeKnowledge(path: string, content: string, metadata: KnowledgeMetadata): Promise<void>;
  appendLog(message: string): Promise<void>;
}
```

The existing `MemoryStore` SHOULD implement this contract without changing the existing `.aes/knowledge`, `.aes/decisions`, `.aes/experience`, and `.aes/evals` semantics.

Storage format and knowledge semantics MUST remain separate concerns.

## 26. Project-to-User Experience Privacy

Detailed traces remain project-local.

```text
project/.aes/raw/traces
   |
   v
Experience aggregation
   |
   v
Generalization
   |
   v
Privacy filter
   |
   v
Evaluation gate
   |
   v
~/.aes/experience
```

Only abstracted procedural patterns MAY be promoted globally, for example:

```text
approved plan + TypeScript execution + balanced
-> high verified success
```

The following MUST NOT be promoted by default:

- project paths;
- repository names;
- internal service names;
- source code;
- prompts;
- tool output;
- customer data;
- secrets;
- proprietary architecture details.

If safe generalization cannot be established, the pattern remains project-local.

## 27. Session Checkpoints

After meaningful state transitions, the runtime persists a compact checkpoint.

```ts
interface SessionCheckpoint {
  sessionId: string;
  provider: string;
  providerSessionId: string;
  state: RuntimeSessionState;
  lastEventId?: string;
  lastActionId?: string;
  modelProfile: ResolvedModelProfile;
  contextRevision: number;
  checkpointAt: string;
}
```

Required checkpoint boundaries include:

- turn start;
- tool completion;
- approval resolution;
- compaction completion;
- turn completion;
- transition into recovery.

Checkpoints MUST be sufficient to reconcile provider state after a process restart without relying on the old in-memory session object.

## 28. Crash Recovery

Provider crash recovery is enabled by default.

```text
App Server exits unexpectedly
   |
   v
Supervisor marks provider recovering
   |
   v
bounded restart
   |
   v
resume provider session/thread
   |
   v
load last checkpoint
   |
   v
reconcile state
   |
   +--> SAFE      -> continue automatically
   +--> AMBIGUOUS -> Control Engine / user authority
   +--> LOST      -> fail safely / handoff recovery path
```

Recovery MUST distinguish read-only/model progress from side effects.

An action is ambiguous when AES cannot determine whether the side effect completed before the crash. An ambiguous action MUST NOT be automatically repeated.

Existing Milestone 2 action IDs and idempotency semantics SHOULD be reused wherever provider action mapping permits.

## 29. Runtime Failure Taxonomy

Milestone 3 standardizes runtime failure categories:

```ts
type RuntimeFailureKind =
  | 'transport_failed'
  | 'provider_crashed'
  | 'provider_unavailable'
  | 'model_unavailable'
  | 'rate_limited'
  | 'session_lost'
  | 'approval_failed'
  | 'action_ambiguous'
  | 'execution_failed'
  | 'context_exhausted'
  | 'verification_failed'
  | 'cancelled';
```

Each class has an owner:

| Failure | Primary owner |
| --- | --- |
| `transport_failed` | provider transport |
| `provider_crashed` | workspace supervisor |
| `provider_unavailable` | workspace supervisor / provider |
| `model_unavailable` | model resolver |
| `rate_limited` | runtime/provider retry policy |
| `session_lost` | recovery coordinator |
| `approval_failed` | control bridge |
| `action_ambiguous` | recovery + control |
| `execution_failed` | execution/decision workflow |
| `context_exhausted` | context engine / compaction/handoff path |
| `verification_failed` | decision engine |
| `cancelled` | runtime lifecycle, non-quality outcome |

A generic catch-all retry loop is prohibited.

## 30. Retry Budgets

Retries are bounded by failure class.

Reference defaults:

```yaml
recovery:
  transport:
    retries: 2

  providerRestart:
    retries: 2

  catalogRefresh:
    retries: 1

  modelFallback:
    retries: 1

  execution:
    retries: 1
```

These are implementation defaults, not guarantees that every failure will be retried. Safety and ambiguity checks take precedence.

Repeated execution failures MUST eventually transition to debugging/replanning rather than repeat the same strategy indefinitely.

## 31. Failure Fingerprinting

Runtime/verification failures SHOULD carry a stable fingerprint derived from normalized error evidence rather than raw full logs.

```text
attempt 1 -> fingerprint X
attempt 2 -> fingerprint X + same strategy
=> strategy exhausted
=> debug/replan instead of identical retry
```

Fingerprinting is used to prevent wasteful repeated attempts. It MUST NOT store secrets or full sensitive outputs by default.

## 32. Circuit Breaker

Provider crash/restart loops are bounded by a circuit breaker:

```text
closed
  |
  | repeated provider failures
  v
open
  |
  | cooldown or explicit recovery
  v
half_open
  |
  +--> success -> closed
  +--> failure -> open
```

After the configured failure threshold, the supervisor MUST stop automatic restarts until the circuit can be safely tested or explicitly reset.

## 33. Rate Limits and Attribution

Rate limiting is an infrastructure/provider-availability outcome, not a model-quality outcome.

Trace metadata MUST allow Experience Engine to exclude from model-quality success calculations:

- rate limits;
- provider crashes;
- transport failures;
- user cancellations;
- sessions that never reached actual model execution.

The same principle applies to any future provider.

## 34. Context Compaction

Compaction is decided by the AES Context Engine and executed through the runtime provider.

```text
Context Engine
pressure=high, relevance=high
   |
   v
recommend compact
   |
   v
Control policy
   |
   v
RuntimeSession.compact()
   |
   v
provider-specific operation
```

If the provider does not support compaction, the runtime reports capability unavailability. AES MAY then follow the existing handoff/new-session path.

The provider MUST NOT independently redefine AES context-health policy merely because it offers its own auto-compaction behavior. Provider compaction state is telemetry/capability input to AES, not the sole source of decision policy.

## 35. Cancellation

User cancellation is provider-neutral:

```text
User cancel
   |
   v
AdaptiveRuntime
   |
   v
RuntimeSession.cancel()
   |
   v
provider interrupt
   |
   v
acknowledged cancelled state
```

A cancelled turn MUST create a trace with:

```text
outcome = cancelled
initiator = user
```

It MUST NOT count as a model failure in experience aggregation.

## 36. Observability Model

Milestone 3 emits three categories of events.

### 36.1 Runtime events

Examples:

- `runtime.session.started`
- `runtime.turn.started`
- `runtime.output.delta`
- `runtime.tool.requested`
- `runtime.tool.completed`
- `runtime.usage.updated`
- `runtime.turn.completed`
- `runtime.provider.failed`
- `runtime.session.recovering`
- `runtime.session.recovered`

### 36.2 Decision events

Examples:

- `decision.model.selected`
- `decision.model.fallback`
- `decision.context.compact`
- `decision.retry`
- `decision.replan`

### 36.3 Learning events

Examples:

- `experience.trace.recorded`
- `experience.pattern.candidate`
- `experience.pattern.validated`
- `experience.pattern.rejected`
- `experience.authority.proposed`

Observability MUST remain compatible with the existing event-driven kernel rather than replacing it with a parallel logging model.

## 37. Correlation IDs

The runtime SHOULD preserve a hierarchical correlation chain:

```text
taskId
  -> sessionId
      -> turnId
          -> decisionId
          -> actionId
          -> traceId
```

These IDs support:

- recovery reconciliation;
- idempotency;
- event/audit inspection;
- trace aggregation;
- debugging without logging full prompts.

## 38. Raw Provider Event Logging

Raw provider protocol capture is disabled by default:

```yaml
telemetry:
  providerRawEvents: false
```

If explicitly enabled for local debugging, raw event capture MUST pass through a sanitizer before persistence.

The sanitizer MUST remove or redact, as applicable:

- prompts;
- project content;
- secrets;
- tool output;
- sensitive paths;
- environment secrets;
- authentication material.

Raw provider capture MUST never be required for normal AES operation.

## 39. Experience Feedback Loop

Milestone 3 supplies real evidence to the Milestone 2 Experience Engine.

```text
baseline routing rules
   |
   v
real Codex execution
   |
   v
normalized trace
   |
   v
verification
   |
   v
Experience Engine
   |
   v
candidate pattern
   |
   v
Evaluation Gate
   |
   v
validated routing evidence
   |
   +------------------> future Model Resolver ranking
```

Production learning uses natural work history. AES MUST NOT routinely execute the same production task on several models only to collect counterfactual data.

Controlled multi-model comparisons belong in explicit `evals/` workflows.

## 40. Learning Objective

Experience aggregation SHOULD optimize a multi-dimensional verified outcome, including:

- verification success;
- quality regressions;
- retries;
- wall-clock latency;
- token usage;
- estimated monetary cost when available;
- user interruptions;
- fallback frequency;
- recovery frequency.

A cheap model that requires several failed retries can be less efficient than a more capable model that succeeds once.

No single metric such as token count may become the sole optimization target.

## 41. Storage and Retention Behavior

Milestone 3 keeps storage simple and inspectable:

- raw normalized traces: JSONL;
- checkpoints: JSON;
- knowledge: Markdown plus metadata;
- aggregated experience: compact JSON or Markdown depending on existing Milestone 2 conventions;
- eval evidence: existing `.aes/evals` model.

SQLite is deliberately deferred. The interfaces MUST allow a later `SqliteTraceStore` without changing runtime/learning callers.

Retention policies MAY be added later. Milestone 3 SHOULD keep files bounded by rotation (for example monthly trace files) rather than one unbounded JSONL file.

## 42. Testing Strategy

The default test suite MUST remain deterministic, offline, and free of model/API cost.

Testing pyramid:

```text
              live Codex smoke tests
                     ^
                     |
             provider contract tests
                     ^
                     |
             fake App Server tests
                     ^
                     |
      deterministic unit/property tests
```

## 43. Deterministic Unit Tests

Unit tests MUST cover at minimum:

- model hard filtering;
- preference ranking;
- equivalent fallback;
- acceptable degradation;
- quality-degradation authorization;
- missing telemetry preservation;
- pricing unknown behavior;
- retry-budget exhaustion;
- circuit-breaker transitions;
- failure attribution;
- failure fingerprinting;
- lossless/coalescible event queue behavior;
- trace privacy defaults;
- project-to-user generalization filtering;
- checkpoint serialization;
- idempotency conflicts;
- cancellation not counting as model-quality failure.

## 44. Fake Codex App Server

Tests MUST include a deterministic fake process or transport speaking the same App Server transport contract expected by the adapter.

Required scenarios:

- initialization;
- model discovery;
- normal streamed turn;
- approval request/response;
- tool completion;
- usage updates;
- compaction;
- cancellation;
- provider crash;
- session resume;
- rate limit;
- session loss;
- malformed message;
- unknown non-critical notification;
- crash around a side effect.

A critical recovery test MUST prove that an action whose completion is ambiguous after a crash is not automatically re-executed.

## 45. Provider Contract Tests

AES SHOULD expose a reusable contract suite conceptually equivalent to:

```ts
runProviderContractTests(providerFactory);
```

Every future provider adapter should demonstrate:

- capability reporting;
- model discovery;
- session creation;
- normalized event delivery;
- cancellation;
- telemetry normalization;
- approval routing;
- recovery/resume behavior when supported;
- idempotent action handling;
- graceful unsupported-capability behavior.

Codex is the first adapter to pass this suite.

## 46. Live Codex Integration Tests

Live tests are opt-in and separate from the normal offline suite.

Reference command:

```bash
npm run test:integration:codex
```

The test should:

1. detect the Codex binary;
2. start `codex app-server`;
3. initialize protocol communication;
4. discover available models;
5. create a disposable session/thread;
6. run a minimal safe turn;
7. observe normalized events;
8. collect available telemetry;
9. shut down cleanly.

If Codex is not installed/configured, the live integration suite SHOULD skip with a clear message rather than fail the normal project build.

Live tests MUST avoid destructive commands and MUST NOT be a prerequisite for local unit-test success.

## 47. Record / Replay

Milestone 3 SHOULD support sanitized protocol recording for adapter testing.

```text
opt-in real Codex session
   |
   v
sanitizer
   |
   v
recorded fixture
   |
   v
offline replay tests
```

Example fixture location:

```text
packages/adapter-codex/fixtures/session-basic.jsonl
```

Recorded fixtures MUST contain no project source, prompts, secrets, or sensitive tool output.

## 48. Chaos / Recovery Tests

The fake provider MUST support deterministic failure injection at meaningful boundaries:

- after turn start;
- after tool completion;
- before approval response;
- during compaction;
- after provider completion but before local checkpoint persistence.

Tests MUST verify:

- no duplicate ambiguous side effects;
- bounded restart/retry behavior;
- correct session state;
- correct trace attribution;
- correct user-interruption behavior;
- no model-quality penalty for provider infrastructure failure.

## 49. Compatibility with Milestone 2 APIs

Milestone 3 extends rather than discards Milestone 2.

### 49.1 `RuntimeAdapter`

The current adapter interface remains temporarily supported:

```ts
interface RuntimeAdapter {
  invokeModel(request: ModelRequest): Promise<ModelResponse>;
  invokeTool(request: ToolRequest): Promise<ToolResponse>;
  getCapabilities?(): RuntimeCapabilities;
  executeAction?(action: RuntimeAction): Promise<RuntimeActionResult>;
}
```

`CodexRuntimeAdapter` MAY become a compatibility façade over `CodexProvider` + `AdaptiveRuntime` rather than remain the primary architecture.

### 49.2 `DecisionTrace`

Milestone 2 `DecisionTrace` is extended with runtime execution evidence rather than replaced wholesale. Existing fields remain meaningful for non-live/deterministic scenarios.

### 49.3 Memory

Milestone 2 `.aes/` knowledge lifecycle remains canonical. Milestone 3 adds raw runtime trace/checkpoint subtrees and real evidence sources.

## 50. Configuration

A representative configuration is:

```yaml
runtime:
  provider: codex

  codex:
    processScope: workspace
    binary: codex

  modelResolution:
    qualityDegradation: assisted
    catalogRefreshRetries: 1

  recovery:
    transportRetries: 2
    providerRestartRetries: 2
    executionRetries: 1
    circuitBreakerThreshold: 2

  telemetry:
    providerRawEvents: false
    traceStore: jsonl

control:
  default: assisted
  actions:
    modelRouting: autonomous
    fastMode: autonomous
    contextCompaction: autonomous
    handoffCreation: autonomous
    memoryPromotion: assisted
    conversationTransition: assisted
    modelQualityDegradation: assisted
    resourceBudgetOverride: assisted
```

Exact config file placement and parser shape are implementation-plan decisions, but semantics MUST follow this design.

## 51. Expected End-to-End Flow

A normal approved-plan execution should look like:

```text
1. Kernel determines:
   balanced + prefer_fast

2. AdaptiveRuntime requests model catalog.

3. ModelResolver selects a concrete Codex model.

4. ResourcePolicyEngine checks task/session budget and current usage window.

5. If a hard limit would be exceeded, execution stops unless `resourceBudgetOverride` is explicitly authorized.

6. WorkspaceRuntimeSupervisor reuses or starts one App Server process.

7. RuntimeSession starts a turn.

8. Codex streams events.

9. Tool/approval requests are normalized through AES control policy.

10. Usage/context events update RuntimeTraceAccumulator and resource usage.

11. Resource policies are re-evaluated at meaningful usage checkpoints; warning/throttle/deny outcomes are observable.

12. Turn completes.

13. Verification runs.

14. Normalized trace is appended to project-local JSONL.

15. Experience Engine aggregates verified evidence later.

16. Future routing may rank the same model/profile higher or lower based on the validated history.
```

A crash flow should look like:

```text
1. App Server exits during a turn.
2. Supervisor consumes one restart budget.
3. Provider process restarts.
4. Session resumes from provider/session identity.
5. Runtime loads last local checkpoint.
6. Runtime reconciles side-effect state.
7. SAFE -> continue automatically.
8. AMBIGUOUS -> ask Control Engine; do not repeat blindly.
9. LOST -> stop safely and expose a recoverable failure/handoff path.
```

## 52. Success Criteria

Milestone 3 is complete when all of the following are true:

1. AES can start one Codex App Server process for a workspace and reuse it across multiple runtime sessions.
2. A real Codex turn can be started through provider-neutral runtime contracts.
3. Codex provider events are normalized and no Codex-specific type escapes the adapter package.
4. Provider approvals pass through AES control authority rather than auto-approval in the adapter.
5. Model discovery returns a normalized catalog and Model Resolver chooses a concrete model with explainable reasons.
6. Equivalent and latency-only fallbacks can proceed without unnecessary interruption.
7. Quality-degrading fallback requires the configured authority path and is never silent.
8. Runtime telemetry records available token usage, duration, retries, compactions, provider/model identity, and outcome without inventing missing values.
9. Price estimation is optional and separated from protocol parsing.
10. Project-local normalized traces persist as JSONL without full prompts/source/tool output by default.
11. Crash recovery can restart the workspace provider and resume a recoverable session.
12. Ambiguous side effects are not automatically repeated.
13. Retry budgets and circuit breaker prevent runaway restart/retry loops.
14. Provider failures and cancellations do not corrupt model-quality learning statistics.
15. Context compaction can be requested through the provider-neutral session contract when supported.
16. User cancellation reaches the provider and produces a normalized cancelled outcome.
17. Fake App Server tests cover approvals, streaming, crash, resume, rate limits, malformed events, and ambiguity recovery.
18. A reusable provider contract suite validates the Codex adapter.
19. Default unit/contract tests are deterministic and do not require live Codex/API usage.
20. An opt-in live Codex smoke test demonstrates the full provider connection when the local environment supports it.
21. The Milestone 2 Experience Engine can consume real verified runtime trace evidence without receiving raw project content.
22. Vendor-boundary architecture tests continue to prove that core/kernel packages do not import Codex-specific code.
23. Hard task/session resource budgets can deny execution without silently changing required model quality.
24. A simple sliding token-usage window can throttle repeated usage with deterministic retry guidance.
25. Unknown token/cost measurements remain unknown during resource-policy evaluation rather than being treated as zero.
26. Exceeding a hard resource budget requires the configured `resourceBudgetOverride` authority path rather than a provider-local bypass.

## 53. Recommended Implementation Decomposition

The implementation plan SHOULD be split into independently testable slices rather than one monolithic change:

1. **Runtime contracts and model resolution** — new provider/session/event/telemetry contracts plus resolver and fallback tests.
2. **Trace/checkpoint/recovery infrastructure** — JSONL trace store, checkpoint store, retry budgets, fingerprinting, circuit breaker, event backpressure.
3. **Resource governance** — provider-neutral budgets, warning thresholds, simple sliding usage window, and Control Engine override semantics.
4. **Codex transport/provider** — App Server process, JSONL RPC transport, protocol normalization, model discovery, approvals, sessions, compaction, cancellation.
5. **Adaptive runtime integration** — supervisor, resource-policy/control bridge integration, end-to-end orchestration, experience trace feeding.
6. **Provider testing infrastructure** — fake App Server, contract suite, replay/chaos fixtures, opt-in live smoke test.

Each slice MUST leave the default offline test suite green.

## 54. Final Architectural Principle

Milestone 3 establishes a strict separation:

```text
Model Router
  -> what capabilities are required?

Model Resolver
  -> which available provider model best satisfies them?

Control Engine
  -> is AES allowed to perform the requested/degraded action?

Runtime Provider
  -> how is it executed in this provider?

Telemetry
  -> what actually happened?

Experience Engine
  -> what did verified evidence teach us?
```

Codex is the first real provider implementation, not the architecture of AES.
