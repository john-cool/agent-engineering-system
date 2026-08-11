import type { LifecycleState, ModelClass } from './common.js';
import type { ContextDecision } from './context.js';
import type {
  Confidence,
  ControlActionType,
  ControlDecision,
  ControlMode,
  ModelDecision,
  PlanStatus,
  TaskAnalysis,
  TaskComplexity
} from './intelligence.js';

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

export interface CostTelemetry {
  inputTokens?: number;
  outputTokens?: number;
  estimatedCost?: number;
  wallClockMs?: number;
}

export interface UserOverrideEvent {
  action: string;
  decision: 'approved' | 'rejected' | 'manual_override';
  timestamp: string;
}

export interface DecisionTrace {
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

export interface KnowledgeMetadata {
  id: string;
  status: 'candidate' | 'trusted' | 'superseded';
  scope: 'session' | 'project' | 'user';
  confidence: Confidence;
  createdAt: string;
  updatedAt: string;
  evidenceRefs: string[];
  supersededBy?: string;
}

export interface ExperienceHypothesis {
  id: string;
  taskClass: string;
  recommendation: string;
  sampleCount: number;
  successCount: number;
  retryCount: number;
  overrideCount: number;
  evidenceRefs: string[];
}

export interface EvaluationEvidence {
  hypothesisId: string;
  sampleCount: number;
  successRate: number;
  retryRate: number;
  overrideRate: number;
  qualityRegressionRate: number;
}

export interface EvaluationDecision {
  hypothesisId: string;
  outcome: 'promote' | 'keep_candidate' | 'reject';
  reasons: string[];
}
