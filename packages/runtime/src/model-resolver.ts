import type {
  AvailableModel,
  ModelAlternative,
  ModelRequirement,
  ModelResolution,
  ResolvedModelProfile
} from '@aes/runtime-sdk';

const QUALITY_RANK = { cheap: 0, balanced: 1, powerful: 2 } as const;
const LATENCY_RANK = {
  prefer_fast: { fast: 0, standard: 1, slow: 2 },
  balanced: { standard: 0, fast: 1, slow: 2 },
  quality_first: { standard: 0, slow: 1, fast: 2 }
} as const;

export class ModelResolutionError extends Error {
  constructor(
    message: string,
    readonly alternatives: ModelAlternative[]
  ) {
    super(message);
    this.name = 'ModelResolutionError';
  }
}

export interface ModelResolverInput {
  requirement: ModelRequirement;
  models: readonly AvailableModel[];
  allowQualityDegradationCandidate?: boolean;
}

function capabilityRejections(requirement: ModelRequirement, model: AvailableModel): string[] {
  const reasons: string[] = [];
  if (model.availability !== 'available') reasons.push(`availability is ${model.availability}`);
  for (const capability of requirement.capabilities ?? []) {
    if (!model.capabilities[capability]) reasons.push(`missing capability ${capability}`);
  }
  return reasons;
}

function qualityRejections(requirement: ModelRequirement, model: AvailableModel): string[] {
  const reasons: string[] = [];
  if (QUALITY_RANK[model.traits.qualityClass] < QUALITY_RANK[requirement.class]) {
    reasons.push(`quality class ${model.traits.qualityClass} is below ${requirement.class}`);
  }
  const levels = model.capabilities.reasoningLevels;
  if (levels && !levels.includes(requirement.reasoning)) {
    reasons.push(`reasoning level ${requirement.reasoning} is unsupported`);
  }
  return reasons;
}

function rejectionReasons(requirement: ModelRequirement, model: AvailableModel): string[] {
  return [...capabilityRejections(requirement, model), ...qualityRejections(requirement, model)];
}

function toResolved(model: AvailableModel, requirement: ModelRequirement): ResolvedModelProfile {
  return {
    ...model,
    ...(model.capabilities.reasoningLevels?.includes(requirement.reasoning)
      ? { selectedReasoning: requirement.reasoning }
      : {})
  };
}

function knownPrice(model: AvailableModel): number | undefined {
  const price = model.pricing;
  if (!price) return undefined;
  const values = [price.inputPerMillion, price.outputPerMillion, price.cachedInputPerMillion]
    .filter((value): value is number => value !== undefined);
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) : undefined;
}

function compareCandidates(requirement: ModelRequirement, a: AvailableModel, b: AvailableModel): number {
  const aQualityDelta = QUALITY_RANK[a.traits.qualityClass] - QUALITY_RANK[requirement.class];
  const bQualityDelta = QUALITY_RANK[b.traits.qualityClass] - QUALITY_RANK[requirement.class];
  if (aQualityDelta !== bQualityDelta) return aQualityDelta - bQualityDelta;

  const aLatency = LATENCY_RANK[requirement.latency][a.traits.latencyClass ?? 'standard'];
  const bLatency = LATENCY_RANK[requirement.latency][b.traits.latencyClass ?? 'standard'];
  if (aLatency !== bLatency) return aLatency - bLatency;

  if (requirement.costPreference === 'minimize') {
    const aCost = knownPrice(a);
    const bCost = knownPrice(b);
    if (aCost !== undefined && bCost !== undefined && aCost !== bCost) return aCost - bCost;
    if (aCost !== undefined && bCost === undefined) return -1;
    if (aCost === undefined && bCost !== undefined) return 1;
  }

  return a.id.localeCompare(b.id);
}

function compareDegraded(requirement: ModelRequirement, a: AvailableModel, b: AvailableModel): number {
  const quality = QUALITY_RANK[b.traits.qualityClass] - QUALITY_RANK[a.traits.qualityClass];
  if (quality !== 0) return quality;
  return compareCandidates({ ...requirement, class: a.traits.qualityClass }, a, b);
}

export class ModelResolver {
  resolve(input: ModelResolverInput): ModelResolution {
    let alternatives: ModelAlternative[] = input.models.map((model) => {
      const reasons = rejectionReasons(input.requirement, model);
      return {
        modelId: model.id,
        status: reasons.length === 0 ? 'candidate' : 'rejected',
        reasons
      };
    });

    const hardCandidates = input.models.filter((_, index) => alternatives[index]?.status === 'candidate');
    let selected: AvailableModel | undefined;
    let fallback: ModelResolution['fallback'] = { used: false, type: 'none' };

    if (hardCandidates.length > 0) {
      selected = [...hardCandidates].sort((a, b) => compareCandidates(input.requirement, a, b))[0];
      if (input.requirement.latency === 'prefer_fast' && selected?.traits.latencyClass !== 'fast') {
        fallback = {
          used: true,
          type: 'acceptable_degradation',
          reason: 'preferred fast latency was unavailable while required quality was preserved'
        };
      }
    } else if (input.allowQualityDegradationCandidate) {
      const degradedCandidates = input.models.filter(
        (model) => capabilityRejections(input.requirement, model).length === 0
      );
      selected = [...degradedCandidates].sort((a, b) => compareDegraded(input.requirement, a, b))[0];
      if (selected) {
        alternatives = alternatives.map((alternative) =>
          alternative.modelId === selected?.id
            ? {
                modelId: alternative.modelId,
                status: 'candidate',
                reasons: qualityRejections(input.requirement, selected)
              }
            : alternative
        );
        fallback = {
          used: true,
          type: 'quality_degradation',
          reason: `selected ${selected.traits.qualityClass} because no model met ${input.requirement.class} requirements`
        };
      }
    }

    if (!selected) {
      throw new ModelResolutionError('No model satisfies the required runtime constraints.', alternatives);
    }

    return {
      requested: input.requirement,
      selected: toResolved(selected, input.requirement),
      reasons: fallback.used
        ? [fallback.reason ?? 'fallback selected']
        : ['selected from models satisfying all hard constraints'],
      alternatives,
      fallback
    };
  }
}
