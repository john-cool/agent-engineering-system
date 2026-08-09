export const RUNTIME_FAILURE_KINDS = [
  'transport_failed',
  'provider_crashed',
  'provider_unavailable',
  'model_unavailable',
  'rate_limited',
  'session_lost',
  'approval_failed',
  'action_ambiguous',
  'execution_failed',
  'context_exhausted',
  'verification_failed',
  'cancelled'
] as const;
export type RuntimeFailureKind = (typeof RUNTIME_FAILURE_KINDS)[number];

export const RUNTIME_OUTCOMES = ['success', 'failed', 'cancelled', 'recovered'] as const;
export type RuntimeOutcome = (typeof RUNTIME_OUTCOMES)[number];

export type RuntimeVerification = 'passed' | 'failed' | 'not_run';
export type ModelReasoning = 'low' | 'medium' | 'high';
export type ModelLatencyPreference = 'prefer_fast' | 'balanced' | 'quality_first';
export type ModelContextRequirement = 'standard' | 'large';
export type ModelCostPreference = 'minimize' | 'balanced' | 'quality_first';
