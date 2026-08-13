import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { CodexLineIo, CodexServerRequest, CodexTransport } from './transport.js';

class AsyncQueue<T> implements AsyncIterable<T> {
  private readonly values: T[] = [];
  private readonly waiters: Array<{ resolve: (value: IteratorResult<T>) => void; reject: (error: unknown) => void }> = [];
  private ended = false;
  private failure: unknown;

  push(value: T): void {
    if (this.ended || this.failure !== undefined) return;
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve({ value, done: false });
    else this.values.push(value);
  }

  close(): void {
    if (this.ended || this.failure !== undefined) return;
    this.ended = true;
    this.flush();
  }

  fail(error: unknown): void {
    if (this.ended || this.failure !== undefined) return;
    this.failure = error;
    this.flush();
  }

  private flush(): void {
    if (this.values.length > 0) return;
    const waiters = this.waiters.splice(0);
    if (this.failure !== undefined) {
      for (const waiter of waiters) waiter.reject(this.failure);
    } else if (this.ended) {
      for (const waiter of waiters) waiter.resolve({ value: undefined, done: true });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => {
        const value = this.values.shift();
        if (value !== undefined) {
          if (this.values.length === 0) queueMicrotask(() => this.flush());
          return Promise.resolve({ value, done: false });
        }
        if (this.failure !== undefined) return Promise.reject(this.failure);
        if (this.ended) return Promise.resolve({ value: undefined, done: true });
        return new Promise<IteratorResult<T>>((resolve, reject) => this.waiters.push({ resolve, reject }));
      }
    };
  }
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

export interface CodexAppServerTransportOptions {
  io?: CodexLineIo;
  command?: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export class CodexAppServerTransport implements CodexTransport {
  private readonly io: CodexLineIo;
  private readonly notificationQueue = new AsyncQueue<unknown>();
  private readonly serverRequestQueue = new AsyncQueue<CodexServerRequest>();
  private readonly pending = new Map<string | number, PendingRequest>();
  private nextRequestId = 1;
  private closed = false;
  private readonly reader: Promise<void>;

  constructor(options: CodexAppServerTransportOptions = {}) {
    this.io = options.io ?? new ChildProcessCodexLineIo(options);
    this.reader = this.readLoop();
  }

  request(method: string, params: unknown): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error('codex transport is closed'));
    const id = this.nextRequestId++;
    const result = new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    void Promise.resolve(this.io.writeLine(JSON.stringify({ id, method, params }))).catch((error) => {
      const pending = this.pending.get(id);
      this.pending.delete(id);
      pending?.reject(error);
    });
    return result;
  }

  async notify(method: string, params: unknown): Promise<void> {
    if (this.closed) throw new Error('codex transport is closed');
    await this.io.writeLine(JSON.stringify({ method, params }));
  }

  notifications(): AsyncIterable<unknown> {
    return this.notificationQueue;
  }

  serverRequests(): AsyncIterable<CodexServerRequest> {
    return this.serverRequestQueue;
  }

  async respond(id: string | number, result: unknown): Promise<void> {
    if (this.closed) throw new Error('codex transport is closed');
    await this.io.writeLine(JSON.stringify({ id, result }));
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.io.close();
    await this.reader.catch(() => undefined);
    this.finish(new Error('codex transport closed'));
  }

  private async readLoop(): Promise<void> {
    try {
      for await (const line of this.io.lines()) {
        if (line.trim().length === 0) continue;
        const message = JSON.parse(line) as unknown;
        this.route(message);
      }
      if (!this.closed) this.finish(new Error('codex app server stream ended'));
    } catch (error) {
      if (!this.closed) this.finish(error);
    }
  }

  private route(message: unknown): void {
    if (!isRecord(message)) throw new Error('invalid codex transport message');
    const id = isRpcId(message.id) ? message.id : undefined;
    const method = typeof message.method === 'string' ? message.method : undefined;

    if (id !== undefined && method !== undefined) {
      this.serverRequestQueue.push({ id, method, params: message.params });
      return;
    }

    if (id !== undefined) {
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      if ('error' in message && message.error !== undefined) pending.reject(toRpcError(message.error));
      else pending.resolve(message.result);
      return;
    }

    if (method !== undefined) {
      this.notificationQueue.push(message);
      return;
    }

    throw new Error('invalid codex transport envelope');
  }

  private finish(error: unknown): void {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
    if (error instanceof Error) {
      this.notificationQueue.fail(error);
      this.serverRequestQueue.fail(error);
    } else {
      this.notificationQueue.fail(new Error(String(error)));
      this.serverRequestQueue.fail(new Error(String(error)));
    }
  }
}

class ChildProcessCodexLineIo implements CodexLineIo {
  private readonly child: ChildProcessWithoutNullStreams;
  private closed = false;

  constructor(options: CodexAppServerTransportOptions) {
    const command = options.command ?? 'codex';
    const args = options.args ?? ['app-server'];
    this.child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: process.platform === 'win32' && command.toLowerCase().endsWith('.cmd'),
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }

  writeLine(line: string): Promise<void> {
    if (this.closed) return Promise.reject(new Error('codex app server io is closed'));
    return new Promise<void>((resolve, reject) => {
      this.child.stdin.write(`${line}\n`, (error) => error ? reject(error) : resolve());
    });
  }

  async *lines(): AsyncIterable<string> {
    this.child.stdout.setEncoding('utf8');
    let buffer = '';
    for await (const chunk of this.child.stdout) {
      buffer += String(chunk);
      let newline = buffer.indexOf('\n');
      while (newline >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '');
        buffer = buffer.slice(newline + 1);
        yield line;
        newline = buffer.indexOf('\n');
      }
    }
    if (buffer.length > 0) yield buffer;
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.child.stdin.end();
    if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      if (this.child.exitCode !== null || this.child.signalCode !== null) resolve();
      else this.child.once('exit', () => resolve());
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRpcId(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function toRpcError(value: unknown): Error {
  if (isRecord(value) && typeof value.message === 'string') return new Error(value.message);
  return new Error(`codex rpc error: ${JSON.stringify(value)}`);
}
