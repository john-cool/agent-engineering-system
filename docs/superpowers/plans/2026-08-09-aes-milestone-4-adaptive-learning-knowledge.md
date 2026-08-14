# AES Milestone 4 — Adaptive Learning & Knowledge Runtime Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans for any evidence-backed follow-up task. Steps use checkbox (`- [ ]`) syntax for tracking; completed implementation work is recorded in Git history.

**Status (2026-08-14):** The implementation tasks are present in the current `main` baseline through the adaptive lifecycle, configuration, and documentation commits. This document is now the audit and verification checklist; do not reimplement completed tasks. The next action is a bounded audit against the approved design and Definition of Done.

**Goal:** Close AES's learning loop so verified runtime evidence can create, validate, shadow, activate, explain, monitor, and safely roll back reversible project-local learning while typed knowledge and user authority remain bounded, inspectable, and privacy-safe.

**Architecture:** Extend the existing `@aes/spec` → `@aes/kernel` → `@aes/runtime-sdk` → `@aes/runtime` boundaries rather than creating a new top-level package. Deterministic kernel components produce and evaluate typed candidates; runtime components own optional model calls, controlled evaluation, persistence orchestration, and failure isolation; learned behavior reaches decisions only through closed, reversible soft overlays. Existing Milestone 2/3 APIs remain valid through compatibility facades and adapters.

**Tech Stack:** Node.js >=22, TypeScript 5.8.x, ESM, `node:test`, workspace packages managed by pnpm 10.14.0, dependency-free core/runtime logic unless a dependency is separately justified and approved.

**Design spec:** `docs/superpowers/specs/2026-08-09-aes-milestone-4-adaptive-learning-knowledge-design.md`

## Global Constraints

- Node.js MUST remain `>=22`; package manager target remains `pnpm@10.14.0`.
- Offline build/typecheck/tests MUST remain network-independent and MUST NOT require Codex or any provider binary.
- `@aes/kernel` and `@aes/spec` MUST NOT import Codex/provider-specific types.
- Learning MUST NOT be required for base AES execution; any learning failure falls back to base behavior where safe.
- Shadow candidates MUST NOT affect production decisions.
- Learned behavior MUST be reversible and MUST NOT weaken hard safety, privacy, quality, authority, capability, or resource constraints.
- AES MUST NOT silently increase authority; verified regression MAY automatically reduce authority from `autonomous` to `assisted`.
- Project-specific knowledge MUST NOT enter user scope without deterministic generalization/privacy checks; uncertain promotion fails closed.
- Unknown telemetry MUST remain unknown and MUST NOT be treated as zero, success, failure, cost, or confidence.
- Natural evidence is preferred over replay/offline evaluation; live controlled evaluation is last and is sandboxed, budgeted, and Resource-Governed.
- Controlled-eval defaults: `enabled=true`, `sandboxOnly=true`, `maxRunsPerCandidate=5`, `maxTokensPerDay=100000`, `maxCostPerDay=0.50`.
- Learning-analysis defaults: `maxCandidatesPerTask=3`, `maxAnalysisTokensPerTask=3000`, `maxIncrementalWorkMs=500`.
- Evaluation defaults: `minSamples=20`, `minComparableSamplesPerAlternative=5`, `qualityNonInferiorityMargin=0.01`, `minRelativeImprovement=0.05`, `regressionWindow=20`.
- Interaction-learning defaults: `authorityProposalMinApprovals=15`, `authorityProposalMaxRejections=0`, `rejectionSuppressionRuns=5`.
- Retrieval defaults: `maxRecords=8`, `maxEstimatedTokens=2500`.
- Knowledge-health defaults: `maxActiveRecords=500`, `maxRecordTokens=800`, `maxIndexTokens=4000`.
- Retention defaults: raw traces `90d`, failed traces `180d`, promoted evidence `keep`.
- Full maintenance default trigger: `fullCompileAfterNewTraces=20`.
- No mandatory embeddings, vector database, graph database, hosted knowledge service, second provider adapter, contextual-bandit exploration, or model fine-tuning in Milestone 4.
- Current planning sandbox note: `pnpm` is not installed locally and Corepack cannot fetch it because outbound registry access is unavailable. Execution must begin in an environment where pnpm 10.14.0 is already available; do not change repository package-manager policy merely to work around this sandbox limitation.

---

## File Structure Map

### `@aes/spec`

- Modify `packages/spec/src/learning.ts` — M4 learning evidence, task signatures, candidate/evaluation/overlay/interaction/config contracts while preserving M2/3 compatibility interfaces.
- Create `packages/spec/src/knowledge.ts` — typed knowledge records, relations, lifecycle, retrieval/retention/health budgets.
- Modify `packages/spec/src/intelligence.ts` — add `controlledEvaluation` and `controlledEvaluationBudgetOverride` control actions.
- Modify `packages/spec/src/index.ts` — export M4 knowledge contracts.
- Modify `packages/spec/src/__tests__/learning.test.ts` — compatibility + new learning contract tests.
- Create `packages/spec/src/__tests__/knowledge.test.ts` — typed knowledge contract tests.

### `@aes/runtime-sdk`

- Create `packages/runtime-sdk/src/learning.ts` — neutral `PatternAnalyzer`, `ControlledEvaluationExecutor`, learning artifact store, and learning-observation interfaces.
- Modify `packages/runtime-sdk/src/storage.ts` — typed knowledge-store compatibility surface.
- Modify `packages/runtime-sdk/src/observability.ts` — learning lifecycle observations without raw prompt/code payloads.
- Modify `packages/runtime-sdk/src/index.ts` — export learning contracts.
- Create `packages/runtime-sdk/src/__tests__/learning-contracts.test.ts` — provider-neutral learning boundary tests.

### `@aes/kernel`

- Create `packages/kernel/src/task-signature.ts` — bounded deterministic task-signature normalization/applicability matching.
- Create `packages/kernel/src/experience-metrics.ts` — deterministic aggregation + optional metric coverage.
- Create `packages/kernel/src/experience-miner.ts` — evidence-first candidate creation.
- Create `packages/kernel/src/evaluation-engine.ts` — quality-first multi-dimensional candidate evaluation.
- Modify `packages/kernel/src/evaluation-gate.ts` — keep M2 compatibility facade intact.
- Create `packages/kernel/src/policy-overlay-engine.ts` — applicability, specificity, evidence precedence, conflict removal, explanations.
- Create `packages/kernel/src/shadow-evaluator.ts` — record hypothetical decisions without substitution.
- Create `packages/kernel/src/regression-monitor.ts` — rolling baseline/post-activation quality monitoring and degrade recommendation.
- Modify `packages/kernel/src/model-router.ts` — optional resolved model-preference advice only.
- Modify `packages/kernel/src/context-engine.ts` — optional context soft advice only.
- Modify `packages/kernel/src/interruption-policy.ts` — urgency + hard-blocker-safe learned soft advice.
- Create `packages/kernel/src/interruption-scheduler.ts` — immediate/boundary/digest batching.
- Create `packages/kernel/src/rejection-suppression.ts` — scoped suppression window with context invalidation.
- Modify `packages/kernel/src/authority-learning.ts` — scoped authority candidates + explicit grant creation + automatic degradation decisions.
- Modify `packages/kernel/src/control-engine.ts` — consume only already-accepted scoped authority grants while preserving session/explicit precedence.
- Modify `packages/kernel/src/knowledge-compiler.ts` — deterministic create/merge/supersede/conflict decisions over typed records.
- Create `packages/kernel/src/memory-lint.ts` — deterministic memory hygiene findings/repairs.
- Create `packages/kernel/src/memory-maintenance.ts` — concrete incremental/full maintenance orchestration over the local store.
- Create `packages/kernel/src/knowledge-retriever.ts` — scoped/applicable deterministic ranking and record/token budgets.
- Create `packages/kernel/src/controlled-evaluation-policy.ts` — expected-learning-value and safety eligibility.
- Create `packages/kernel/src/evidence-query.ts` — deterministic validation of optional LLM hypotheses against evidence.
- Modify `packages/kernel/src/memory-store.ts` — typed local records, migration, materialized indexes, compatibility methods.
- Modify `packages/kernel/src/index.ts` — export all new kernel components.

### `@aes/runtime`

- Modify `packages/runtime/src/experience-adapter.ts` — richer normalized `LearningEvidence` while preserving `toExperienceEvidence`.
- Create `packages/runtime/src/replay-evaluation-runner.ts` — normalized offline/replay evidence boundary.
- Create `packages/runtime/src/controlled-evaluation-runner.ts` — sandbox/resource/control-governed live eval orchestration.
- Create `packages/runtime/src/evidence-acquisition-coordinator.ts` — natural → replay → controlled acquisition ordering without policy activation.
- Create `packages/runtime/src/pattern-analysis-coordinator.ts` — optional LLM hypothesis generation with budget/failure isolation.
- Create `packages/runtime/src/adaptive-learning-coordinator.ts` — end-to-end trace → evidence → candidate → shadow/eval → persistence/overlay lifecycle orchestration.
- Create `packages/runtime/src/interaction-learning-coordinator.ts` — truthful approval/rejection evidence, authority proposals, explicit grant acceptance, and automatic degradation.
- Modify `packages/runtime/src/adaptive-runtime.ts` — optional learning observer hook after finalized trace; learning failure cannot fail ordinary execution.
- Modify `packages/runtime/src/index.ts` — export M4 runtime components.

### `@aes/cli` + examples

- Modify `packages/cli/src/runtime-config.ts` — normalize all reference M4 defaults.
- Modify `packages/cli/src/__tests__/runtime-config.test.ts` — exact configuration-default assertions.
- Modify `examples/control.yaml` — new control actions.
- Create `examples/learning.yaml` — complete reference learning/knowledge configuration.

### Documentation

- Modify `README.md`.
- Create/populate `docs/getting-started/what-is-aes.md`, `docs/getting-started/quick-start.md`, `docs/getting-started/mental-model.md`.
- Create/populate `docs/concepts/workflows.md`, `docs/concepts/context-management.md`, `docs/concepts/model-routing.md`, `docs/concepts/control-and-authority.md`, `docs/concepts/resource-governance.md`, `docs/concepts/knowledge-and-memory.md`, `docs/concepts/adaptive-learning.md`.
- Create/populate `docs/architecture/overview.md`, `docs/architecture/kernel.md`, `docs/architecture/adaptive-runtime.md`, `docs/architecture/provider-model.md`, `docs/architecture/codex-adapter.md`, `docs/architecture/learning-loop.md`, `docs/architecture/how-aes-makes-a-decision.md`.
- Create/populate `docs/guides/configure-aes.md`, `docs/guides/budgets.md`, `docs/guides/autonomy.md`, `docs/guides/knowledge-base.md`, `docs/guides/write-an-adapter.md`, `docs/guides/debugging.md`.
- Create/populate `docs/reference/configuration.md`, `docs/reference/events.md`, `docs/reference/schemas.md`, `docs/reference/runtime-api.md`, `docs/reference/policy-api.md`.
- Create `docs/examples/learning-lifecycle.md`, `docs/examples/authority-promotion.md`.

---

### Task 1: Add normative Milestone 4 contracts without breaking Milestone 3 callers

**Files:**
- Modify: `packages/spec/src/learning.ts`
- Create: `packages/spec/src/knowledge.ts`
- Modify: `packages/spec/src/intelligence.ts`
- Modify: `packages/spec/src/index.ts`
- Modify: `packages/spec/src/__tests__/learning.test.ts`
- Create: `packages/spec/src/__tests__/knowledge.test.ts`

**Interfaces:**
- Consumes: existing `ModelClass`, `ControlMode`, `Confidence`, `LifecycleState`, `PlanStatus`, `TaskComplexity` from `@aes/spec`.
- Produces: `LearningScope`, `TaskSignature`, `Applicability`, `LearningEvidence`, `EvidenceStrength`, `LearningCandidate`, `LearningEvaluation`, `PolicyOverlay`, `OverlayEffect`, `ShadowDecisionTrace`, `InteractionEvidence`, `InterruptionUrgency`, `AuthorityCandidate`, `ScopedAuthorityGrant`, `LearningConfig`, `KnowledgeRecord`, `KnowledgeRelation`, `KnowledgeQuery`, `KnowledgePacket`.
- Compatibility: existing `DecisionTrace`, `KnowledgeMetadata`, `ExperienceHypothesis`, `EvaluationEvidence`, and `EvaluationDecision` MUST continue to compile unchanged.

- [ ] **Step 1: Add failing spec tests for the closed vocabularies and backward compatibility**

```ts
// packages/spec/src/__tests__/learning.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  DecisionTrace,
  KnowledgeMetadata,
  LearningCandidate,
  LearningConfig,
  PolicyOverlay,
  TaskSignature
} from '../index.js';

// keep the existing compatibility test in this file.

test('milestone 4 learning contracts keep normalized evidence and soft overlays typed', () => {
  const signature: TaskSignature = {
    taskClass: 'implementation',
    stage: 'execution',
    planStatus: 'approved',
    taskComplexity: 'standard',
    risk: 'low',
    language: 'typescript',
    stackTags: ['node'],
    operationTags: ['refactor']
  };

  const candidate: LearningCandidate = {
    id: 'candidate:model:1',
    kind: 'model_preference',
    scope: 'project',
    applicability: { taskClass: 'implementation', stage: 'execution', language: 'typescript' },
    effect: { kind: 'model_preference', prefer: 'balanced', avoid: ['cheap'] },
    source: 'experience_miner',
    evidenceRefs: ['trace-1'],
    evidenceStrength: 'comparative',
    status: 'candidate',
    createdAt: '2026-08-09T00:00:00Z',
    updatedAt: '2026-08-09T00:00:00Z',
    evaluationRefs: []
  };

  const overlay: PolicyOverlay = {
    id: 'overlay:model:1',
    sourceCandidateId: candidate.id,
    scope: 'project',
    status: 'active',
    applicability: candidate.applicability,
    effect: candidate.effect,
    evidenceRefs: candidate.evidenceRefs,
    evaluationRefs: ['eval-1'],
    evidenceStrength: 'comparative',
    evaluationScore: 4,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt
  };

  assert.equal(signature.language, 'typescript');
  assert.equal(candidate.status, 'candidate');
  assert.equal(overlay.effect.kind, 'model_preference');
});

test('reference learning defaults are encoded in the type-level config shape', () => {
  const config: LearningConfig = {
    enabled: true,
    analysis: { maxCandidatesPerTask: 3, maxAnalysisTokensPerTask: 3000, maxIncrementalWorkMs: 500 },
    projectAutoActivation: {
      enabled: true,
      requireShadow: true,
      minimumEvidenceStrengthByKind: {
        model_preference: 'comparative', latency_preference: 'comparative',
        context_preference: 'observational', retry_preference: 'comparative',
        replan_preference: 'comparative', interruption_preference: 'observational'
      }
    },
    evaluation: {
      minSamples: 20, minComparableSamplesPerAlternative: 5,
      qualityNonInferiorityMargin: 0.01, minRelativeImprovement: 0.05,
      regressionWindow: 20
    },
    controlledEvals: {
      enabled: true, sandboxOnly: true, maxRunsPerCandidate: 5,
      maxTokensPerDay: 100000, maxCostPerDay: 0.50
    },
    interactionLearning: {
      authorityProposalMinApprovals: 15,
      authorityProposalMaxRejections: 0,
      rejectionSuppressionRuns: 5
    },
    maintenance: { incremental: true, fullCompileAfterNewTraces: 20 },
    retrieval: { maxRecords: 8, maxEstimatedTokens: 2500 }
  };
  assert.equal(config.controlledEvals.maxRunsPerCandidate, 5);
});
```

```ts
// packages/spec/src/__tests__/knowledge.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type { KnowledgeRecord } from '../index.js';

test('typed knowledge preserves provenance, applicability and relations', () => {
  const record: KnowledgeRecord = {
    id: 'K42',
    key: 'routing.approved-plan.typescript.execution',
    kind: 'experience',
    scope: 'project',
    status: 'active',
    statement: 'Prefer balanced for approved-plan TypeScript execution in this project.',
    applicability: { stage: 'execution', planStatus: 'approved', language: 'typescript' },
    evidenceRefs: ['trace-1'],
    evaluationRefs: ['eval-1'],
    provenance: { source: 'experience_miner', refs: ['trace-1'] },
    relations: [{ kind: 'supports', targetId: 'overlay:model:1' }],
    createdAt: '2026-08-09T00:00:00Z',
    updatedAt: '2026-08-09T00:00:00Z'
  };
  assert.equal(record.key, 'routing.approved-plan.typescript.execution');
  assert.equal(record.relations[0]?.kind, 'supports');
});
```

- [ ] **Step 2: Build spec to verify the new tests fail because the M4 types/actions do not exist**

Run:
```bash
pnpm --filter @aes/spec build
pnpm --filter @aes/spec test
```
Expected: TypeScript build fails on missing M4 type exports and missing control action names.

- [ ] **Step 3: Add the M4 learning contracts while keeping the M2/3 interfaces in the same module**

```ts
// add to packages/spec/src/learning.ts above the existing compatibility contracts
import type { LifecycleState, ModelClass } from './common.js';
import type { ControlActionType, ControlMode, PlanStatus, TaskComplexity } from './intelligence.js';

export type LearningScope = 'session' | 'project' | 'user';
export type EvidenceStrength = 'observational' | 'comparative' | 'controlled';
export type LearningCandidateStatus =
  | 'discovered' | 'candidate' | 'shadow' | 'validated'
  | 'active' | 'degraded' | 'superseded' | 'disabled' | 'rejected';

export interface TaskSignature {
  taskClass: string;
  stage?: LifecycleState;
  planStatus?: PlanStatus;
  taskComplexity?: TaskComplexity;
  risk?: 'low' | 'medium' | 'high';
  architecturalDecisionRequired?: boolean;
  language?: string;
  stackTags?: string[];
  operationTags?: string[];
}

export interface Applicability {
  taskClass?: string;
  stage?: LifecycleState;
  planStatus?: PlanStatus;
  taskComplexity?: TaskComplexity[];
  risk?: Array<'low' | 'medium' | 'high'>;
  architecturalDecisionRequired?: boolean;
  language?: string;
  stackTags?: string[];
  operationTags?: string[];
}

export interface CostMeasurement { amount: number; currency: string; }

export interface LearningEvidence {
  id: string;
  traceId: string;
  signature: TaskSignature;
  verification: 'passed' | 'failed' | 'partial' | 'not_run';
  attributable: boolean;
  origin?: 'natural' | 'replay' | 'controlled';
  modelClass?: ModelClass;
  latencyMode?: 'fast' | 'standard';
  retries: number;
  replans?: number;
  userInterruptions: number;
  providerRecoveries: number;
  fallbackKind?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCost?: CostMeasurement;
  durationMs?: number;
  qualityRegression?: boolean;
  timestamp: string;
}

export type CandidateKind =
  | 'model_preference' | 'latency_preference' | 'context_preference'
  | 'retry_preference' | 'replan_preference' | 'interruption_preference'
  | 'knowledge' | 'authority_promotion';

export interface ModelPreferenceEffect { kind: 'model_preference'; prefer: ModelClass; avoid?: ModelClass[]; }
export interface LatencyPreferenceEffect { kind: 'latency_preference'; prefer: 'fast' | 'standard'; }
export interface ContextPreferenceEffect {
  kind: 'context_preference';
  preferCompactionBeforeHandoff?: boolean;
  preferMemoryRetrieval?: boolean;
}
export interface RetryPreferenceEffect { kind: 'retry_preference'; maxRepeatedFingerprintRetries: number; }
export interface ReplanPreferenceEffect { kind: 'replan_preference'; afterRepeatedFailureFingerprint: boolean; prefer: 'retry' | 'replan'; }
export interface InterruptionPreferenceEffect {
  kind: 'interruption_preference';
  suppressRoutinePrompt?: boolean;
  schedule?: 'boundary' | 'digest';
}
export type OverlayEffect =
  | ModelPreferenceEffect | LatencyPreferenceEffect | ContextPreferenceEffect
  | RetryPreferenceEffect | ReplanPreferenceEffect | InterruptionPreferenceEffect;

export interface LearningCandidate {
  id: string;
  kind: CandidateKind;
  scope: LearningScope;
  applicability: Applicability;
  effect?: OverlayEffect;
  statement?: string;
  source: 'experience_miner' | 'llm_pattern_analyst';
  evidenceRefs: string[];
  evidenceStrength: EvidenceStrength;
  status: LearningCandidateStatus;
  createdAt: string;
  updatedAt: string;
  evaluationRefs: string[];
  supersedes?: string[];
}

export interface EvaluationDimension {
  passed: boolean;
  value?: number;
  threshold?: number;
  coverage?: number;
  reason: string;
}

export interface LearningEvaluation {
  id: string;
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

export interface OverlayBaseline {
  verifiedRate: number;
  retryRate: number;
  interruptionRate: number;
  averageCost?: CostMeasurement;
}

export interface PolicyOverlay {
  id: string;
  sourceCandidateId: string;
  scope: 'project' | 'user';
  status: Exclude<LearningCandidateStatus, 'discovered' | 'candidate' | 'rejected'>;
  applicability: Applicability;
  effect: OverlayEffect;
  evidenceRefs: string[];
  evaluationRefs: string[];
  evidenceStrength: EvidenceStrength;
  evaluationScore: number;
  baseline?: OverlayBaseline;
  createdAt: string;
  updatedAt: string;
  supersedes?: string[];
}

export interface ShadowDecisionTrace<TDecision = unknown> {
  candidateId: string;
  baselineDecision: TDecision;
  shadowDecision: TDecision;
  comparable: boolean;
  observedOutcome?: unknown;
  timestamp: string;
}

export type InterruptionUrgency = 'immediate' | 'boundary' | 'digest';

export interface InteractionEvidence {
  id: string;
  actionType: ControlActionType;
  applicability: Applicability;
  currentMode: ControlMode;
  proposedMode?: ControlMode;
  userDecision: 'approved' | 'rejected' | 'modified' | 'not_asked';
  urgency: InterruptionUrgency;
  verifiedOutcome?: 'passed' | 'failed' | 'partial';
  timestamp: string;
}

export interface AuthorityCandidate {
  id: string;
  actionType: ControlActionType;
  scope: 'project' | 'user';
  applicability: Applicability;
  currentMode: ControlMode;
  proposedMode: 'autonomous';
  approvalCount: number;
  rejectionCount: number;
  verifiedSuccessCount: number;
  evidenceRefs: string[];
  createdAt: string;
}

export interface ScopedAuthorityGrant {
  id: string;
  actionType: ControlActionType;
  scope: 'project' | 'user';
  applicability: Applicability;
  mode: ControlMode;
  grantedAt: string;
  updatedAt: string;
  sourceCandidateId: string;
}

export interface LearningConfig {
  enabled: boolean;
  analysis: { maxCandidatesPerTask: number; maxAnalysisTokensPerTask: number; maxIncrementalWorkMs: number };
  projectAutoActivation: {
    enabled: boolean;
    requireShadow: boolean;
    minimumEvidenceStrengthByKind: Partial<Record<CandidateKind, EvidenceStrength>>;
  };
  evaluation: {
    minSamples: number;
    minComparableSamplesPerAlternative: number;
    qualityNonInferiorityMargin: number;
    minRelativeImprovement: number;
    regressionWindow: number;
  };
  controlledEvals: {
    enabled: boolean;
    sandboxOnly: boolean;
    maxRunsPerCandidate: number;
    maxTokensPerDay: number;
    maxCostPerDay: number;
  };
  interactionLearning: {
    authorityProposalMinApprovals: number;
    authorityProposalMaxRejections: number;
    rejectionSuppressionRuns: number;
  };
  maintenance: { incremental: boolean; fullCompileAfterNewTraces: number };
  retrieval: { maxRecords: number; maxEstimatedTokens: number };
}
```

- [ ] **Step 4: Add typed knowledge contracts with deterministic machine keying**

```ts
// packages/spec/src/knowledge.ts
import type { Applicability, LearningScope } from './learning.js';

export type KnowledgeKind = 'fact' | 'decision' | 'experience' | 'preference';
export type KnowledgeStatus = 'candidate' | 'shadow' | 'active' | 'degraded' | 'superseded' | 'disabled';
export type KnowledgeRelationKind = 'depends_on' | 'supports' | 'contradicts' | 'supersedes' | 'derived_from' | 'applies_to';
export type KnowledgeSource = 'user' | 'project_source' | 'decision_trace' | 'experience_miner' | 'llm_pattern_analyst' | 'controlled_eval' | 'compiler';

export interface KnowledgeRelation { kind: KnowledgeRelationKind; targetId: string; }
export interface KnowledgeProvenance { source: KnowledgeSource; refs: string[]; }

export interface KnowledgeRecord {
  id: string;
  key: string;
  kind: KnowledgeKind;
  scope: LearningScope;
  status: KnowledgeStatus;
  statement: string;
  applicability?: Applicability;
  evidenceRefs: string[];
  evaluationRefs: string[];
  confidence?: 'low' | 'medium' | 'high';
  provenance: KnowledgeProvenance;
  relations: KnowledgeRelation[];
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  supersededBy?: string;
}

export interface KnowledgeQuery {
  text: string;
  scope: LearningScope;
  signature?: import('./learning.js').TaskSignature;
  kinds?: KnowledgeKind[];
  statuses?: KnowledgeStatus[];
  maxRecords: number;
  maxEstimatedTokens: number;
}

export interface KnowledgePacketEntry {
  id: string;
  path: string;
  statement: string;
  score: number;
  estimatedTokens: number;
  reasons: string[];
  record: KnowledgeRecord;
}

export interface KnowledgePacket {
  entries: KnowledgePacketEntry[];
  estimatedTokens: number;
  truncated: boolean;
}

export interface KnowledgeRetentionPolicy {
  rawTracesDays: number;
  failedTracesDays: number;
  promotedEvidence: 'keep';
}

export interface KnowledgeHealthBudget {
  maxActiveRecords: number;
  maxRecordTokens: number;
  maxIndexTokens: number;
}
```

- [ ] **Step 5: Extend control actions and exports**

```ts
// packages/spec/src/intelligence.ts
export const CONTROL_ACTION_TYPES = [
  'modelRouting',
  'fastMode',
  'toolExecution',
  'contextCompaction',
  'handoffCreation',
  'memoryPromotion',
  'conversationTransition',
  'modelQualityDegradation',
  'resourceBudgetOverride',
  'controlledEvaluation',
  'controlledEvaluationBudgetOverride'
] as const;
```

```ts
// packages/spec/src/index.ts
export * from './learning.js';
export * from './knowledge.js';
```

- [ ] **Step 6: Build and run spec tests**

Run:
```bash
pnpm --filter @aes/spec build
pnpm --filter @aes/spec test
```
Expected: PASS; old `KnowledgeMetadata`/`DecisionTrace` test and new M4 tests both compile.

- [ ] **Step 7: Commit the contract slice**

```bash
git add packages/spec
git commit -m "feat(spec): add adaptive learning and knowledge contracts"
```

