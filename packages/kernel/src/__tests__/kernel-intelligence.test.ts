import test from 'node:test';
import assert from 'node:assert/strict';
import type { PolicyDocument, WorkflowDocument } from '@aes/spec';
import type { RuntimeAdapter } from '@aes/runtime-sdk';
import { AESKernel } from '../kernel.js';

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
const policies: PolicyDocument[] = [];
const adapter: RuntimeAdapter = {
  getCapabilities() {
    return {
      modelRouting: true, fastMode: false, toolExecution: true, contextTelemetry: false,
      tokenTelemetry: false, contextCompaction: false, handoffInjection: false,
      conversationTransition: false, persistentMemory: false
    };
  },
  async invokeModel() { return { text: 'ok' }; },
  async invokeTool(request) { return { ok: true, output: request.input }; }
};

test('kernel routes architecture planning then downgrades after approved plan', async () => {
  const kernel = new AESKernel({
    workflow,
    policies,
    adapter,
    classifier: {
      classify: async () => ({
        ambiguity: 'high', risk: 'medium', taskComplexity: 'complex', confidence: 'high',
        architecturalDecisionRequired: true, reasons: ['architecture boundary requested']
      })
    }
  });
  kernel.transition('planning');
  const analysis = await kernel.analyzeTask({ stage: 'planning', planStatus: 'none', failedAttempts: 0, request: 'redesign auth boundary' });
  const first = kernel.routeModel(analysis, 'balanced');
  assert.equal(first.modelClass, 'powerful');

  kernel.transition('execution');
  const execution = await kernel.analyzeTask({ stage: 'execution', planStatus: 'approved', failedAttempts: 0 });
  const second = kernel.routeModel(execution, 'powerful');
  assert.equal(second.modelClass, 'balanced');
});

test('kernel emits new audit events for analysis and model routing', async () => {
  const kernel = new AESKernel({ workflow, policies, adapter });
  const names: string[] = [];
  kernel.on('analysis.completed', () => names.push('analysis.completed'));
  kernel.on('model.route.changed', () => names.push('model.route.changed'));
  const analysis = await kernel.analyzeTask({ stage: 'discovery', planStatus: 'none', failedAttempts: 0 });
  kernel.routeModel(analysis, 'balanced');
  assert.deepEqual(names, ['analysis.completed', 'model.route.changed']);
});

test('kernel control action applies capability fallback', () => {
  const kernel = new AESKernel({ workflow, policies, adapter });
  const decision = kernel.controlAction(
    { id: 'c1', type: 'conversationTransition', source: 'handoff-engine', reason: 'new chat useful', confidence: 'high', payload: {} },
    { aes: { default: 'autonomous' } }
  );
  assert.equal(decision.outcome, 'recommend');
});

test('kernel routes model quality degradation through control policy', () => {
  const kernel = new AESKernel({ workflow, policies, adapter });
  const decision = kernel.controlAction({
    id: 'degrade-1',
    type: 'modelQualityDegradation',
    source: 'runtime-provider',
    reason: 'powerful unavailable',
    confidence: 'high',
    payload: { requested: 'powerful', available: 'balanced' }
  }, { aes: { default: 'assisted' } });
  assert.equal(decision.outcome, 'request_approval');
});
