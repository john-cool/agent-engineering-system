import type {
  ContextDecision,
  ContextFacts,
  ContextPressure,
  ContextRelevance
} from '@aes/spec';

export class ContextEngine {
  evaluate(facts: ContextFacts): ContextDecision {
    const pressure = this.pressure(facts);
    const relevance = this.relevance(facts);
    const reasons: string[] = [];

    if (facts.activeDependsOnPriorEvidence) reasons.push('active work depends on prior evidence');
    if (facts.nextTaskIndependent) reasons.push('next task is largely independent');
    if (facts.staleLogs) reasons.push('old debugging logs are stale');
    if (facts.repeatedContent) reasons.push('context contains repeated content');
    if (pressure === 'unknown') reasons.push('token telemetry unavailable');

    if (relevance === 'high') {
      return {
        health: pressure === 'high' ? 'growing' : 'good',
        pressure,
        relevance,
        confidence: 'high',
        reasons,
        recommendations: ['continue']
      };
    }

    if (
      relevance === 'low' &&
      facts.handoffPossible &&
      (facts.staleLogs || facts.completedTasks >= 2 || facts.repeatedContent)
    ) {
      return {
        health: 'start_fresh',
        pressure,
        relevance,
        confidence: 'high',
        reasons,
        recommendations: ['create_handoff', 'start_fresh']
      };
    }

    if (pressure === 'high') {
      return {
        health: 'growing',
        pressure,
        relevance,
        confidence: 'high',
        reasons,
        recommendations: ['compact']
      };
    }

    return {
      health: 'good',
      pressure,
      relevance,
      confidence: pressure === 'unknown' ? 'medium' : 'high',
      reasons,
      recommendations: ['continue']
    };
  }

  private pressure(facts: ContextFacts): ContextPressure {
    if (facts.inputTokens === undefined || facts.contextWindow === undefined || facts.contextWindow <= 0) {
      return 'unknown';
    }
    const ratio = facts.inputTokens / facts.contextWindow;
    if (ratio >= 0.75) return 'high';
    if (ratio >= 0.4) return 'medium';
    return 'low';
  }

  private relevance(facts: ContextFacts): ContextRelevance {
    if (facts.activeDependsOnPriorEvidence) return 'high';
    if (facts.nextTaskIndependent) return 'low';
    return 'medium';
  }
}
