import assert from 'node:assert/strict';
import test from 'node:test';
import { createInMemoryProvider } from '@aes/runtime-sdk/testing';
import type { RuntimeProvider, RuntimeTurnRequest } from '@aes/runtime-sdk';
import { formatRunProgress, parseRunArguments, runTask } from '../run-command.js';

test('parses the read-only run mode', () => {
  assert.deepEqual(parseRunArguments(['--read-only', 'analyze repository']), {
    task: 'analyze repository',
    readOnly: true
  });
});

test('formats progress without exposing task content', () => {
  assert.equal(
    formatRunProgress({ stage: 'starting', message: 'task accepted' }),
    '[aes] starting: task accepted'
  );
});

test('runTask sends the user task through the runtime provider', async () => {
  const base = createInMemoryProvider();
  let observedTurn: RuntimeTurnRequest | undefined;
  let providerShutdown = false;
  const progress: string[] = [];
  const provider: RuntimeProvider = {
    ...base,
    async shutdown() {
      providerShutdown = true;
      await base.shutdown();
    },
    async createSession(input) {
      const session = await base.createSession(input);
      return {
        ...session,
        async *runTurn(request) {
          observedTurn = request;
          yield* session.runTurn(request);
        }
      };
    }
  };

  const result = await runTask('inspect repository', {
    workspaceId: '/test',
    providerFactory: async () => provider,
    onProgress: (event) => progress.push(event.stage)
  });

  assert.deepEqual(observedTurn?.input, { kind: 'text', text: 'inspect repository' });
  assert.equal(result.provider, 'memory');
  assert.equal(result.outcome, 'success');
  assert.equal(result.verification, 'passed');
  assert.equal(providerShutdown, true);
  assert.deepEqual(progress, ['starting', 'turn_started', 'model_selected', 'completed']);
});

test('runTask rejects invalid timeout values before creating a provider', async () => {
  let providerCreated = false;
  const providerFactory = async () => {
    providerCreated = true;
    return createInMemoryProvider();
  };

  await assert.rejects(
    () => runTask('inspect repository', { timeoutMs: 0, providerFactory }),
    /timeoutMs must be a positive finite number/
  );
  await assert.rejects(
    () => runTask('inspect repository', { timeoutMs: -1, providerFactory }),
    /timeoutMs must be a positive finite number/
  );
  assert.equal(providerCreated, false);
});

test('runTask rejects an empty task before creating a provider', async () => {
  let providerCreated = false;

  await assert.rejects(
    () => runTask('   ', {
      providerFactory: async () => {
        providerCreated = true;
        return createInMemoryProvider();
      }
    }),
    /task must not be empty/
  );

  assert.equal(providerCreated, false);
});

test('runTask stops safely when the provider requests tool approval', async () => {
  const base = createInMemoryProvider();
  let providerShutdown = false;
  const provider: RuntimeProvider = {
    ...base,
    async shutdown() {
      providerShutdown = true;
      await base.shutdown();
    },
    async createSession(input) {
      const session = await base.createSession(input);
      return {
        ...session,
        async *runTurn(request) {
          yield {
            type: 'approval_requested',
            delivery: 'lossless',
            meta: { sessionId: input.sessionId, turnId: request.turnId, eventId: 'approval-1', timestamp: '2026-08-14T00:00:00Z' },
            requestId: 'approval-1',
            action: {
              id: 'action-1',
              type: 'toolExecution',
              source: 'runtime-provider',
              reason: 'test approval',
              confidence: 'high',
              payload: { command: 'read repository' }
            }
          };
        }
      };
    }
  };

  const result = await runTask('inspect repository', {
    providerFactory: async () => provider
  });

  assert.equal(result.outcome, 'awaiting_approval');
  assert.equal(providerShutdown, true);
});

test('read-only run approves provider tool requests inside the read-only sandbox', async () => {
  const base = createInMemoryProvider();
  let approved = false;
  const provider: RuntimeProvider = {
    ...base,
    async createSession(input) {
      const session = await base.createSession(input);
      return {
        ...session,
        async respondToApproval(requestId, response) {
          approved = requestId === 'approval-1' && response.decision === 'approved';
        },
        async *runTurn(request) {
          yield {
            type: 'approval_requested',
            delivery: 'lossless',
            meta: { sessionId: input.sessionId, turnId: request.turnId, eventId: 'approval-1', timestamp: '2026-08-14T00:00:00Z' },
            requestId: 'approval-1',
            action: {
              id: 'action-1',
              type: 'toolExecution',
              source: 'runtime-provider',
              reason: 'read-only repository inspection',
              confidence: 'high',
              payload: { command: 'read repository' }
            }
          };
          yield {
            type: 'turn_completed',
            delivery: 'lossless',
            meta: { sessionId: input.sessionId, turnId: request.turnId, eventId: 'completed-1', timestamp: '2026-08-14T00:00:01Z' },
            data: { outcome: 'success' }
          };
        }
      };
    }
  };

  const result = await runTask('inspect repository', {
    readOnly: true,
    providerFactory: async () => provider
  });

  assert.equal(approved, true);
  assert.equal(result.outcome, 'success');
});

test('runTask times out a stalled provider and shuts it down', async () => {
  const base = createInMemoryProvider();
  let providerShutdown = 0;
  const provider: RuntimeProvider = {
    ...base,
    async shutdown() {
      providerShutdown += 1;
      await base.shutdown();
    },
    async createSession(input) {
      const session = await base.createSession(input);
      return {
        ...session,
        async *runTurn() {
          await new Promise<void>(() => undefined);
        }
      };
    }
  };
  const progress: string[] = [];

  await assert.rejects(
    () => runTask('inspect repository', {
      timeoutMs: 10,
      providerFactory: async () => provider,
      onProgress: (event) => progress.push(event.stage)
    }),
    /task timed out after 10 ms/
  );

  assert.equal(providerShutdown, 1);
  assert.deepEqual(progress, ['starting', 'failed']);
});