---

### Task 2: Add provider-neutral learning SDK contracts and richer runtime evidence normalization

**Files:**
- Create: `packages/runtime-sdk/src/learning.ts`
- Modify: `packages/runtime-sdk/src/storage.ts`
- Modify: `packages/runtime-sdk/src/observability.ts`
- Modify: `packages/runtime-sdk/src/index.ts`
- Create: `packages/runtime-sdk/src/__tests__/learning-contracts.test.ts`
- Create: `packages/kernel/src/task-signature.ts`
- Create: `packages/kernel/src/__tests__/task-signature.test.ts`
- Modify: `packages/kernel/src/index.ts`
- Modify: `packages/runtime/package.json`
- Modify: `packages/runtime/src/experience-adapter.ts`
- Modify: `packages/runtime/src/__tests__/experience-adapter.test.ts`

**Interfaces:**
- Consumes: `LearningEvidence`, `TaskSignature`, `LearningCandidate`, `LearningEvaluation`, `PolicyOverlay`, `KnowledgeRecord`, `RuntimeDecisionTrace`.
- Produces: `normalizeTaskSignature()`, `matchesApplicability()`, `applicabilityKey()`, `toLearningEvidence()`, `PatternAnalyzer`, `ControlledEvaluationExecutor`, `LearningArtifactStore`, `TypedKnowledgeStore`.
- Compatibility: preserve `toExperienceEvidence()` and existing `KnowledgeStore<T>`.

- [ ] **Step 1: Write failing normalization and SDK-contract tests**

```ts
// packages/kernel/src/__tests__/task-signature.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesApplicability, normalizeTaskSignature } from '../task-signature.js';

test('task signature normalization lowercases bounded tags and removes duplicates', () => {
  const result = normalizeTaskSignature({
    taskClass: ' Implementation ', stage: 'execution', planStatus: 'approved',
    language: 'TypeScript', stackTags: [' Node ', 'node', 'PNPM'], operationTags: ['Refactor']
  });
  assert.deepEqual(result, {
    taskClass: 'implementation', stage: 'execution', planStatus: 'approved',
    language: 'typescript', stackTags: ['node', 'pnpm'], operationTags: ['refactor']
  });
});

test('applicability is a partial match and requires every requested tag', () => {
  const signature = normalizeTaskSignature({
    taskClass: 'implementation', stage: 'execution', language: 'typescript',
    stackTags: ['node', 'pnpm']
  });
  assert.equal(matchesApplicability(signature, { stage: 'execution', stackTags: ['node'] }), true);
  assert.equal(matchesApplicability(signature, { stage: 'planning' }), false);
});
```

```ts
// add to packages/runtime/src/__tests__/experience-adapter.test.ts
import { toLearningEvidence } from '../experience-adapter.js';

test('runtime trace becomes normalized learning evidence without inventing missing telemetry', () => {
  const evidence = toLearningEvidence(trace, {
    taskClass: 'Implementation', stage: 'execution', planStatus: 'approved', language: 'TypeScript'
  });
  assert.equal(evidence.signature.language, 'typescript');
  assert.equal(evidence.modelClass, trace.resolution.selected.traits.qualityClass);
  assert.equal(evidence.totalTokens,
    trace.telemetry.inputTokens !== undefined && trace.telemetry.outputTokens !== undefined
      ? trace.telemetry.inputTokens + trace.telemetry.outputTokens
      : undefined);
  assert.equal(evidence.qualityRegression, undefined);
});
```

- [ ] **Step 2: Run targeted builds/tests and confirm failures**

Run:
```bash
pnpm --filter @aes/runtime-sdk build
pnpm --filter @aes/kernel build
pnpm --filter @aes/runtime build
```
Expected: FAIL on missing SDK types/functions and `task-signature.ts`.

- [ ] **Step 3: Implement deterministic signature normalization and applicability matching**

```ts
// packages/kernel/src/task-signature.ts
import type { Applicability, TaskSignature } from '@aes/spec';

const MAX_TAGS = 16;
const MAX_TAG_LENGTH = 64;

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}
function normalizeTags(values: readonly string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  const normalized = [...new Set(values.map(normalizeText).filter(Boolean).map((v) => v.slice(0, MAX_TAG_LENGTH)))]
    .sort()
    .slice(0, MAX_TAGS);
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeTaskSignature(input: TaskSignature): TaskSignature {
  return {
    taskClass: normalizeText(input.taskClass),
    ...(input.stage ? { stage: input.stage } : {}),
    ...(input.planStatus ? { planStatus: input.planStatus } : {}),
    ...(input.taskComplexity ? { taskComplexity: input.taskComplexity } : {}),
    ...(input.risk ? { risk: input.risk } : {}),
    ...(input.architecturalDecisionRequired !== undefined
      ? { architecturalDecisionRequired: input.architecturalDecisionRequired } : {}),
    ...(input.language ? { language: normalizeText(input.language) } : {}),
    ...(normalizeTags(input.stackTags) ? { stackTags: normalizeTags(input.stackTags) } : {}),
    ...(normalizeTags(input.operationTags) ? { operationTags: normalizeTags(input.operationTags) } : {})
  };
}

function includesAll(actual: readonly string[] | undefined, expected: readonly string[] | undefined): boolean {
  return !expected || expected.every((value) => actual?.includes(value));
}

export function matchesApplicability(signature: TaskSignature, applicability: Applicability): boolean {
  if (applicability.taskClass && signature.taskClass !== normalizeText(applicability.taskClass)) return false;
  if (applicability.stage && signature.stage !== applicability.stage) return false;
  if (applicability.planStatus && signature.planStatus !== applicability.planStatus) return false;
  if (applicability.taskComplexity && !applicability.taskComplexity.includes(signature.taskComplexity!)) return false;
  if (applicability.risk && !applicability.risk.includes(signature.risk!)) return false;
  if (applicability.architecturalDecisionRequired !== undefined &&
      signature.architecturalDecisionRequired !== applicability.architecturalDecisionRequired) return false;
  if (applicability.language && signature.language !== normalizeText(applicability.language)) return false;
  if (!includesAll(signature.stackTags, normalizeTags(applicability.stackTags))) return false;
  if (!includesAll(signature.operationTags, normalizeTags(applicability.operationTags))) return false;
  return true;
}


export function applicabilityKey(input: Applicability): string {
  return JSON.stringify({
    ...(input.taskClass ? { taskClass: normalizeText(input.taskClass) } : {}),
    ...(input.stage ? { stage: input.stage } : {}),
    ...(input.planStatus ? { planStatus: input.planStatus } : {}),
    ...(input.taskComplexity ? { taskComplexity: [...input.taskComplexity].sort() } : {}),
    ...(input.risk ? { risk: [...input.risk].sort() } : {}),
    ...(input.architecturalDecisionRequired !== undefined ? { architecturalDecisionRequired: input.architecturalDecisionRequired } : {}),
    ...(input.language ? { language: normalizeText(input.language) } : {}),
    ...(normalizeTags(input.stackTags) ? { stackTags: normalizeTags(input.stackTags) } : {}),
    ...(normalizeTags(input.operationTags) ? { operationTags: normalizeTags(input.operationTags) } : {})
  });
}
```

- [ ] **Step 4: Add provider-neutral learning boundaries**

```ts
// packages/runtime-sdk/src/learning.ts
import type {
  AuthorityCandidate, InteractionEvidence, LearningCandidate, LearningEvaluation, LearningEvidence,
  PolicyOverlay, ScopedAuthorityGrant, ShadowDecisionTrace, TaskSignature
} from '@aes/spec';

export interface PatternHypothesis {
  id: string;
  kind: LearningCandidate['kind'];
  applicability: LearningCandidate['applicability'];
  proposedEffect?: LearningCandidate['effect'];
  statement?: string;
  evidenceQuery: { signature: TaskSignature; minimumRefs: number };
}

export interface PatternAnalyzer {
  analyze(input: {
    evidence: readonly LearningEvidence[];
    maxCandidates: number;
  }): Promise<readonly PatternHypothesis[]>;
}

export interface ControlledEvaluationFixture {
  id: string;
  candidateId: string;
  signature: TaskSignature;
  sandboxPath: string;
  sideEffectRisk: 'none' | 'reversible' | 'material';
}

export interface ControlledEvaluationResult {
  candidateId: string;
  fixtureId: string;
  evidence: LearningEvidence;
}

export interface ControlledEvaluationExecutor {
  evaluate(fixture: ControlledEvaluationFixture): Promise<ControlledEvaluationResult>;
}

export interface ReplayEvaluationExecutor {
  replay(input: { candidateId: string; evidenceRefs: string[] }): Promise<readonly LearningEvidence[]>;
}

export interface LearningArtifactStore {
  putCandidate(candidate: LearningCandidate): Promise<void>;
  putEvaluation(evaluation: LearningEvaluation): Promise<void>;
  putOverlay(overlay: PolicyOverlay): Promise<void>;
  putShadowDecision(trace: ShadowDecisionTrace): Promise<void>;
  appendInteraction(evidence: InteractionEvidence): Promise<void>;
  putAuthorityCandidate(candidate: AuthorityCandidate): Promise<void>;
  putAuthorityGrant(grant: ScopedAuthorityGrant): Promise<void>;
  listCandidates(): Promise<LearningCandidate[]>;
  listOverlays(): Promise<PolicyOverlay[]>;
  listInteractions(): Promise<InteractionEvidence[]>;
  listAuthorityCandidates(): Promise<AuthorityCandidate[]>;
  listAuthorityGrants(): Promise<ScopedAuthorityGrant[]>;
}

export interface RuntimeLearningObserver {
  observe(trace: import('./telemetry.js').RuntimeDecisionTrace): Promise<void>;
}
```

```ts
// append to packages/runtime-sdk/src/storage.ts
import type { KnowledgePacket, KnowledgeQuery, KnowledgeRecord } from '@aes/spec';

export interface TypedKnowledgeStore {
  initialize(): Promise<void>;
  putRecord(record: KnowledgeRecord): Promise<void>;
  getRecord(id: string): Promise<KnowledgeRecord | undefined>;
  listRecords(): Promise<KnowledgeRecord[]>;
  queryKnowledge(query: KnowledgeQuery): Promise<KnowledgePacket>;
  rebuildIndexes(): Promise<void>;
  appendLog(message: string): Promise<void>;
}
```

- [ ] **Step 5: Extend observations with metadata-only learning lifecycle events**

```ts
// packages/runtime-sdk/src/observability.ts — add union members
  | { type: 'learning.evidence.accepted'; evidenceId: string; scope: string }
  | { type: 'learning.candidate.created'; candidateId: string; kind: string; scope: string }
  | { type: 'learning.candidate.shadowed'; candidateId: string }
  | { type: 'learning.evaluation.completed'; candidateId: string; outcome: string }
  | { type: 'learning.overlay.activated'; overlayId: string; scope: string }
  | { type: 'learning.overlay.degraded'; overlayId: string; reason: string }
  | { type: 'learning.overlay.disabled'; overlayId: string; reason: string }
  | { type: 'learning.overlay.superseded'; overlayId: string; replacementId: string }
  | { type: 'knowledge.record.created'; recordId: string; scope: string }
  | { type: 'knowledge.record.merged'; recordId: string; mergedEvidenceCount: number }
  | { type: 'knowledge.conflict.detected'; recordIds: string[] }
  | { type: 'knowledge.index.rebuilt'; recordCount: number }
  | { type: 'interaction.authority_candidate.created'; candidateId: string; actionType: string }
  | { type: 'authority.degraded'; actionType: string; scope: string }
  | { type: 'controlled_eval.requested'; candidateId: string; fixtureId: string }
  | { type: 'controlled_eval.completed'; candidateId: string; fixtureId: string; outcome: 'completed'; evidenceId: string };
```

- [ ] **Step 6: Implement `toLearningEvidence()` while preserving the old adapter**

```ts
// packages/runtime/src/experience-adapter.ts
import type { LearningEvidence, TaskSignature } from '@aes/spec';
import { normalizeTaskSignature } from '@aes/kernel';

export function toLearningEvidence(trace: RuntimeDecisionTrace, signature: TaskSignature): LearningEvidence {
  const normalized = normalizeTaskSignature(signature);
  const attributable =
    trace.telemetry.verification !== 'not_run' &&
    trace.telemetry.outcome !== 'cancelled' &&
    trace.failure?.attributableToModelQuality !== false;
  const totalTokens = trace.telemetry.inputTokens !== undefined && trace.telemetry.outputTokens !== undefined
    ? trace.telemetry.inputTokens + trace.telemetry.outputTokens
    : undefined;
  return {
    id: `learning:${trace.traceId}`,
    traceId: trace.traceId,
    signature: normalized,
    verification: trace.telemetry.verification,
    attributable,
    origin: 'natural',
    modelClass: trace.resolution.selected.traits.qualityClass,
    latencyMode: trace.resolution.selected.traits.latencyClass === 'fast' ? 'fast' : 'standard',
    retries: trace.telemetry.retries,
    userInterruptions: trace.userInterruptions,
    providerRecoveries: trace.providerRecoveries,
    ...(trace.resolution.fallback.type !== 'none' ? { fallbackKind: trace.resolution.fallback.type } : {}),
    ...(trace.telemetry.inputTokens !== undefined ? { inputTokens: trace.telemetry.inputTokens } : {}),
    ...(trace.telemetry.outputTokens !== undefined ? { outputTokens: trace.telemetry.outputTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
    ...(trace.telemetry.estimatedCost
      ? { estimatedCost: { amount: trace.telemetry.estimatedCost.amount, currency: trace.telemetry.estimatedCost.currency } }
      : {}),
    ...(trace.telemetry.durationMs !== undefined ? { durationMs: trace.telemetry.durationMs } : {}),
    timestamp: trace.timestamp
  };
}
```

- [ ] **Step 7: Add the kernel workspace dependency required by runtime learning orchestration**

```json
// packages/runtime/package.json — dependencies
{
  "dependencies": {
    "@aes/kernel": "workspace:*",
    "@aes/runtime-sdk": "workspace:*",
    "@aes/spec": "workspace:*"
  }
}
```

- [ ] **Step 8: Export SDK/kernel functions and run targeted tests**

Run:
```bash
pnpm --filter @aes/spec build
pnpm --filter @aes/runtime-sdk build
pnpm --filter @aes/kernel build
pnpm --filter @aes/runtime build
pnpm --filter @aes/runtime-sdk test
pnpm --filter @aes/kernel test
pnpm --filter @aes/runtime test
```
Expected: PASS; old runtime-experience test still passes and new normalized-evidence test passes.

- [ ] **Step 9: Commit the normalized evidence boundary**

```bash
git add packages/runtime-sdk packages/kernel packages/runtime
git commit -m "feat(learning): normalize provider-neutral runtime evidence"
```

---

### Task 3: Build deterministic experience metrics and candidate mining

**Files:**
- Create: `packages/kernel/src/experience-metrics.ts`
- Create: `packages/kernel/src/experience-miner.ts`
- Create: `packages/kernel/src/__tests__/experience-miner.test.ts`
- Modify: `packages/kernel/src/experience-engine.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: `LearningEvidence`, normalized `Applicability`, `EvidenceStrength`.
- Produces: `ExperienceMetrics`, `ChoiceAggregate`, `ExperienceMiner.aggregate()`, `ExperienceMiner.mineModelPreference()`.
- Compatibility: existing `ExperienceEngine.aggregate()` and `aggregateRuntimeEvidence()` retain behavior/signatures.

- [ ] **Step 1: Write failing tests for attribution, coverage, applicability separation, and deterministic recommendation changes**

```ts
// packages/kernel/src/__tests__/experience-miner.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type { LearningEvidence } from '@aes/spec';
import { ExperienceMiner } from '../experience-miner.js';

function evidence(id: string, modelClass: 'cheap'|'balanced', verification: 'passed'|'failed', overrides: Partial<LearningEvidence> = {}): LearningEvidence {
  return {
    id, traceId: id,
    signature: { taskClass: 'implementation', stage: 'execution', planStatus: 'approved', language: 'typescript' },
    verification, attributable: true, modelClass, latencyMode: 'fast', retries: 0,
    userInterruptions: 0, providerRecoveries: 0, timestamp: '2026-08-09T00:00:00Z',
    ...overrides
  };
}

test('miner excludes non-attributable model failures and preserves missing cost coverage', () => {
  const miner = new ExperienceMiner();
  const result = miner.aggregate([
    evidence('b1', 'balanced', 'passed', { estimatedCost: { amount: 0.1, currency: 'USD' } }),
    evidence('b2', 'balanced', 'failed', { attributable: false }),
    evidence('b3', 'balanced', 'passed')
  ]);
  assert.equal(result.sampleCount, 2);
  assert.equal(result.verifiedSuccessRate, 1);
  assert.equal(result.coverage.estimatedCost, 0.5);
});

test('comparative evidence can create a model preference candidate', () => {
  const rows = [
    ...Array.from({ length: 10 }, (_, i) => evidence(`b${i}`, 'balanced', i === 9 ? 'failed' : 'passed')),
    ...Array.from({ length: 10 }, (_, i) => evidence(`c${i}`, 'cheap', i < 6 ? 'passed' : 'failed'))
  ];
  const candidates = new ExperienceMiner().mineModelPreference(rows, 'project', '2026-08-09T00:00:00Z');
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.effect?.kind, 'model_preference');
  assert.equal(candidates[0]?.effect?.kind === 'model_preference' && candidates[0].effect.prefer, 'balanced');
  assert.equal(candidates[0]?.evidenceStrength, 'comparative');
});

test('miner never merges different applicability scopes into one candidate', () => {
  const rows = [
    ...Array.from({ length: 10 }, (_, i) => evidence(`exec-b${i}`, 'balanced', 'passed')),
    ...Array.from({ length: 10 }, (_, i) => evidence(`exec-c${i}`, 'cheap', i < 7 ? 'passed' : 'failed')),
    ...Array.from({ length: 10 }, (_, i) => evidence(`plan-b${i}`, 'balanced', i < 6 ? 'passed' : 'failed', { signature: { taskClass: 'implementation', stage: 'planning', language: 'typescript' } })),
    ...Array.from({ length: 10 }, (_, i) => evidence(`plan-c${i}`, 'cheap', 'passed', { signature: { taskClass: 'implementation', stage: 'planning', language: 'typescript' } }))
  ];
  const candidates = new ExperienceMiner().mineModelPreference(rows, 'project', '2026-08-09T00:00:00Z');
  assert.equal(candidates.length, 2);
  const execution = candidates.find((c) => c.applicability.stage === 'execution')!;
  const planning = candidates.find((c) => c.applicability.stage === 'planning')!;
  assert.equal(execution.effect?.kind, 'model_preference');
  assert.equal(planning.effect?.kind, 'model_preference');
  assert.notEqual(execution.effect?.kind === 'model_preference' && execution.effect.prefer,
    planning.effect?.kind === 'model_preference' && planning.effect.prefer);
});
```

- [ ] **Step 2: Run kernel build/test and verify failure**

Run:
```bash
pnpm --filter @aes/kernel build
```
Expected: FAIL because `ExperienceMiner` and metrics types do not exist.

- [ ] **Step 3: Implement deterministic metric aggregation with explicit coverage**

```ts
// packages/kernel/src/experience-metrics.ts
import type { CostMeasurement, LearningEvidence } from '@aes/spec';

export interface MetricCoverage {
  totalTokens: number;
  estimatedCost: number;
  durationMs: number;
}
export interface ExperienceMetrics {
  sampleCount: number;
  verifiedSuccessCount: number;
  verifiedSuccessRate: number;
  partialVerificationRate: number;
  firstPassSuccessRate: number;
  retryRate: number;
  replanRate: number;
  interruptionRate: number;
  providerRecoveryRate: number;
  fallbackRate: number;
  qualityRegressionRate: number;
  averageTotalTokens?: number;
  averageEstimatedCost?: CostMeasurement;
  averageDurationMs?: number;
  coverage: MetricCoverage;
  evidenceRefs: string[];
}

function avg(values: number[]): number | undefined {
  return values.length === 0 ? undefined : values.reduce((a, b) => a + b, 0) / values.length;
}

export function aggregateExperience(input: readonly LearningEvidence[]): ExperienceMetrics {
  const rows = input.filter((row) => row.attributable);
  if (rows.length === 0) throw new Error('AES experience mining requires attributable evidence');
  const costs = rows.filter((r) => r.estimatedCost).map((r) => r.estimatedCost!);
  const currencies = new Set(costs.map((c) => c.currency));
  const costAverage = currencies.size === 1 ? avg(costs.map((c) => c.amount)) : undefined;
  const totals = rows.flatMap((r) => r.totalTokens === undefined ? [] : [r.totalTokens]);
  const durations = rows.flatMap((r) => r.durationMs === undefined ? [] : [r.durationMs]);
  const passed = rows.filter((r) => r.verification === 'passed').length;
  return {
    sampleCount: rows.length,
    verifiedSuccessCount: passed,
    verifiedSuccessRate: passed / rows.length,
    partialVerificationRate: rows.filter((r) => r.verification === 'partial').length / rows.length,
    firstPassSuccessRate: rows.filter((r) => r.verification === 'passed' && r.retries === 0).length / rows.length,
    retryRate: rows.reduce((sum, r) => sum + r.retries, 0) / rows.length,
    replanRate: rows.reduce((sum, r) => sum + (r.replans ?? 0), 0) / rows.length,
    interruptionRate: rows.reduce((sum, r) => sum + r.userInterruptions, 0) / rows.length,
    providerRecoveryRate: rows.reduce((sum, r) => sum + r.providerRecoveries, 0) / rows.length,
    fallbackRate: rows.filter((r) => r.fallbackKind).length / rows.length,
    qualityRegressionRate: rows.filter((r) => r.qualityRegression === true).length / rows.length,
    ...(avg(totals) !== undefined ? { averageTotalTokens: avg(totals) } : {}),
    ...(costAverage !== undefined ? { averageEstimatedCost: { amount: costAverage, currency: costs[0]!.currency } } : {}),
    ...(avg(durations) !== undefined ? { averageDurationMs: avg(durations) } : {}),
    coverage: {
      totalTokens: totals.length / rows.length,
      estimatedCost: costs.length / rows.length,
      durationMs: durations.length / rows.length
    },
    evidenceRefs: rows.map((r) => r.id).sort()
  };
}
```

- [ ] **Step 4: Implement deterministic model-preference candidate mining**

```ts
// packages/kernel/src/experience-miner.ts
import type { LearningCandidate, LearningEvidence, LearningScope, ModelClass } from '@aes/spec';
import { aggregateExperience, type ExperienceMetrics } from './experience-metrics.js';

export interface ChoiceAggregate { choice: ModelClass; metrics: ExperienceMetrics; }

export class ExperienceMiner {
  aggregate(evidence: readonly LearningEvidence[]): ExperienceMetrics {
    return aggregateExperience(evidence);
  }

  aggregateModelChoices(evidence: readonly LearningEvidence[]): ChoiceAggregate[] {
    const byChoice = new Map<ModelClass, LearningEvidence[]>();
    for (const row of evidence.filter((r) => r.attributable && r.modelClass)) {
      byChoice.set(row.modelClass!, [...(byChoice.get(row.modelClass!) ?? []), row]);
    }
    return [...byChoice.entries()].map(([choice, rows]) => ({ choice, metrics: aggregateExperience(rows) }))
      .sort((a, b) => a.choice.localeCompare(b.choice));
  }

  stablePreferenceWindows(evidence: readonly LearningEvidence[], preferred: ModelClass): number {
    const rows = [...evidence].filter((r) => r.attributable && r.modelClass).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
    if (rows.length < 10) return 0;
    const midpoint = Math.floor(rows.length / 2);
    return [rows.slice(0, midpoint), rows.slice(midpoint)].filter((window) => {
      const ranked = this.aggregateModelChoices(window).sort((a,b) => b.metrics.verifiedSuccessRate - a.metrics.verifiedSuccessRate || a.metrics.retryRate - b.metrics.retryRate);
      return ranked[0]?.choice === preferred;
    }).length;
  }

