import test from 'node:test';
import assert from 'node:assert/strict';
import type { RuntimeProvider } from '../index.js';

export interface ProviderContractExpectations {
  supportsResume?: boolean;
  supportsCancellation?: boolean;
  supportsApprovals?: boolean;
}

export function runProviderContractTests(
  name: string,
  factory: () => Promise<RuntimeProvider>,
  expectations: ProviderContractExpectations = {}
): void {
  test(`${name}: reports neutral capabilities`, async () => {
    const provider = await factory();
    const caps = await provider.getCapabilities();
    assert.equal(typeof caps.modelDiscovery, 'boolean');
    assert.equal(typeof caps.streaming, 'boolean');
    if (expectations.supportsResume !== undefined) assert.equal(caps.sessionResume, expectations.supportsResume);
    if (expectations.supportsCancellation !== undefined) assert.equal(caps.sessionCancellation, expectations.supportsCancellation);
    if (expectations.supportsApprovals !== undefined) assert.equal(caps.approvals, expectations.supportsApprovals);
    await provider.shutdown();
  });

  test(`${name}: discovers at least one normalized model`, async () => {
    const provider = await factory();
    const models = await provider.discoverModels();
    assert.ok(models.length > 0);
    assert.ok(models.every((model) => model.provider.length > 0));
    await provider.shutdown();
  });

  test(`${name}: creates a session and emits normalized lifecycle events`, async () => {
    const provider = await factory();
    const model = (await provider.discoverModels())[0]!;
    const session = await provider.createSession({ sessionId: 'contract-s1', workspaceId: '/contract', model });
    const types: string[] = [];
    for await (const event of session.runTurn({ turnId: 'turn-1', input: { kind: 'text', text: 'synthetic' } })) {
      types.push(event.type);
    }
    assert.ok(types.includes('turn_started'));
    assert.ok(types.includes('turn_completed'));
    await session.close();
    await provider.shutdown();
  });

  if (expectations.supportsCancellation) {
    test(`${name}: supports cancellation`, async () => {
      const provider = await factory();
      const model = (await provider.discoverModels())[0]!;
      const session = await provider.createSession({ sessionId: 'contract-cancel', workspaceId: '/contract', model });
      await session.cancel('contract');
      assert.equal((await session.checkpoint()).state, 'cancelled');
      await provider.shutdown();
    });
  }

  if (expectations.supportsApprovals) {
    test(`${name}: accepts approval responses`, async () => {
      const provider = await factory();
      const model = (await provider.discoverModels())[0]!;
      const session = await provider.createSession({ sessionId: 'contract-approval', workspaceId: '/contract', model });
      await session.respondToApproval('request-1', { decision: 'approved' });
      await provider.shutdown();
    });
  }

  if (expectations.supportsResume) {
    test(`${name}: resumes from normalized checkpoint`, async () => {
      const provider = await factory();
      const model = (await provider.discoverModels())[0]!;
      const session = await provider.createSession({ sessionId: 'contract-resume', workspaceId: '/contract', model });
      const checkpoint = await session.checkpoint();
      const resumed = await provider.resumeSession(checkpoint);
      assert.equal(resumed.sessionId, checkpoint.sessionId);
      assert.equal(resumed.providerSessionId, checkpoint.providerSessionId);
      await provider.shutdown();
    });
  }
}
