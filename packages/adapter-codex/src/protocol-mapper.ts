import type { ActionRequest, RuntimeFailureKind, RuntimeOutcome } from '@aes/spec';
import type { RuntimeEvent } from '@aes/runtime-sdk';
import type { CodexServerRequest } from './transport.js';
import { isRecord, type CodexProtocolMessage } from './protocol.js';

export function mapCodexMessage(message: CodexProtocolMessage): RuntimeEvent | undefined {
  if (message.kind === 'unknown_notification') return undefined;
  const params = message.params;
  const sessionId = readString(params.threadId) ?? 'codex';
  const turnId = readString(params.turnId) ?? readNestedString(params.turn, 'id');
  const meta = createMeta(sessionId, turnId, eventIdFor(message.method, params));

  switch (message.method) {
    case 'turn/started':
      return { type: 'turn_started', delivery: 'lossless', meta };
    case 'turn/completed': {
      const status = readNestedString(params.turn, 'status');
      return {
        type: 'turn_completed',
        delivery: 'lossless',
        meta,
        data: { outcome: mapTurnOutcome(status) }
      };
    }
    case 'item/agentMessage/delta':
      return {
        type: 'output_delta', delivery: 'coalescible', meta,
        data: { text: readString(params.delta) ?? '' }
      };
    case 'thread/tokenUsage/updated': {
      const usage = extractTokenUsage(params);
      return { type: 'usage_updated', delivery: 'coalescible', meta, data: usage };
    }
    case 'item/started':
      return mapItemStarted(params, meta);
    case 'item/completed':
      return mapItemCompleted(params, meta);
    case 'warning':
      return {
        type: 'runtime_warning', delivery: 'lossless', meta,
        data: { message: readString(params.message) ?? 'Codex warning' }
      };
    case 'configWarning':
      return {
        type: 'runtime_warning', delivery: 'lossless', meta,
        data: { code: 'codex_config_warning', message: readString(params.summary) ?? 'Codex config warning' }
      };
    case 'error': {
      const error = isRecord(params.error) ? params.error : {};
      const kind = mapFailureKind(error.codexErrorInfo);
      return {
        type: 'runtime_failed', delivery: 'lossless', meta,
        data: { kind, message: readString(error.message) ?? 'Codex runtime failure' }
      };
    }
    case 'serverRequest/resolved':
      return undefined;
    default:
      return undefined;
  }
}

export function mapCodexServerRequest(request: CodexServerRequest): RuntimeEvent | undefined {
  if (!isRecord(request.params)) return undefined;
  if (request.method !== 'item/commandExecution/requestApproval' && request.method !== 'item/fileChange/requestApproval') {
    return undefined;
  }
  const params = request.params;
  const sessionId = readString(params.threadId) ?? 'codex';
  const turnId = readString(params.turnId);
  const requestId = String(request.id);
  const itemId = readString(params.itemId);
  const action: ActionRequest = {
    id: `codex:${requestId}`,
    type: 'toolExecution',
    source: 'runtime-provider',
    reason: readString(params.reason) ?? `Codex requested approval for ${request.method}`,
    confidence: 'high',
    payload: {
      provider: 'codex',
      requestMethod: request.method,
      itemId,
      params
    }
  };
  return {
    type: 'approval_requested',
    delivery: 'lossless',
    meta: createMeta(sessionId, turnId, `approval:${requestId}`),
    requestId,
    action
  };
}

function mapItemStarted(params: Record<string, unknown>, meta: RuntimeEvent['meta']): RuntimeEvent | undefined {
  const item = isRecord(params.item) ? params.item : undefined;
  if (!item) return undefined;
  const type = readString(item.type);
  const id = readString(item.id) ?? 'unknown';
  if (type === 'contextCompaction') return { type: 'compaction_started', delivery: 'lossless', meta };
  if (type === 'commandExecution' || type === 'fileChange' || type === 'mcpToolCall' || type === 'dynamicToolCall') {
    return {
      type: 'tool_requested', delivery: 'lossless', meta,
      requestId: id, actionId: id, toolName: type
    };
  }
  return undefined;
}

function mapItemCompleted(params: Record<string, unknown>, meta: RuntimeEvent['meta']): RuntimeEvent | undefined {
  const item = isRecord(params.item) ? params.item : undefined;
  if (!item) return undefined;
  const type = readString(item.type);
  const id = readString(item.id) ?? 'unknown';
  if (type === 'contextCompaction') {
    return { type: 'compaction_completed', delivery: 'lossless', meta, data: { contextRevision: 0 } };
  }
  if (type === 'commandExecution' || type === 'fileChange' || type === 'mcpToolCall' || type === 'dynamicToolCall') {
    const status = readString(item.status);
    return {
      type: 'tool_completed', delivery: 'lossless', meta,
      actionId: id, ok: status === 'completed'
    };
  }
  return undefined;
}

function extractTokenUsage(params: Record<string, unknown>): { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } {
  const candidates: unknown[] = [params.tokenUsage, params.usage, params];
  if (isRecord(params.tokenUsage)) candidates.unshift(params.tokenUsage.total, params.tokenUsage.totalTokenUsage, params.tokenUsage.total_token_usage);
  for (const candidate of candidates) {
    if (!isRecord(candidate)) continue;
    const inputTokens = readNumberAny(candidate, ['inputTokens', 'input_tokens', 'input']);
    const outputTokens = readNumberAny(candidate, ['outputTokens', 'output_tokens', 'output']);
    const cachedInputTokens = readNumberAny(candidate, ['cachedInputTokens', 'cached_input_tokens', 'cached']);
    if (inputTokens !== undefined || outputTokens !== undefined || cachedInputTokens !== undefined) {
      const result: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } = {};
      if (inputTokens !== undefined) result.inputTokens = inputTokens;
      if (outputTokens !== undefined) result.outputTokens = outputTokens;
      if (cachedInputTokens !== undefined) result.cachedInputTokens = cachedInputTokens;
      return result;
    }
  }
  return {};
}

function mapTurnOutcome(status: string | undefined): RuntimeOutcome {
  if (status === 'interrupted') return 'cancelled';
  if (status === 'failed') return 'failed';
  return 'success';
}

function mapFailureKind(info: unknown): RuntimeFailureKind {
  const name = typeof info === 'string' ? info : isRecord(info) ? readString(info.type) ?? readString(info.code) : undefined;
  if (name === 'ContextWindowExceeded') return 'context_exhausted';
  if (name === 'UsageLimitExceeded') return 'rate_limited';
  if (name === 'HttpConnectionFailed' || name === 'ResponseStreamConnectionFailed' || name === 'ResponseStreamDisconnected') return 'transport_failed';
  return 'execution_failed';
}

function createMeta(sessionId: string, turnId: string | undefined, eventId: string): RuntimeEvent['meta'] {
  const meta: RuntimeEvent['meta'] = { sessionId, eventId, timestamp: new Date().toISOString() };
  if (turnId !== undefined) meta.turnId = turnId;
  return meta;
}

function eventIdFor(method: string, params: Record<string, unknown>): string {
  return readString(params.eventId)
    ?? readString(params.itemId)
    ?? readNestedString(params.item, 'id')
    ?? readNestedString(params.turn, 'id')
    ?? `${method}:${Date.now()}`;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readNestedString(value: unknown, key: string): string | undefined {
  return isRecord(value) ? readString(value[key]) : undefined;
}

function readNumberAny(record: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const key of keys) if (typeof record[key] === 'number' && Number.isFinite(record[key])) return record[key] as number;
  return undefined;
}
