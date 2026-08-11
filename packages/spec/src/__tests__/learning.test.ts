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

test('learning contracts separate traces and durable knowledge metadata', () => {
  const metadata: KnowledgeMetadata = {
    id: 'k-1',
    status: 'candidate',
    scope: 'project',
    confidence: 'medium',
    createdAt: '2026-08-08T00:00:00Z',
    updatedAt: '2026-08-08T00:00:00Z',
    evidenceRefs: ['trace-1']
  };
  const trace = {
    taskClass: 'refactor',
    analysis: {} as never,
    modelDecisions: [],
    contextDecisions: [],
    controlOutcomes: [],
    retries: 0,
    verificationOutcome: 'passed',
    userOverrides: [],
    timestamp: '2026-08-08T00:00:00Z'
  } satisfies DecisionTrace;
  assert.equal(metadata.scope, 'project');
  assert.equal(trace.verificationOutcome, 'passed');
});

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
    effect: candidate.effect!,
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
