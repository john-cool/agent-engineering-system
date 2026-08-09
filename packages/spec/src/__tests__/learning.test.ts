import test from 'node:test';
import assert from 'node:assert/strict';
import type { DecisionTrace, KnowledgeMetadata } from '../index.js';

test('learning contracts separate traces and durable knowledge metadata', () => {
  const metadata: KnowledgeMetadata = {
    id: 'k-1',
    status: 'candidate',
    scope: 'project',
    confidence: 'medium',
    createdAt: '2026-08-08T00:00:00Z',
    updatedAt: '2026-08-08T00:00:00Z',
    evidenceRefs: ['trace-1']
  };
  const trace = {
    taskClass: 'refactor',
    analysis: {} as never,
    modelDecisions: [],
    contextDecisions: [],
    controlOutcomes: [],
    retries: 0,
    verificationOutcome: 'passed',
    userOverrides: [],
    timestamp: '2026-08-08T00:00:00Z'
  } satisfies DecisionTrace;
  assert.equal(metadata.scope, 'project');
  assert.equal(trace.verificationOutcome, 'passed');
});
