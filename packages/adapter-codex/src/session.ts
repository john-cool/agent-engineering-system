import type {
  ResolvedModelProfile,
  RuntimeApprovalResolution,
  RuntimeEvent,
  RuntimeSession,
  RuntimeSessionState,
  RuntimeTurnRequest,
  SessionCheckpoint
} from '@aes/runtime-sdk';
import { mapCodexMessage, mapCodexServerRequest } from './protocol-mapper.js';
import { parseCodexProtocolMessage, isRecord } from './protocol.js';
import type { CodexServerRequest, CodexTransport } from './transport.js';

type HubMessage = { kind: 'notification'; value: unknown } | { kind: 'server_request'; value: CodexServerRequest };

class AsyncQueue<T> {
  private values: T[] = [];
  private waiters: Array<{ resolve: (value: T) => void; reject: (error: unknown) => void }> = [];
  private failure: unknown;

  push(value: T): void {
    if (this.failure !== undefined) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve(value);
    else this.values.push(value);
  }

  fail(error: unknown): void {
    if (this.failure !== undefined) return;
    this.failure = error;
    for (const waiter of this.waiters.splice(0)) waiter.reject(error);
  }

  next(): Promise<T> {
    const value = this.values.shift();
    if (value !== undefined) return Promise.resolve(value);
    if (this.failure !== undefined) return Promise.reject(this.failure);
    return new Promise<T>((resolve, reject) => this.waiters.push({ resolve, reject }));
  }
}

class CodexTransportHub {
  private readonly subscribers = new Map<string, Set<AsyncQueue<HubMessage>>>();
  private readonly globalSubscribers = new Set<AsyncQueue<HubMessage>>();

  constructor(private readonly transport: CodexTransport) {
    void this.pumpNotifications();
    void this.pumpServerRequests();
  }

  subscribe(threadId: string): AsyncQueue<HubMessage> {
    const queue = new AsyncQueue<HubMessage>();
    const set = this.subscribers.get(threadId) ?? new Set<AsyncQueue<HubMessage>>();
    set.add(queue);
    this.subscribers.set(threadId, set);
    this.globalSubscribers.add(queue);
    return queue;
  }

  unsubscribe(threadId: string, queue: AsyncQueue<HubMessage>): void {
    this.subscribers.get(threadId)?.delete(queue);
    this.globalSubscribers.delete(queue);
  }

  private dispatch(message: HubMessage, threadId: string | undefined): void {
    if (threadId !== undefined) {
      for (const queue of this.subscribers.get(threadId) ?? []) queue.push(message);
      return;
    }
    for (const queue of this.globalSubscribers) queue.push(message);
  }

  private async pumpNotifications(): Promise<void> {
    try {
      for await (const value of this.transport.notifications()) {
        this.dispatch({ kind: 'notification', value }, extractThreadId(value));
      }
    } catch (error) {
      this.failAll(error);
    }
  }

  private async pumpServerRequests(): Promise<void> {
    try {
      for await (const value of this.transport.serverRequests()) {
        this.dispatch({ kind: 'server_request', value }, extractThreadId(value.params));
      }
    } catch (error) {
      this.failAll(error);
    }
  }

  private failAll(error: unknown): void {
    for (const queue of this.globalSubscribers) queue.fail(error);
  }
}

const HUBS = new WeakMap<CodexTransport, CodexTransportHub>();
function hubFor(transport: CodexTransport): CodexTransportHub {
  let hub = HUBS.get(transport);
  if (!hub) {
    hub = new CodexTransportHub(transport);
    HUBS.set(transport, hub);
  }
  return hub;
}

export interface CodexRuntimeSessionOptions {
  sessionId: string;
  providerSessionId: string;
  workspaceId: string;
  transport: CodexTransport;
  modelProfile: ResolvedModelProfile;
  initialState?: RuntimeSessionState;
  contextRevision?: number;
}

export class CodexRuntimeSession implements RuntimeSession {
  readonly sessionId: string;
  readonly providerSessionId: string;
  private state: RuntimeSessionState;
  private contextRevision: number;
  private activeTurnId: string | undefined;
  private lastEventId: string | undefined;
  private lastActionId: string | undefined;
  private readonly hub: CodexTransportHub;
  private readonly queue: AsyncQueue<HubMessage>;

