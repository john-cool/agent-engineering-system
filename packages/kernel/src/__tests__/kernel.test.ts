import test from 'node:test';
import assert from 'node:assert/strict';
import type { PolicyDocument, WorkflowDocument } from '@aes/spec';
import type { RuntimeAdapter } from '@aes/runtime-sdk';
import { AESKernel } from '../index.js';

const workflow: WorkflowDocument = {
  kind: 'Workflow', version: 1, name: 'default', initial: 'discovery',
  states: {
    discovery: { next: ['planning'] },
    planning: { next: ['execution', 'discovery'] },
    execution: { next: ['verification', 'planning'] },
    verification: { next: ['completed', 'execution', 'planning'] },
    completed: { next: [] }
  }
};
const policies: PolicyDocument[] = [{
  kind: 'Policy', version: 1, name: 'architecture-escalation',
  when: { architecture: true }, action: { modelClass: 'powerful' }
}];
const adapter: RuntimeAdapter = {
  async invokeModel() { return { text: 'ok' }; },
  async invokeTool(request) { return { ok: true, output: request.input }; }
};

test('AESKernel emits lifecycle transition events', () => {
  const kernel = new AESKernel({ workflow, policies, adapter });
  const events: unknown[] = [];
  kernel.on('lifecycle.transition', (event) => events.push(event));
  kernel.transition('planning');
  assert.deepEqual(events, [{ from: 'discovery', to: 'planning' }]);
});

test('AESKernel emits model decisions without invoking a live model', () => {
  const kernel = new AESKernel({ workflow, policies, adapter });
  kernel.transition('planning');
  const decision = kernel.decideModel({ architecture: true });
  assert.equal(decision.modelClass, 'powerful');
});
