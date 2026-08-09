import type { ModelClass, ModelReasoning } from '@aes/spec';
import type { AvailableModel } from '@aes/runtime-sdk';
import type { CodexTransport } from './transport.js';
import { isRecord } from './protocol.js';

export interface CodexDiscoveredModel {
  id: string;
  model?: string;
  displayName?: string;
  isDefault?: boolean;
  hidden?: boolean;
  defaultReasoningEffort?: string;
  supportedReasoningEfforts?: unknown[];
  inputModalities?: string[];
}

export interface CodexModelClassification {
  qualityClass: ModelClass;
  latencyClass?: 'fast' | 'standard' | 'slow';
}

export interface CodexModelCatalogOptions {
  ttlMs: number;
  classify?: (model: CodexDiscoveredModel) => CodexModelClassification;
  now?: () => number;
}

export class CodexModelCatalog {
  private cached: AvailableModel[] | undefined;
  private cachedAt = 0;
  private readonly now: () => number;

  constructor(
    private readonly transport: CodexTransport,
    private readonly options: CodexModelCatalogOptions
  ) {
    this.now = options.now ?? Date.now;
  }

  async discover(options: { forceRefresh?: boolean } = {}): Promise<AvailableModel[]> {
    const fresh = this.cached !== undefined && (this.now() - this.cachedAt) < this.options.ttlMs;
    if (!options.forceRefresh && fresh) return [...this.cached!];

    const rawModels = await this.readAllModels();
    const normalized = rawModels.map((model) => this.normalize(model));
    this.cached = normalized;
    this.cachedAt = this.now();
    return [...normalized];
  }

  private async readAllModels(): Promise<CodexDiscoveredModel[]> {
    const items: CodexDiscoveredModel[] = [];
    let cursor: string | undefined;
    do {
      const params: Record<string, unknown> = { limit: 100, includeHidden: false };
      if (cursor !== undefined) params.cursor = cursor;
      const response = await this.transport.request('model/list', params);
      if (!isRecord(response) || !Array.isArray(response.data)) {
        throw new Error('invalid codex model/list response');
      }
      for (const entry of response.data) items.push(parseModelEntry(entry));
      cursor = typeof response.nextCursor === 'string' && response.nextCursor.length > 0
        ? response.nextCursor
        : undefined;
    } while (cursor !== undefined);
    return items;
  }

  private normalize(model: CodexDiscoveredModel): AvailableModel {
    const classification = this.options.classify?.(model) ?? { qualityClass: 'balanced' as const };
    const reasoningLevels = normalizeReasoningEfforts(model.supportedReasoningEfforts);
    const capabilities: AvailableModel['capabilities'] = {
      coding: true,
      toolUse: true
    };
    if (reasoningLevels.length > 0) capabilities.reasoningLevels = reasoningLevels;
    const traits: AvailableModel['traits'] = { qualityClass: classification.qualityClass };
    if (classification.latencyClass !== undefined) traits.latencyClass = classification.latencyClass;
    return {
      id: model.id,
      provider: 'codex',
      capabilities,
      traits,
      availability: 'available'
    };
  }
}

function parseModelEntry(value: unknown): CodexDiscoveredModel {
  if (!isRecord(value)) throw new Error('invalid codex model entry');
  const id = typeof value.id === 'string'
    ? value.id
    : typeof value.model === 'string'
      ? value.model
      : undefined;
  if (!id) throw new Error('invalid codex model entry: missing id');
  const result: CodexDiscoveredModel = { id };
  if (typeof value.model === 'string') result.model = value.model;
  if (typeof value.displayName === 'string') result.displayName = value.displayName;
  if (typeof value.isDefault === 'boolean') result.isDefault = value.isDefault;
  if (typeof value.hidden === 'boolean') result.hidden = value.hidden;
  if (typeof value.defaultReasoningEffort === 'string') result.defaultReasoningEffort = value.defaultReasoningEffort;
  if (Array.isArray(value.supportedReasoningEfforts)) result.supportedReasoningEfforts = value.supportedReasoningEfforts;
  if (Array.isArray(value.inputModalities) && value.inputModalities.every((x) => typeof x === 'string')) {
    result.inputModalities = value.inputModalities as string[];
  }
  return result;
}

function normalizeReasoningEfforts(values: unknown[] | undefined): ModelReasoning[] {
  if (!values) return [];
  const result: ModelReasoning[] = [];
  for (const value of values) {
    const raw = typeof value === 'string'
      ? value
      : isRecord(value) && typeof value.reasoningEffort === 'string'
        ? value.reasoningEffort
        : undefined;
    const normalized = normalizeReasoning(raw);
    if (normalized && !result.includes(normalized)) result.push(normalized);
  }
  return result;
}

function normalizeReasoning(value: string | undefined): ModelReasoning | undefined {
  if (value === 'none' || value === 'minimal' || value === 'low') return 'low';
  if (value === 'medium') return 'medium';
  if (value === 'high' || value === 'xhigh' || value === 'max') return 'high';
  return undefined;
}