  constructor(private readonly options: CodexRuntimeSessionOptions) {
    this.sessionId = options.sessionId;
    this.providerSessionId = options.providerSessionId;
    this.state = options.initialState ?? 'ready';
    this.contextRevision = options.contextRevision ?? 0;
    this.hub = hubFor(options.transport);
    this.queue = this.hub.subscribe(this.providerSessionId);
  }

  async *runTurn(request: RuntimeTurnRequest): AsyncIterable<RuntimeEvent> {
    if (this.state === 'cancelled' || this.state === 'failed') throw new Error(`cannot run turn from ${this.state}`);
    this.state = 'running';
    const params: Record<string, unknown> = {
      threadId: this.providerSessionId,
      input: [{ type: 'text', text: request.input.text }],
      cwd: this.options.workspaceId,
      model: this.options.modelProfile.id
    };
    if (this.options.modelProfile.selectedReasoning !== undefined) params.effort = this.options.modelProfile.selectedReasoning;
    const response = await this.options.transport.request('turn/start', params);
    this.activeTurnId = readTurnId(response) ?? request.turnId;

    while (true) {
      const message = await this.queue.next();
      let event: RuntimeEvent | undefined;
      if (message.kind === 'notification') {
        event = mapCodexMessage(parseCodexProtocolMessage(message.value));
      } else {
        event = mapCodexServerRequest(message.value);
        if (event?.type === 'approval_requested') this.state = 'awaiting_approval';
      }
      if (!event) continue;
      event = this.remapEvent(event, request.turnId);
      this.lastEventId = event.meta.eventId;
      if ('actionId' in event && typeof event.actionId === 'string') this.lastActionId = event.actionId;
      if (event.type === 'compaction_completed') {
        this.contextRevision += 1;
        event = { ...event, data: { contextRevision: this.contextRevision } };
      }
      if (event.type === 'turn_completed') {
        this.state = event.data.outcome === 'cancelled' ? 'cancelled' : event.data.outcome === 'failed' ? 'failed' : 'completed';
        this.activeTurnId = undefined;
        yield event;
        return;
      }
      yield event;
    }
  }

  async respondToApproval(requestId: string, resolution: RuntimeApprovalResolution): Promise<void> {
    const result = resolution.decision === 'approved' ? 'accept' : 'decline';
    await this.options.transport.respond(requestId, result);
    if (this.state === 'awaiting_approval') this.state = 'running';
  }

  async compact(): Promise<void> {
    if (this.state === 'cancelled' || this.state === 'failed') throw new Error(`cannot compact from ${this.state}`);
    const previous = this.state;
    this.state = 'compacting';
    await this.options.transport.request('thread/compact/start', { threadId: this.providerSessionId });
    this.contextRevision += 1;
    this.state = previous === 'completed' ? 'completed' : 'ready';
  }

  async cancel(_reason?: string): Promise<void> {
    if (this.activeTurnId !== undefined) {
      await this.options.transport.request('turn/interrupt', {
        threadId: this.providerSessionId,
        turnId: this.activeTurnId
      });
    }
    this.activeTurnId = undefined;
    this.state = 'cancelled';
  }

  async checkpoint(): Promise<SessionCheckpoint> {
    const checkpoint: SessionCheckpoint = {
      sessionId: this.sessionId,
      provider: 'codex',
      providerSessionId: this.providerSessionId,
      state: this.state,
      modelProfile: this.options.modelProfile,
      contextRevision: this.contextRevision,
      checkpointAt: new Date().toISOString()
    };
    if (this.lastEventId !== undefined) checkpoint.lastEventId = this.lastEventId;
    if (this.lastActionId !== undefined) checkpoint.lastActionId = this.lastActionId;
    return checkpoint;
  }

  async close(): Promise<void> {
    this.hub.unsubscribe(this.providerSessionId, this.queue);
  }

  private remapEvent(event: RuntimeEvent, turnId: string): RuntimeEvent {
    return {
      ...event,
      meta: {
        ...event.meta,
        sessionId: this.sessionId,
        turnId: event.meta.turnId ?? turnId
      }
    } as RuntimeEvent;
  }
}

function extractThreadId(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.threadId === 'string') return value.threadId;
  if (isRecord(value.params) && typeof value.params.threadId === 'string') return value.params.threadId;
  return undefined;
}

function readTurnId(response: unknown): string | undefined {
  if (!isRecord(response) || !isRecord(response.turn)) return undefined;
  return typeof response.turn.id === 'string' ? response.turn.id : undefined;
}
