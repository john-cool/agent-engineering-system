import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeCodexAppServer, type FakeFailurePoint } from '../testing/fake-app-server.js';

test('crash after tool completion marks side-effect boundary as ambiguous', async () => {
  const fake = FakeCodexAppServer.scenario('tool-completed-then-crash');
  const events: Array<{ kind: string; eventId: string }> = [];
  await assert.rejects(async () => {
    for await (const event of fake.events()) events.push(event);
  }, /fake app server crashed/);
  assert.ok(events.some((event) => event.kind === 'tool_completed'));
  assert.equal(fake.lastFailurePoint, 'after_tool_completion');
  assert.equal(fake.failureOccurrences, 1);
});

test('all named recovery failure points fire once with deterministic event ids', async () => {
  const points: FakeFailurePoint[] = [
    'after_turn_start',
    'after_tool_completion',
    'before_approval_response',
    'during_compaction',
    'after_turn_completion_before_checkpoint'
  ];

  for (const point of points) {
    const fake = FakeCodexAppServer.failureAt(point);
    const eventIds: string[] = [];
    await assert.rejects(async () => {
      for await (const event of fake.events()) eventIds.push(event.eventId);
    }, /fake app server crashed/);
    assert.equal(fake.lastFailurePoint, point);
    assert.equal(fake.failureOccurrences, 1);
    assert.deepEqual(eventIds, eventIds.map((_, index) => `e${index + 1}`));
  }
});
