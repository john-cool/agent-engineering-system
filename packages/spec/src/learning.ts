import type { Confidence } from './intelligence.js';
import type { ContextDecision } from './context.js';
import type { ControlDecision, ModelDecision, TaskAnalysis } from './intelligence.js';

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