  mineModelPreference(evidence: readonly LearningEvidence[], scope: LearningScope, now: string): LearningCandidate[] {
    const attributable = evidence.filter((row) => row.attributable && row.modelClass);
    const buckets = new Map<string, LearningEvidence[]>();
    for (const row of attributable) {
      const applicability = {
        taskClass: row.signature.taskClass,
        ...(row.signature.stage ? { stage: row.signature.stage } : {}),
        ...(row.signature.planStatus ? { planStatus: row.signature.planStatus } : {}),
        ...(row.signature.language ? { language: row.signature.language } : {})
      };
      const key = JSON.stringify(applicability);
      buckets.set(key, [...(buckets.get(key) ?? []), row]);
    }

    const candidates: LearningCandidate[] = [];
    for (const [applicabilityKey, rows] of [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const byChoice = new Map<ModelClass, LearningEvidence[]>();
      for (const row of rows) byChoice.set(row.modelClass!, [...(byChoice.get(row.modelClass!) ?? []), row]);
      if (byChoice.size < 2) continue;
      const aggregates = [...byChoice.entries()].map(([choice, choiceRows]) => ({ choice, metrics: aggregateExperience(choiceRows) }));
      aggregates.sort((a, b) =>
        b.metrics.verifiedSuccessRate - a.metrics.verifiedSuccessRate ||
        a.metrics.retryRate - b.metrics.retryRate ||
        a.choice.localeCompare(b.choice));
      const best = aggregates[0]!;
      const controlledAcrossAlternatives = [...byChoice.values()].every((choiceRows) =>
        choiceRows.some((row) => row.origin === 'controlled'));
      const evidenceStrength = controlledAcrossAlternatives ? 'controlled' as const : 'comparative' as const;
      const applicability = JSON.parse(applicabilityKey) as LearningCandidate['applicability'];
      candidates.push({
        id: `candidate:model:${applicabilityKey.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}:${best.choice}`,
        kind: 'model_preference', scope, applicability,
        effect: { kind: 'model_preference', prefer: best.choice, avoid: aggregates.slice(1).map((a) => a.choice) },
        source: 'experience_miner',
        evidenceRefs: aggregates.flatMap((a) => a.metrics.evidenceRefs).sort(),
        evidenceStrength, status: 'candidate', createdAt: now, updatedAt: now,
        evaluationRefs: []
      });
    }
    return candidates;
  }
}
```

- [ ] **Step 5: Keep the old `ExperienceEngine` untouched except for delegating reusable aggregation if useful**

Do not change its public signatures. If code is shared, call the new pure helpers internally; preserve the existing exact error messages tested by M2/M3 callers.

- [ ] **Step 6: Run kernel tests**

Run:
```bash
pnpm --filter @aes/kernel build
pnpm --filter @aes/kernel test
```
Expected: PASS including old `experience-engine` and `experience-runtime-evidence` suites plus new miner tests.

- [ ] **Step 7: Commit**

```bash
git add packages/kernel
git commit -m "feat(learning): mine deterministic experience candidates"
```

---

### Task 4: Replace opaque promotion with a quality-first multi-dimensional Evaluation Engine

**Files:**
- Create: `packages/kernel/src/evaluation-engine.ts`
- Create: `packages/kernel/src/__tests__/evaluation-engine.test.ts`
- Modify: `packages/kernel/src/evaluation-gate.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: `LearningCandidate`, `EvidenceStrength`, `ExperienceMetrics`, reference evaluation defaults.
- Produces: `LearningEvaluationEngine.evaluate(input): LearningEvaluation`.
- Compatibility: `EvaluationGate.evaluate()` keeps returning old `EvaluationDecision`; no caller migration is forced in this task.

- [ ] **Step 1: Write failing tests for evidence volume, quality non-inferiority, efficiency, missing telemetry, and evidence strength**

```ts
// packages/kernel/src/__tests__/evaluation-engine.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { LearningEvaluationEngine } from '../evaluation-engine.js';

const engine = new LearningEvaluationEngine({
  minSamples: 20,
  minComparableSamplesPerAlternative: 5,
  qualityNonInferiorityMargin: 0.01,
  minRelativeImprovement: 0.05,
  regressionWindow: 20
});

const candidate = {
  id: 'candidate:model:1', kind: 'model_preference', scope: 'project',
  applicability: { stage: 'execution' },
  effect: { kind: 'model_preference', prefer: 'balanced' },
  source: 'experience_miner', evidenceRefs: ['e1'], evidenceStrength: 'comparative',
  status: 'shadow', createdAt: '2026-08-09T00:00:00Z', updatedAt: '2026-08-09T00:00:00Z', evaluationRefs: []
} as const;

test('comparative evidence with preserved quality and lower retry cost validates', () => {
  const result = engine.evaluate({
    candidate,
    candidateMetrics: { sampleCount: 20, verifiedSuccessRate: .96, retryRate: .10, interruptionRate: .10, coverage: { totalTokens: 0, estimatedCost: 0, durationMs: 0 } },
    baselineMetrics: { sampleCount: 20, verifiedSuccessRate: .96, retryRate: .20, interruptionRate: .10, coverage: { totalTokens: 0, estimatedCost: 0, durationMs: 0 } },
    stableWindows: 2,
    evaluatedAt: '2026-08-09T00:00:00Z'
  });
  assert.equal(result.outcome, 'validate');
  assert.equal(result.quality.passed, true);
  assert.equal(result.efficiency.passed, true);
});

test('observational model candidate cannot validate a counterfactual even when aggregate metrics are present', () => {
  const result = engine.evaluate({
    candidate: { ...candidate, evidenceStrength: 'observational' },
    candidateMetrics: { sampleCount: 20, verifiedSuccessRate: .98, retryRate: .05, interruptionRate: .05, coverage: { totalTokens: 0, estimatedCost: 0, durationMs: 0 } },
    baselineMetrics: { sampleCount: 20, verifiedSuccessRate: .96, retryRate: .20, interruptionRate: .20, coverage: { totalTokens: 0, estimatedCost: 0, durationMs: 0 } },
    stableWindows: 2,
    evaluatedAt: '2026-08-09T00:00:00Z'
  });
  assert.equal(result.outcome, 'keep_candidate');
  assert.equal(result.evidenceVolume.passed, false);
});

test('large savings cannot validate unacceptable quality regression', () => {
  const result = engine.evaluate({
    candidate,
    candidateMetrics: { sampleCount: 20, verifiedSuccessRate: .82, retryRate: .01, interruptionRate: .01, averageTotalTokens: 100, coverage: { totalTokens: 1, estimatedCost: 0, durationMs: 0 } },
    baselineMetrics: { sampleCount: 20, verifiedSuccessRate: .96, retryRate: .20, interruptionRate: .20, averageTotalTokens: 1000, coverage: { totalTokens: 1, estimatedCost: 0, durationMs: 0 } },
    stableWindows: 2,
    evaluatedAt: '2026-08-09T00:00:00Z'
  });
  assert.equal(result.outcome, 'reject');
  assert.equal(result.quality.passed, false);
});
```

- [ ] **Step 2: Run the targeted build and confirm failure**

Run:
```bash
pnpm --filter @aes/kernel build
```
Expected: FAIL because `LearningEvaluationEngine` does not exist.

- [ ] **Step 3: Implement explicit evaluation dimensions and no magic confidence score**

```ts
// packages/kernel/src/evaluation-engine.ts
import type { LearningCandidate, LearningEvaluation } from '@aes/spec';

export interface ComparableMetrics {
  sampleCount: number;
  verifiedSuccessRate: number;
  retryRate: number;
  interruptionRate: number;
  averageTotalTokens?: number;
  averageEstimatedCost?: { amount: number; currency: string };
  averageDurationMs?: number;
  coverage: { totalTokens: number; estimatedCost: number; durationMs: number };
}
export interface LearningEvaluationPolicy {
  minSamples: number;
  minComparableSamplesPerAlternative: number;
  qualityNonInferiorityMargin: number;
  minRelativeImprovement: number;
  regressionWindow: number;
}

const EVIDENCE_RANK = { observational: 0, comparative: 1, controlled: 2 } as const;

function relativeImprovement(lower: number, baseline: number): number {
  return baseline === 0 ? 0 : (baseline - lower) / baseline;
}

export class LearningEvaluationEngine {
  constructor(private readonly policy: LearningEvaluationPolicy) {}

  evaluate(input: {
    candidate: LearningCandidate;
    candidateMetrics: ComparableMetrics;
    baselineMetrics?: ComparableMetrics;
    stableWindows: number;
    evaluatedAt: string;
  }): LearningEvaluation {
    const volumePassed = input.candidateMetrics.sampleCount >= this.policy.minSamples;
    const baseline = input.baselineMetrics;
    const comparativeRequired = input.candidate.kind === 'model_preference' || input.candidate.kind === 'latency_preference' || input.candidate.kind === 'retry_preference' || input.candidate.kind === 'replan_preference';
    const comparisonAvailable = !comparativeRequired || (
      EVIDENCE_RANK[input.candidate.evidenceStrength] >= EVIDENCE_RANK.comparative &&
      !!baseline && baseline.sampleCount >= this.policy.minComparableSamplesPerAlternative
    );
    const qualityPassed = !baseline || input.candidateMetrics.verifiedSuccessRate + this.policy.qualityNonInferiorityMargin >= baseline.verifiedSuccessRate;

    const improvements: number[] = [];
    if (baseline) {
      improvements.push(relativeImprovement(input.candidateMetrics.retryRate, baseline.retryRate));
      improvements.push(relativeImprovement(input.candidateMetrics.interruptionRate, baseline.interruptionRate));
      if (input.candidateMetrics.averageTotalTokens !== undefined && baseline.averageTotalTokens !== undefined) {
        improvements.push(relativeImprovement(input.candidateMetrics.averageTotalTokens, baseline.averageTotalTokens));
      }
      if (input.candidateMetrics.averageDurationMs !== undefined && baseline.averageDurationMs !== undefined) {
        improvements.push(relativeImprovement(input.candidateMetrics.averageDurationMs, baseline.averageDurationMs));
      }
      if (input.candidateMetrics.averageEstimatedCost && baseline.averageEstimatedCost &&
          input.candidateMetrics.averageEstimatedCost.currency === baseline.averageEstimatedCost.currency) {
        improvements.push(relativeImprovement(input.candidateMetrics.averageEstimatedCost.amount, baseline.averageEstimatedCost.amount));
      }
    }
    const bestImprovement = improvements.length === 0 ? 0 : Math.max(...improvements);
    const knowledgeOnly = input.candidate.kind === 'knowledge';
    const efficiencyPassed = knowledgeOnly || bestImprovement >= this.policy.minRelativeImprovement;
    const stabilityPassed = input.stableWindows >= 2;

    const reasons = [
      !volumePassed ? 'insufficient evidence volume' : undefined,
      !comparisonAvailable ? 'insufficient comparative evidence' : undefined,
      !qualityPassed ? 'quality non-inferiority gate failed' : undefined,
      !efficiencyPassed ? 'minimum efficiency improvement not demonstrated' : undefined,
      !stabilityPassed ? 'candidate is not stable across evaluation windows' : undefined
    ].filter((v): v is string => !!v);

    const outcome: LearningEvaluation['outcome'] = !volumePassed || !comparisonAvailable
      ? 'keep_candidate'
      : !qualityPassed
        ? 'reject'
        : efficiencyPassed && stabilityPassed
          ? 'validate'
          : 'keep_candidate';

    return {
      id: `evaluation:${input.candidate.id}:${input.evaluatedAt}`,
      candidateId: input.candidate.id,
      outcome,
      evidenceStrength: input.candidate.evidenceStrength,
      evidenceVolume: { passed: volumePassed && comparisonAvailable, value: input.candidateMetrics.sampleCount, threshold: this.policy.minSamples, reason: comparisonAvailable ? 'sample threshold evaluated' : 'comparative evidence missing' },
      quality: { passed: qualityPassed, value: input.candidateMetrics.verifiedSuccessRate, threshold: baseline ? baseline.verifiedSuccessRate - this.policy.qualityNonInferiorityMargin : undefined, reason: qualityPassed ? 'required quality preserved' : 'candidate regressed beyond margin' },
      efficiency: { passed: efficiencyPassed, value: bestImprovement, threshold: this.policy.minRelativeImprovement, reason: efficiencyPassed ? 'efficiency target met or not required' : 'efficiency target not met' },
      stability: { passed: stabilityPassed, value: input.stableWindows, threshold: 2, reason: stabilityPassed ? 'stable across windows' : 'additional window required' },
      reasons,
      evaluatedAt: input.evaluatedAt
    };
  }
}
```

- [ ] **Step 4: Preserve `EvaluationGate` compatibility and add a comment pointing new code to `LearningEvaluationEngine`**

No signature removal. The compatibility class remains tested by `evaluation-gate.test.ts`; new M4 runtime code must import `LearningEvaluationEngine` instead.

- [ ] **Step 5: Run all kernel tests**

Run:
```bash
pnpm --filter @aes/kernel build
pnpm --filter @aes/kernel test
```
Expected: PASS; M2 `EvaluationGate` tests and new quality-first tests both pass.

- [ ] **Step 6: Commit**

```bash
git add packages/kernel
git commit -m "feat(learning): evaluate candidates with quality-first gates"
```

---

### Task 5: Implement reversible soft Policy Overlay resolution and deterministic conflict handling

**Files:**
- Create: `packages/kernel/src/policy-overlay-engine.ts`
- Create: `packages/kernel/src/__tests__/policy-overlay-engine.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: `TaskSignature`, `PolicyOverlay`, `OverlayEffect`.
- Produces: `PolicyOverlayEngine.resolve(kind, signature, overlays)` returning `OverlayResolution` with selected advice, applied IDs, conflict IDs, reasons.
- Invariant: only `active` overlays influence production; `shadow`, `validated`, `degraded`, `superseded`, `disabled` do not.

- [ ] **Step 1: Write failing tests for specificity, evidence strength, equal conflict, and inactive states**

```ts
// packages/kernel/src/__tests__/policy-overlay-engine.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type { PolicyOverlay } from '@aes/spec';
import { PolicyOverlayEngine } from '../policy-overlay-engine.js';

function overlay(id: string, status: PolicyOverlay['status'], applicability: PolicyOverlay['applicability'], prefer: 'cheap'|'balanced'|'powerful', score: number, strength: PolicyOverlay['evidenceStrength'] = 'comparative'): PolicyOverlay {
  return {
    id, sourceCandidateId: `candidate:${id}`, scope: 'project', status, applicability,
    effect: { kind: 'model_preference', prefer }, evidenceRefs: ['e'], evaluationRefs: ['v'],
    evidenceStrength: strength, evaluationScore: score,
    createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-09T00:00:00Z'
  };
}

test('more specific applicability outranks generic advice', () => {
  const result = new PolicyOverlayEngine().resolve('model_preference', {
    taskClass: 'implementation', stage: 'planning', architecturalDecisionRequired: true
  }, [
    overlay('generic', 'active', { taskClass: 'implementation' }, 'balanced', 5),
    overlay('specific', 'active', { taskClass: 'implementation', stage: 'planning', architecturalDecisionRequired: true }, 'powerful', 4)
  ]);
  assert.equal(result.effect?.kind === 'model_preference' && result.effect.prefer, 'powerful');
});

test('unresolved equal conflict removes learned influence', () => {
  const result = new PolicyOverlayEngine().resolve('model_preference', { taskClass: 'implementation' }, [
    overlay('a', 'active', { taskClass: 'implementation' }, 'cheap', 5),
    overlay('b', 'active', { taskClass: 'implementation' }, 'balanced', 5)
  ]);
  assert.equal(result.effect, undefined);
  assert.deepEqual(result.conflictIds.sort(), ['a', 'b']);
});

test('shadow and degraded overlays never influence production resolution', () => {
  const result = new PolicyOverlayEngine().resolve('model_preference', { taskClass: 'implementation' }, [
    overlay('shadow', 'shadow', { taskClass: 'implementation' }, 'cheap', 100, 'controlled'),
    overlay('degraded', 'degraded', { taskClass: 'implementation' }, 'powerful', 100, 'controlled')
  ]);
  assert.equal(result.effect, undefined);
});


test('active resolution explains the evidence behind learned advice', () => {
  const result = new PolicyOverlayEngine().resolve('model_preference', { taskClass: 'implementation' }, [
    overlay('explained', 'active', { taskClass: 'implementation' }, 'balanced', 5)
  ]);
  assert.equal(result.explanation?.overlayId, 'explained');
  assert.deepEqual(result.explanation?.evidenceRefs, ['e']);
  assert.deepEqual(result.explanation?.evaluationRefs, ['v']);
});
```

- [ ] **Step 2: Verify failure**

Run:
```bash
pnpm --filter @aes/kernel build
```
Expected: FAIL on missing overlay engine.

- [ ] **Step 3: Implement deterministic precedence**

```ts
// packages/kernel/src/policy-overlay-engine.ts
import type { OverlayEffect, PolicyOverlay, TaskSignature } from '@aes/spec';
import { matchesApplicability } from './task-signature.js';

const EVIDENCE_RANK = { observational: 0, comparative: 1, controlled: 2 } as const;

export interface OverlayResolution {
  effect?: OverlayEffect;
  appliedIds: string[];
  conflictIds: string[];
  reasons: string[];
  explanation?: {
    overlayId: string;
    evidenceStrength: PolicyOverlay['evidenceStrength'];
    evidenceRefs: string[];
    evaluationRefs: string[];
  };
}

function specificity(overlay: PolicyOverlay): number {
  const a = overlay.applicability;
  return [a.taskClass, a.stage, a.planStatus, a.taskComplexity, a.risk,
    a.architecturalDecisionRequired, a.language, a.stackTags, a.operationTags]
    .filter((value) => value !== undefined).length;
}
function sameEffect(a: OverlayEffect, b: OverlayEffect): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class PolicyOverlayEngine {
  resolve(kind: OverlayEffect['kind'], signature: TaskSignature, overlays: readonly PolicyOverlay[]): OverlayResolution {
    const applicable = overlays
      .filter((o) => o.status === 'active' && o.effect.kind === kind && matchesApplicability(signature, o.applicability))
      .sort((a, b) =>
        specificity(b) - specificity(a) ||
        EVIDENCE_RANK[b.evidenceStrength] - EVIDENCE_RANK[a.evidenceStrength] ||
        b.evaluationScore - a.evaluationScore ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.id.localeCompare(b.id));
    if (applicable.length === 0) return { appliedIds: [], conflictIds: [], reasons: ['no active applicable learned overlay'] };
    const winner = applicable[0]!;
    const tied = applicable.filter((o) =>
      specificity(o) === specificity(winner) &&
      EVIDENCE_RANK[o.evidenceStrength] === EVIDENCE_RANK[winner.evidenceStrength] &&
      o.evaluationScore === winner.evaluationScore &&
      o.updatedAt === winner.updatedAt);
    if (tied.some((o) => !sameEffect(o.effect, winner.effect))) {
      return { appliedIds: [], conflictIds: tied.map((o) => o.id), reasons: ['equally supported learned overlays conflict; base policy required'] };
    }
    return {
      effect: winner.effect,
      appliedIds: [winner.id],
      conflictIds: [],
      reasons: [`applied learned overlay ${winner.id}`],
      explanation: {
        overlayId: winner.id,
        evidenceStrength: winner.evidenceStrength,
        evidenceRefs: [...winner.evidenceRefs],
        evaluationRefs: [...winner.evaluationRefs]
      }
    };
  }
}
```

- [ ] **Step 4: Run tests and commit**

Run:
```bash
pnpm --filter @aes/kernel build
pnpm --filter @aes/kernel test
```
Expected: PASS.

```bash
git add packages/kernel
git commit -m "feat(policy): resolve reversible learned overlays"
```

---

### Task 6: Add mandatory shadow evaluation and integrate only resolved soft advice into decision engines

**Files:**
- Create: `packages/kernel/src/shadow-evaluator.ts`
- Create: `packages/kernel/src/__tests__/shadow-evaluator.test.ts`
- Modify: `packages/kernel/src/model-router.ts`
- Modify: `packages/kernel/src/context-engine.ts`
- Modify: `packages/kernel/src/interruption-policy.ts`
- Modify: `packages/kernel/src/__tests__/model-router.test.ts`
- Modify: `packages/kernel/src/__tests__/context-engine.test.ts`
- Modify: `packages/kernel/src/__tests__/interruption-policy.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: a baseline decision, hypothetical learned decision, candidate ID; resolved `OverlayEffect` from Task 5.
- Produces: `ShadowEvaluator.record()` and optional advice parameters on Router/Context/Interruption decision methods.
- Hard constraint rule: learned model advice can change a soft preference but cannot lower a hard required capability class.

- [ ] **Step 1: Write a failing invariant test proving shadow output is recorded separately**

```ts
// packages/kernel/src/__tests__/shadow-evaluator.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ShadowEvaluator } from '../shadow-evaluator.js';

test('shadow evaluation records a hypothetical decision without substituting baseline', () => {
  const baseline = { modelClass: 'balanced' } as const;
  const trace = new ShadowEvaluator().record({
    candidateId: 'candidate:model:cheap',
    baselineDecision: baseline,
    shadowDecision: { modelClass: 'cheap' } as const,
    comparable: false,
    timestamp: '2026-08-09T00:00:00Z'
  });
  assert.deepEqual(baseline, { modelClass: 'balanced' });
  assert.equal(trace.shadowDecision.modelClass, 'cheap');
  assert.equal(trace.comparable, false);
});
```

- [ ] **Step 2: Add failing hard-constraint and soft-advice tests to existing Router/Context/Interruption suites**

```ts
// model-router.test.ts additions
const router = new ModelRouter();
const architecture = router.route({
  stage: 'planning', planStatus: 'draft', ambiguity: 'medium', risk: 'high',
  taskComplexity: 'complex', confidence: 'high', failedAttempts: 0,
  architecturalDecisionRequired: true, evidenceSufficient: true, reasons: []
}, 'balanced', { kind: 'model_preference', prefer: 'cheap' });
assert.equal(architecture.modelClass, 'powerful');

const execution = router.route({
  stage: 'execution', planStatus: 'approved', ambiguity: 'low', risk: 'low',
  taskComplexity: 'standard', confidence: 'high', failedAttempts: 0,
  architecturalDecisionRequired: false, evidenceSufficient: true, reasons: []
}, 'balanced', { kind: 'model_preference', prefer: 'balanced' });
assert.equal(execution.modelClass, 'balanced');
assert.ok(execution.reasons.some((r) => r.includes('learned')));
```

- [ ] **Step 3: Implement `ShadowEvaluator` as a pure recorder**

```ts
// packages/kernel/src/shadow-evaluator.ts
import type { ShadowDecisionTrace } from '@aes/spec';

export class ShadowEvaluator {
  record<TDecision>(input: ShadowDecisionTrace<TDecision>): ShadowDecisionTrace<TDecision> {
    return {
      ...input,
      baselineDecision: structuredClone(input.baselineDecision),
      shadowDecision: structuredClone(input.shadowDecision)
    };
  }
}
```

- [ ] **Step 4: Add optional advice to `ModelRouter.route()` after base hard requirements are known**

```ts
// packages/kernel/src/model-router.ts — signature and advice application
import type { ModelPreferenceEffect } from '@aes/spec';

route(analysis: TaskAnalysis, current: ModelClass = 'balanced', advice?: ModelPreferenceEffect): ModelDecision {
  // existing base routing stays first.
  // after computing the hard/base target:
  const hardRequiresPowerful = analysis.stage === 'planning' && analysis.architecturalDecisionRequired && analysis.evidenceSufficient;
  if (advice && !hardRequiresPowerful) {
    target = advice.prefer;
    reasons.push(`learned project preference suggests ${advice.prefer}`);
  }
  // existing transition calculation remains unchanged.
}
```

- [ ] **Step 5: Add optional context/interruption soft advice with hard-blocker checks**

```ts
// context-engine.ts — keep existing logic in evaluateBase and apply advice afterward
import type { ContextPreferenceEffect } from '@aes/spec';

evaluate(facts: ContextFacts, advice?: ContextPreferenceEffect): ContextDecision {
  const base = this.evaluateBase(facts);
  if (!advice || facts.activeDependsOnPriorEvidence) return base;
  if (advice.preferCompactionBeforeHandoff && base.health === 'good') {
    return {
      ...base,
      health: 'growing',
      reasons: [...base.reasons, 'learned project preference favors earlier compaction'],
      recommendations: ['compact']
    };
  }
  if (advice.preferMemoryRetrieval) {
    return { ...base, reasons: [...base.reasons, 'learned project preference favors selective memory retrieval'] };
  }
  return base;
}

private evaluateBase(facts: ContextFacts): ContextDecision {
  // Move the current pre-M4 body of evaluate() here unchanged.
}
```

```ts
// interruption-policy.ts — extend input result without allowing hard suppression
import type { InterruptionPreferenceEffect, InterruptionUrgency } from '@aes/spec';

export interface InterruptionDecision {
  interrupt: boolean;
  urgency: InterruptionUrgency;
  reasons: string[];
}

evaluate(input: InterruptionInput, advice?: InterruptionPreferenceEffect): InterruptionDecision {
  const reasons: string[] = [];
  if (input.authorityIncrease) reasons.push('new authority requires user consent');
  if (input.durableConflict) reasons.push('durable knowledge conflict requires judgment');
  if (input.capabilityFailure) reasons.push('runtime capability failure changes the next user action');
  if (input.confidence === 'low' && input.impact === 'high') reasons.push('low confidence high impact');
  const hardBlocker = reasons.length > 0;
  if (hardBlocker) return { interrupt: true, urgency: 'immediate', reasons };

  if (input.controlOutcome === 'request_approval') {
    return { interrupt: true, urgency: 'boundary', reasons: ['assisted action requires approval'] };
  }
  if (input.controlOutcome === 'recommend') {
    if (advice?.suppressRoutinePrompt) {
      return { interrupt: false, urgency: advice.schedule ?? 'digest', reasons: ['learned routine prompt suppression'] };
    }
    return { interrupt: true, urgency: advice?.schedule ?? 'boundary', reasons: ['recommendation requires user action'] };
  }
  return { interrupt: false, urgency: 'digest', reasons: [] };
}
```

- [ ] **Step 6: Run kernel tests and prove compatibility**

Run:
```bash
pnpm --filter @aes/kernel build
pnpm --filter @aes/kernel test
```
Expected: PASS; existing callers that omit advice behave exactly as before except for the intentional additional `urgency` field.

- [ ] **Step 7: Commit**

```bash
git add packages/kernel
git commit -m "feat(learning): shadow candidates and apply bounded soft advice"
```

---

### Task 7: Add post-activation regression monitoring and automatic learned rollback

**Files:**
- Create: `packages/kernel/src/regression-monitor.ts`
- Create: `packages/kernel/src/__tests__/regression-monitor.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: active overlay, baseline metrics, rolling post-activation attributable evidence, evaluation policy.
- Produces: `RegressionMonitor.evaluate()` → `keep | degrade` and baseline snapshot helper.
- Invariant: provider/cancellation evidence with `attributable=false` is excluded from model-quality degradation.

- [ ] **Step 1: Write failing tests for healthy, degraded, and provider-outage windows**

```ts
// packages/kernel/src/__tests__/regression-monitor.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { RegressionMonitor } from '../regression-monitor.js';

const monitor = new RegressionMonitor({ regressionWindow: 20, qualityNonInferiorityMargin: 0.01 });

test('quality regression degrades an active overlay', () => {
  const result = monitor.evaluate({
    baseline: { verifiedRate: .96, retryRate: .18, interruptionRate: .24 },
    observed: Array.from({ length: 20 }, (_, i) => ({ attributable: true, verification: i < 16 ? 'passed' : 'failed', retries: 0, userInterruptions: 0 })),
    overlayId: 'ov-1'
  });
  assert.equal(result.action, 'degrade');
});

test('non-attributable provider failures do not degrade model advice', () => {
  const observed = [
    ...Array.from({ length: 20 }, () => ({ attributable: true, verification: 'passed' as const, retries: 0, userInterruptions: 0 })),
    ...Array.from({ length: 5 }, () => ({ attributable: false, verification: 'failed' as const, retries: 0, userInterruptions: 0 }))
  ];
  assert.equal(monitor.evaluate({ baseline: { verifiedRate: .96, retryRate: .18, interruptionRate: .24 }, observed, overlayId: 'ov-1' }).action, 'keep');
});
```

- [ ] **Step 2: Implement rolling-window logic**

```ts
// packages/kernel/src/regression-monitor.ts
export interface BaselineSnapshot {
  verifiedRate: number;
  retryRate: number;
  interruptionRate: number;
  averageCost?: { amount: number; currency: string };
}
export interface RegressionResult { action: 'keep' | 'degrade'; reason: string; }

export class RegressionMonitor {
  constructor(private readonly policy: { regressionWindow: number; qualityNonInferiorityMargin: number }) {}

