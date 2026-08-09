import { CONFIDENCE_LEVELS, TASK_COMPLEXITIES, type Confidence, type LifecycleState, type PlanStatus, type TaskAnalysis, type TaskComplexity } from '@aes/spec';
import { AesTaskAnalysisError } from './errors.js';

export interface SemanticTaskClassification {
  ambiguity: Confidence;
  risk: Confidence;
  taskComplexity: TaskComplexity;
  confidence: Confidence;
  architecturalDecisionRequired: boolean;
  reasons: string[];
}

export interface SemanticTaskClassifier {
  classify(request: string): Promise<SemanticTaskClassification>;
}

export interface TaskAnalyzerInput {
  stage: LifecycleState;
  planStatus: PlanStatus;
  failedAttempts: number;
  request?: string;
}

export class TaskAnalyzer {
  constructor(private readonly classifier?: SemanticTaskClassifier) {}

  async analyze(input: TaskAnalyzerInput): Promise<TaskAnalysis> {
    if (input.planStatus === 'invalidated') {
      return {
        ...base(input),
        ambiguity: 'high',
        risk: 'medium',
        taskComplexity: 'complex',
        confidence: 'high',
        architecturalDecisionRequired: true,
        evidenceSufficient: true,
        reasons: ['existing plan is invalidated']
      };
    }

    if (input.stage === 'execution' && input.planStatus === 'approved') {
      return {
        ...base(input),
        ambiguity: 'low',
        risk: 'low',
        taskComplexity: 'standard',
        confidence: 'high',
        architecturalDecisionRequired: false,
        evidenceSufficient: true,
        reasons: ['approved plan exists for execution']
      };
    }

    if (input.request && this.classifier) {
      const semantic = await this.classifier.classify(input.request);
      validateSemanticClassification(semantic);
      return {
        ...base(input),
        ...semantic,
        evidenceSufficient: semantic.confidence !== 'low'
      };
    }

    return {
      ...base(input),
      ambiguity: 'medium',
      risk: 'medium',
      taskComplexity: 'standard',
      confidence: 'low',
      architecturalDecisionRequired: false,
      evidenceSufficient: false,
      reasons: ['insufficient deterministic evidence and no semantic classification']
    };
  }
}

function base(input: TaskAnalyzerInput) {
  return {
    stage: input.stage,
    planStatus: input.planStatus,
    failedAttempts: input.failedAttempts
  };
}


function validateSemanticClassification(value: SemanticTaskClassification): void {
  if (!CONFIDENCE_LEVELS.includes(value.ambiguity) ||
      !CONFIDENCE_LEVELS.includes(value.risk) ||
      !TASK_COMPLEXITIES.includes(value.taskComplexity) ||
      !CONFIDENCE_LEVELS.includes(value.confidence) ||
      typeof value.architecturalDecisionRequired !== 'boolean' ||
      !Array.isArray(value.reasons) ||
      !value.reasons.every((reason) => typeof reason === 'string')) {
    throw new AesTaskAnalysisError('Semantic task classifier returned malformed structured output');
  }
}
