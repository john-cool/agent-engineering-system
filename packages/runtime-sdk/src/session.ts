import type { RuntimeEvent } from './events.js';
import type { ResolvedModelProfile } from './resolution.js';

export type RuntimeSessionState =
  | 'created'
  | 'starting'
  | 'ready'
  | 'running'
  | 'awaiting_approval'
  | 'compacting'
  | 'recovering'
  | 'failed'
  | 'cancelled'
  | 'completed';

export interface RuntimeTurnRequest {
  turnId: string;
  input: { kind: 'text'; text: string };
}

export interface RuntimeApprovalResolution {
  decision: 'approved' | 'rejected';
}

export interface CreateRuntimeSessionInput {
  sessionId: string;
  workspaceId: string;
  model: ResolvedModelProfile;
}

export interface SessionCheckpoint {
  sessionId: string;
  provider: string;
  providerSessionId: string;
  state: RuntimeSessionState;
  lastEventId?: string;
  lastActionId?: string;
  modelProfile: ResolvedModelProfile;
  contextRevision: number;
  checkpointAt: string;
}

export interface RuntimeSession {
  readonly sessionId: string;
  readonly providerSessionId: string;
  runTurn(request: RuntimeTurnRequest): AsyncIterable<RuntimeEvent>;
  respondToApproval(requestId: string, resolution: RuntimeApprovalResolution): Promise<void>;
  compact(): Promise<void>;
  cancel(reason?: string): Promise<void>;
  checkpoint(): Promise<SessionCheckpoint>;
  close(): Promise<void>;
}
