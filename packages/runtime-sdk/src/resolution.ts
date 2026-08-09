import type {
  ModelClass,
  ModelContextRequirement,
  ModelCostPreference,
  ModelLatencyPreference,
  ModelReasoning
} from '@aes/spec';

export type ModelCapability = 'coding' | 'toolUse';

export interface ModelRequirement {
  class: ModelClass;
  reasoning: ModelReasoning;
  latency: ModelLatencyPreference;
  context: ModelContextRequirement;
  capabilities?: ModelCapability[];
  costPreference?: ModelCostPreference;
}

export interface PricingMetadata {
  inputPerMillion?: number;
  outputPerMillion?: number;
  cachedInputPerMillion?: number;
  currency?: string;
}

export interface AvailableModel {
  id: string;
  provider: string;
  capabilities: {
    coding: boolean;
    toolUse: boolean;
    reasoningLevels?: ModelReasoning[];
    contextWindow?: number;
  };
  traits: {
    qualityClass: ModelClass;
    latencyClass?: 'fast' | 'standard' | 'slow';
  };
  availability: 'available' | 'unavailable' | 'unknown';
  pricing?: PricingMetadata;
}

export interface ResolvedModelProfile extends AvailableModel {
  selectedReasoning?: ModelReasoning;
}

export interface ModelAlternative {
  modelId: string;
  status: 'candidate' | 'rejected';
  reasons: string[];
}

export interface ModelFallbackResult {
  used: boolean;
  type: 'none' | 'equivalent' | 'acceptable_degradation' | 'quality_degradation' | 'request_replan';
  reason?: string;
}

export interface ModelResolution {
  requested: ModelRequirement;
  selected: ResolvedModelProfile;
  reasons: string[];
  alternatives: ModelAlternative[];
  fallback: ModelFallbackResult;
}
