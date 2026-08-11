import type { LifecycleState, ModelClass } from './common.js';

export const CONFIDENCE_LEVELS = ['low', 'medium', 'high'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

export const PLAN_STATUSES = ['none', 'draft', 'approved', 'invalidated'] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];

export const TASK_COMPLEXITIES = ['mechanical', 'standard', 'complex'] as const;
export type TaskComplexity = (typeof TASK_COMPLEXITIES)[number];

export const CONTROL_MODES = ['manual', 'assisted', 'autonomous'] as const;
export type ControlMode = (typeof CONTROL_MODES)[number];

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
export type ControlActionType = (typeof CONTROL_ACTION_TYPES)[number];

export interface TaskAnalysis {
  stage: LifecycleState;
  planStatus: PlanStatus;
  ambiguity: Confidence;
  risk: Confidence;
  taskComplexity: TaskComplexity;
  confidence: Confidence;
  failedAttempts: number;
  architecturalDecisionRequired: boolean;
  evidenceSufficient: boolean;
  reasons: string[];
}

export interface ModelDecision {
  modelClass: ModelClass;
  confidence: Confidence;
  reasons: string[];
  previousClass?: ModelClass;
  transition: 'keep' | 'upgrade' | 'downgrade';
  latencyMode: 'fast' | 'standard';
}

export interface ExecutionProfile {
  modelClass: ModelClass;
  latencyMode: 'fast' | 'standard';
}

export interface ControlConfig {
  default: ControlMode;
  actions?: Partial<Record<ControlActionType, ControlMode>>;
}

export interface ActionRequest {
  id: string;
  type: ControlActionType;
  source:
    | 'context-engine'
    | 'model-router'
    | 'handoff-engine'
    | 'policy-engine'
    | 'experience-engine'
    | 'runtime-provider'
    | 'user';
  reason: string;
  confidence: Confidence;
  payload: unknown;
}

export interface ControlDecision {
  actionId: string;
  mode: ControlMode;
  outcome: 'recommend' | 'request_approval' | 'execute' | 'blocked';
  reason: string;
}

export type RuntimeCapabilityName =
  | Exclude<ControlActionType, 'controlledEvaluation' | 'controlledEvaluationBudgetOverride'>
  | 'contextTelemetry'
  | 'tokenTelemetry'
  | 'handoffInjection'
  | 'persistentMemory';
