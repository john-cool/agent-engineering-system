import type { ActionRequest, RuntimeFailureKind, RuntimeOutcome } from '@aes/spec';

export interface RuntimeEventMeta {
  taskId?: string;
  sessionId: string;
  turnId?: string;
  eventId: string;
  timestamp: string;
}

interface RuntimeEventBase {
  meta: RuntimeEventMeta;
  delivery: 'lossless' | 'coalescible';
}

export type RuntimeEvent =
  | (RuntimeEventBase & { type: 'turn_started'; delivery: 'lossless' })
  | (RuntimeEventBase & { type: 'output_delta'; delivery: 'coalescible'; data: { text: string } })
  | (RuntimeEventBase & { type: 'tool_requested'; delivery: 'lossless'; requestId: string; actionId?: string; toolName: string })
  | (RuntimeEventBase & { type: 'tool_completed'; delivery: 'lossless'; actionId?: string; ok: boolean })
  | (RuntimeEventBase & { type: 'approval_requested'; delivery: 'lossless'; requestId: string; action: ActionRequest })
  | (RuntimeEventBase & { type: 'usage_updated'; delivery: 'coalescible'; data: { inputTokens?: number; outputTokens?: number; cachedInputTokens?: number } })
  | (RuntimeEventBase & { type: 'context_updated'; delivery: 'coalescible'; data: { contextRevision: number; inputTokens?: number; contextWindow?: number } })
  | (RuntimeEventBase & { type: 'compaction_started'; delivery: 'lossless' })
  | (RuntimeEventBase & { type: 'compaction_completed'; delivery: 'lossless'; data: { contextRevision: number } })
  | (RuntimeEventBase & { type: 'turn_completed'; delivery: 'lossless'; data: { outcome: RuntimeOutcome } })
  | (RuntimeEventBase & { type: 'runtime_warning'; delivery: 'lossless'; data: { code?: string; message: string } })
  | (RuntimeEventBase & { type: 'runtime_failed'; delivery: 'lossless'; data: { kind: RuntimeFailureKind; message: string } });
