import test from 'node:test';
import assert from 'node:assert/strict';
import type { ResolvedModelProfile } from '@aes/runtime-sdk';
import { CodexRuntimeSession } from '../index.js';
import { FakeCodexAppServer } from '../testing/fake-app-server.js';

const MODEL: ResolvedModelProfile = {
  id: 'm1', provider: 'codex',
  capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium'] },
  traits: { qualityClass: 'balanced' as const, latencyClass: 'standard' as const },
  availability: 'available' as const,
  selectedReasoning: 'medium' as const
};

test('CodexRuntimeSession streams normalized events and persists provider identity in checkpoint', async () => {
  const fake = FakeCodexAppServer.scenario('stream-with-approval');
  const session = new CodexRuntimeSession({
    sessionId: 's1',
    providerSessionId: 'thread-1',
    workspaceId: '/workspace',
    transport: fake.createTransport(),
    modelProfile: MODEL
  });

  const seen: string[] = [];
  for await (const event of session.runTurn({ turnId: 't1', input: { kind: 'text', text: 'safe synthetic request' } })) {
    seen.push(event.type);
    if (event.type === 'approval_requested') {
      await session.respondToApproval(event.requestId, { decision: 'approved' });
    }
  }
  assert.ok(seen.includes('approval_requested'));
  assert.ok(seen.includes('turn_completed'));
  assert.equal((await session.checkpoint()).providerSessionId, 'thread-1');
  assert.equal((await session.checkpoint()).state, 'completed');
});

test('CodexRuntimeSession compacts context and cancellation is represented without inventing a provider turn', async () => {
  const fake = FakeCodexAppServer.scenario('normal-turn');
  const session = new CodexRuntimeSession({
    sessionId: 's2', providerSessionId: 'thread-1', workspaceId: '/workspace',
    transport: fake.createTransport(), modelProfile: MODEL
  });
  await session.compact();
  assert.equal((await session.checkpoint()).contextRevision, 1);
  await session.cancel('user stop');
  assert.equal((await session.checkpoint()).state, 'cancelled');
});
