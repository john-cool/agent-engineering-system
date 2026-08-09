import type { CodexServerRequest, CodexTransport } from '../transport.js';

class AsyncQueue<T> implements AsyncIterable<T> {
  private values: T[] = [];
  private waiters: Array<{
    resolve: (value: IteratorResult<T>) => void;
    reject: (error: unknown) => void;
  }> = [];
  private terminalError: unknown;
  private ended = false;

  push(value: T): void {
    if (this.ended || this.terminalError !== undefined) throw new Error('queue is closed');
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve({ value, done: false });
    else this.values.push(value);
  }

  fail(error: unknown): void {
    if (this.ended || this.terminalError !== undefined) return;
    this.terminalError = error;
    if (this.values.length === 0) this.flushTerminal();
  }

  close(): void {
    if (this.ended) return;
    this.ended = true;
    if (this.values.length === 0) this.flushTerminal();
  }

  private flushTerminal(): void {
    if (this.values.length > 0) return;
    const waiters = this.waiters.splice(0);
    if (this.terminalError !== undefined) {
      for (const waiter of waiters) waiter.reject(this.terminalError);
    } else if (this.ended) {
      for (const waiter of waiters) waiter.resolve({ value: undefined, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        const value = this.values.shift();
        if (value !== undefined) {
          if (this.values.length === 0) queueMicrotask(() => this.flushTerminal());
          return Promise.resolve({ value, done: false });
        }
        if (this.terminalError !== undefined) return Promise.reject(this.terminalError);
        if (this.ended) return Promise.resolve({ value: undefined, done: true });
        return new Promise<IteratorResult<T>>((resolve, reject) => {
          this.waiters.push({ resolve, reject });
        });
      }
    };
  }
}

export interface ScriptedRequestResult {
  result?: unknown;
  error?: Error;
}

export class ScriptedCodexTransport implements CodexTransport {
  private readonly notificationQueue = new AsyncQueue<unknown>();
  private readonly serverRequestQueue = new AsyncQueue<CodexServerRequest>();
  private closed = false;
  readonly responses = new Map<string | number, unknown>();

  constructor(
    private readonly requestResults: ReadonlyMap<string, ScriptedRequestResult>,
    private readonly notificationsAfter: ReadonlyMap<string, readonly unknown[]>,
    private readonly serverRequestsAfter: ReadonlyMap<string, readonly CodexServerRequest[]>,
    private readonly crashAfterNotificationMethods: ReadonlySet<string>
  ) {}

  async request(method: string, _params: unknown): Promise<unknown> {
    if (this.closed) throw new Error('fake transport is closed');
    const scripted = this.requestResults.get(method);
    if (!scripted) throw new Error(`no scripted response for ${method}`);
    if (scripted.error) throw scripted.error;

    for (const notification of this.notificationsAfter.get(method) ?? []) {
      this.notificationQueue.push(notification);
      const notificationMethod = isMethodEnvelope(notification) ? notification.method : undefined;
      if (notificationMethod && this.crashAfterNotificationMethods.has(notificationMethod)) {
        this.notificationQueue.fail(new Error('fake app server crashed'));
        this.serverRequestQueue.fail(new Error('fake app server crashed'));
      }
    }
    for (const request of this.serverRequestsAfter.get(method) ?? []) {
      this.serverRequestQueue.push(request);
    }
    return scripted.result;
  }

  async notify(_method: string, _params: unknown): Promise<void> {
    if (this.closed) throw new Error('fake transport is closed');
  }

  notifications(): AsyncIterable<unknown> {
    return this.notificationQueue;
  }

  serverRequests(): AsyncIterable<CodexServerRequest> {
    return this.serverRequestQueue;
  }

  async respond(id: string | number, result: unknown): Promise<void> {
    if (this.closed) throw new Error('fake transport is closed');
    this.responses.set(id, result);
  }

  async close(): Promise<void> {
    this.closed = true;
    this.notificationQueue.close();
    this.serverRequestQueue.close();
  }
}

function isMethodEnvelope(value: unknown): value is { method: string } {
  return typeof value === 'object' && value !== null && 'method' in value && typeof (value as { method?: unknown }).method === 'string';
}
