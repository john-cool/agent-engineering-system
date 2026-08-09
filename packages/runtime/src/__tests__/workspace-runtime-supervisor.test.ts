import assert from 'node:assert/strict';
import test from 'node:test';
import { createInMemoryProvider } from '@aes/runtime-sdk/testing';
import { WorkspaceRuntimeSupervisor } from '../workspace-runtime-supervisor.js';

test('supervisor creates one provider per workspace and reuses it across sessions', async () => {
  let created = 0;
  const supervisor = new WorkspaceRuntimeSupervisor({
    providerFactory: async () => {
      created += 1;
      return createInMemoryProvider();
    }
  });

  await supervisor.getProvider('/workspace/a');
  await supervisor.getProvider('/workspace/a');
  await supervisor.getProvider('/workspace/b');

  assert.equal(created, 2);
});

test('shutdownWorkspace closes only that workspace provider and allows a fresh one later', async () => {
  let created = 0;
  let shutdowns = 0;
  const supervisor = new WorkspaceRuntimeSupervisor({
    providerFactory: async () => {
      created += 1;
      const provider = createInMemoryProvider();
      return {
        ...provider,
        async shutdown() {
          shutdowns += 1;
          await provider.shutdown();
        }
      };
    }
  });

  await supervisor.getProvider('/workspace/a');
  await supervisor.getProvider('/workspace/b');
  await supervisor.shutdownWorkspace('/workspace/a');

  assert.equal(shutdowns, 1);
  await supervisor.getProvider('/workspace/a');
  assert.equal(created, 3);

  await supervisor.shutdownAll();
  assert.equal(shutdowns, 3);
});
