import type {
  AuthorityCandidate,
  InteractionEvidence,
  LearningCandidate,
  LearningEvaluation,
  LearningEvidence,
  PolicyOverlay,
  ScopedAuthorityGrant,
  ShadowDecisionTrace,
  TaskSignature
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
