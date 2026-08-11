import type { ControlMode } from '@aes/spec';
import type { ResourceBudget } from '@aes/runtime-sdk';

export interface RuntimeConfigInput {
  runtime?: { provider?: string };
  telemetry?: { providerRawEvents?: boolean };
  modelResolution?: { qualityDegradation?: ControlMode };
  codex?: { processScope?: 'workspace' };
  learning?: { enabled?: boolean; analysis?: { maxCandidatesPerTask?: number; maxAnalysisTokensPerTask?: number; maxIncrementalWorkMs?: number }; evaluation?: { minSamples?: number; regressionWindow?: number }; controlledEvals?: { enabled?: boolean; sandboxOnly?: boolean; maxRunsPerCandidate?: number; maxTokensPerDay?: number; maxCostPerDay?: number } };
  knowledge?: { retrieval?: { maxRecords?: number; maxEstimatedTokens?: number }; budgets?: { maxActiveRecords?: number; maxRecordTokens?: number; maxIndexTokens?: number } };
  control?: { actions?: { controlledEvaluation?: ControlMode; controlledEvaluationBudgetOverride?: ControlMode } };
}

export interface NormalizedRuntimeConfig {
  runtime: { provider: string };
  telemetry: { providerRawEvents: boolean };
  modelResolution: { qualityDegradation: ControlMode };
  codex: { processScope: 'workspace' };
  learning: { enabled: boolean; analysis: { maxCandidatesPerTask: number; maxAnalysisTokensPerTask: number; maxIncrementalWorkMs: number }; evaluation: { minSamples: number; regressionWindow: number }; controlledEvals: { enabled: boolean; sandboxOnly: boolean; maxRunsPerCandidate: number; maxTokensPerDay: number; maxCostPerDay: number } };
  knowledge: { retrieval: { maxRecords: number; maxEstimatedTokens: number }; budgets: { maxActiveRecords: number; maxRecordTokens: number; maxIndexTokens: number } };
  control: { actions: { controlledEvaluation: ControlMode; controlledEvaluationBudgetOverride: ControlMode } };
}

export function normalizeRuntimeConfig(input: RuntimeConfigInput): NormalizedRuntimeConfig {
  return {
    runtime: { provider: input.runtime?.provider ?? 'codex' },
    telemetry: { providerRawEvents: input.telemetry?.providerRawEvents ?? false },
    modelResolution: { qualityDegradation: input.modelResolution?.qualityDegradation ?? 'assisted' },
    codex: { processScope: 'workspace' },
    learning: { enabled: input.learning?.enabled ?? true, analysis: { maxCandidatesPerTask: input.learning?.analysis?.maxCandidatesPerTask ?? 3, maxAnalysisTokensPerTask: input.learning?.analysis?.maxAnalysisTokensPerTask ?? 3000, maxIncrementalWorkMs: input.learning?.analysis?.maxIncrementalWorkMs ?? 500 }, evaluation: { minSamples: input.learning?.evaluation?.minSamples ?? 20, regressionWindow: input.learning?.evaluation?.regressionWindow ?? 20 }, controlledEvals: { enabled: input.learning?.controlledEvals?.enabled ?? true, sandboxOnly: input.learning?.controlledEvals?.sandboxOnly ?? true, maxRunsPerCandidate: input.learning?.controlledEvals?.maxRunsPerCandidate ?? 5, maxTokensPerDay: input.learning?.controlledEvals?.maxTokensPerDay ?? 100000, maxCostPerDay: input.learning?.controlledEvals?.maxCostPerDay ?? 0.5 } },
    knowledge: { retrieval: { maxRecords: input.knowledge?.retrieval?.maxRecords ?? 8, maxEstimatedTokens: input.knowledge?.retrieval?.maxEstimatedTokens ?? 2500 }, budgets: { maxActiveRecords: input.knowledge?.budgets?.maxActiveRecords ?? 500, maxRecordTokens: input.knowledge?.budgets?.maxRecordTokens ?? 800, maxIndexTokens: input.knowledge?.budgets?.maxIndexTokens ?? 4000 } },
    control: { actions: { controlledEvaluation: input.control?.actions?.controlledEvaluation ?? 'autonomous', controlledEvaluationBudgetOverride: input.control?.actions?.controlledEvaluationBudgetOverride ?? 'assisted' } }
  };
}

export function toControlledEvalResourceBudget(config: NormalizedRuntimeConfig['learning']['controlledEvals'], pricingCurrency?: string): { allowed: true; budget: ResourceBudget } | { allowed: false; reason: string } {
  if (config.maxCostPerDay > 0 && !pricingCurrency) return { allowed: false, reason: 'controlled eval cost budget requires an explicit pricing currency' };
  return { allowed: true, budget: { maxTotalTokens: config.maxTokensPerDay, ...(pricingCurrency ? { maxEstimatedCost: { amount: config.maxCostPerDay, currency: pricingCurrency } } : {}), warningThreshold: 0.8 } };
}
