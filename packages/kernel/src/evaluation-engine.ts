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
    const comparativeRequired = input.candidate.kind === 'model_preference' ||
      input.candidate.kind === 'latency_preference' ||
      input.candidate.kind === 'retry_preference' ||
      input.candidate.kind === 'replan_preference';
    const comparisonAvailable = !comparativeRequired || (
      EVIDENCE_RANK[input.candidate.evidenceStrength] >= EVIDENCE_RANK.comparative &&
      !!baseline && baseline.sampleCount >= this.policy.minComparableSamplesPerAlternative
    );
    const qualityPassed = !baseline ||
      input.candidateMetrics.verifiedSuccessRate + this.policy.qualityNonInferiorityMargin >= baseline.verifiedSuccessRate;

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
    ].filter((value): value is string => !!value);

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
      evidenceVolume: {
        passed: volumePassed && comparisonAvailable,
        value: input.candidateMetrics.sampleCount,
        threshold: this.policy.minSamples,
        reason: comparisonAvailable ? 'sample threshold evaluated' : 'comparative evidence missing'
      },
      quality: {
        passed: qualityPassed,
        value: input.candidateMetrics.verifiedSuccessRate,
        ...(baseline ? { threshold: baseline.verifiedSuccessRate - this.policy.qualityNonInferiorityMargin } : {}),
        reason: qualityPassed ? 'required quality preserved' : 'candidate regressed beyond margin'
      },
      efficiency: {
        passed: efficiencyPassed,
        value: bestImprovement,
        threshold: this.policy.minRelativeImprovement,
        reason: efficiencyPassed ? 'efficiency target met or not required' : 'efficiency target not met'
      },
      stability: {
        passed: stabilityPassed,
        value: input.stableWindows,
        threshold: 2,
        reason: stabilityPassed ? 'stable across windows' : 'additional window required'
      },
      reasons,
      evaluatedAt: input.evaluatedAt
    };
  }
}
