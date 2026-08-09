import type { CodexServerRequest, CodexTransport } from '../transport.js';
import { ScriptedCodexTransport, type ScriptedRequestResult } from './scripted-transport.js';

export type FakeFailurePoint =
  | 'after_turn_start'
  | 'after_tool_completion'
  | 'before_approval_response'
  | 'during_compaction'
  | 'after_turn_completion_before_checkpoint';

export interface FakeScenarioEvent {
  eventId: string;
  kind: 'turn_started' | 'tool_completed' | 'approval_requested' | 'compaction_started' | 'turn_completed';
}

export type FakeCodexScenarioName =
  | 'normal-turn'
  | 'stream-with-approval'
  | 'provider-contract'
  | 'rate-limit'
  | 'session-lost'
  | 'tool-completed-then-crash';

export class FakeCodexAppServer {
  private readonly requestResults = new Map<string, ScriptedRequestResult>();
  private readonly notificationsAfter = new Map<string, unknown[]>();
  private readonly serverRequestsAfter = new Map<string, CodexServerRequest[]>();
  private readonly crashMethods = new Set<string>();
  private scenarioEvents: FakeScenarioEvent[] = [];
  private scenarioFailurePoint?: FakeFailurePoint;
  lastFailurePoint: FakeFailurePoint | undefined = undefined;
  failureOccurrences = 0;

  onRequest(method: string, response: { result?: unknown; error?: Error }): this {
    this.requestResults.set(method, response);
    return this;
  }

  emitAfter(method: string, notification: unknown): this {
    const items = this.notificationsAfter.get(method) ?? [];
    items.push(notification);
    this.notificationsAfter.set(method, items);
    return this;
  }

  requestApprovalAfter(method: string, request: CodexServerRequest): this {
    const items = this.serverRequestsAfter.get(method) ?? [];
    items.push(request);
    this.serverRequestsAfter.set(method, items);
    return this;
  }

  crashAfter(notificationMethod: string): this {
    this.crashMethods.add(notificationMethod);
    return this;
  }

  rateLimit(method: string): this {
    return this.onRequest(method, { error: new Error('rate limited') });
  }

  malformedAfter(method: string): this {
    return this.emitAfter(method, '{malformed-json');
  }

  unknownNotificationAfter(method: string): this {
    return this.emitAfter(method, { method: 'future/unknown', params: {} });
  }

  loseSession(method = 'thread/resume'): this {
    return this.onRequest(method, { error: new Error('session lost') });
  }


  async *events(): AsyncIterable<FakeScenarioEvent> {
    this.lastFailurePoint = undefined;
    this.failureOccurrences = 0;
    for (const event of this.scenarioEvents) yield event;
    if (this.scenarioFailurePoint) {
      this.lastFailurePoint = this.scenarioFailurePoint;
      this.failureOccurrences += 1;
      throw new Error('fake app server crashed');
    }
  }

  static failureAt(point: FakeFailurePoint): FakeCodexAppServer {
    const fake = new FakeCodexAppServer();
    fake.scenarioFailurePoint = point;
    const kinds: Record<FakeFailurePoint, FakeScenarioEvent['kind'][]> = {
      after_turn_start: ['turn_started'],
      after_tool_completion: ['turn_started', 'tool_completed'],
      before_approval_response: ['turn_started', 'approval_requested'],
      during_compaction: ['compaction_started'],
      after_turn_completion_before_checkpoint: ['turn_started', 'turn_completed']
    };
    fake.scenarioEvents = kinds[point].map((kind, index) => ({ eventId: `e${index + 1}`, kind }));
    return fake;
  }

  createTransport(): CodexTransport {
    return new ScriptedCodexTransport(
      this.requestResults,
      this.notificationsAfter,
      this.serverRequestsAfter,
      this.crashMethods
    );
  }

  static scenario(name: FakeCodexScenarioName): FakeCodexAppServer {
    const fake = new FakeCodexAppServer()
      .onRequest('initialize', { result: { serverInfo: { name: 'fake-codex' } } })
      .onRequest('model/list', { result: { data: [{ id: 'fake-balanced' }] } })
      .onRequest('thread/start', { result: { thread: { id: 'thread-1' } } })
      .onRequest('thread/resume', { result: { thread: { id: 'thread-1' } } })
      .onRequest('thread/compact/start', { result: {} })
      .onRequest('turn/start', { result: { turn: { id: 'turn-1', status: 'inProgress', items: [] } } })
      .onRequest('turn/interrupt', { result: {} })
      .emitAfter('thread/compact/start', { method: 'item/started', params: { threadId: 'thread-1', turnId: 'compact-1', item: { id: 'compact-item-1', type: 'contextCompaction' } } })
      .emitAfter('thread/compact/start', { method: 'item/completed', params: { threadId: 'thread-1', turnId: 'compact-1', item: { id: 'compact-item-1', type: 'contextCompaction' } } });

    switch (name) {
      case 'normal-turn':
        return fake
          .emitAfter('turn/start', { method: 'turn/started', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'inProgress', items: [] } } })
          .emitAfter('turn/start', { method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed', items: [] } } });
      case 'stream-with-approval':
        return fake
          .emitAfter('turn/start', { method: 'turn/started', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'inProgress', items: [] } } })
          .requestApprovalAfter('turn/start', {
            id: 'approval-1', method: 'item/commandExecution/requestApproval', params: { threadId: 'thread-1', turnId: 'turn-1', itemId: 'cmd-1', command: '<redacted>' }
          })
          .emitAfter('turn/start', { method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed', items: [] } } });
      case 'provider-contract':
        return fake
          .emitAfter('turn/start', { method: 'turn/started', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'inProgress', items: [] } } })
          .emitAfter('turn/start', { method: 'turn/completed', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'completed', items: [] } } });
      case 'rate-limit':
        return fake.rateLimit('turn/start');
      case 'session-lost':
        return fake.loseSession();
      case 'tool-completed-then-crash': {
        const failure = FakeCodexAppServer.failureAt('after_tool_completion');
        failure
          .onRequest('initialize', { result: { serverInfo: { name: 'fake-codex' } } })
          .onRequest('thread/start', { result: { thread: { id: 'thread-1' } } })
          .emitAfter('turn/start', { method: 'turn/started', params: { threadId: 'thread-1', turn: { id: 'turn-1', status: 'inProgress', items: [] } } })
          .emitAfter('turn/start', { method: 'item/completed', params: { threadId: 'thread-1', turnId: 'turn-1', item: { type: 'commandExecution', id: 'tool-1', status: 'completed' } } })
          .crashAfter('item/completed');
        return failure;
      }
    }
  }
}
