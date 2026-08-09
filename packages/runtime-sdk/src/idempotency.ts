import type { RuntimeAdapter } from './adapter.js';
import type { RuntimeAction, RuntimeActionResult } from './actions.js';

export class AesIdempotencyConflictError extends Error {
  readonly code = 'AES_IDEMPOTENCY_CONFLICT' as const;

  constructor(readonly actionId: string) {
    super(`AES idempotency conflict for action ${actionId}`);
    this.name = 'AesIdempotencyConflictError';
  }
}

interface StoredAction {
  fingerprint: string;
  result: RuntimeActionResult;
}

export class IdempotentActionExecutor {
  readonly #actions = new Map<string, StoredAction>();

  async execute(
    adapter: Pick<RuntimeAdapter, 'executeAction'>,
    action: RuntimeAction
  ): Promise<RuntimeActionResult> {
    const fingerprint = JSON.stringify({ type: action.type, payload: action.payload });
    const previous = this.#actions.get(action.id);
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new AesIdempotencyConflictError(action.id);
      return previous.result;
    }
    if (!adapter.executeAction) {
      return { actionId: action.id, executed: false, error: 'runtime action execution unavailable' };
    }
    const result = await adapter.executeAction(action);
    this.#actions.set(action.id, { fingerprint, result });
    return result;
  }
}
