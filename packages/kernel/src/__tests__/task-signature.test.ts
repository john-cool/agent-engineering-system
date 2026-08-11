import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesApplicability, normalizeTaskSignature } from '../task-signature.js';

test('task signature normalization lowercases bounded tags and removes duplicates', () => {
  const result = normalizeTaskSignature({
    taskClass: ' Implementation ', stage: 'execution', planStatus: 'approved',
    language: 'TypeScript', stackTags: [' Node ', 'node', 'PNPM'], operationTags: ['Refactor']
  });
  assert.deepEqual(result, {
    taskClass: 'implementation', stage: 'execution', planStatus: 'approved',
    language: 'typescript', stackTags: ['node', 'pnpm'], operationTags: ['refactor']
  });
});

test('applicability is a partial match and requires every requested tag', () => {
  const signature = normalizeTaskSignature({
    taskClass: 'implementation', stage: 'execution', language: 'typescript',
    stackTags: ['node', 'pnpm']
  });
  assert.equal(matchesApplicability(signature, { stage: 'execution', stackTags: ['node'] }), true);
  assert.equal(matchesApplicability(signature, { stage: 'planning' }), false);
});
