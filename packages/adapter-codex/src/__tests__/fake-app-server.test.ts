import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeCodexAppServer } from '../testing/fake-app-server.js';

async function nextValue<T>(source: AsyncIterable<T>): Promise<T> {
  const iterator = source[Symbol.asyncIterator]();
  const value = await iterator.next();
  if (value.done) throw new Error('expected another fake provider event');
  return value.value;
}

test('fake app server can emit notifications and fail at a deterministic boundary', async () => {
  const fake = new FakeCodexAppServer()
    .onRequest('initialize', { result: { serverInfo: { name: 'fake-codex' } } })
    .onRequest('thread/start', { result: { thread: { id: 'thread-1' } } })
    .emitAfter('thread/start', { method: 'turn/started', params: { turnId: 'turn-1' } })
    .crashAfter('turn/started');

  const transport = fake.createTransport();
  await transport.request('initialize', {});
  await transport.request('thread/start', {});
  const notifications = transport.notifications();
  const event = await nextValue(notifications) as { method: string };
  assert.equal(event.method, 'turn/started');
  await assert.rejects(() => nextValue(notifications), /fake app server crashed/);
});
