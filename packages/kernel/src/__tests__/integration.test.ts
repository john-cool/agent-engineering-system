import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePolicyText, parseWorkflowText } from '@aes/spec';
import type { RuntimeAdapter } from '@aes/runtime-sdk';
import { AESKernel } from '../index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');

const adapter: RuntimeAdapter = {
  async invokeModel(request) { return { text: `mock:${request.modelClass}` }; },
  async invokeTool(request) { return { ok: true, output: request.input }; }
};

test('AES deterministic lifecycle completes and routes architecture planning to powerful', async () => {
  const workflow = parseWorkflowText(await readFile(resolve(root, 'examples/workflow.yaml'), 'utf8'), 'yaml');
  const policy = parsePolicyText(await readFile(resolve(root, 'examples/policy.yaml'), 'utf8'), 'yaml');
  const kernel = new AESKernel({ workflow, policies: [policy], adapter });

  kernel.transition('planning');
  assert.equal(kernel.decideModel({ architecture: true }).modelClass, 'powerful');
  kernel.transition('execution');
  assert.equal(kernel.decideModel({}).modelClass, 'balanced');
  kernel.transition('verification');
  kernel.transition('completed');

  assert.equal(kernel.currentState(), 'completed');
});
