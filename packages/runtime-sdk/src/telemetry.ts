import type { RuntimeFailureKind, RuntimeOutcome, RuntimeVerification } from '@aes/spec';
import type { Money } from './pricing.js';
import type { ModelRequirement, ModelResolution } from './resolution.js';
import type { ResourceDecision } from './resources.js';

export interface RuntimeTelemetry {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  durationMs: number;
  retries: number;
  compactions: number;
  estimatedCost?: Money;
  outcome: RuntimeOutcome;
  verification: RuntimeVerification;
}

export interface RuntimeFailureEvidence {
  kind: RuntimeFailureKind;
  attributableToModelQuality: boolean;
  fingerprint?: string;
}

export interface RuntimeExperienceEvidence {
  id: string;
  taskClass: string;
  verification: RuntimeVerification;
  retries: number;
  userInterruptions: number;
  attributableToModelQuality: boolean;
  providerRecoveries: number;
  durationMs?: number;
  estimatedCost?: Money;
}

export interface RuntimeDecisionTrace {
  traceId: string;
  taskId?: string;
  taskClass?: string;
  sessionId: string;
  turnId?: string;
  timestamp: string;
  requirement: ModelRequirement;
  resolution: ModelResolution;
  telemetry: RuntimeTelemetry;
  providerRecoveries: number;
  userInterruptions: number;
  resource?: ResourceDecision;
  failure?: RuntimeFailureEvidence;
  cancellation?: { initiator: 'user' | 'runtime' };
  context?: {
    before?: 'good' | 'growing' | 'start_fresh';
    after?: 'good' | 'growing' | 'start_fresh';
  };
}
