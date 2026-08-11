export interface BaselineSnapshot {
  verifiedRate: number;
  retryRate: number;
  interruptionRate: number;
  averageCost?: { amount: number; currency: string };
}

export interface RegressionResult { action: 'keep' | 'degrade'; reason: string; }

export class RegressionMonitor {
  constructor(private readonly policy: { regressionWindow: number; qualityNonInferiorityMargin: number }) {}

  evaluate(input: {
    baseline: BaselineSnapshot;
    observed: readonly { attributable: boolean; verification: 'passed' | 'failed' | 'partial' | 'not_run'; retries: number; userInterruptions: number }[];
    overlayId: string;
  }): RegressionResult {
    const rows = input.observed.filter((row) => row.attributable).slice(-this.policy.regressionWindow);
    if (rows.length < this.policy.regressionWindow) return { action: 'keep', reason: 'regression window incomplete' };
    const verifiedRate = rows.filter((row) => row.verification === 'passed').length / rows.length;
    if (verifiedRate + this.policy.qualityNonInferiorityMargin < input.baseline.verifiedRate) {
      return { action: 'degrade', reason: `verified quality regressed for ${input.overlayId}` };
    }
    return { action: 'keep', reason: 'post-activation quality remains within policy' };
  }
}
