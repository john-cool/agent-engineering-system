import type { LearningCandidate, LearningEvidence, LearningScope, ModelClass } from '@aes/spec';
import { aggregateExperience, type ExperienceMetrics } from './experience-metrics.js';

export interface ChoiceAggregate {
  choice: ModelClass;
  metrics: ExperienceMetrics;
}

export class ExperienceMiner {
  aggregate(evidence: readonly LearningEvidence[]): ExperienceMetrics {
    return aggregateExperience(evidence);
  }

  aggregateModelChoices(evidence: readonly LearningEvidence[]): ChoiceAggregate[] {
    const byChoice = new Map<ModelClass, LearningEvidence[]>();
    for (const row of evidence.filter((item) => item.attributable && item.modelClass)) {
      byChoice.set(row.modelClass!, [...(byChoice.get(row.modelClass!) ?? []), row]);
    }
    return [...byChoice.entries()]
      .map(([choice, rows]) => ({ choice, metrics: aggregateExperience(rows) }))
      .sort((a, b) => a.choice.localeCompare(b.choice));
  }

  stablePreferenceWindows(evidence: readonly LearningEvidence[], preferred: ModelClass): number {
    const rows = [...evidence]
      .filter((row) => row.attributable && row.modelClass)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    if (rows.length < 10) return 0;
    const midpoint = Math.floor(rows.length / 2);
    return [rows.slice(0, midpoint), rows.slice(midpoint)].filter((window) => {
      const ranked = this.aggregateModelChoices(window).sort((a, b) =>
        b.metrics.verifiedSuccessRate - a.metrics.verifiedSuccessRate ||
        a.metrics.retryRate - b.metrics.retryRate);
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
      const aggregates = [...byChoice.entries()].map(([choice, choiceRows]) => ({
        choice, metrics: aggregateExperience(choiceRows)
      }));
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
        effect: { kind: 'model_preference', prefer: best.choice, avoid: aggregates.slice(1).map((item) => item.choice) },
        source: 'experience_miner',
        evidenceRefs: aggregates.flatMap((item) => item.metrics.evidenceRefs).sort(),
        evidenceStrength, status: 'candidate', createdAt: now, updatedAt: now,
        evaluationRefs: []
      });
    }
    return candidates;
  }
}