  evaluate(input: {
    baseline: BaselineSnapshot;
    observed: readonly { attributable: boolean; verification: 'passed'|'failed'|'partial'|'not_run'; retries: number; userInterruptions: number }[];
    overlayId: string;
  }): RegressionResult {
    const rows = input.observed.filter((r) => r.attributable).slice(-this.policy.regressionWindow);
    if (rows.length < this.policy.regressionWindow) return { action: 'keep', reason: 'regression window incomplete' };
    const verifiedRate = rows.filter((r) => r.verification === 'passed').length / rows.length;
    if (verifiedRate + this.policy.qualityNonInferiorityMargin < input.baseline.verifiedRate) {
      return { action: 'degrade', reason: `verified quality regressed for ${input.overlayId}` };
    }
    return { action: 'keep', reason: 'post-activation quality remains within policy' };
  }
}
```

- [ ] **Step 3: Run kernel tests and commit**

Run:
```bash
pnpm --filter @aes/kernel build
pnpm --filter @aes/kernel test
```
Expected: PASS.

```bash
git add packages/kernel
git commit -m "feat(learning): monitor overlays and degrade on regression"
```

---

### Task 8: Evolve `.aes` into typed knowledge storage with idempotent M3 migration and reproducible indexes

**Files:**
- Modify: `packages/kernel/src/memory-store.ts`
- Create: `packages/kernel/src/knowledge-migration.ts`
- Create: `packages/kernel/src/knowledge-index.ts`
- Modify: `packages/kernel/src/__tests__/memory-store.test.ts`
- Create: `packages/kernel/src/__tests__/knowledge-migration.test.ts`
- Create: `packages/kernel/src/__tests__/knowledge-index.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: old `KnowledgeMetadata`, new `KnowledgeRecord`.
- Produces: `MemoryStore.putRecord/getRecord/listRecords/rebuildIndexes`, concrete `LearningArtifactStore` persistence (`putCandidate/putEvaluation/putOverlay/putShadowDecision/list*`), `migrateLegacyKnowledge()`, deterministic index renderers.
- Compatibility: existing `writeKnowledge`, `searchKnowledge`, `appendRaw`, `appendLog` remain available.

- [ ] **Step 1: Write failing tests for new directory layout, `index.json`, migration, and idempotency**

```ts
// knowledge-migration.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateLegacyKnowledge } from '../knowledge-migration.js';

test('legacy trusted knowledge becomes active knowledge but never an active policy overlay', () => {
  const record = migrateLegacyKnowledge('architecture/vendor-neutral.md', 'Core never imports adapters.', {
    id: 'k1', status: 'trusted', scope: 'project', confidence: 'high',
    createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', evidenceRefs: ['adr-1']
  });
  assert.equal(record.status, 'active');
  assert.equal(record.kind, 'fact');
  assert.equal(record.provenance.source, 'compiler');
});
```

```ts
// memory-store.test.ts addition
await store.initialize();
for (const folder of ['raw', 'knowledge', 'decisions', 'experience', 'evals', 'overlays']) {
  assert.equal((await stat(join(root, '.aes', folder))).isDirectory(), true);
}
assert.equal(JSON.parse(await readFile(join(root, '.aes', 'index.json'), 'utf8')).records.length, 0);

test('initialize migrates legacy sidecars once and leaves source files untouched', async () => {
  const legacyDir = join(root, '.aes', 'knowledge', 'architecture');
  await mkdir(legacyDir, { recursive: true });
  const markdown = join(legacyDir, 'vendor-neutral.md');
  await writeFile(markdown, '# Vendor neutral\n\nCore never imports adapters.\n');
  await writeFile(`${markdown}.meta.json`, JSON.stringify({
    id: 'k1', status: 'trusted', scope: 'project', confidence: 'high',
    createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', evidenceRefs: ['adr-1']
  }));

  const store = new MemoryStore(root);
  await store.initialize();
  assert.equal((await store.getRecord('k1'))?.status, 'active');
  assert.equal(await readFile(markdown, 'utf8'), '# Vendor neutral\n\nCore never imports adapters.\n');
  const firstIndex = await readFile(join(root, '.aes', 'index.json'), 'utf8');
  await store.initialize();
  assert.equal(await readFile(join(root, '.aes', 'index.json'), 'utf8'), firstIndex);
  assert.equal((await store.listRecords()).filter((record) => record.id === 'k1').length, 1);
});
```

- [ ] **Step 2: Verify targeted failures**

Run:
```bash
pnpm --filter @aes/kernel build
```
Expected: FAIL on missing migration/index functions and typed store methods.

- [ ] **Step 3: Implement deterministic legacy conversion without inventing evidence**

```ts
// packages/kernel/src/knowledge-migration.ts
import type { KnowledgeMetadata, KnowledgeRecord } from '@aes/spec';

export function migrateLegacyKnowledge(path: string, content: string, legacy: KnowledgeMetadata): KnowledgeRecord {
  return {
    id: legacy.id,
    key: `legacy.${path.replace(/[^a-zA-Z0-9]+/g, '.').replace(/^\.|\.$/g, '').toLowerCase()}`,
    kind: 'fact',
    scope: legacy.scope,
    status: legacy.status === 'trusted' ? 'active' : legacy.status === 'superseded' ? 'superseded' : 'candidate',
    statement: content.replace(/^#+\s+.*$/m, '').trim().replace(/\s+/g, ' '),
    evidenceRefs: [...legacy.evidenceRefs],
    evaluationRefs: [],
    confidence: legacy.confidence,
    provenance: { source: 'compiler', refs: [...legacy.evidenceRefs] },
    relations: [],
    ...(legacy.supersededBy ? { supersededBy: legacy.supersededBy } : {}),
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt
  };
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolute = join(root, entry.name);
    if (entry.isDirectory()) out.push(...await walkFiles(absolute));
    else out.push(absolute);
  }
  return out.sort();
}

export async function migrateLegacyKnowledgeDirectory(
  knowledgeRoot: string,
  target: {
    getRecord(id: string): Promise<KnowledgeRecord | undefined>;
    putRecord(record: KnowledgeRecord): Promise<void>;
  }
): Promise<number> {
  const files = await walkFiles(knowledgeRoot);
  const legacyMetadataFiles = files.filter((path) => path.endsWith('.meta.json'));
  let migrated = 0;
  for (const metadataPath of legacyMetadataFiles) {
    const parsed = JSON.parse(await readFile(metadataPath, 'utf8')) as KnowledgeMetadata | KnowledgeRecord;
    if ('key' in parsed && 'provenance' in parsed) continue; // already M4 canonical metadata
    if (await target.getRecord(parsed.id)) continue;
    const markdownPath = metadataPath.slice(0, -'.meta.json'.length);
    const content = await readFile(markdownPath, 'utf8');
    const relativePath = relative(knowledgeRoot, markdownPath).replaceAll('\\', '/');
    await target.putRecord(migrateLegacyKnowledge(relativePath, content, parsed));
    migrated += 1;
  }
  return migrated;
}
```

Import `readdir`/`readFile` from `node:fs/promises` and `join`/`relative` from `node:path`. The migration scans first and writes second through the typed store. Existing legacy files remain untouched; a second run sees the canonical record ID and migrates zero records.

- [ ] **Step 4: Implement reproducible index rendering from canonical records**

```ts
// packages/kernel/src/knowledge-index.ts
import type { KnowledgeRecord } from '@aes/spec';

export function renderIndexJson(records: readonly KnowledgeRecord[]): string {
  const rows = [...records].sort((a, b) => a.id.localeCompare(b.id)).map((r) => ({
    id: r.id, key: r.key, kind: r.kind, scope: r.scope, status: r.status,
    confidence: r.confidence, updatedAt: r.updatedAt
  }));
  return `${JSON.stringify({ version: 1, records: rows }, null, 2)}\n`;
}

export function renderIndexMarkdown(records: readonly KnowledgeRecord[]): string {
  const lines = [...records].sort((a, b) => a.id.localeCompare(b.id)).map((r) =>
    `- ${r.id} [${r.kind}/${r.scope}/${r.status}] ${r.statement.replace(/\s+/g, ' ').slice(0, 240)}`);
  return `# AES Knowledge Index\n\n${lines.join('\n')}${lines.length ? '\n' : ''}`;
}
```

- [ ] **Step 5: Evolve `MemoryStore` into the concrete typed knowledge + learning-artifact filesystem store**

`MemoryStore` remains the local filesystem implementation and implements both `TypedKnowledgeStore` and `LearningArtifactStore`. Create the nested directories deterministically and keep lifecycle state inside the JSON artifact rather than encoding trust in a filename.

```ts
// packages/kernel/src/memory-store.ts — key additions
import { access, appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { migrateLegacyKnowledgeDirectory } from './knowledge-migration.js';
import { renderIndexJson, renderIndexMarkdown } from './knowledge-index.js';
import type {
  KnowledgeSearchResult,
  KnowledgeStore,
  LearningArtifactStore,
  TypedKnowledgeStore
} from '@aes/runtime-sdk';
import type {
  AuthorityCandidate,
  InteractionEvidence,
  KnowledgeMetadata,
  KnowledgePacket,
  KnowledgeQuery,
  KnowledgeRecord,
  LearningCandidate,
  LearningEvaluation,
  PolicyOverlay,
  ScopedAuthorityGrant,
  ShadowDecisionTrace
} from '@aes/spec';

const ROOT_FOLDERS = ['raw', 'knowledge', 'decisions', 'experience', 'evals', 'overlays'] as const;
const NESTED_FOLDERS = [
  'raw/traces',
  'experience/candidates',
  'experience/shadow',
  'experience/active',
  'experience/interactions',
  'experience/authority-candidates',
  'decisions/authority',
  'overlays/project',
  'overlays/user'
] as const;

export class MemoryStore implements KnowledgeStore<KnowledgeMetadata>, TypedKnowledgeStore, LearningArtifactStore {
  // keep the existing constructor/private root fields and compatibility methods.

  async initialize(): Promise<void> {
    await mkdir(this.#aesRoot, { recursive: true });
    for (const folder of [...ROOT_FOLDERS, ...NESTED_FOLDERS]) {
      await mkdir(join(this.#aesRoot, folder), { recursive: true });
    }
    await this.ensureFile('index.json', renderIndexJson([]));
    await this.ensureFile('index.md', '# AES Knowledge Index\n');
    await this.ensureFile('log.md', '# AES Knowledge Log\n');
    await this.ensureFile('MEMORY.md', '# AES Memory\n\nProject knowledge is retrieved selectively through index metadata.\n');
    await migrateLegacyKnowledgeDirectory(join(this.#aesRoot, 'knowledge'), this);
    await this.rebuildIndexes();
  }

  async getRecord(id: string): Promise<KnowledgeRecord | undefined> {
    return (await this.listRecords()).find((record) => record.id === id);
  }

  async listRecords(): Promise<KnowledgeRecord[]> {
    const kinds = ['fact', 'decision', 'experience', 'preference'] as const;
    const records: KnowledgeRecord[] = [];
    for (const kind of kinds) {
      const directory = join(this.#aesRoot, 'knowledge', kind);
      await mkdir(directory, { recursive: true });
      records.push(...await this.readJsonDirectory<KnowledgeRecord>(directory, '.meta.json'));
    }
    return records.sort((a, b) => a.id.localeCompare(b.id));
  }

  async putRecord(record: KnowledgeRecord): Promise<void> {
    const dir = join(this.#aesRoot, 'knowledge', record.kind);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${record.id}.meta.json`), `${JSON.stringify(record, null, 2)}\n`);
    await writeFile(join(dir, `${record.id}.md`), `# ${record.key}\n\n${record.statement}\n`);
    await this.rebuildIndexes();
  }

  async putCandidate(candidate: LearningCandidate): Promise<void> {
    const path = join(this.#aesRoot, 'experience', 'candidates', `${candidate.id}.json`);
    await writeFile(path, `${JSON.stringify(candidate, null, 2)}\n`);
  }

  async putShadowDecision(trace: ShadowDecisionTrace): Promise<void> {
    const path = join(this.#aesRoot, 'experience', 'shadow', `${trace.candidateId}.jsonl`);
    await appendFile(path, `${JSON.stringify(trace)}\n`);
  }

  async putEvaluation(evaluation: LearningEvaluation): Promise<void> {
    await writeFile(join(this.#aesRoot, 'evals', `${evaluation.id}.json`), `${JSON.stringify(evaluation, null, 2)}\n`);
  }

  async putOverlay(overlay: PolicyOverlay): Promise<void> {
    const dir = join(this.#aesRoot, 'overlays', overlay.scope);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${overlay.id}.json`), `${JSON.stringify(overlay, null, 2)}\n`);
  }

  async appendInteraction(evidence: InteractionEvidence): Promise<void> {
    await writeFile(join(this.#aesRoot, 'experience', 'interactions', `${evidence.id}.json`), `${JSON.stringify(evidence, null, 2)}\n`);
  }

  async putAuthorityCandidate(candidate: AuthorityCandidate): Promise<void> {
    await writeFile(join(this.#aesRoot, 'experience', 'authority-candidates', `${candidate.id}.json`), `${JSON.stringify(candidate, null, 2)}\n`);
  }

  async putAuthorityGrant(grant: ScopedAuthorityGrant): Promise<void> {
    await writeFile(join(this.#aesRoot, 'decisions', 'authority', `${grant.id}.json`), `${JSON.stringify(grant, null, 2)}\n`);
  }

  async listCandidates(): Promise<LearningCandidate[]> {
    return this.readJsonDirectory<LearningCandidate>(join(this.#aesRoot, 'experience', 'candidates'));
  }

  async listOverlays(): Promise<PolicyOverlay[]> {
    const project = await this.readJsonDirectory<PolicyOverlay>(join(this.#aesRoot, 'overlays', 'project'));
    const user = await this.readJsonDirectory<PolicyOverlay>(join(this.#aesRoot, 'overlays', 'user'));
    return [...project, ...user].sort((a, b) => a.id.localeCompare(b.id));
  }

  async listInteractions(): Promise<InteractionEvidence[]> {
    return this.readJsonDirectory<InteractionEvidence>(join(this.#aesRoot, 'experience', 'interactions'));
  }
  async listAuthorityCandidates(): Promise<AuthorityCandidate[]> {
    return this.readJsonDirectory<AuthorityCandidate>(join(this.#aesRoot, 'experience', 'authority-candidates'));
  }
  async listAuthorityGrants(): Promise<ScopedAuthorityGrant[]> {
    return this.readJsonDirectory<ScopedAuthorityGrant>(join(this.#aesRoot, 'decisions', 'authority'));
  }

  private async readJsonDirectory<T>(directory: string, suffix = '.json'): Promise<T[]> {
    const entries = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
      .map((entry) => entry.name)
      .sort();
    const values: T[] = [];
    for (const name of entries) {
      values.push(JSON.parse(await readFile(join(directory, name), 'utf8')) as T);
    }
    return values;
  }

  private async ensureFile(relativePath: string, content: string): Promise<void> {
    const path = join(this.#aesRoot, relativePath);
    try {
      await access(path);
    } catch {
      await writeFile(path, content);
    }
  }

  async queryKnowledge(query: KnowledgeQuery): Promise<KnowledgePacket> {
    const records = (await this.listRecords())
      .filter((record) => record.status === 'active')
      .filter((record) => record.scope === query.scope || (query.scope === 'project' && record.scope === 'user'))
      .sort((a, b) => a.id.localeCompare(b.id));
    let estimatedTokens = 0;
    const entries: KnowledgePacket['entries'] = [];
    for (const record of records) {
      if (entries.length >= query.maxRecords) break;
      const tokens = Math.ceil(record.statement.length / 4);
      if (estimatedTokens + tokens > query.maxEstimatedTokens) continue;
      entries.push({
        id: record.id, path: `knowledge/${record.kind}/${record.id}.md`, statement: record.statement,
        score: 0, estimatedTokens: tokens, reasons: ['typed-store compatibility retrieval'], record
      });
      estimatedTokens += tokens;
    }
    return { entries, estimatedTokens, truncated: entries.length < records.length };
  }

  async rebuildIndexes(): Promise<void> {
    const records = await this.listRecords();
    await writeFile(join(this.#aesRoot, 'index.json'), renderIndexJson(records));
    await writeFile(join(this.#aesRoot, 'index.md'), renderIndexMarkdown(records));
  }
}
```

Add store tests that persist a candidate, shadow trace, evaluation, active project overlay, interaction evidence, authority candidate, and accepted authority grant; recreate `MemoryStore` against the same temp directory; then assert `listCandidates()`/`listOverlays()` return byte-equivalent domain objects and that the shadow JSONL contains exactly the recorded hypothetical decision. Existing `writeKnowledge()` reads/migrates old metadata and writes through compatibility storage without activating policy overlays. Existing `searchKnowledge()` remains compatible until Task 9 replaces its internals.

- [ ] **Step 6: Run store/migration tests twice to prove idempotency**

Run:
```bash
pnpm --filter @aes/kernel build
pnpm --filter @aes/kernel test
pnpm --filter @aes/kernel test
```
Expected: both runs PASS; a second migration/index rebuild produces byte-identical `index.json`/`index.md` for unchanged records.

- [ ] **Step 7: Commit**

```bash
git add packages/kernel
git commit -m "feat(memory): store typed knowledge and rebuild deterministic indexes"
```

---

### Task 9: Add deterministic Memory Compiler, linting, bounded retrieval, and storage hygiene

**Files:**
- Modify: `packages/kernel/src/knowledge-compiler.ts`
- Create: `packages/kernel/src/memory-lint.ts`
- Create: `packages/kernel/src/knowledge-retriever.ts`
- Create: `packages/kernel/src/knowledge-privacy.ts`
- Create: `packages/kernel/src/memory-retention.ts`
- Create: `packages/kernel/src/memory-maintenance.ts`
- Modify: `packages/kernel/src/__tests__/knowledge-compiler.test.ts`
- Create: `packages/kernel/src/__tests__/memory-lint.test.ts`
- Create: `packages/kernel/src/__tests__/knowledge-retriever.test.ts`
- Create: `packages/kernel/src/__tests__/knowledge-privacy.test.ts`
- Create: `packages/kernel/src/__tests__/memory-retention.test.ts`
- Create: `packages/kernel/src/__tests__/memory-maintenance.test.ts`
- Modify: `packages/kernel/src/memory-store.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: canonical `KnowledgeRecord[]`, `KnowledgeQuery`, deterministic `key` + applicability.
- Produces: `KnowledgeCompiler.compile()`, `MemoryLint.inspect()`, `KnowledgeRetriever.retrieve()`, `MemoryMaintenanceService.incremental()/full()`.
- Semantic rule: same machine key + overlapping same applicability may merge/supersede/conflict; different applicability may coexist.

- [ ] **Step 1: Write failing compiler tests for create/merge/coexist/supersede/conflict/idempotency**

```ts
// knowledge-compiler.test.ts additions
const compiler = new KnowledgeCompiler();
const existing = record({ id: 'K1', key: 'routing.ts.execution', statement: 'Prefer balanced.', applicability: { stage: 'execution', language: 'typescript' }, evidenceRefs: ['e1'] });

assert.equal(compiler.compile(existing, []).outcome, 'create');
const merged = compiler.compile(record({ ...existing, id: 'K2', evidenceRefs: ['e2'] }), [existing]);
assert.equal(merged.outcome, 'merge');
assert.deepEqual(merged.record?.evidenceRefs.sort(), ['e1', 'e2']);

const planning = record({ ...existing, id: 'K3', applicability: { stage: 'planning', language: 'typescript' }, statement: 'Prefer powerful.' });
assert.equal(compiler.compile(planning, [existing]).outcome, 'create');

const conflict = record({ ...existing, id: 'K4', statement: 'Prefer powerful.' });
assert.equal(compiler.compile(conflict, [existing]).outcome, 'conflict');
```

- [ ] **Step 2: Write failing retrieval-budget tests**

```ts
// knowledge-retriever.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { KnowledgeRetriever } from '../knowledge-retriever.js';

test('retrieval filters by scope/applicability and enforces record/token budgets deterministically', () => {
  const packet = new KnowledgeRetriever().retrieve(records, {
    text: 'typescript execution routing', scope: 'project',
    signature: { taskClass: 'implementation', stage: 'execution', language: 'typescript' },
    statuses: ['active'], maxRecords: 2, maxEstimatedTokens: 80
  });
  assert.ok(packet.entries.length <= 2);
  assert.ok(packet.estimatedTokens <= 80);
  assert.ok(packet.entries.every((entry) => entry.record.status === 'active'));
});
```

- [ ] **Step 3: Implement compile semantics using deterministic keys instead of semantic guessing**

```ts
// packages/kernel/src/knowledge-compiler.ts — keep existing validateScope/promote/supersede methods
import type { KnowledgeRecord } from '@aes/spec';

export interface TypedCompileResult {
  outcome: 'create' | 'merge' | 'supersede' | 'conflict';
  record?: KnowledgeRecord;
  conflictingIds?: string[];
}

export class KnowledgeCompiler {
  // existing M2 methods remain.
  compile(incoming: KnowledgeRecord, existing: readonly KnowledgeRecord[]): TypedCompileResult {
    const sameKey = existing.filter((r) => r.key === incoming.key && r.scope === incoming.scope);
    if (sameKey.length === 0) return { outcome: 'create', record: incoming };
    const exact = sameKey.find((r) => JSON.stringify(r.applicability ?? {}) === JSON.stringify(incoming.applicability ?? {}));
    if (!exact) return { outcome: 'create', record: incoming };
    if (exact.statement === incoming.statement) {
      return {
        outcome: 'merge',
        record: {
          ...exact,
          evidenceRefs: [...new Set([...exact.evidenceRefs, ...incoming.evidenceRefs])].sort(),
          evaluationRefs: [...new Set([...exact.evaluationRefs, ...incoming.evaluationRefs])].sort(),
          updatedAt: incoming.updatedAt > exact.updatedAt ? incoming.updatedAt : exact.updatedAt
        }
      };
    }
    if (incoming.relations.some((r) => r.kind === 'supersedes' && r.targetId === exact.id)) {
      return { outcome: 'supersede', record: incoming };
    }
    return { outcome: 'conflict', conflictingIds: [exact.id, incoming.id] };
  }
}
```

- [ ] **Step 4: Implement deterministic retrieval ranking and char-based token estimation**

```ts
// packages/kernel/src/knowledge-retriever.ts
import type { KnowledgePacket, KnowledgeQuery, KnowledgeRecord } from '@aes/spec';
import { matchesApplicability } from './task-signature.js';

function estimateTokens(text: string): number { return Math.ceil(text.length / 4); }
function lexicalScore(text: string, query: string): number {
  const haystack = text.toLowerCase();
  return [...new Set(query.toLowerCase().split(/\s+/).filter(Boolean))]
    .reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export class KnowledgeRetriever {
  retrieve(records: readonly KnowledgeRecord[], query: KnowledgeQuery): KnowledgePacket {
    const candidates = records
      .filter((r) => r.scope === query.scope || (query.scope === 'project' && r.scope === 'user'))
      .filter((r) => (query.statuses ?? ['active']).includes(r.status))
      .filter((r) => !query.kinds || query.kinds.includes(r.kind))
      .filter((r) => !r.applicability || !query.signature || matchesApplicability(query.signature, r.applicability))
      .map((r) => {
        const score = lexicalScore(`${r.key} ${r.statement}`, query.text) + (r.applicability ? 3 : 0) + (r.confidence === 'high' ? 2 : r.confidence === 'medium' ? 1 : 0);
        return { record: r, score, estimatedTokens: estimateTokens(r.statement) };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || b.record.updatedAt.localeCompare(a.record.updatedAt) || a.record.id.localeCompare(b.record.id));

    const entries = [] as KnowledgePacket['entries'];
    let total = 0;
    for (const item of candidates) {
      if (entries.length >= query.maxRecords) break;
      if (total + item.estimatedTokens > query.maxEstimatedTokens) continue;
      entries.push({ id: item.record.id, path: `knowledge/${item.record.kind}/${item.record.id}.md`, statement: item.record.statement, score: item.score, estimatedTokens: item.estimatedTokens, reasons: ['scope/applicability matched', 'lexical/metadata ranking'], record: item.record });
      total += item.estimatedTokens;
    }
    return { entries, estimatedTokens: total, truncated: entries.length < candidates.length };
  }
}
```

- [ ] **Step 5: Implement lint findings and only safe automatic repairs**

```ts
// packages/kernel/src/memory-lint.ts
import type { KnowledgeRecord } from '@aes/spec';

export type MemoryLintCode = 'duplicate'|'conflict'|'orphan_relation'|'missing_provenance'|'low_evidence_active'|'oversized_record'|'scope_risk';
export interface MemoryLintFinding { code: MemoryLintCode; recordIds: string[]; repairable: boolean; message: string; }

export class MemoryLint {
  private inspectRecordIntegrity(records: readonly KnowledgeRecord[], maxRecordTokens: number): MemoryLintFinding[] {
    const ids = new Set(records.map((r) => r.id));
    const findings: MemoryLintFinding[] = [];
    for (const record of records) {
      if (record.provenance.refs.length === 0) findings.push({ code: 'missing_provenance', recordIds: [record.id], repairable: false, message: 'durable record has no provenance refs' });
      if (record.status === 'active' && record.evidenceRefs.length === 0) findings.push({ code: 'low_evidence_active', recordIds: [record.id], repairable: false, message: 'active learned record has no evidence refs' });
      if (Math.ceil(record.statement.length / 4) > maxRecordTokens) findings.push({ code: 'oversized_record', recordIds: [record.id], repairable: false, message: 'record exceeds token budget' });
      for (const relation of record.relations) if (!ids.has(relation.targetId)) findings.push({ code: 'orphan_relation', recordIds: [record.id], repairable: false, message: `missing relation target ${relation.targetId}` });
    }
    return findings;
  }
}
```

- [ ] **Step 6: Wire `MemoryStore.queryKnowledge()` to `KnowledgeRetriever` and retain legacy `searchKnowledge()`**

`queryKnowledge()` reads canonical records and calls `KnowledgeRetriever.retrieve()`. `searchKnowledge(query, limit)` becomes a compatibility adapter that requests project-scope active records with `maxRecords=limit` and a conservative token budget, then reads/rendered Markdown for returned entries.

- [ ] **Step 7: Implement fail-closed project→user generalization from structured learning candidates**

```ts
// packages/kernel/src/knowledge-privacy.ts
import type { Applicability, LearningCandidate } from '@aes/spec';

const SAFE_LANGUAGES = new Set(['typescript','javascript','python','java','go','rust','c','cpp','csharp','kotlin','swift','ruby','php']);

function generalizedApplicability(input: Applicability): Applicability {
  return {
    ...(input.stage ? { stage: input.stage } : {}),
    ...(input.planStatus ? { planStatus: input.planStatus } : {}),
    ...(input.taskComplexity ? { taskComplexity: input.taskComplexity } : {}),
    ...(input.risk ? { risk: input.risk } : {}),
    ...(input.architecturalDecisionRequired !== undefined ? { architecturalDecisionRequired: input.architecturalDecisionRequired } : {}),
    ...(input.language && SAFE_LANGUAGES.has(input.language) ? { language: input.language } : {})
  };
}

export class KnowledgePrivacyGuard {
  generalizeCandidate(candidate: LearningCandidate, now: string): { allowed: true; candidate: LearningCandidate } | { allowed: false; reason: string } {
    if (candidate.scope !== 'project') return { allowed: false, reason: 'only project candidates can be generalized' };
    if (candidate.kind === 'knowledge' || !candidate.effect) {
      return { allowed: false, reason: 'unstructured project knowledge requires explicit reviewed promotion' };
    }
    return {
      allowed: true,
      candidate: {
        ...candidate,
        id: `user:${candidate.id}`,
        scope: 'user',
        applicability: generalizedApplicability(candidate.applicability),
        status: 'candidate',
        // Project-local trace/evaluation IDs do not cross the privacy boundary.
        // User-scope evidence is attached only after generalized cross-project/controlled evaluation.
        evidenceRefs: [],
        createdAt: now,
        updatedAt: now,
        evaluationRefs: []
      }
    };
  }
}
```

Add the exact fail-closed test:

```ts
// knowledge-privacy.test.ts
const local = candidate({
  id: 'c-local', kind: 'model_preference', scope: 'project',
  applicability: {
    taskClass: 'customer-x-service', stage: 'execution', language: 'typescript',
    stackTags: ['internal-api'], operationTags: ['repo:/customers/acme/migration']
  },
  effect: { kind: 'model_preference', prefer: 'balanced' },
  evidenceRefs: ['trace:/customers/acme/private-run']
});
const generalized = new KnowledgePrivacyGuard().generalizeCandidate(local, '2026-08-09T00:00:00Z');
assert.equal(generalized.allowed, true);
const serialized = JSON.stringify(generalized.allowed ? generalized.candidate : {});
for (const secret of ['customer-x-service', 'internal-api', 'repo:/customers/acme/migration', 'trace:/customers/acme/private-run']) {
  assert.equal(serialized.includes(secret), false);
}
assert.equal(generalized.allowed && generalized.candidate.scope, 'user');
assert.equal(generalized.allowed && generalized.candidate.status, 'candidate');
assert.deepEqual(generalized.allowed ? generalized.candidate.evidenceRefs : ['unexpected'], []);

const unstructured = candidate({ id: 'k-local', kind: 'knowledge', scope: 'project', statement: 'customer-x-service uses /customers/acme' });
assert.equal(new KnowledgePrivacyGuard().generalizeCandidate(unstructured, '2026-08-09T00:00:00Z').allowed, false);
```

The user-scope result remains a pending candidate with no project-local evidence references. Cross-project or controlled generalized evidence must be attached by a separate evaluation step before promotion. This method never activates it or grants promotion authority.

- [ ] **Step 8: Implement deterministic retention planning with evidence preservation**

```ts
// packages/kernel/src/memory-retention.ts
export interface RawTraceDescriptor { id: string; timestamp: string; failed: boolean; referencedByActiveKnowledge: boolean; }
export class MemoryRetentionPlanner {
  plan(input: { traces: readonly RawTraceDescriptor[]; now: string; rawTracesDays: number; failedTracesDays: number }) {
    const now = Date.parse(input.now);
    const day = 86_400_000;
    const remove: string[] = [];
    const keep: string[] = [];
    for (const trace of input.traces) {
      const ageDays = (now - Date.parse(trace.timestamp)) / day;
      const limit = trace.failed ? input.failedTracesDays : input.rawTracesDays;
      if (!trace.referencedByActiveKnowledge && ageDays > limit) remove.push(trace.id); else keep.push(trace.id);
    }
    return { keep: keep.sort(), remove: remove.sort() };
  }
}
```

Tests pass `now='2026-08-09T00:00:00Z'`; assert 90-day/180-day cutoffs and that active-knowledge evidence is retained even when older than the cutoff. Do not use wall-clock time in domain assertions.

- [ ] **Step 9: Extend `MemoryLint.inspect()` to enforce all knowledge-health budgets and report staleness without rewriting facts**

```ts
// packages/kernel/src/memory-lint.ts — extend the code vocabulary and input
export type MemoryLintCode =
  | 'duplicate' | 'conflict' | 'orphan_relation' | 'missing_provenance'
  | 'low_evidence_active' | 'oversized_record' | 'scope_risk'
  | 'active_record_budget' | 'index_budget' | 'stale_active';

export interface MemoryLintBudget {
  maxActiveRecords: number;
  maxRecordTokens: number;
  maxIndexTokens: number;
}

inspect(input: {
  records: readonly KnowledgeRecord[];
  budget: MemoryLintBudget;
  renderedIndex: string;
  staleBefore?: string;
}): MemoryLintFinding[] {
  const { records, budget } = input;
  const findings = this.inspectRecordIntegrity(records, budget.maxRecordTokens);
  const active = records.filter((record) => record.status === 'active');
  if (active.length > budget.maxActiveRecords) {
    findings.push({
      code: 'active_record_budget', recordIds: active.map((r) => r.id).sort(), repairable: false,
      message: `active knowledge count ${active.length} exceeds ${budget.maxActiveRecords}`
    });
  }
  if (Math.ceil(input.renderedIndex.length / 4) > budget.maxIndexTokens) {
    findings.push({
      code: 'index_budget', recordIds: [], repairable: true,
      message: `derived index exceeds ${budget.maxIndexTokens} estimated tokens`
    });
  }
  if (input.staleBefore) {
    for (const record of active) {
      if (record.updatedAt < input.staleBefore) {
        findings.push({ code: 'stale_active', recordIds: [record.id], repairable: false, message: 'active record requires evidence review' });
      }
    }
  }
  return findings.sort((a, b) => a.code.localeCompare(b.code) || a.recordIds.join(':').localeCompare(b.recordIds.join(':')));
}
```

Keep the existing per-record checks in `inspectRecordIntegrity()`. Tests use the exact defaults `{ maxActiveRecords: 500, maxRecordTokens: 800, maxIndexTokens: 4000 }`; exceed each limit independently and assert the corresponding finding. `stale_active` is informational: age alone never changes a durable fact/decision or deletes evidence.

- [ ] **Step 10: Add the concrete incremental/full maintenance service used by runtime orchestration**

```ts
// packages/kernel/src/memory-maintenance.ts
import type { KnowledgeRecord } from '@aes/spec';
import { renderIndexMarkdown } from './knowledge-index.js';
import { MemoryLint, type MemoryLintBudget } from './memory-lint.js';
import { MemoryStore } from './memory-store.js';

export class MemoryMaintenanceService {
  constructor(private readonly deps: {
    store: MemoryStore;
    lint: MemoryLint;
    budget: MemoryLintBudget;
    staleBefore?: () => string | undefined;
  }) {}

  async incremental(): Promise<void> {
    const records = await this.deps.store.listRecords();
    const renderedIndex = renderIndexMarkdown(records);
    const findings = this.deps.lint.inspect({
      records,
      budget: this.deps.budget,
      renderedIndex,
      staleBefore: this.deps.staleBefore?.()
    });
    if (findings.some((finding) => finding.code === 'index_budget')) {
      await this.deps.store.rebuildIndexes();
    }
  }

  async full(): Promise<void> {
    const records = await this.deps.store.listRecords();
    // Full semantic consolidation is deterministic: exact duplicates share key,
    // scope, applicability, and statement. The first ID is canonical.
    const groups = new Map<string, KnowledgeRecord[]>();
    for (const record of records) {
      const key = JSON.stringify([record.key, record.scope, record.applicability ?? {}, record.statement]);
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) => a.id.localeCompare(b.id));
      const canonical = sorted[0]!;
      await this.deps.store.putRecord({
        ...canonical,
        evidenceRefs: [...new Set(sorted.flatMap((r) => r.evidenceRefs))].sort(),
        evaluationRefs: [...new Set(sorted.flatMap((r) => r.evaluationRefs))].sort(),
        updatedAt: sorted.map((r) => r.updatedAt).sort().at(-1)!
      });
      for (const duplicate of sorted.slice(1)) {
        await this.deps.store.putRecord({ ...duplicate, status: 'superseded', supersededBy: canonical.id });
      }
    }
    await this.deps.store.rebuildIndexes();
    await this.incremental();
  }
}
```

`memory-maintenance.test.ts` runs `full()` twice against the same temporary `.aes` directory and asserts byte-identical canonical records/indexes after the first pass. It also asserts that different applicability is never consolidated merely to reduce record count. Retention removal remains a separate explicit action based on `MemoryRetentionPlanner`; maintenance does not silently delete referenced evidence.

- [ ] **Step 11: Run kernel tests and commit**

Run:
```bash
pnpm --filter @aes/kernel build
pnpm --filter @aes/kernel test
```
Expected: PASS, including repeated compile/index rebuild idempotency.

```bash
git add packages/kernel
git commit -m "feat(memory): compile lint and retrieve bounded knowledge"
```

---

### Task 10: Learn interruption timing without suppressing required authority or safety prompts

**Files:**
- Modify: `packages/kernel/src/interruption-policy.ts`
- Create: `packages/kernel/src/interruption-scheduler.ts`
- Create: `packages/kernel/src/rejection-suppression.ts`
- Modify: `packages/kernel/src/__tests__/interruption-policy.test.ts`
- Create: `packages/kernel/src/__tests__/interruption-scheduler.test.ts`
- Create: `packages/kernel/src/__tests__/rejection-suppression.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: `InteractionEvidence`, `InterruptionUrgency`, optional `InterruptionPreferenceEffect`.
- Produces: `InterruptionScheduler.schedule()`, `RejectionSuppression.shouldSuppress()/record()`.
- Invariant: immediate blockers and explicit approval requirements are never suppressed by learned history.

- [ ] **Step 1: Write failing urgency/scheduling/suppression tests**

```ts
// interruption-scheduler.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { InterruptionScheduler } from '../interruption-scheduler.js';

test('immediate item is emitted now while boundary and digest items remain grouped', () => {
  const result = new InterruptionScheduler().schedule([
    { id: 'i', summary: 'ambiguous side effect', urgency: 'immediate' },
    { id: 'b', summary: 'authority proposal', urgency: 'boundary' },
    { id: 'd', summary: 'overlay degraded', urgency: 'digest' }
  ]);
  assert.deepEqual(result.immediate.map((x) => x.id), ['i']);
  assert.deepEqual(result.boundary.map((x) => x.id), ['b']);
  assert.deepEqual(result.digest.map((x) => x.id), ['d']);
});
```

```ts
// rejection-suppression.test.ts
const tracker = new RejectionSuppression({ runs: 5 });
tracker.record({ actionType: 'conversationTransition', applicabilityKey: 'session:a', decision: 'rejected', run: 10 });
assert.equal(tracker.shouldSuppress({ actionType: 'conversationTransition', applicabilityKey: 'session:a', run: 13 }), true);
assert.equal(tracker.shouldSuppress({ actionType: 'conversationTransition', applicabilityKey: 'session:changed', run: 13 }), false);
assert.equal(tracker.shouldSuppress({ actionType: 'conversationTransition', applicabilityKey: 'session:a', run: 16 }), false);
```

- [ ] **Step 2: Implement scheduler as a pure partitioner/batcher**

```ts
// packages/kernel/src/interruption-scheduler.ts
import type { InterruptionUrgency } from '@aes/spec';
export interface ScheduledInterruption { id: string; summary: string; urgency: InterruptionUrgency; }
export interface InterruptionSchedule {
  immediate: ScheduledInterruption[];
  boundary: ScheduledInterruption[];
  digest: ScheduledInterruption[];
}
export class InterruptionScheduler {
  schedule(items: readonly ScheduledInterruption[]): InterruptionSchedule {
    return {
      immediate: items.filter((x) => x.urgency === 'immediate'),
      boundary: items.filter((x) => x.urgency === 'boundary'),
      digest: items.filter((x) => x.urgency === 'digest')
    };
  }
}
```

- [ ] **Step 3: Implement scoped run-count suppression with material-context invalidation via key change**

```ts
// packages/kernel/src/rejection-suppression.ts
export class RejectionSuppression {
  readonly #lastRejected = new Map<string, number>();
  constructor(private readonly policy: { runs: number }) {}
  record(input: { actionType: string; applicabilityKey: string; decision: 'approved'|'rejected'|'modified'; run: number }): void {
    if (input.decision === 'rejected') this.#lastRejected.set(`${input.actionType}:${input.applicabilityKey}`, input.run);
    else this.#lastRejected.delete(`${input.actionType}:${input.applicabilityKey}`);
  }
  shouldSuppress(input: { actionType: string; applicabilityKey: string; run: number }): boolean {
    const rejectedAt = this.#lastRejected.get(`${input.actionType}:${input.applicabilityKey}`);
    return rejectedAt !== undefined && input.run - rejectedAt < this.policy.runs;
  }
}
```

- [ ] **Step 4: Update `InterruptionPolicy` urgency rules and keep hard blockers dominant**

Rules encoded in code/tests:

```ts
const hardImmediate = input.authorityIncrease || input.durableConflict || input.capabilityFailure ||
  (input.confidence === 'low' && input.impact === 'high');
if (hardImmediate) return { interrupt: true, urgency: 'immediate', reasons };
if (input.controlOutcome === 'request_approval') return { interrupt: true, urgency: 'boundary', reasons };
if (input.controlOutcome === 'recommend') {
  if (advice?.suppressRoutinePrompt) return { interrupt: false, urgency: advice.schedule ?? 'digest', reasons: ['learned routine prompt suppression'] };
  return { interrupt: true, urgency: advice?.schedule ?? 'boundary', reasons };
}
return { interrupt: false, urgency: 'digest', reasons };
```

- [ ] **Step 5: Run tests and commit**

Run:
```bash
pnpm --filter @aes/kernel build
pnpm --filter @aes/kernel test
```
Expected: PASS; hard authority prompt test explicitly passes even when learned suppression advice is supplied.

```bash
git add packages/kernel
git commit -m "feat(interaction): learn interruption timing and rejection suppression"
```

---

### Task 11: Persist scoped authority evidence, require explicit promotion, and apply automatic degradation through Control Engine

**Files:**
- Modify: `packages/kernel/src/authority-learning.ts`
- Modify: `packages/kernel/src/control-engine.ts`
- Modify: `packages/kernel/src/__tests__/authority-learning.test.ts`
- Modify: `packages/kernel/src/__tests__/control-engine.test.ts`
- Create: `packages/runtime/src/interaction-learning-coordinator.ts`
- Create: `packages/runtime/src/__tests__/interaction-learning-coordinator.test.ts`
- Create: `packages/runtime/src/__tests__/helpers/in-memory-learning-artifact-store.ts`
- Modify: `packages/runtime/src/index.ts`

**Interfaces:**
- Consumes: persisted `InteractionEvidence[]`, current `ControlMode`, exact target applicability, accepted `ScopedAuthorityGrant[]`.
- Produces: scoped `AuthorityCandidate`, explicit `ScopedAuthorityGrant`, persisted interaction/authority state, and applicability-aware authority resolution.
- Invariants: proposal ≠ grant; `assisted -> autonomous` requires explicit `approved=true`; `autonomous -> assisted` may be written automatically after verified regression; unrelated applicability evidence never broadens a candidate/grant.

- [ ] **Step 1: Write failing authority-learning tests proving exact applicability aggregation and proposal ≠ grant**

```ts
// authority-learning.test.ts additions
const evidence = Array.from({ length: 15 }, (_, i) => ({
  id: `planning-${i}`, actionType: 'modelRouting',
  applicability: { stage: 'planning', architecturalDecisionRequired: true },
  currentMode: 'assisted' as const, proposedMode: 'autonomous' as const,
  userDecision: 'approved' as const, urgency: 'boundary' as const,
  verifiedOutcome: 'passed' as const, timestamp: '2026-08-09T00:00:00Z'
}));
const unrelated = Array.from({ length: 20 }, (_, i) => ({
  ...evidence[0]!, id: `execution-${i}`, applicability: { stage: 'execution' as const }
}));
const target = { stage: 'planning', architecturalDecisionRequired: true } as const;
const candidate = engine.evaluateInteractions({
  actionType: 'modelRouting', scope: 'project', current: 'assisted', applicability: target,
  evidence: [...evidence, ...unrelated], now: '2026-08-09T00:00:00Z'
});
assert.equal(candidate?.approvalCount, 15);
assert.deepEqual(candidate?.applicability, target);
assert.throws(() => engine.acceptCandidate(candidate!, false, '2026-08-09T00:00:00Z'));
const grant = engine.acceptCandidate(candidate!, true, '2026-08-09T00:00:00Z');
assert.equal(grant.mode, 'autonomous');
assert.equal(grant.sourceCandidateId, candidate?.id);
```

- [ ] **Step 2: Extend `AuthorityLearning` while preserving the old aggregate `evaluate()` API**

```ts
// packages/kernel/src/authority-learning.ts additions
import type {
  Applicability, AuthorityCandidate, ControlActionType, InteractionEvidence, ScopedAuthorityGrant
} from '@aes/spec';
import { applicabilityKey } from './task-signature.js';

// Extend the constructor policy compatibly:
// { promotionSamples: number; regressionRate: number; maxPromotionRejections?: number }
// Existing callers that omit maxPromotionRejections retain the M3 behavior of zero allowed rejections.

evaluateInteractions(input: {
  actionType: ControlActionType;
  scope: 'project'|'user';
  current: ControlMode;
  applicability: Applicability;
  evidence: readonly InteractionEvidence[];
  now: string;
}): AuthorityCandidate | undefined {
  if (input.current === 'autonomous') return undefined;
  const targetKey = applicabilityKey(input.applicability);
  const rows = input.evidence.filter((e) =>
    e.actionType === input.actionType && applicabilityKey(e.applicability) === targetKey);
  const approvals = rows.filter((e) => e.userDecision === 'approved').length;
  const rejections = rows.filter((e) => e.userDecision === 'rejected').length;
  const successes = rows.filter((e) => e.userDecision === 'approved' && e.verifiedOutcome === 'passed').length;
  const allowedRejections = this.policy.maxPromotionRejections ?? 0;
  if (approvals < this.policy.promotionSamples || rejections > allowedRejections || successes !== approvals) return undefined;
  return {
    id: `authority:${input.scope}:${input.actionType}:${targetKey}:${input.now}`,
    actionType: input.actionType,
    scope: input.scope,
    applicability: input.applicability,
    currentMode: input.current,
    proposedMode: 'autonomous',
    approvalCount: approvals,
    rejectionCount: rejections,
    verifiedSuccessCount: successes,
    evidenceRefs: rows.map((e) => e.id).sort(),
    createdAt: input.now
  };
}

acceptCandidate(candidate: AuthorityCandidate, approved: boolean, now: string): ScopedAuthorityGrant {
  if (!approved) throw new Error('AES authority increase requires explicit user approval');
  return {
    id: `grant:${candidate.id}`,
    actionType: candidate.actionType,
    scope: candidate.scope,
    applicability: candidate.applicability,
    mode: 'autonomous',
    grantedAt: now,
    updatedAt: now,
    sourceCandidateId: candidate.id
  };
}
```

Keep the existing `evaluate()` method as the compatibility/automatic-degradation primitive, changing only its promotion check from `rejections === 0` to `rejections <= (this.policy.maxPromotionRejections ?? 0)` so configured M4 behavior and legacy default behavior agree. Add a regression test showing that after `degrade_to_assisted`, fresh evidence does not itself create or accept an autonomous grant.

- [ ] **Step 3: Make accepted scoped grants an optional Control Engine input with explicit/session decisions still dominant**

```ts
// packages/kernel/src/control-engine.ts
import type { ScopedAuthorityGrant, TaskSignature } from '@aes/spec';
import { matchesApplicability } from './task-signature.js';

export interface ControlScopes {
  aes: ControlConfig;
  user?: ControlConfig;
  project?: ControlConfig;
  session?: ControlConfig;
  explicit?: Partial<Record<ControlActionType, ControlMode>>;
  authorityContext?: TaskSignature;
  acceptedAuthority?: readonly ScopedAuthorityGrant[];
}

function matchingGrant(
  action: ControlActionType,
  scope: 'user'|'project',
  context: TaskSignature | undefined,
  grants: readonly ScopedAuthorityGrant[] | undefined
): ScopedAuthorityGrant | undefined {
  if (!context || !grants) return undefined;
  return grants
    .filter((grant) => grant.actionType === action && grant.scope === scope && matchesApplicability(context, grant.applicability))
    .sort((a, b) => {
      const sa = Object.values(a.applicability).filter((value) => value !== undefined).length;
      const sb = Object.values(b.applicability).filter((value) => value !== undefined).length;
      return sb - sa || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
    })[0];
}

resolveMode(action: ControlActionType, scopes: ControlScopes): ControlMode {
  let mode = scopes.aes.actions?.[action] ?? scopes.aes.default;
  if (scopes.user) mode = scopes.user.actions?.[action] ?? scopes.user.default;
  mode = matchingGrant(action, 'user', scopes.authorityContext, scopes.acceptedAuthority)?.mode ?? mode;
  if (scopes.project) mode = scopes.project.actions?.[action] ?? scopes.project.default;
  mode = matchingGrant(action, 'project', scopes.authorityContext, scopes.acceptedAuthority)?.mode ?? mode;
  if (scopes.session) mode = scopes.session.actions?.[action] ?? scopes.session.default;
  return scopes.explicit?.[action] ?? mode;
}
```

Add tests with one accepted planning grant: matching planning resolves `autonomous`; execution remains the underlying `assisted`; session `manual` overrides the durable grant; an explicit current `manual` choice overrides everything. No grant is accepted by this method—it only consumes already approved state.

- [ ] **Step 4: Create the runtime interaction coordinator that persists evidence/candidates/grants and performs conservative degradation**

```ts
// packages/runtime/src/interaction-learning-coordinator.ts
import type {
  Applicability, AuthorityCandidate, ControlMode, InteractionEvidence, ScopedAuthorityGrant
} from '@aes/spec';
import type { LearningArtifactStore, RuntimeObservationSink } from '@aes/runtime-sdk';
import { applicabilityKey, AuthorityLearning } from '@aes/kernel';

export class InteractionLearningCoordinator {
  constructor(private readonly deps: {
    authority: AuthorityLearning;
    artifacts: LearningArtifactStore;
    observations?: RuntimeObservationSink;
    now: () => string;
  }) {}

  async record(input: InteractionEvidence): Promise<{
    candidate?: AuthorityCandidate;
    degradedGrant?: ScopedAuthorityGrant;
  }> {
    await this.deps.artifacts.appendInteraction(input);
    const all = await this.deps.artifacts.listInteractions();
    const key = applicabilityKey(input.applicability);
    const rows = all.filter((row) => row.actionType === input.actionType && applicabilityKey(row.applicability) === key);

    if (input.currentMode !== 'autonomous') {
      const candidate = this.deps.authority.evaluateInteractions({
        actionType: input.actionType,
        scope: 'project',
        current: input.currentMode,
        applicability: input.applicability,
        evidence: rows,
        now: this.deps.now()
      });
      if (!candidate) return {};
      await this.deps.artifacts.putAuthorityCandidate(candidate);
      this.deps.observations?.emit({ type: 'interaction.authority_candidate.created', candidateId: candidate.id, actionType: candidate.actionType });
      return { candidate };
    }

    const approvals = rows.filter((row) => row.userDecision === 'approved').length;
    const rejections = rows.filter((row) => row.userDecision === 'rejected').length;
    const verifiedSuccesses = rows.filter((row) => row.verifiedOutcome === 'passed').length;
    const regressions = rows.filter((row) => row.verifiedOutcome === 'failed').length;
    const result = this.deps.authority.evaluate({
      current: 'autonomous', approvals, rejections, verifiedSuccesses, regressions
    });
    if (result.action !== 'degrade_to_assisted') return {};

    const grants = await this.deps.artifacts.listAuthorityGrants();
    const grant = grants.find((item) => item.actionType === input.actionType && applicabilityKey(item.applicability) === key && item.mode === 'autonomous');
    if (!grant) return {};
    const degradedGrant = { ...grant, mode: 'assisted' as const, updatedAt: this.deps.now() };
    await this.deps.artifacts.putAuthorityGrant(degradedGrant);
    this.deps.observations?.emit({ type: 'authority.degraded', actionType: grant.actionType, scope: grant.scope });
    return { degradedGrant };
  }

  async accept(candidateId: string, approved: boolean): Promise<ScopedAuthorityGrant> {
    const candidate = (await this.deps.artifacts.listAuthorityCandidates()).find((item) => item.id === candidateId);
    if (!candidate) throw new Error(`unknown authority candidate ${candidateId}`);
    const grant = this.deps.authority.acceptCandidate(candidate, approved, this.deps.now());
    await this.deps.artifacts.putAuthorityGrant(grant);
    return grant;
  }
}
```

`record()` is the integration API for the UI/control boundary that actually knows whether a user approved/rejected/modified an assisted decision. AES MUST NOT infer approval from a generic `request_approval` result. This keeps evidence truthful. The M4 coordinator deliberately creates **project-scoped** authority candidates only; it does not turn one project's approval history into a user-scope proposal. Future user-scope authority generalization requires cross-project evidence plus a separate explicit promotion flow.

- [ ] **Step 5: Add one exact in-memory artifact-store test helper and write the end-to-end authority-state test**

Create `packages/runtime/src/__tests__/helpers/in-memory-learning-artifact-store.ts` once and reuse it in later runtime learning tests:

```ts
import type {
  AuthorityCandidate, InteractionEvidence, LearningCandidate, LearningEvaluation,
  PolicyOverlay, ScopedAuthorityGrant, ShadowDecisionTrace
} from '@aes/spec';
import type { LearningArtifactStore } from '@aes/runtime-sdk';

export class InMemoryLearningArtifactStore implements LearningArtifactStore {
  candidates = new Map<string, LearningCandidate>();
  evaluations = new Map<string, LearningEvaluation>();
  overlays = new Map<string, PolicyOverlay>();
  shadowDecisions: ShadowDecisionTrace[] = [];
  interactions = new Map<string, InteractionEvidence>();
  authorityCandidates = new Map<string, AuthorityCandidate>();
  authorityGrants = new Map<string, ScopedAuthorityGrant>();
  async putCandidate(v: LearningCandidate) { this.candidates.set(v.id, structuredClone(v)); }
  async putEvaluation(v: LearningEvaluation) { this.evaluations.set(v.id, structuredClone(v)); }
  async putOverlay(v: PolicyOverlay) { this.overlays.set(v.id, structuredClone(v)); }
  async putShadowDecision(v: ShadowDecisionTrace) { this.shadowDecisions.push(structuredClone(v)); }
  async appendInteraction(v: InteractionEvidence) { this.interactions.set(v.id, structuredClone(v)); }
  async putAuthorityCandidate(v: AuthorityCandidate) { this.authorityCandidates.set(v.id, structuredClone(v)); }
  async putAuthorityGrant(v: ScopedAuthorityGrant) { this.authorityGrants.set(v.id, structuredClone(v)); }
  async listCandidates() { return [...this.candidates.values()].sort((a,b) => a.id.localeCompare(b.id)); }
  async listOverlays() { return [...this.overlays.values()].sort((a,b) => a.id.localeCompare(b.id)); }
  async listInteractions() { return [...this.interactions.values()].sort((a,b) => a.id.localeCompare(b.id)); }
  async listAuthorityCandidates() { return [...this.authorityCandidates.values()].sort((a,b) => a.id.localeCompare(b.id)); }
  async listAuthorityGrants() { return [...this.authorityGrants.values()].sort((a,b) => a.id.localeCompare(b.id)); }
}
```

Then use it in `interaction-learning-coordinator.test.ts`:

```ts
for (const row of fifteenVerifiedPlanningApprovals) await coordinator.record(row);
const proposal = (await artifacts.listAuthorityCandidates())[0]!;
assert.equal(proposal.scope, 'project');

// Proposal alone changes nothing.
assert.equal(control.resolveMode('modelRouting', assistedScopes(planningSignature, await artifacts.listAuthorityGrants())), 'assisted');
await assert.rejects(() => coordinator.accept(proposal.id, false));
assert.equal((await artifacts.listAuthorityGrants()).length, 0);

await coordinator.accept(proposal.id, true);
assert.equal(control.resolveMode('modelRouting', assistedScopes(planningSignature, await artifacts.listAuthorityGrants())), 'autonomous');
assert.equal(control.resolveMode('modelRouting', assistedScopes(executionSignature, await artifacts.listAuthorityGrants())), 'assisted');

for (const row of regressiveAutonomousPlanningEvidence) await coordinator.record(row);
const degraded = (await artifacts.listAuthorityGrants()).find((grant) => grant.sourceCandidateId === proposal.id)!;
assert.equal(degraded.mode, 'assisted');
assert.equal(control.resolveMode('modelRouting', assistedScopes(planningSignature, await artifacts.listAuthorityGrants())), 'assisted');
```

Also mix 20 successful execution approvals into the fixture before proposal creation and assert the planning candidate still contains only the 15 matching evidence refs.

- [ ] **Step 6: Run spec/kernel/runtime tests and commit**

Run:
```bash
pnpm --filter @aes/spec build
pnpm --filter @aes/kernel build
pnpm --filter @aes/runtime build
pnpm --filter @aes/kernel test
pnpm --filter @aes/runtime test
```
Expected: PASS; accepted authority is scoped, explicit/session overrides remain stronger, no proposal grants itself, and verified regression actually changes the stored grant to `assisted`.

```bash
git add packages/kernel packages/runtime
git commit -m "feat(authority): persist scoped grants and degrade them safely"
```

---

### Task 12: Add natural → replay → controlled evidence acquisition with budgets, authority, and sandbox safety

**Files:**
- Create: `packages/kernel/src/evidence-acquisition-policy.ts`
- Create: `packages/kernel/src/controlled-evaluation-policy.ts`
- Create: `packages/kernel/src/__tests__/evidence-acquisition-policy.test.ts`
- Create: `packages/kernel/src/__tests__/controlled-evaluation-policy.test.ts`
- Create: `packages/runtime/src/replay-evaluation-runner.ts`
- Create: `packages/runtime/src/controlled-evaluation-runner.ts`
- Create: `packages/runtime/src/evidence-acquisition-coordinator.ts`
- Create: `packages/runtime/src/__tests__/replay-evaluation-runner.test.ts`
- Create: `packages/runtime/src/__tests__/controlled-evaluation-runner.test.ts`
- Create: `packages/runtime/src/__tests__/evidence-acquisition-coordinator.test.ts`
- Modify: `packages/runtime/src/index.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes: `ReplayEvaluationExecutor`, `ControlledEvaluationFixture`, `ControlledEvaluationExecutor`, `ResourcePolicyEngine`, `RuntimeControlBridge`, candidate economics.
- Produces: `EvidenceAcquisitionPolicy.choose()`, `ReplayEvaluationRunner.run()`, `ControlledEvaluationPolicy.decide()`, `ControlledEvaluationUsageStore`, `ControlledEvaluationRunner.run()`, and concrete `EvidenceAcquisitionCoordinator.enrich()` used by Task 14.
- Invariants: natural evidence wins when sufficient; replay wins before live evaluation; live evaluation requires side-effect risk `none`, sandbox, resource policy, run-count budget, and Control Engine permission.

- [ ] **Step 1: Write failing evidence-source ordering tests**

```ts
// packages/kernel/src/__tests__/evidence-acquisition-policy.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceAcquisitionPolicy } from '../evidence-acquisition-policy.js';

test('natural evidence is preferred over replay and live controlled evaluation', () => {
  const policy = new EvidenceAcquisitionPolicy();
  assert.equal(policy.choose({ naturalComparativeSufficient: true, replayAvailable: true, liveEligible: true }), 'natural');
  assert.equal(policy.choose({ naturalComparativeSufficient: false, replayAvailable: true, liveEligible: true }), 'replay');
  assert.equal(policy.choose({ naturalComparativeSufficient: false, replayAvailable: false, liveEligible: true }), 'controlled');
  assert.equal(policy.choose({ naturalComparativeSufficient: false, replayAvailable: false, liveEligible: false }), 'unresolved');
});
```

- [ ] **Step 2: Implement deterministic source selection**

```ts
// packages/kernel/src/evidence-acquisition-policy.ts
export class EvidenceAcquisitionPolicy {
  choose(input: {
    naturalComparativeSufficient: boolean;
    replayAvailable: boolean;
    liveEligible: boolean;
  }): 'natural' | 'replay' | 'controlled' | 'unresolved' {
    if (input.naturalComparativeSufficient) return 'natural';
    if (input.replayAvailable) return 'replay';
    if (input.liveEligible) return 'controlled';
    return 'unresolved';
  }
}
```

- [ ] **Step 3: Write failing replay-runner tests proving replay produces evidence only**

```ts
// packages/runtime/src/__tests__/replay-evaluation-runner.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ReplayEvaluationRunner } from '../replay-evaluation-runner.js';

const replayEvidence = [{ id: 'replay:e1' }] as never;
const executor = {
  calls: 0,
  async replay(input: { candidateId: string; evidenceRefs: string[] }) {
    this.calls += 1;
    assert.equal(input.candidateId, 'c1');
    return replayEvidence;
  }
};

test('replay runner returns evidence without any overlay activation API', async () => {
  const result = await new ReplayEvaluationRunner(executor).run({ candidateId: 'c1', evidenceRefs: ['e1'] });
  assert.equal(executor.calls, 1);
  assert.deepEqual(result, replayEvidence.map((row) => ({ ...row, origin: 'replay' })));
});
```

- [ ] **Step 4: Implement the replay runner as a thin neutral boundary**

```ts
// packages/runtime/src/replay-evaluation-runner.ts
import type { ReplayEvaluationExecutor } from '@aes/runtime-sdk';

export class ReplayEvaluationRunner {
  constructor(private readonly executor: ReplayEvaluationExecutor) {}
  async run(input: { candidateId: string; evidenceRefs: string[] }) {
    const evidence = await this.executor.replay(input);
    return evidence.map((row) => ({ ...row, origin: 'replay' as const }));
  }
}
```

- [ ] **Step 5: Write failing expected-learning-value tests for live evaluation eligibility**

```ts
// packages/kernel/src/__tests__/controlled-evaluation-policy.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ControlledEvaluationPolicy } from '../controlled-evaluation-policy.js';

test('live evaluation runs only when expected learning value justifies its cost', () => {
  const policy = new ControlledEvaluationPolicy({ minimumValueRatio: 2 });
  assert.equal(policy.decide({ expectedReuse: 1000, savingPerUse: .10, actionableProbability: .5, evaluationCost: .50 }).run, true);
  assert.equal(policy.decide({ expectedReuse: 10, savingPerUse: .001, actionableProbability: .5, evaluationCost: 2 }).run, false);
});
```

- [ ] **Step 6: Implement the simple deterministic learning-value heuristic**

```ts
// packages/kernel/src/controlled-evaluation-policy.ts
export class ControlledEvaluationPolicy {
  constructor(private readonly policy: { minimumValueRatio: number }) {}

  decide(input: {
    expectedReuse: number;
    savingPerUse: number;
    actionableProbability: number;
    evaluationCost: number;
  }): { run: boolean; expectedValue: number; ratio: number } {
    const expectedValue = input.expectedReuse * input.savingPerUse * input.actionableProbability;
    const ratio = input.evaluationCost <= 0 ? Number.POSITIVE_INFINITY : expectedValue / input.evaluationCost;
    return { run: ratio >= this.policy.minimumValueRatio, expectedValue, ratio };
  }
}
```

- [ ] **Step 7: Write failing controlled-runner tests for sandbox, daily resource budgets, unknown usage, authority, and max runs**

```ts
// packages/runtime/src/__tests__/controlled-evaluation-runner.test.ts
const fixture = {
  id: 'f1', candidateId: 'c1', signature,
  sandboxPath: '/tmp/aes-eval', sideEffectRisk: 'none' as const
};
const projected = {
  totalTokens: 5_000,
  estimatedCost: { amount: 0.05, currency: 'USD' }
};

const completed = await allowedRunner.run({
  candidateId: 'c1', fixture, dayScopeKey: 'learning:2026-08-09', projected
});
assert.equal(completed.outcome, 'completed');
assert.equal(completed.result?.evidence.origin, 'controlled');
assert.equal(allowedExecutor.calls, 1);

const denied = await budgetDeniedRunner.run({
  candidateId: 'c1', fixture, dayScopeKey: 'learning:2026-08-09',
  projected: { totalTokens: 200_000, estimatedCost: { amount: 0.05, currency: 'USD' } }
});
assert.equal(denied.outcome, 'awaiting_budget_override');
assert.equal(deniedExecutor.calls, 0);

const sideEffecting = await allowedRunner.run({
  candidateId: 'c2', fixture: { ...fixture, candidateId: 'c2', sideEffectRisk: 'material' },
  dayScopeKey: 'learning:2026-08-09', projected
});
assert.equal(sideEffecting.outcome, 'blocked');
assert.equal(allowedExecutor.calls, 1); // only the earlier allowed `c1` call executed

const noSandbox = await allowedRunner.run({
  candidateId: 'c2', fixture: { ...fixture, candidateId: 'c2', sandboxPath: '' },
  dayScopeKey: 'learning:2026-08-09', projected
});
assert.equal(noSandbox.outcome, 'blocked');

const unknownProjection = await allowedRunner.run({
  candidateId: 'c2', fixture: { ...fixture, candidateId: 'c2' },
  dayScopeKey: 'learning:2026-08-09', projected: {}
});
assert.equal(unknownProjection.outcome, 'blocked');

for (let i = 0; i < 5; i += 1) {
  await maxRunRunner.run({ candidateId: 'c3', fixture: { ...fixture, candidateId: 'c3' }, dayScopeKey: 'learning:2026-08-09', projected });
}
const sixth = await maxRunRunner.run({ candidateId: 'c3', fixture: { ...fixture, candidateId: 'c3' }, dayScopeKey: 'learning:2026-08-09', projected });
assert.equal(sixth.outcome, 'max_runs_reached');
assert.equal(maxRunExecutor.calls, 5);
```

Add a fixture whose first completed eval returns no token/cost telemetry. The second eval on the same day must return `blocked: usage_unknown_for_configured_budget`; unknown measured usage is never converted to zero. Add a different-currency projected cost and assert it is blocked before the executor call.

- [ ] **Step 8: Implement a daily usage store that preserves unknown token/cost coverage**

```ts
// packages/runtime/src/controlled-evaluation-runner.ts
import type { Money, ResourceUsageSnapshot } from '@aes/runtime-sdk';

export interface ControlledEvaluationUsageStore {
  candidateRuns(candidateId: string): Promise<number>;
  daily(scopeKey: string, costCurrency?: string): Promise<{ completedRuns: number; usage: ResourceUsageSnapshot }>;
  record(scopeKey: string, candidateId: string, evidence: LearningEvidence): Promise<void>;
}

interface DailyState {
  completedRuns: number;
  tokensKnown: boolean;
  totalTokens: number;
  costKnown: boolean;
  cost?: Money;
}

export class InMemoryControlledEvaluationUsageStore implements ControlledEvaluationUsageStore {
  readonly #candidateRuns = new Map<string, number>();
  readonly #daily = new Map<string, DailyState>();

  async candidateRuns(candidateId: string): Promise<number> {
    return this.#candidateRuns.get(candidateId) ?? 0;
  }

  async daily(scopeKey: string, costCurrency?: string) {
    const state = this.#daily.get(scopeKey);
    if (!state) {
      return {
        completedRuns: 0,
        usage: {
          totalTokens: 0,
          ...(costCurrency ? { estimatedCost: { amount: 0, currency: costCurrency } } : {})
        }
      };
    }
    return {
      completedRuns: state.completedRuns,
      usage: {
        ...(state.tokensKnown ? { totalTokens: state.totalTokens } : {}),
        ...(state.costKnown && state.cost ? { estimatedCost: state.cost } : {})
      }
    };
  }

  async record(scopeKey: string, candidateId: string, evidence: LearningEvidence): Promise<void> {
    this.#candidateRuns.set(candidateId, (this.#candidateRuns.get(candidateId) ?? 0) + 1);
    const current = this.#daily.get(scopeKey) ?? {
      completedRuns: 0, tokensKnown: true, totalTokens: 0, costKnown: true
    };
    current.completedRuns += 1;
    if (evidence.totalTokens === undefined) current.tokensKnown = false;
    else if (current.tokensKnown) current.totalTokens += evidence.totalTokens;

    if (!evidence.estimatedCost) current.costKnown = false;
    else if (current.costKnown && !current.cost) current.cost = { ...evidence.estimatedCost };
    else if (current.costKnown && current.cost?.currency === evidence.estimatedCost.currency) current.cost.amount += evidence.estimatedCost.amount;
    else current.costKnown = false;
    this.#daily.set(scopeKey, current);
  }
}
```

The in-memory implementation is for the reference runtime/tests; the interface permits a durable/distributed implementation later without changing policy logic.

- [ ] **Step 9: Implement the controlled runner with unknown-usage, resource, budget-override, and authority gates in that order**

```ts
// packages/runtime/src/controlled-evaluation-runner.ts
import type {
  ControlledEvaluationExecutor,
  ControlledEvaluationFixture,
  ResourceBudget,
  ResourceUsageSnapshot,
  RuntimeControlBridge,
  RuntimeObservationSink
} from '@aes/runtime-sdk';
import { ResourcePolicyEngine } from './resource-policy.js';

export class ControlledEvaluationRunner {
  constructor(private readonly deps: {
    executor: ControlledEvaluationExecutor;
    resources: ResourcePolicyEngine;
    control: RuntimeControlBridge;
    usage: ControlledEvaluationUsageStore;
    budget: ResourceBudget;
    sandboxOnly: boolean;
    maxRunsPerCandidate: number;
    observations?: RuntimeObservationSink;
  }) {}

  async run(input: {
    candidateId: string;
    fixture: ControlledEvaluationFixture;
    dayScopeKey: string;
    projected: ResourceUsageSnapshot;
    now?: number;
  }) {
    if (input.fixture.sideEffectRisk !== 'none') {
      return { outcome: 'blocked' as const, reason: 'controlled evaluation forbids external side effects' };
    }
    if (this.deps.sandboxOnly && input.fixture.sandboxPath.length === 0) {
      return { outcome: 'blocked' as const, reason: 'sandbox path is required' };
    }
    if (await this.deps.usage.candidateRuns(input.candidateId) >= this.deps.maxRunsPerCandidate) {
      return { outcome: 'max_runs_reached' as const };
    }

    const currency = this.deps.budget.maxEstimatedCost?.currency;
    const daily = await this.deps.usage.daily(input.dayScopeKey, currency);
    if (daily.completedRuns > 0 && this.deps.budget.maxTotalTokens !== undefined && daily.usage.totalTokens === undefined) {
      return { outcome: 'blocked' as const, reason: 'usage_unknown_for_configured_budget' };
    }
    if (daily.completedRuns > 0 && this.deps.budget.maxEstimatedCost && daily.usage.estimatedCost === undefined) {
      return { outcome: 'blocked' as const, reason: 'usage_unknown_for_configured_budget' };
    }
    if (this.deps.budget.maxTotalTokens !== undefined && input.projected.totalTokens === undefined) {
      return { outcome: 'blocked' as const, reason: 'projected_tokens_unknown' };
    }
    if (this.deps.budget.maxEstimatedCost &&
        (!input.projected.estimatedCost || input.projected.estimatedCost.currency !== this.deps.budget.maxEstimatedCost.currency)) {
      return { outcome: 'blocked' as const, reason: 'projected_cost_unknown_or_incomparable' };
    }

    const resource = await this.deps.resources.evaluate({
      scopeKey: input.dayScopeKey,
      budget: this.deps.budget,
      usage: daily.usage,
      projected: input.projected,
      now: input.now
    });
    if (resource.outcome === 'throttle') return { outcome: 'throttled' as const, resource };
    if (resource.outcome === 'deny') {
      const override = await this.deps.control.authorize({
        id: `controlled-eval-budget:${input.candidateId}:${input.fixture.id}`,
        type: 'controlledEvaluationBudgetOverride',
        source: 'experience-engine',
        reason: 'controlled evaluation exceeds the configured learning resource budget',
        confidence: 'high',
        payload: { candidateId: input.candidateId, fixtureId: input.fixture.id, resource }
      });
      if (override.outcome !== 'execute') {
        return { outcome: 'awaiting_budget_override' as const, authorization: override, resource };
      }
    }

    this.deps.observations?.emit({
      type: 'controlled_eval.requested', candidateId: input.candidateId, fixtureId: input.fixture.id
    });
    const authorization = await this.deps.control.authorize({
      id: `controlled-eval:${input.candidateId}:${input.fixture.id}`,
      type: 'controlledEvaluation',
      source: 'experience-engine',
      reason: 'bounded evidence collection for a learning candidate',
      confidence: 'high',
      payload: { candidateId: input.candidateId, fixtureId: input.fixture.id }
    });
    if (authorization.outcome !== 'execute') {
      return { outcome: 'awaiting_control' as const, authorization, resource };
    }

    const raw = await this.deps.executor.evaluate(input.fixture);
    const result = { ...raw, evidence: { ...raw.evidence, origin: 'controlled' as const } };
    await this.deps.usage.record(input.dayScopeKey, input.candidateId, result.evidence);
    this.deps.observations?.emit({
      type: 'controlled_eval.completed', candidateId: input.candidateId, fixtureId: input.fixture.id, outcome: 'completed', evidenceId: result.evidence.id
    });
    return { outcome: 'completed' as const, result, resource };
  }
}
```

Task 15 provides the config-to-`ResourceBudget` helper: `maxTokensPerDay -> maxTotalTokens`; `maxCostPerDay` maps only when an explicit pricing currency is known. If currency is unavailable, construction of live controlled-eval resources fails closed and natural/replay learning continues.

- [ ] **Step 10: Add the concrete acquisition coordinator used by the adaptive lifecycle**

Write the failing test first:

```ts
// packages/runtime/src/__tests__/evidence-acquisition-coordinator.test.ts
const coordinator = new EvidenceAcquisitionCoordinator({
  sources: new EvidenceAcquisitionPolicy(),
  replay: {
    nextInput: async () => ({ candidateId: 'c1', evidenceRefs: ['e1'] }),
    runner: replayRunner
  },
  controlled: {
    policy: new ControlledEvaluationPolicy({ minimumValueRatio: 2 }),
    economics: () => ({ expectedReuse: 1000, savingPerUse: .10, actionableProbability: .5, evaluationCost: .50 }),
    nextInput: async () => controlledInput,
    runner: controlledRunner
  }
});

const fromReplay = await coordinator.enrich(observationalCandidate, evidence, keepEvaluation);
assert.equal(replayExecutor.calls, 1);
assert.equal(controlledExecutor.calls, 0);
assert.ok(fromReplay.every((row) => row.origin === 'replay'));

// Once replay input is exhausted, a still-unresolved valuable candidate may use controlled evaluation.
replaySource.nextInput = async () => undefined;
const fromControlled = await coordinator.enrich(observationalCandidate, evidence, keepEvaluation);
assert.equal(controlledExecutor.calls, 1);
assert.equal(fromControlled[0]?.origin, 'controlled');

// Already-sufficient comparative evidence never spends replay/live resources.
const none = await coordinator.enrich(comparativeCandidate, comparativeEvidence, validatedVolumeEvaluation);
assert.deepEqual(none, []);
```

Implement the coordinator without any policy-activation API:

```ts
// packages/runtime/src/evidence-acquisition-coordinator.ts
import type { LearningCandidate, LearningEvaluation, LearningEvidence } from '@aes/spec';
import { ControlledEvaluationPolicy, EvidenceAcquisitionPolicy } from '@aes/kernel';
import type { ReplayEvaluationRunner } from './replay-evaluation-runner.js';
import type { ControlledEvaluationRunner } from './controlled-evaluation-runner.js';

export class EvidenceAcquisitionCoordinator {
  constructor(private readonly deps: {
    sources: EvidenceAcquisitionPolicy;
    replay?: {
      nextInput(candidate: LearningCandidate): Promise<{ candidateId: string; evidenceRefs: string[] } | undefined>;
      runner: ReplayEvaluationRunner;
    };
    controlled?: {
      policy: ControlledEvaluationPolicy;
      economics(candidate: LearningCandidate): {
        expectedReuse: number; savingPerUse: number; actionableProbability: number; evaluationCost: number;
      };
      nextInput(candidate: LearningCandidate): Promise<Parameters<ControlledEvaluationRunner['run']>[0] | undefined>;
      runner: ControlledEvaluationRunner;
    };
  }) {}

  async enrich(
    candidate: LearningCandidate,
    _evidence: readonly LearningEvidence[],
    evaluation: LearningEvaluation
  ): Promise<readonly LearningEvidence[]> {
    const naturalComparativeSufficient =
      candidate.evidenceStrength !== 'observational' && evaluation.evidenceVolume.passed;
    if (naturalComparativeSufficient) return [];

    const replayInput = await this.deps.replay?.nextInput(candidate);
    const liveDecision = this.deps.controlled
      ? this.deps.controlled.policy.decide(this.deps.controlled.economics(candidate))
      : { run: false };
    const source = this.deps.sources.choose({
      naturalComparativeSufficient: false,
      replayAvailable: replayInput !== undefined,
      liveEligible: liveDecision.run
    });
    if (source === 'replay' && replayInput && this.deps.replay) {
      return this.deps.replay.runner.run(replayInput);
    }
    if (source === 'controlled' && this.deps.controlled) {
      const input = await this.deps.controlled.nextInput(candidate);
      if (!input) return [];
      const result = await this.deps.controlled.runner.run(input);
      return result.outcome === 'completed' ? [result.result.evidence] : [];
    }
    return [];
  }
}
```

This coordinator only acquires evidence. It never persists an overlay or changes production routing. A replay source must mark a fixture consumed/return `undefined` when it has no new evidence; otherwise repeated `keep_candidate` evaluations would repeatedly replay the same fixture.

- [ ] **Step 11: Export all acquisition components and run targeted tests**

Run:
```bash
pnpm --filter @aes/kernel build
pnpm --filter @aes/runtime build
pnpm --filter @aes/kernel test
pnpm --filter @aes/runtime test
```
Expected: PASS; natural/replay/live ordering is deterministic, replay cannot activate policy directly, and live executor call count remains zero on sandbox, max-run, resource, or authority blocks.

- [ ] **Step 12: Commit**

```bash
git add packages/kernel packages/runtime
git commit -m "feat(learning): acquire evidence through bounded replay and controlled evals"
```

---

### Task 13: Add optional LLM Pattern Analyst boundary that can only create evidence-backed candidates

**Files:**
- Create: `packages/kernel/src/evidence-query.ts`
- Create: `packages/kernel/src/__tests__/evidence-query.test.ts`
- Create: `packages/runtime/src/pattern-analysis-coordinator.ts`
- Create: `packages/runtime/src/__tests__/pattern-analysis-coordinator.test.ts`
- Modify: `packages/kernel/src/index.ts`
- Modify: `packages/runtime/src/index.ts`

**Interfaces:**
- Consumes: SDK `PatternAnalyzer`, normalized `LearningEvidence[]`, `PatternHypothesis`.
- Produces: `EvidenceQuery.matchHypothesis()` and `PatternAnalysisCoordinator.analyze()` returning only candidates with deterministic evidence references.
- Failure rule: analyzer unavailable/throws/over-budget → return `[]`; deterministic mining continues.

- [ ] **Step 1: Write failing evidence-query tests**

```ts
// evidence-query.test.ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { EvidenceQuery } from '../evidence-query.js';

test('LLM hypothesis with insufficient matching evidence does not become a candidate', () => {
  const result = new EvidenceQuery().matchHypothesis(hypothesis, [evidence1]);
  assert.equal(result.eligible, false);
  assert.deepEqual(result.evidenceRefs, ['e1']);
  assert.equal(result.evidenceStrength, 'observational');
});

test('model hypothesis strength is computed from real alternatives, not analyzer confidence', () => {
  const result = new EvidenceQuery().matchHypothesis(modelHypothesis, [balancedEvidence, cheapEvidence]);
  assert.equal(result.eligible, true);
  assert.equal(result.evidenceStrength, 'comparative');
});
```

- [ ] **Step 2: Implement deterministic evidence query by normalized signature/applicability**

```ts
// packages/kernel/src/evidence-query.ts
import type { LearningEvidence } from '@aes/spec';
import type { PatternHypothesis } from '@aes/runtime-sdk';
import { matchesApplicability } from './task-signature.js';

export class EvidenceQuery {
  matchHypothesis(hypothesis: PatternHypothesis, evidence: readonly LearningEvidence[]) {
    const rows = evidence.filter((row) => row.attributable && matchesApplicability(row.signature, hypothesis.applicability));
    const alternativeKey = (row: LearningEvidence): string | undefined => {
      if (hypothesis.kind === 'model_preference') return row.modelClass;
      if (hypothesis.kind === 'latency_preference') return row.latencyMode;
      return undefined;
    };
    const alternatives = new Map<string, LearningEvidence[]>();
    for (const row of rows) {
      const key = alternativeKey(row);
      if (key) alternatives.set(key, [...(alternatives.get(key) ?? []), row]);
    }
    const comparative = alternatives.size >= 2;
    const controlled = comparative
      ? [...alternatives.values()].every((group) => group.some((row) => row.origin === 'controlled'))
      : rows.some((row) => row.origin === 'controlled');
    return {
      eligible: rows.length >= hypothesis.evidenceQuery.minimumRefs,
      evidenceRefs: rows.map((row) => row.id).sort(),
      evidenceStrength: controlled ? 'controlled' as const : comparative ? 'comparative' as const : 'observational' as const
    };
  }
}
```

- [ ] **Step 3: Write failing coordinator tests for failure isolation and no direct activation**

```ts
// pattern-analysis-coordinator.test.ts
const coordinator = new PatternAnalysisCoordinator({ analyzer: throwingAnalyzer, evidenceQuery: new EvidenceQuery(), maxCandidates: 3, maxAnalysisTokens: 3000 });
assert.deepEqual(await coordinator.analyze(evidence), []);

const candidates = await healthyCoordinator.analyze(evidence);
assert.ok(candidates.every((c) => c.source === 'llm_pattern_analyst'));
assert.ok(candidates.every((c) => c.status === 'candidate'));
assert.ok(candidates.every((c) => c.evidenceRefs.length > 0));

const overBudget = new PatternAnalysisCoordinator({
  analyzer: countingAnalyzer, evidenceQuery: new EvidenceQuery(), maxCandidates: 3, maxAnalysisTokens: 1
});
assert.deepEqual(await overBudget.analyze(evidence), []);
assert.equal(countingAnalyzer.calls, 0);
```

- [ ] **Step 4: Implement coordinator; never accept analyzer self-confidence or active status**

```ts
// packages/runtime/src/pattern-analysis-coordinator.ts
import type { LearningCandidate, LearningEvidence } from '@aes/spec';
import type { PatternAnalyzer } from '@aes/runtime-sdk';
import { EvidenceQuery } from '@aes/kernel';

function estimateAnalysisTokens(evidence: readonly LearningEvidence[]): number {
  return Math.ceil(JSON.stringify(evidence).length / 4);
}

export class PatternAnalysisCoordinator {
  constructor(private readonly deps: {
    analyzer: PatternAnalyzer;
    evidenceQuery: EvidenceQuery;
    maxCandidates: number;
    maxAnalysisTokens: number;
  }) {}
  async analyze(evidence: readonly LearningEvidence[], now = new Date().toISOString()): Promise<LearningCandidate[]> {
    if (estimateAnalysisTokens(evidence) > this.deps.maxAnalysisTokens) return [];
    try {
      const hypotheses = await this.deps.analyzer.analyze({ evidence, maxCandidates: this.deps.maxCandidates });
      return hypotheses.slice(0, this.deps.maxCandidates).flatMap((h) => {
        const matched = this.deps.evidenceQuery.matchHypothesis(h, evidence);
        if (!matched.eligible) return [];
        return [{
          id: `candidate:llm:${h.id}`, kind: h.kind, scope: 'project' as const,
          applicability: h.applicability, ...(h.proposedEffect ? { effect: h.proposedEffect } : {}),
          ...(h.statement ? { statement: h.statement } : {}), source: 'llm_pattern_analyst' as const,
          evidenceRefs: matched.evidenceRefs, evidenceStrength: matched.evidenceStrength,
          status: 'candidate' as const, createdAt: now, updatedAt: now, evaluationRefs: []
        }];
      });
    } catch {
      return [];
    }
  }
}
```

- [ ] **Step 5: Run tests and commit**

Run:
```bash
pnpm --filter @aes/kernel build
pnpm --filter @aes/runtime build
pnpm --filter @aes/kernel test
pnpm --filter @aes/runtime test
```
Expected: PASS; analyzer failure does not affect deterministic paths.

```bash
git add packages/kernel packages/runtime
git commit -m "feat(learning): validate optional llm hypotheses against evidence"
```

---

### Task 14: Orchestrate the full learning lifecycle without making ordinary Adaptive Runtime depend on it

**Files:**
- Create: `packages/runtime/src/adaptive-learning-coordinator.ts`
- Create: `packages/runtime/src/__tests__/adaptive-learning-coordinator.test.ts`
- Create: `packages/runtime/src/__tests__/milestone4-adaptive-scenario.test.ts`
- Modify: `packages/runtime/src/adaptive-runtime.ts`
- Modify: `packages/runtime/src/__tests__/adaptive-runtime.test.ts`
- Modify: `packages/runtime/src/index.ts`

**Interfaces:**
- Consumes: trace → `toLearningEvidence`; `ExperienceMiner`; `LearningEvaluationEngine`; `PolicyOverlayEngine`; `RegressionMonitor`; concrete `LearningArtifactStore`; evidence store; `MemoryMaintenanceService`; optional Pattern Analyst and evidence-acquisition services.
- Produces: `AdaptiveLearningCoordinator.observe(trace)`, `listActiveOverlays()`, `disableOverlay()`, `explainOverlay()`.
- Runtime integration: `AdaptiveRuntimeOptions.learning?: RuntimeLearningObserver`; hook runs only after finalized trace persistence and is failure-isolated.
- Auto-activation rule: only project-scope soft overlay kinds may activate; configured minimum evidence strength and required shadow state are mandatory; `knowledge` and `authority_promotion` candidates never auto-activate as policy.

- [ ] **Step 1: Write a failing runtime test proving learning observer failure cannot fail a successful task**

```ts
// adaptive-runtime.test.ts addition
const runtime = new AdaptiveRuntime({
  ...options,
  learning: { observe: async () => { throw new Error('learning unavailable'); } }
});
const result = await runtime.execute(request);
assert.equal(result.outcome, 'success');
assert.ok(result.trace);

test('learning omitted preserves milestone 3 execution behavior', async () => {
  const baseline = await new AdaptiveRuntime({ ...options }).execute(request);
  const explicitlyAbsent = await new AdaptiveRuntime({ ...options, learning: undefined }).execute(request);
  assert.equal(explicitlyAbsent.outcome, baseline.outcome);
  assert.equal(explicitlyAbsent.trace.resolution.selected.id, baseline.trace.resolution.selected.id);
  assert.deepEqual(explicitlyAbsent.trace.verification, baseline.trace.verification);
  assert.deepEqual(explicitlyAbsent.trace.resourceDecision, baseline.trace.resourceDecision);
});
```

- [ ] **Step 2: Extend `AdaptiveRuntimeOptions` and call the observer only after the finalized trace is persisted**

```ts
// adaptive-runtime.ts
import type { RuntimeLearningObserver } from '@aes/runtime-sdk';

export interface AdaptiveRuntimeOptions {
  resolver: ModelResolver;
  supervisor: WorkspaceRuntimeSupervisor;
  control: RuntimeControlBridge;
  traceStore: TraceStore;
  checkpointStore: SessionCheckpointStore;
  pricing?: PricingProvider;
  verification?: RuntimeVerificationBridge;
  observations?: RuntimeObservationSink;
  resources?: ResourcePolicyEngine;
  learning?: RuntimeLearningObserver;
}

// after finalized trace append + normal observation emission:
if (this.options.learning) {
  try {
    await this.options.learning.observe(trace);
  } catch {
    // Learning is advisory. Never change AdaptiveRuntimeResult here.
  }
}
```

- [ ] **Step 3: Write lifecycle tests for real shadow persistence, evidence-strength gates, status transitions, regression rollback, and manual disable**

```ts
// adaptive-learning-coordinator.test.ts — focused assertions
// Seed one attributable run per model so the real ExperienceMiner can discover a
// comparative candidate, but keep total volume below minSamples=20 so it must stay shadow.
await evidenceStore.append(balancedEvidence({ id: 'seed-balanced' }));
await evidenceStore.append(cheapEvidence({ id: 'seed-cheap' }));
await coordinator.observe(traceUsingBalanced);

const candidatesAfterFirstPass = await artifacts.listCandidates();
const learned = candidatesAfterFirstPass.find((c) => c.kind === 'model_preference')!;
assert.equal(learned.status, 'shadow');
assert.equal(artifacts.shadowDecisions.length > 0, true);
assert.deepEqual(artifacts.shadowDecisions.at(-1)?.baselineDecision, { modelClass: 'balanced' });
assert.equal(artifacts.shadowDecisions.at(-1)?.comparable, false); // shadow chose a different class
assert.equal(artifacts.shadowDecisions.at(-1)?.observedOutcome, undefined); // baseline success is not a cheap-model outcome

// Observational model evidence must not auto-activate when config requires comparative.
assert.equal((await coordinator.listActiveOverlays()).length, 0);

// After comparative evidence reaches the configured gate:
await feedComparableEvidence(coordinator);
const active = await coordinator.listActiveOverlays();
assert.equal(active.length, 1);
assert.equal(active[0]?.status, 'active');
assert.equal(active[0]?.sourceCandidateId, learned.id);
assert.ok(active[0]?.baseline);
assert.equal((await artifacts.listCandidates()).find((c) => c.id === learned.id)?.status, 'active');

// Twenty attributable regressive post-activation outcomes remove learned influence.
await feedRegressionWindow(coordinator, 20);
const degraded = (await artifacts.listOverlays()).find((o) => o.id === active[0]?.id)!;
assert.equal(degraded.status, 'degraded');
assert.equal((await artifacts.listCandidates()).find((c) => c.id === learned.id)?.status, 'degraded');

await coordinator.disableOverlay(active[0]!.id, '2026-08-09T03:00:00Z');
assert.equal((await artifacts.listOverlays()).find((o) => o.id === active[0]?.id)?.status, 'disabled');
assert.equal((await coordinator.listActiveOverlays()).length, 0);
```

Also add candidate fixtures with `kind: 'authority_promotion'` and `kind: 'knowledge'` returned by optional candidate generation and assert neither can create a `PolicyOverlay`; they remain non-policy artifacts for the authority/knowledge paths. Add a model candidate with `evidenceStrength:'observational'` while the evaluator/auto-activation map requires `comparative`; assert it remains non-active (`shadow`/`keep_candidate`) rather than becoming `active`. Finally construct the coordinator with `regressionAvailable: () => false` and otherwise-valid evidence; assert validation may be persisted but no new overlay activates while mandatory monitoring is unavailable.

- [ ] **Step 4: Implement the coordinator with bounded candidate work and explicit lifecycle helpers**

```ts
// packages/runtime/src/adaptive-learning-coordinator.ts — essential contracts/guards
import type {
  CandidateKind,
  EvidenceStrength,
  LearningCandidate,
  LearningEvaluation,
  LearningEvidence,
  PolicyOverlay,
  TaskSignature
} from '@aes/spec';
import type {
  LearningArtifactStore,
  RuntimeDecisionTrace,
  RuntimeLearningObserver,
  RuntimeObservationSink
} from '@aes/runtime-sdk';
import {
  ExperienceMiner,
  LearningEvaluationEngine,
  matchesApplicability,
  PolicyOverlayEngine,
  RegressionMonitor,
  ShadowEvaluator
} from '@aes/kernel';
import { toLearningEvidence } from './experience-adapter.js';

const STRENGTH_RANK: Record<EvidenceStrength, number> = {
  observational: 0,
  comparative: 1,
  controlled: 2
};
const AUTO_OVERLAY_KINDS = new Set<CandidateKind>([
  'model_preference', 'latency_preference', 'context_preference',
  'retry_preference', 'replan_preference', 'interruption_preference'
]);

export interface LearningEvidenceStore {
  append(evidence: LearningEvidence): Promise<void>;
  query(signature: TaskSignature): Promise<LearningEvidence[]>;
}

export interface AdaptiveLearningCoordinatorOptions {
  signatureForTrace: (trace: RuntimeDecisionTrace) => TaskSignature;
  miner: ExperienceMiner;
  evaluator: LearningEvaluationEngine;
  overlays: PolicyOverlayEngine;
  regression: RegressionMonitor;
  regressionAvailable?: () => boolean;
  shadow: ShadowEvaluator;
  artifacts: LearningArtifactStore;
  evidenceStore: LearningEvidenceStore;
  patternAnalysis?: { analyze(evidence: readonly LearningEvidence[], now?: string): Promise<LearningCandidate[]> };
  evidenceAcquisition?: {
    enrich(candidate: LearningCandidate, evidence: readonly LearningEvidence[], evaluation: LearningEvaluation): Promise<readonly LearningEvidence[]>;
  };
  observations?: RuntimeObservationSink;
  maintenance: { incremental(): Promise<void>; full(): Promise<void>; fullCompileAfterNewTraces: number };
  autoActivation: {
    enabled: boolean;
    requireShadow: boolean;
    minimumEvidenceStrengthByKind: Partial<Record<CandidateKind, EvidenceStrength>>;
  };
  analysisBudget: { maxCandidatesPerTask: number; maxIncrementalWorkMs: number };
  now: () => string;
  nowMs: () => number;
}

export class AdaptiveLearningCoordinator implements RuntimeLearningObserver {
  private newTraceCount = 0;
  constructor(private readonly deps: AdaptiveLearningCoordinatorOptions) {}

  async observe(trace: RuntimeDecisionTrace): Promise<void> {
    const started = this.deps.nowMs();
    const signature = this.deps.signatureForTrace(trace);
    const evidence = toLearningEvidence(trace, signature);
    await this.deps.evidenceStore.append(evidence);
    this.deps.observations?.emit({ type: 'learning.evidence.accepted', evidenceId: evidence.id, scope: 'project' });

    const comparable = await this.deps.evidenceStore.query(signature);
    const deterministic = this.deps.miner.mineModelPreference(comparable, 'project', this.deps.now());
    let optional: LearningCandidate[] = [];
    if (this.withinIncrementalBudget(started) && this.deps.patternAnalysis) {
      optional = await this.deps.patternAnalysis.analyze(comparable, this.deps.now());
    }
    const candidates = [...deterministic, ...optional]
      .sort((a, b) => a.id.localeCompare(b.id))
      .slice(0, this.deps.analysisBudget.maxCandidatesPerTask);

    for (const candidate of candidates) {
      if (!this.withinIncrementalBudget(started)) break;
      await this.processCandidate(candidate, trace, comparable);
    }
    await this.monitorActiveOverlays(signature);
    if (this.withinIncrementalBudget(started)) await this.runMaintenanceIfDue();
  }

  private withinIncrementalBudget(started: number): boolean {
    return this.deps.nowMs() - started <= this.deps.analysisBudget.maxIncrementalWorkMs;
  }

  private minimumStrength(kind: CandidateKind): EvidenceStrength {
    return this.deps.autoActivation.minimumEvidenceStrengthByKind[kind] ?? 'controlled';
  }

  private canAutoActivate(candidate: LearningCandidate, shadowRecorded: boolean): boolean {
    return this.deps.autoActivation.enabled &&
      (this.deps.regressionAvailable?.() ?? true) &&
      candidate.scope === 'project' &&
      AUTO_OVERLAY_KINDS.has(candidate.kind) &&
      !!candidate.effect &&
      (!this.deps.autoActivation.requireShadow || shadowRecorded) &&
      STRENGTH_RANK[candidate.evidenceStrength] >= STRENGTH_RANK[this.minimumStrength(candidate.kind)];
  }

  private async processCandidate(
    candidate: LearningCandidate,
    trace: RuntimeDecisionTrace,
    evidence: readonly LearningEvidence[]
  ): Promise<void> {
    const existing = (await this.deps.artifacts.listCandidates()).find((item) => item.id === candidate.id);
    if (existing && ['active', 'degraded', 'disabled', 'superseded'].includes(existing.status)) return;
    await this.deps.artifacts.putCandidate(candidate);
    if (!existing) {
      this.deps.observations?.emit({ type: 'learning.candidate.created', candidateId: candidate.id, kind: candidate.kind, scope: candidate.scope });
    }
    const shadow = await this.enterShadow(candidate, trace);
    await this.evaluateAndMaybeActivate(shadow.candidate, evidence, shadow.recorded);
  }

  private async runMaintenanceIfDue(): Promise<void> {
    this.newTraceCount += 1;
    await this.deps.maintenance.incremental();
    if (this.newTraceCount < this.deps.maintenance.fullCompileAfterNewTraces) return;
    await this.deps.maintenance.full();
    this.newTraceCount = 0;
  }
}
```

The lifecycle methods are deliberately separate. A degraded/disabled/superseded candidate is not silently reactivated just because the miner rediscovers the same stable ID; a future replacement must be represented as a new/superseding candidate and pass the lifecycle again.

- [ ] **Step 5: Persist a real shadow decision before evaluation and never use the real baseline outcome as counterfactual model evidence**

```ts
// adaptive-learning-coordinator.ts — focused helper
private async enterShadow(candidate: LearningCandidate, trace: RuntimeDecisionTrace): Promise<{ candidate: LearningCandidate; recorded: boolean }> {
  const shadowCandidate = { ...candidate, status: 'shadow' as const, updatedAt: this.deps.now() };
  await this.deps.artifacts.putCandidate(shadowCandidate);

  if (candidate.effect?.kind !== 'model_preference') {
    return { candidate: shadowCandidate, recorded: false };
  }

  const baselineClass = trace.resolution.selected.traits.qualityClass;
  const sameChoice = baselineClass === candidate.effect.prefer;
  const shadowTrace = this.deps.shadow.record({
    candidateId: candidate.id,
    baselineDecision: { modelClass: baselineClass },
    shadowDecision: { modelClass: candidate.effect.prefer },
    comparable: sameChoice,
    ...(sameChoice ? { observedOutcome: trace.telemetry.verification } : {}),
    timestamp: this.deps.now()
  });
  await this.deps.artifacts.putShadowDecision(shadowTrace);
  this.deps.observations?.emit({ type: 'learning.candidate.shadowed', candidateId: candidate.id });
  return { candidate: shadowCandidate, recorded: true };
}
```

The reference M4 end-to-end automatic-learning path has directly observable shadow capture for model preference. The other closed effect kinds remain supported as **soft overlay vocabulary** and decision-engine advice, but the runtime MUST keep their learned candidates non-active unless a real decision integration can supply equivalent observable shadow/evaluation evidence. Do not fabricate a context/retry/interruption counterfactual merely to make an activation test pass. Interruption reduction itself is implemented from real `InteractionEvidence` in Tasks 10–11.

- [ ] **Step 6: Evaluate, persist `validated`, and activate only eligible project soft overlays with a baseline snapshot**

```ts
private async evaluateAndMaybeActivate(
  candidate: LearningCandidate,
  evidence: readonly LearningEvidence[],
  shadowRecorded: boolean
): Promise<void> {
  const applicableEvidence = evidence.filter((row) => matchesApplicability(row.signature, candidate.applicability));
  const grouped = this.deps.miner.aggregateModelChoices(applicableEvidence);
  const selected = grouped.find((group) =>
    candidate.effect?.kind === 'model_preference' && group.choice === candidate.effect.prefer);
  const baseline = grouped
    .filter((group) => group.choice !== selected?.choice)
    .sort((a, b) => b.metrics.verifiedSuccessRate - a.metrics.verifiedSuccessRate || a.choice.localeCompare(b.choice))[0];
  if (!selected || !baseline) return;

  const evaluation = this.deps.evaluator.evaluate({
    candidate,
    candidateMetrics: selected.metrics,
    baselineMetrics: baseline.metrics,
    stableWindows: this.deps.miner.stablePreferenceWindows(applicableEvidence, selected.choice),
    evaluatedAt: this.deps.now()
  });
  await this.deps.artifacts.putEvaluation(evaluation);
  this.deps.observations?.emit({ type: 'learning.evaluation.completed', candidateId: candidate.id, outcome: evaluation.outcome });

  if (evaluation.outcome !== 'validate') {
    const updated: LearningCandidate = {
      ...candidate,
      status: evaluation.outcome === 'reject' ? 'rejected' : candidate.status,
      evaluationRefs: [...new Set([...candidate.evaluationRefs, evaluation.id])].sort(),
      updatedAt: this.deps.now()
    };
    await this.deps.artifacts.putCandidate(updated);
    if (evaluation.outcome === 'keep_candidate' && this.deps.evidenceAcquisition) {
      const acquired = await this.deps.evidenceAcquisition.enrich(updated, evidence, evaluation);
      for (const row of acquired) await this.deps.evidenceStore.append(row);
    }
    return;
  }

  const validated: LearningCandidate = {
    ...candidate,
    status: 'validated',
    evaluationRefs: [...new Set([...candidate.evaluationRefs, evaluation.id])].sort(),
    updatedAt: this.deps.now()
  };
  await this.deps.artifacts.putCandidate(validated);
  if (!this.canAutoActivate(validated, shadowRecorded)) return;

  const overlay: PolicyOverlay = {
    id: `overlay:${validated.id}`,
    sourceCandidateId: validated.id,
    scope: 'project',
    status: 'active',
    applicability: validated.applicability,
    effect: validated.effect!,
    evidenceRefs: [...validated.evidenceRefs],
    evaluationRefs: [...validated.evaluationRefs],
    evidenceStrength: validated.evidenceStrength,
    evaluationScore: 4,
    baseline: {
      verifiedRate: baseline.metrics.verifiedSuccessRate,
      retryRate: baseline.metrics.retryRate,
      interruptionRate: baseline.metrics.interruptionRate,
      ...(baseline.metrics.averageEstimatedCost ? { averageCost: baseline.metrics.averageEstimatedCost } : {})
    },
    createdAt: this.deps.now(),
    updatedAt: this.deps.now()
  };
  await this.deps.artifacts.putOverlay(overlay);
  await this.deps.artifacts.putCandidate({ ...validated, status: 'active', updatedAt: this.deps.now() });
  this.deps.observations?.emit({ type: 'learning.overlay.activated', overlayId: overlay.id, scope: overlay.scope });
}
```

The evaluator already requires `latency_preference`, `model_preference`, `retry_preference`, and `replan_preference` to have comparative evidence. `minimumEvidenceStrengthByKind` is a second activation gate, not a replacement for evaluation.

- [ ] **Step 7: Wire continuous regression monitoring and reversible inspect/disable workflows**

```ts
private async monitorActiveOverlays(signature: TaskSignature): Promise<void> {
  const overlays = (await this.deps.artifacts.listOverlays())
    .filter((overlay) => overlay.status === 'active' && overlay.baseline && matchesApplicability(signature, overlay.applicability));
  if (overlays.length === 0) return;
  const evidence = await this.deps.evidenceStore.query(signature);

  for (const overlay of overlays) {
    const postActivation = evidence.filter((row) => row.timestamp > overlay.createdAt);
    const result = this.deps.regression.evaluate({
      baseline: overlay.baseline!,
      observed: postActivation,
      overlayId: overlay.id
    });
    if (result.action !== 'degrade') continue;
    const degraded = { ...overlay, status: 'degraded' as const, updatedAt: this.deps.now() };
    await this.deps.artifacts.putOverlay(degraded);
    const candidates = await this.deps.artifacts.listCandidates();
    const source = candidates.find((candidate) => candidate.id === overlay.sourceCandidateId);
    if (source) await this.deps.artifacts.putCandidate({ ...source, status: 'degraded', updatedAt: this.deps.now() });
    this.deps.observations?.emit({ type: 'learning.overlay.degraded', overlayId: overlay.id, reason: result.reason });
  }
}

async listActiveOverlays(): Promise<PolicyOverlay[]> {
  return (await this.deps.artifacts.listOverlays()).filter((overlay) => overlay.status === 'active');
}

async disableOverlay(id: string, now: string): Promise<void> {
  const overlay = (await this.deps.artifacts.listOverlays()).find((item) => item.id === id);
  if (!overlay) throw new Error(`unknown overlay ${id}`);
  await this.deps.artifacts.putOverlay({ ...overlay, status: 'disabled', updatedAt: now });
  const source = (await this.deps.artifacts.listCandidates()).find((item) => item.id === overlay.sourceCandidateId);
  if (source) await this.deps.artifacts.putCandidate({ ...source, status: 'disabled', updatedAt: now });
  this.deps.observations?.emit({ type: 'learning.overlay.disabled', overlayId: id, reason: 'explicit disable' });
}

async explainOverlay(id: string) {
  const overlay = (await this.deps.artifacts.listOverlays()).find((item) => item.id === id);
  if (!overlay) return undefined;
  return {
    overlayId: overlay.id,
    sourceCandidateId: overlay.sourceCandidateId,
    evidenceStrength: overlay.evidenceStrength,
    evidenceRefs: [...overlay.evidenceRefs],
    evaluationRefs: [...overlay.evaluationRefs],
    baseline: overlay.baseline
  };
}
```

Because `PolicyOverlayEngine` from Task 5 ignores `degraded` and `disabled`, the next decision automatically returns to base behavior after these writes; no base policy source file is mutated.

- [ ] **Step 8: Reuse the exact artifact-store fixture from Task 11 and add only the evidence-store fixture**

Import `InMemoryLearningArtifactStore` from `./helpers/in-memory-learning-artifact-store.js`; do not create a second subtly different fake. Add the evidence store used only by adaptive-learning tests:

```ts
export class InMemoryLearningEvidenceStore implements LearningEvidenceStore {
  rows: LearningEvidence[] = [];
  async append(value: LearningEvidence) { this.rows.push(structuredClone(value)); }
  async query(signature: TaskSignature) {
    return this.rows
      .filter((row) => row.signature.taskClass === signature.taskClass)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.id.localeCompare(b.id));
  }
}
```

Inject `MemoryMaintenanceService` from Task 9 in production assembly. Tests use a deterministic fake with call counters and `fullCompileAfterNewTraces:20`; assert `incremental()` occurs only while the 500ms budget remains and `full()` occurs on the twentieth accepted trace, not every turn.

- [ ] **Step 9: Write the required deterministic 100-task adaptive simulation**

```ts
// milestone4-adaptive-scenario.test.ts — required phases/assertions
// Tasks 1–30: base policy only; attributable evidence accumulates.
// Tasks 31–50: candidate is persisted in shadow; real decision still equals base decision.
// Tasks 51–70: comparative evidence + stable windows pass; project overlay activates.
// Tasks 71–100: resolve active overlay through PolicyOverlayEngine and feed verified outcomes back.

assert.ok(verifiedRateAfter + 0.01 >= verifiedRateBefore);
assert.ok(totalCostAfter < totalCostBefore || interruptionsAfter < interruptionsBefore);
assert.ok(activeOverlay.evidenceRefs.length >= 20);
const explanation = await coordinator.explainOverlay(activeOverlay.id);
assert.deepEqual(explanation?.evidenceRefs, activeOverlay.evidenceRefs);

// Inject 20 attributable regressive outcomes after activation.
await feedRegressiveWindow(coordinator, 20);
const resolveAfterDegrade = overlayEngine.resolve('model_preference', signature, await artifacts.listOverlays());
assert.equal(resolveAfterDegrade.effect, undefined);
assert.deepEqual(realDecisionAfterDegrade, baseDecision);
```

Use deterministic synthetic traces/fake providers only. The scenario must also assert that `analysisBudget.maxCandidatesPerTask=3` caps candidate processing and an injected `nowMs()` jump beyond 500ms skips optional Pattern Analysis/maintenance without failing the completed task.

- [ ] **Step 10: Add failure-injection cases and run cross-package tests**

Tests inject evaluator failure, corrupt/unavailable artifact store, optional analyzer failure, controlled-eval unavailability, regression-monitor state loss, and contradictory active overlays. Ordinary `AdaptiveRuntime` completion must remain successful; new activation is blocked when monitor state is unavailable; conflicting overlays resolve to no learned effect; no missing telemetry is fabricated.

Run:
```bash
pnpm build
pnpm --filter @aes/kernel test
pnpm --filter @aes/runtime test
```
Expected: PASS; adaptive scenario proves shadow isolation, evidence-gated activation, inspectability, automatic rollback, candidate cap, time-budget fallback, and no network dependency.

- [ ] **Step 11: Commit**

```bash
git add packages/runtime
git commit -m "feat(runtime): close the adaptive learning lifecycle"
```

---

### Task 15: Normalize all M4 configuration defaults, events, and examples

**Files:**
- Modify: `packages/cli/src/runtime-config.ts`
- Modify: `packages/cli/src/__tests__/runtime-config.test.ts`
- Modify: `examples/control.yaml`
- Create: `examples/learning.yaml`
- Modify: `packages/runtime-sdk/src/observability.ts`
- Modify: `packages/runtime-sdk/src/__tests__/learning-contracts.test.ts`

**Interfaces:**
- Consumes: reference defaults from the approved spec.
- Produces: `NormalizedRuntimeConfig.learning`, `.knowledge`, and control defaults; complete example YAML.

- [ ] **Step 1: Write failing exact-default assertions**

```ts
// runtime-config.test.ts
const config = normalizeRuntimeConfig({ runtime: { provider: 'codex' } });
assert.deepEqual(config.learning.analysis, {
  maxCandidatesPerTask: 3,
  maxAnalysisTokensPerTask: 3000,
  maxIncrementalWorkMs: 500
});
assert.deepEqual(config.learning.evaluation, {
  minSamples: 20,
  minComparableSamplesPerAlternative: 5,
  qualityNonInferiorityMargin: 0.01,
  minRelativeImprovement: 0.05,
  regressionWindow: 20
});
assert.deepEqual(config.learning.controlledEvals, {
  enabled: true, sandboxOnly: true, maxRunsPerCandidate: 5,
  maxTokensPerDay: 100000, maxCostPerDay: 0.50
});
assert.deepEqual(config.knowledge.retrieval, { maxRecords: 8, maxEstimatedTokens: 2500 });
assert.equal(config.control.actions.controlledEvaluation, 'autonomous');
assert.equal(config.control.actions.controlledEvaluationBudgetOverride, 'assisted');
```

- [ ] **Step 2: Define the full optional input shape and normalize every M4 leaf explicitly**

```ts
// packages/cli/src/runtime-config.ts
import type { CandidateKind, ControlMode, EvidenceStrength } from '@aes/spec';
import type { ResourceBudget } from '@aes/runtime-sdk';

type MinimumStrengthInput = Partial<Record<CandidateKind, EvidenceStrength>>;

type NormalizedMinimumStrength = Required<Pick<Record<CandidateKind, EvidenceStrength>,
  'model_preference' | 'latency_preference' | 'context_preference' |
  'retry_preference' | 'replan_preference' | 'interruption_preference'>>;

export interface RuntimeConfigInput {
  runtime?: { provider?: string };
  telemetry?: { providerRawEvents?: boolean };
  modelResolution?: { qualityDegradation?: ControlMode };
  codex?: { processScope?: 'workspace' };
  learning?: {
    enabled?: boolean;
    analysis?: { maxCandidatesPerTask?: number; maxAnalysisTokensPerTask?: number; maxIncrementalWorkMs?: number };
    projectAutoActivation?: { enabled?: boolean; requireShadow?: boolean; minimumEvidenceStrengthByKind?: MinimumStrengthInput };
    evaluation?: {
      minSamples?: number; minComparableSamplesPerAlternative?: number;
      qualityNonInferiorityMargin?: number; minRelativeImprovement?: number; regressionWindow?: number;
    };
    controlledEvals?: {
      enabled?: boolean; sandboxOnly?: boolean; maxRunsPerCandidate?: number;
      maxTokensPerDay?: number; maxCostPerDay?: number;
    };
    interactionLearning?: {
      authorityProposalMinApprovals?: number; authorityProposalMaxRejections?: number; rejectionSuppressionRuns?: number;
    };
    maintenance?: { incremental?: boolean; fullCompileAfterNewTraces?: number };
  };
  knowledge?: {
    retrieval?: { maxRecords?: number; maxEstimatedTokens?: number };
    budgets?: { maxActiveRecords?: number; maxRecordTokens?: number; maxIndexTokens?: number };
    retention?: { rawTracesDays?: number; failedTracesDays?: number; promotedEvidence?: 'keep' };
  };
  control?: { actions?: { controlledEvaluation?: ControlMode; controlledEvaluationBudgetOverride?: ControlMode } };
}

export interface NormalizedRuntimeConfig {
  runtime: { provider: string };
  telemetry: { providerRawEvents: boolean };
  modelResolution: { qualityDegradation: ControlMode };
  codex: { processScope: 'workspace' };
  learning: {
    enabled: boolean;
    analysis: { maxCandidatesPerTask: number; maxAnalysisTokensPerTask: number; maxIncrementalWorkMs: number };
    projectAutoActivation: { enabled: boolean; requireShadow: boolean; minimumEvidenceStrengthByKind: NormalizedMinimumStrength };
    evaluation: {
      minSamples: number; minComparableSamplesPerAlternative: number;
      qualityNonInferiorityMargin: number; minRelativeImprovement: number; regressionWindow: number;
    };
    controlledEvals: {
      enabled: boolean; sandboxOnly: boolean; maxRunsPerCandidate: number;
      maxTokensPerDay: number; maxCostPerDay: number;
    };
    interactionLearning: {
      authorityProposalMinApprovals: number; authorityProposalMaxRejections: number; rejectionSuppressionRuns: number;
    };
    maintenance: { incremental: boolean; fullCompileAfterNewTraces: number };
  };
  knowledge: {
    retrieval: { maxRecords: number; maxEstimatedTokens: number };
    budgets: { maxActiveRecords: number; maxRecordTokens: number; maxIndexTokens: number };
    retention: { rawTracesDays: number; failedTracesDays: number; promotedEvidence: 'keep' };
  };
  control: { actions: { controlledEvaluation: ControlMode; controlledEvaluationBudgetOverride: ControlMode } };
}

// inside normalizeRuntimeConfig(input)
const strength = input.learning?.projectAutoActivation?.minimumEvidenceStrengthByKind;
return {
  // preserve the existing runtime/telemetry/modelResolution/codex normalized members,
  learning: {
    enabled: input.learning?.enabled ?? true,
    analysis: {
      maxCandidatesPerTask: input.learning?.analysis?.maxCandidatesPerTask ?? 3,
      maxAnalysisTokensPerTask: input.learning?.analysis?.maxAnalysisTokensPerTask ?? 3000,
      maxIncrementalWorkMs: input.learning?.analysis?.maxIncrementalWorkMs ?? 500
    },
    projectAutoActivation: {
      enabled: input.learning?.projectAutoActivation?.enabled ?? true,
      requireShadow: input.learning?.projectAutoActivation?.requireShadow ?? true,
      minimumEvidenceStrengthByKind: {
        model_preference: strength?.model_preference ?? 'comparative',
        latency_preference: strength?.latency_preference ?? 'comparative',
        context_preference: strength?.context_preference ?? 'observational',
        retry_preference: strength?.retry_preference ?? 'comparative',
        replan_preference: strength?.replan_preference ?? 'comparative',
        interruption_preference: strength?.interruption_preference ?? 'observational'
      }
    },
    evaluation: {
      minSamples: input.learning?.evaluation?.minSamples ?? 20,
      minComparableSamplesPerAlternative: input.learning?.evaluation?.minComparableSamplesPerAlternative ?? 5,
      qualityNonInferiorityMargin: input.learning?.evaluation?.qualityNonInferiorityMargin ?? 0.01,
      minRelativeImprovement: input.learning?.evaluation?.minRelativeImprovement ?? 0.05,
      regressionWindow: input.learning?.evaluation?.regressionWindow ?? 20
    },
    controlledEvals: {
      enabled: input.learning?.controlledEvals?.enabled ?? true,
      sandboxOnly: input.learning?.controlledEvals?.sandboxOnly ?? true,
      maxRunsPerCandidate: input.learning?.controlledEvals?.maxRunsPerCandidate ?? 5,
      maxTokensPerDay: input.learning?.controlledEvals?.maxTokensPerDay ?? 100000,
      maxCostPerDay: input.learning?.controlledEvals?.maxCostPerDay ?? 0.50
    },
    interactionLearning: {
      authorityProposalMinApprovals: input.learning?.interactionLearning?.authorityProposalMinApprovals ?? 15,
      authorityProposalMaxRejections: input.learning?.interactionLearning?.authorityProposalMaxRejections ?? 0,
      rejectionSuppressionRuns: input.learning?.interactionLearning?.rejectionSuppressionRuns ?? 5
    },
    maintenance: {
      incremental: input.learning?.maintenance?.incremental ?? true,
      fullCompileAfterNewTraces: input.learning?.maintenance?.fullCompileAfterNewTraces ?? 20
    }
  },
  knowledge: {
    retrieval: {
      maxRecords: input.knowledge?.retrieval?.maxRecords ?? 8,
      maxEstimatedTokens: input.knowledge?.retrieval?.maxEstimatedTokens ?? 2500
    },
    budgets: {
      maxActiveRecords: input.knowledge?.budgets?.maxActiveRecords ?? 500,
      maxRecordTokens: input.knowledge?.budgets?.maxRecordTokens ?? 800,
      maxIndexTokens: input.knowledge?.budgets?.maxIndexTokens ?? 4000
    },
    retention: {
      rawTracesDays: input.knowledge?.retention?.rawTracesDays ?? 90,
      failedTracesDays: input.knowledge?.retention?.failedTracesDays ?? 180,
      promotedEvidence: 'keep' as const
    }
  },
  control: {
    actions: {
      controlledEvaluation: input.control?.actions?.controlledEvaluation ?? 'autonomous',
      controlledEvaluationBudgetOverride: input.control?.actions?.controlledEvaluationBudgetOverride ?? 'assisted'
    }
  }
};
```

Add a test passing only `{ minimumEvidenceStrengthByKind: { model_preference: 'controlled' } }`; assert `model_preference` becomes `controlled` while the other five defaults remain intact. This prevents shallow-merge configuration bugs.

- [ ] **Step 3: Map controlled-eval config into the existing Resource Governance model without inventing a currency**

```ts
// packages/cli/src/runtime-config.ts
export function toControlledEvalResourceBudget(
  config: NormalizedRuntimeConfig['learning']['controlledEvals'],
  pricingCurrency?: string
): { allowed: true; budget: ResourceBudget } | { allowed: false; reason: string } {
  if (config.maxCostPerDay > 0 && !pricingCurrency) {
    return { allowed: false, reason: 'controlled eval cost budget requires an explicit pricing currency' };
  }
  return {
    allowed: true,
    budget: {
      maxTotalTokens: config.maxTokensPerDay,
      ...(pricingCurrency ? { maxEstimatedCost: { amount: config.maxCostPerDay, currency: pricingCurrency } } : {}),
      warningThreshold: 0.8
    }
  };
}
```

Tests assert `100000 -> maxTotalTokens`, `0.50 + 'USD' -> { amount:0.50, currency:'USD' }`, and missing currency returns `allowed:false` rather than silently dropping the cost cap. The runner from Task 12 still requires same-currency projected usage; unknown cost remains unknown and live evaluation fails closed, while natural/replay learning is unaffected.

- [ ] **Step 4: Add example configs that demonstrate the authority boundary**

```yaml
# examples/learning.yaml
learning:
  enabled: true
  projectAutoActivation:
    enabled: true
    requireShadow: true
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
  budgets:
    maxActiveRecords: 500
    maxRecordTokens: 800
    maxIndexTokens: 4000
  retention:
    rawTracesDays: 90
    failedTracesDays: 180
    promotedEvidence: keep
control:
  actions:
    controlledEvaluation: autonomous
    controlledEvaluationBudgetOverride: assisted
```

`examples/control.yaml` must add those two actions but MUST NOT add an `authorityPromotion: autonomous` escape hatch.

- [ ] **Step 5: Validate event payloads contain IDs/metadata only**

Add this exact test to `packages/runtime-sdk/src/__tests__/learning-contracts.test.ts`:

```ts
import type { RuntimeObservation } from '../observability.js';

test('learning observations expose ids and summaries but never raw prompt/code/tool payloads', () => {
  const events = [
    { type: 'learning.evidence.accepted', evidenceId: 'e1', scope: 'project' },
    { type: 'learning.candidate.created', candidateId: 'c1', kind: 'model_preference', scope: 'project' },
    { type: 'learning.candidate.shadowed', candidateId: 'c1' },
    { type: 'learning.evaluation.completed', candidateId: 'c1', outcome: 'validate' },
    { type: 'learning.overlay.activated', overlayId: 'o1', scope: 'project' },
    { type: 'learning.overlay.degraded', overlayId: 'o1', reason: 'quality regression' },
    { type: 'learning.overlay.disabled', overlayId: 'o1', reason: 'explicit disable' },
    { type: 'learning.overlay.superseded', overlayId: 'o1', replacementId: 'o2' },
    { type: 'knowledge.record.created', recordId: 'k1', scope: 'project' },
    { type: 'knowledge.record.merged', recordId: 'k1', mergedEvidenceCount: 2 },
    { type: 'knowledge.conflict.detected', recordIds: ['k1', 'k2'] },
    { type: 'knowledge.index.rebuilt', recordCount: 10 },
    { type: 'interaction.authority_candidate.created', candidateId: 'a1', actionType: 'modelRouting' },
    { type: 'authority.degraded', actionType: 'modelRouting', scope: 'project' },
    { type: 'controlled_eval.requested', candidateId: 'c1', fixtureId: 'f1' },
    { type: 'controlled_eval.completed', candidateId: 'c1', fixtureId: 'f1', outcome: 'completed', evidenceId: 'e2' }
  ] satisfies RuntimeObservation[];

  for (const event of events) {
    const serialized = JSON.stringify(event);
    for (const forbidden of ['prompt', 'code', 'toolOutput', '"payload"']) {
      assert.equal(serialized.includes(forbidden), false, `${event.type} leaked ${forbidden}`);
    }
  }
});
```

This is both a compile-time exhaustiveness check against the exported union and a runtime privacy guard for the concrete event shapes.

- [ ] **Step 6: Run CLI/SDK tests and commit**

Run:
```bash
pnpm --filter @aes/runtime-sdk build
pnpm --filter @aes/cli build
pnpm --filter @aes/runtime-sdk test
pnpm --filter @aes/cli test
```
Expected: PASS.

```bash
git add packages/cli packages/runtime-sdk examples
git commit -m "feat(config): add milestone 4 learning defaults and events"
```

---

### Task 16: Write architecture and concept documentation for the complete Milestones 1–4 system

**Files:**
- Modify: `README.md`
- Create: `docs/getting-started/what-is-aes.md`
- Create: `docs/getting-started/quick-start.md`
- Create: `docs/getting-started/mental-model.md`
- Create: `docs/concepts/workflows.md`
- Create: `docs/concepts/context-management.md`
- Create: `docs/concepts/model-routing.md`
- Create: `docs/concepts/control-and-authority.md`
- Create: `docs/concepts/resource-governance.md`
- Create: `docs/concepts/knowledge-and-memory.md`
- Create: `docs/concepts/adaptive-learning.md`
- Create: `docs/architecture/overview.md`
- Create: `docs/architecture/kernel.md`
- Create: `docs/architecture/adaptive-runtime.md`
- Create: `docs/architecture/provider-model.md`
- Create: `docs/architecture/codex-adapter.md`
- Create: `docs/architecture/learning-loop.md`
- Create: `docs/architecture/how-aes-makes-a-decision.md`

**Interfaces:**
- Consumes: implemented code, tests, current ADRs/specs, actual package names and config.
- Produces: canonical mental model that does not require reconstructing Milestones 1–3 from historical specs.

- [ ] **Step 1: Update README package responsibilities and architecture diagram from actual exports**

README must describe exactly:

```text
@aes/spec        normative provider-neutral contracts
@aes/kernel      deterministic task/context/model/control/learning/knowledge decisions
@aes/runtime-sdk provider/session/storage/learning extension interfaces
@aes/runtime     adaptive orchestration, recovery, resource governance, learning side effects
@aes/adapter-codex concrete Codex App Server provider edge
@aes/cli         validation/config/smoke entry points
```

Also state that Codex live integration remains opt-in and offline tests never require it.

- [ ] **Step 2: Write `how-aes-makes-a-decision.md` around one concrete walkthrough**

The page must trace:

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

For each arrow explicitly label whether it is deterministic base logic, learned soft advice, hard policy enforcement, authority, provider execution, evidence capture, or rollback behavior.

- [ ] **Step 3: Write learning-loop and knowledge concept docs using exact lifecycle/status names from code**

`docs/architecture/learning-loop.md` must include:

```text
DecisionTrace -> LearningEvidence -> Candidate -> Shadow -> Evaluation
-> Active Project Overlay -> New Work -> Regression Monitor -> keep/degrade
```

`docs/concepts/knowledge-and-memory.md` must document `fact|decision|experience|preference`, session/project/user scope, provenance, relations, derived indexes, retrieval budgets, retention, and conflict behavior.

- [ ] **Step 4: Write control/authority docs that distinguish interruption reduction from authority expansion**

The doc must explicitly say:

```text
suppression/grouping of routine prompts  -> may be automatic
active overlay degradation               -> may be automatic
autonomous -> assisted                    -> may be automatic
assisted -> autonomous                    -> explicit user approval required
project -> user knowledge promotion       -> privacy/generalization gate; fail closed
```

- [ ] **Step 5: Write current Milestone 1–3 prerequisite concept/architecture pages**

Populate workflow lifecycle, context/handoff, model class routing, Resource Governance, runtime/provider supervision, recovery semantics, provider-neutral SDK, and Codex adapter process-per-workspace behavior. Do not create empty future capability pages.

- [ ] **Step 6: Cross-check documentation names against exports and tests**

Run:
```bash
grep -R -E 'T[O]DO|T[B]D' README.md docs/getting-started docs/concepts docs/architecture
pnpm build
```
Expected: grep returns no matches; build passes. Manually verify every type/component named in docs exists in current package exports or is clearly labeled conceptual/non-code.

- [ ] **Step 7: Commit architecture/concept docs**

```bash
git add README.md docs/getting-started docs/concepts docs/architecture
git commit -m "docs: explain aes architecture and adaptive learning"
```

---

### Task 17: Write configuration/API/operations documentation and worked learning examples

**Files:**
- Create: `docs/guides/configure-aes.md`
- Create: `docs/guides/budgets.md`
- Create: `docs/guides/autonomy.md`
- Create: `docs/guides/knowledge-base.md`
- Create: `docs/guides/write-an-adapter.md`
- Create: `docs/guides/debugging.md`
- Create: `docs/reference/configuration.md`
- Create: `docs/reference/events.md`
- Create: `docs/reference/schemas.md`
- Create: `docs/reference/runtime-api.md`
- Create: `docs/reference/policy-api.md`
- Create: `docs/examples/learning-lifecycle.md`
- Create: `docs/examples/authority-promotion.md`

**Interfaces:**
- Consumes: normalized config from Task 15, runtime/kernel exports, event types, examples.
- Produces: operational docs for users, maintainers, and adapter authors.

- [ ] **Step 1: Write configuration reference with exact defaults and authority notes**

Include one authoritative table with these exact values:

```text
learning.analysis.maxCandidatesPerTask                  3
learning.analysis.maxAnalysisTokensPerTask              3000
learning.analysis.maxIncrementalWorkMs                  500
learning.evaluation.minSamples                          20
learning.evaluation.minComparableSamplesPerAlternative  5
learning.evaluation.qualityNonInferiorityMargin         0.01
learning.evaluation.minRelativeImprovement              0.05
learning.evaluation.regressionWindow                    20
learning.controlledEvals.maxRunsPerCandidate             5
learning.controlledEvals.maxTokensPerDay                 100000
learning.controlledEvals.maxCostPerDay                   0.50
knowledge.retrieval.maxRecords                           8
knowledge.retrieval.maxEstimatedTokens                   2500
knowledge.budgets.maxActiveRecords                       500
knowledge.budgets.maxRecordTokens                        800
knowledge.budgets.maxIndexTokens                         4000
```

Explain unknown usage is not free and budget override uses `controlledEvaluationBudgetOverride`.

- [ ] **Step 2: Write event/API/schema references from the exported types rather than prose-only invention**

`events.md` lists every learning lifecycle event from `RuntimeObservation`; `schemas.md` documents task signature, candidate, overlay, knowledge record, interaction evidence, and lifecycle states; API pages identify package/export names and method signatures.

- [ ] **Step 3: Write the candidate → shadow → active → regression/degrade worked example**

The example must show concrete evidence counts and preserve quality:

```text
balanced: 40 runs, 38 verified
cheap:    20 runs, 13 verified
candidate: prefer balanced
shadow: no production substitution
validated: comparative evidence + quality preserved + retry/cost improvement
active: project overlay
later 20-run regression window: quality below margin
result: overlay degraded, base policy restored
```

- [ ] **Step 4: Write the approvals → authority proposal → explicit acceptance example**

Use 15 approvals, 0 rejections, 15 verified successes; show that this creates only an `AuthorityCandidate`. Show a separate explicit user approval event producing a scoped grant. Show that a later regression may automatically degrade to assisted but cannot automatically promote back.

- [ ] **Step 5: Write privacy, debugging, and inspect/disable/revoke workflows**

Document how to inspect evidence refs and overlay explanation; disable an active project overlay; diagnose missing/corrupt indexes; rebuild indexes; understand learning-unavailable fallback; and why project identifiers are removed before user-scope promotion.

- [ ] **Step 6: Documentation consistency check and commit**

Run:
```bash
grep -R -E 'T[O]DO|T[B]D' docs/guides docs/reference docs/examples
pnpm build
pnpm test
```
Expected: no placeholders; full offline suite passes.

```bash
git add docs/guides docs/reference docs/examples
git commit -m "docs: add aes learning operations and reference pack"
```

---

### Task 18: Final deterministic verification, compatibility audit, and optional live smoke

**Files:**
- Modify only if verification exposes a concrete defect: relevant source/test/doc file.
- No new feature scope is allowed in this task.

**Interfaces:**
- Consumes: all M4 code/docs.
- Produces: verified release candidate and evidence that M3 base behavior still works with learning absent.

- [ ] **Step 1: Verify clean repository and package-manager environment**

Run:
```bash
git status --short
node --version
pnpm --version
```
Expected: clean worktree before verification; Node >=22; pnpm 10.14.0 available.

- [ ] **Step 2: Run full build and typecheck**

Run:
```bash
pnpm build
pnpm typecheck
```
Expected: PASS for every workspace package.

- [ ] **Step 3: Run full offline test suite twice**

Run:
```bash
pnpm test
pnpm test
```
Expected: both complete with zero failures, zero network/provider requirements, deterministic results.

- [ ] **Step 4: Run focused acceptance tests for all hard invariants**

Run:
```bash
node --test \
  packages/kernel/dist/__tests__/shadow-evaluator.test.js \
  packages/kernel/dist/__tests__/policy-overlay-engine.test.js \
  packages/kernel/dist/__tests__/evaluation-engine.test.js \
  packages/kernel/dist/__tests__/regression-monitor.test.js \
  packages/kernel/dist/__tests__/knowledge-privacy.test.js \
  packages/kernel/dist/__tests__/knowledge-retriever.test.js \
  packages/kernel/dist/__tests__/knowledge-migration.test.js \
  packages/kernel/dist/__tests__/authority-learning.test.js \
  packages/runtime/dist/__tests__/controlled-evaluation-runner.test.js \
  packages/runtime/dist/__tests__/adaptive-learning-coordinator.test.js \
  packages/runtime/dist/__tests__/milestone4-adaptive-scenario.test.js
```
Expected: all PASS, covering shadow isolation, hard-constraint precedence, conflict fallback, quality-first gates, authority non-escalation, privacy fail-closed behavior, controlled-eval safety/budgets, learning failure isolation, bounded retrieval, idempotent migration/indexing, and activation→rollback simulation.

- [ ] **Step 5: Verify “learning disabled/no `.aes` data” compatibility**

Task 14 adds the exact regression test named `learning omitted preserves milestone 3 execution behavior`. Run it from the compiled runtime suite:

```bash
node --test --test-name-pattern='learning omitted preserves milestone 3 execution behavior' \
  packages/runtime/dist/__tests__/adaptive-runtime.test.js
```

Expected: PASS; the run with no `learning` option preserves baseline model resolution, Resource Governance decision, verification result, and ordinary trace behavior.

- [ ] **Step 6: Run vendor-boundary and privacy tests**

Run:
```bash
pnpm --filter @aes/kernel test
pnpm --filter @aes/runtime test
```
Expected: `vendor-boundary`, privacy, failure-attribution, and scope tests PASS; no provider-specific import enters `@aes/spec`/`@aes/kernel`.

- [ ] **Step 7: Run opt-in Codex smoke only if the binary is actually available**

Run:
```bash
command -v codex
```
If it returns a path, run:
```bash
pnpm test:integration:codex
```
Expected: PASS or a concrete provider integration defect to fix. If `codex` is absent, record live integration as **NOT VERIFIED — codex binary unavailable**; do not describe it as passing.

- [ ] **Step 8: Final docs/source consistency scan**

Run:
```bash
grep -R -E 'T[O]DO|T[B]D|pending user review' README.md docs packages || true
git diff --check
git status --short
```
Expected: no accidental placeholders, whitespace errors, or uncommitted changes.

If any verification step exposes a defect, return to the owning task above, add a focused failing regression test there, apply the smallest fix, rerun that task's exact verification commands, and use that task's exact commit scope. Do not create an empty verification commit.

---

## Spec Coverage / Traceability

| Design requirement | Implementation tasks |
|---|---|
| Typed evidence/signatures/candidates/overlays/interactions | 1–2 |
| Experience Miner + metric coverage | 3 |
| Evidence strength + quality-first evaluation | 3–4 |
| Mandatory shadow mode | 6, 14 |
| Reversible soft overlays + deterministic conflict resolution | 5–6 |
| Hard constraints outrank learning | 5–6, 18 |
| Regression monitor + rollback | 7, 14 |
| Typed knowledge/provenance/relations | 1, 8 |
| Create/merge/supersede/conflict + idempotency | 8–9 |
| Reproducible `index.json`/`index.md` | 8–9 |
| Bounded explainable retrieval | 9 |
| Retention/health budgets | 9, 15 |
| Interruption urgency/grouping/rejection suppression | 10 |
| Authority candidates + explicit promotion + auto-degrade | 11 |
| Natural → replay → controlled eval policy | 12, 14 |
| Controlled eval resource/authority/sandbox limits | 12, 15 |
| Optional LLM Pattern Analyst is hypothesis-only | 13 |
| Learning failure falls back to base execution | 13–14, 18 |
| Provider failures/cancellation not model-quality evidence | 2–3, 7, 18 |
| Project→user privacy/generalization fail-closed | 9, 11, 17–18 |
| Learning lifecycle events/audit metadata | 2, 14–15 |
| Exact reference defaults/config | 1, 15 |
| End-to-end 100-task adaptive simulation | 14 |
| Comprehensive Milestones 1–4 docs | 16–17 |
| “How AES Makes a Decision” | 16 |
| Worked learning + authority examples | 17 |
| Full offline verification + optional live Codex smoke | 18 |

## Review Gates During Execution

Each task is a reviewer-sized slice. Do not combine tasks merely to reduce commit count. For every task: failing test first, verify the failure is for the intended missing behavior, implement the smallest coherent slice, run targeted tests, then commit. Before Task 14, explicitly review that Tasks 1–13 expose narrow public interfaces and have not leaked provider types into the kernel. Before Task 18, use the verification-before-completion skill and require command output rather than inferred success.
