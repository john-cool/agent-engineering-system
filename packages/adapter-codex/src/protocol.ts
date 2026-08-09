const KNOWN_NOTIFICATION_METHODS = new Set([
  'turn/started',
  'turn/completed',
  'item/started',
  'item/completed',
  'item/agentMessage/delta',
  'thread/tokenUsage/updated',
  'warning',
  'configWarning',
  'error',
  'serverRequest/resolved'
]);

export interface CodexKnownNotification {
  kind: 'known_notification';
  method: string;
  params: Record<string, unknown>;
}

export interface CodexUnknownNotification {
  kind: 'unknown_notification';
  method: string;
  params: unknown;
}

export type CodexProtocolMessage = CodexKnownNotification | CodexUnknownNotification;

export function parseCodexProtocolMessage(value: unknown): CodexProtocolMessage {
  if (!isRecord(value) || typeof value.method !== 'string') {
    throw new Error('invalid codex protocol message: expected method string');
  }
  const method = value.method;
  const params = value.params;
  if (!KNOWN_NOTIFICATION_METHODS.has(method)) {
    return { kind: 'unknown_notification', method, params };
  }
  if (!isRecord(params)) {
    throw new Error(`invalid codex protocol message: ${method} params must be an object`);
  }
  validateKnownNotification(method, params);
  return { kind: 'known_notification', method, params };
}

function validateKnownNotification(method: string, params: Record<string, unknown>): void {
  switch (method) {
    case 'turn/started':
    case 'turn/completed':
      if (!isRecord(params.turn) || typeof params.turn.id !== 'string' || typeof params.turn.status !== 'string') {
        throw new Error(`invalid codex protocol message: ${method} requires turn.id and turn.status`);
      }
      return;
    case 'item/agentMessage/delta':
      if (typeof params.delta !== 'string') {
        throw new Error('invalid codex protocol message: agent message delta requires string delta');
      }
      return;
    case 'item/started':
    case 'item/completed':
      if (!isRecord(params.item) || typeof params.item.id !== 'string' || typeof params.item.type !== 'string') {
        throw new Error(`invalid codex protocol message: ${method} requires item.id and item.type`);
      }
      return;
    case 'warning':
      if (typeof params.message !== 'string') throw new Error('invalid codex protocol message: warning requires message');
      return;
    case 'configWarning':
      if (typeof params.summary !== 'string') throw new Error('invalid codex protocol message: configWarning requires summary');
      return;
    case 'error':
      if (!isRecord(params.error) || typeof params.error.message !== 'string') {
        throw new Error('invalid codex protocol message: error requires error.message');
      }
      return;
    case 'thread/tokenUsage/updated':
    case 'serverRequest/resolved':
      return;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
