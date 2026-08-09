import test from 'node:test';
import assert from 'node:assert/strict';
import { IdempotentActionExecutor } from '../idempotency.js';

test('same runtime action id executes only once', async () => {
  let calls = 0;
  const adapter = {
    executeAction: async (action: { id: string }) => {
      calls++;
      return { actionId: action.id, executed: true };
    }
  };
  const executor = new IdempotentActionExecutor();
  const action = { id: 'a-1', type: 'toolExecution' as const, payload: {} };
  const first = await executor.execute(adapter, action);
  const second = await executor.execute(adapter, action);
  assert.equal(calls, 1);
  assert.deepEqual(second, first);
});

test('reusing an action id for a different action is rejected as an idempotency conflict', async () => {
  const adapter = { executeAction: async (action: { id: string }) => ({ actionId: action.id, executed: true }) };
  const executor = new IdempotentActionExecutor();
  await executor.execute(adapter, { id: 'same-id', type: 'toolExecution', payload: { x: 1 } });
  await assert.rejects(
    () => executor.execute(adapter, { id: 'same-id', type: 'toolExecution', payload: { x: 2 } }),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'AES_IDEMPOTENCY_CONFLICT'
  );
});
