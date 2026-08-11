import type { ModelClass, ModelDecision, ModelPreferenceEffect, TaskAnalysis } from '@aes/spec';

const MODEL_RANK: Record<ModelClass, number> = { cheap: 0, balanced: 1, powerful: 2 };

export class ModelRouter {
  route(analysis: TaskAnalysis, current: ModelClass = 'balanced', advice?: ModelPreferenceEffect): ModelDecision {
    let target: ModelClass = 'balanced';
    const reasons: string[] = [];

    if (
      analysis.stage === 'planning' &&
      analysis.architecturalDecisionRequired &&
      analysis.evidenceSufficient
    ) {
      target = 'powerful';
      reasons.push('planning requires a consequential architectural decision');
    } else if (
      analysis.stage === 'execution' &&
      analysis.planStatus === 'approved' &&
      analysis.taskComplexity === 'mechanical' &&
      analysis.risk === 'low' &&
      analysis.confidence === 'high'
    ) {
      target = 'cheap';
      reasons.push('approved low-risk mechanical execution');
    } else if (analysis.stage === 'execution' && analysis.planStatus === 'approved') {
      target = 'balanced';
      reasons.push('approved plan shifts work from reasoning to execution');
    } else {
      target = 'balanced';
      reasons.push('balanced is the default sufficient capability class');
    }

    const hardRequiresPowerful = analysis.stage === 'planning' &&
      analysis.architecturalDecisionRequired && analysis.evidenceSufficient;
    if (advice && !hardRequiresPowerful) {
      target = advice.prefer;
      reasons.push(`learned project preference suggests ${advice.prefer}`);
    }

    const transition = MODEL_RANK[target] > MODEL_RANK[current]
      ? 'upgrade'
      : MODEL_RANK[target] < MODEL_RANK[current]
        ? 'downgrade'
        : 'keep';

    return {
      modelClass: target,
      confidence: analysis.confidence,
      reasons,
      previousClass: current,
      transition,
      latencyMode: target === 'powerful' ? 'standard' : 'fast'
    };
  }
}
