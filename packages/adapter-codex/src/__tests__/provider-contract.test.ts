import { runProviderContractTests } from '@aes/runtime-sdk/testing';
import { CodexProvider } from '../index.js';
import { FakeCodexAppServer } from '../testing/fake-app-server.js';

runProviderContractTests('codex provider with fake app server', async () => {
  const fake = FakeCodexAppServer.scenario('provider-contract');
  return new CodexProvider({ transportFactory: () => fake.createTransport(), workspaceId: '/contract' });
}, {
  supportsResume: true,
  supportsCancellation: true,
  supportsApprovals: true
});
