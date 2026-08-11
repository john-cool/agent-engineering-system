import type { CostMeasurement, LearningEvidence } from '@aes/spec';

export interface MetricCoverage {
  totalTokens: number;
  estimatedCost: number;
  durationMs: number;
}

export interface ExperienceMetrics {
  sampleCount: number;
  verifiedSuccessCount: number;
  verifiedSuccessRate: number;
  partialVerificationRate: number;
  firstPassSuccessRate: number;
  retryRate: number;
  replanRate: number;
  interruptionRate: number;
  providerRecoveryRate: number;
  fallbackRate: number;
  qualityRegressionRate: number;
  averageTotalTokens?: number;
  averageEstimatedCost?: CostMeasurement;
  averageDurationMs?: number;
  coverage: MetricCoverage;
  evidenceRefs: string[];
}

function avg(values: number[]): number | undefined {
  return values.length === 0 ? undefined : values.reduce((a, b) => a + b, 0) / values.length;
}

export function aggregateExperience(input: readonly LearningEvidence[]): ExperienceMetrics {
  const rows = input.filter((row) => row.attributable);
  if (rows.length === 0) throw new Error('AES experience mining requires attributable evidence');
  const costs = rows.filter((row) => row.estimatedCost).map((row) => row.estimatedCost!);
  const currencies = new Set(costs.map((cost) => cost.currency));
  const costAverage = currencies.size === 1 ? avg(costs.map((cost) => cost.amount)) : undefined;
  const totals = rows.flatMap((row) => row.totalTokens === undefined ? [] : [row.totalTokens]);
  const durations = rows.flatMap((row) => row.durationMs === undefined ? [] : [row.durationMs]);
  const passed = rows.filter((row) => row.verification === 'passed').length;
  const averageTotalTokens = avg(totals);
  const averageDurationMs = avg(durations);
  return {
    sampleCount: rows.length,
    verifiedSuccessCount: passed,
    verifiedSuccessRate: passed / rows.length,
    partialVerificationRate: rows.filter((row) => row.verification === 'partial').length / rows.length,
    firstPassSuccessRate: rows.filter((row) => row.verification === 'passed' && row.retries === 0).length / rows.length,
    retryRate: rows.reduce((sum, row) => sum + row.retries, 0) / rows.length,
    replanRate: rows.reduce((sum, row) => sum + (row.replans ?? 0), 0) / rows.length,
    interruptionRate: rows.reduce((sum, row) => sum + row.userInterruptions, 0) / rows.length,
    providerRecoveryRate: rows.reduce((sum, row) => sum + row.providerRecoveries, 0) / rows.length,
    fallbackRate: rows.filter((row) => row.fallbackKind).length / rows.length,
    qualityRegressionRate: rows.filter((row) => row.qualityRegression === true).length / rows.length,
    ...(averageTotalTokens !== undefined ? { averageTotalTokens } : {}),
    ...(costAverage !== undefined ? { averageEstimatedCost: { amount: costAverage, currency: costs[0]!.currency } } : {}),
    ...(averageDurationMs !== undefined ? { averageDurationMs } : {}),
    coverage: {
      totalTokens: totals.length / rows.length,
      estimatedCost: costs.length / rows.length,
      durationMs: durations.length / rows.length
    },
    evidenceRefs: rows.map((row) => row.id).sort()
  };
}
