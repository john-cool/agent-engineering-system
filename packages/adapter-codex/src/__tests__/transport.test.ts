import test from 'node:test';
import assert from 'node:assert/strict';
import { CodexAppServerTransport, codexCommandForPlatform, type CodexLineIo } from '../index.js';

function createFakeLineIo(): CodexLineIo & { writes: string[]; pushLine(line: string): void } {
  const writes: string[] = [];
  const queue: string[] = [];
  const waiters: Array<(line: string) => void> = [];
  let closed = false;
  return {
    writes,
    writeLine(line) { writes.push(line); },
    async *lines() {
      while (!closed) {
        if (queue.length > 0) {
          yield queue.shift()!;
          continue;
        }
        const value = await new Promise<string>((resolve) => waiters.push(resolve));
        if (value === '__CLOSE__') return;
        yield value;
      }
    },
    pushLine(line) {
      const waiter = waiters.shift();
      if (waiter) waiter(line); else queue.push(line);
    },
    async close() {
      closed = true;
      const waiter = waiters.shift();
      if (waiter) waiter('__CLOSE__');
    }
  };
}

test('uses the Windows command shim for the default Codex process', () => {
  assert.equal(codexCommandForPlatform('win32'), 'codex.cmd');
  assert.equal(codexCommandForPlatform('linux'), 'codex');
});

async function nextValue<T>(source: AsyncIterable<T>): Promise<T> {
  const result = await source[Symbol.asyncIterator]().next();
  if (result.done) throw new Error('expected transport value');
  return result.value;
}

test('transport correlates JSON-RPC response to request id and yields notifications separately', async () => {
  const io = createFakeLineIo();
  const transport = new CodexAppServerTransport({ io });

  const pending = transport.request('initialize', {
    clientInfo: { name: 'aes', version: '0.1.0' },
    capabilities: {}
  });

  const written = JSON.parse(io.writes[0]!) as { id: number; method: string };
  assert.equal(written.method, 'initialize');

  io.pushLine(JSON.stringify({ id: written.id, result: { ok: true } }));
  assert.deepEqual(await pending, { ok: true });

  const notificationPromise = nextValue(transport.notifications());
  io.pushLine(JSON.stringify({ method: 'turn/started', params: { turn: { id: 't1' } } }));
  const notification = await notificationPromise as { method: string };
  assert.equal(notification.method, 'turn/started');

  await transport.close();
});

test('transport routes server initiated requests to serverRequests and can respond', async () => {
  const io = createFakeLineIo();
  const transport = new CodexAppServerTransport({ io });
  const requestPromise = nextValue(transport.serverRequests());

  io.pushLine(JSON.stringify({ id: 'approval-1', method: 'item/commandExecution/requestApproval', params: { command: 'echo hi' } }));
  const request = await requestPromise;
  assert.equal(request.id, 'approval-1');

  await transport.respond(request.id, { decision: 'accept' });
  assert.deepEqual(JSON.parse(io.writes.at(-1)!), { id: 'approval-1', result: { decision: 'accept' } });
  await transport.close();
});

test('transport writes client notifications without a request id', async () => {
  const io = createFakeLineIo();
  const transport = new CodexAppServerTransport({ io });
  await transport.notify('initialized', {});
  assert.deepEqual(JSON.parse(io.writes[0]!), { method: 'initialized', params: {} });
  await transport.close();
});
