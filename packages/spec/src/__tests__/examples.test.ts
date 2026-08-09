import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parsePlaybookText, parsePolicyText, parseWorkflowText } from '../index.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../');
const readExample = (name: string) => readFile(resolve(root, 'examples', name), 'utf8');

test('validates workflow.yaml', async () => {
  assert.equal(parseWorkflowText(await readExample('workflow.yaml'), 'yaml').name, 'engineering-default');
});

test('validates policy.yaml', async () => {
  assert.equal(parsePolicyText(await readExample('policy.yaml'), 'yaml').name, 'architecture-escalation');
});

test('validates playbook.yaml', async () => {
  assert.equal(parsePlaybookText(await readExample('playbook.yaml'), 'yaml').name, 'bugfix');
});
