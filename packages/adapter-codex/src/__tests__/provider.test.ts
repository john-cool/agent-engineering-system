import assert from 'node:assert/strict';
import test from 'node:test';
import { CodexProvider } from '../provider.js';
import { FakeCodexAppServer } from '../testing/fake-app-server.js';
import { ScriptedCodexTransport } from '../testing/scripted-transport.js';

test('uses the current Codex approval policy spelling', async () => {
  const fake = FakeCodexAppServer.scenario('provider-contract');
  const transport = fake.createTransport() as ScriptedCodexTransport;
  const provider = new CodexProvider({
    transportFactory: () => transport,
    workspaceId: '/contract'
  });

  const [model] = await provider.discoverModels();
  assert.ok(model);
  await provider.createSession({
    sessionId: 'policy-test',
    workspaceId: '/contract',
    model
  });

  const threadStart = transport.requests.find((request) => request.method === 'thread/start');
  const params = threadStart?.params as { approvalPolicy?: string; sandbox?: string } | undefined;
  assert.equal(params?.approvalPolicy, 'on-request');
  assert.equal(params?.sandbox, 'workspace-write');
  await provider.shutdown();
});

test('passes read-only execution policies to Codex', async () => {
  const fake = FakeCodexAppServer.scenario('provider-contract');
  const transport = fake.createTransport() as ScriptedCodexTransport;
  const provider = new CodexProvider({
    transportFactory: () => transport,
    workspaceId: '/contract',
    approvalPolicy: 'never',
    sandbox: 'read-only'
  });

  const [model] = await provider.discoverModels();
  assert.ok(model);
  await provider.createSession({ sessionId: 'read-only-test', workspaceId: '/contract', model });

  const threadStart = transport.requests.find((request) => request.method === 'thread/start');
  const params = threadStart?.params as { approvalPolicy?: string; sandbox?: string } | undefined;
  assert.equal(params?.approvalPolicy, 'never');
  assert.equal(params?.sandbox, 'read-only');
  await provider.shutdown();
});
