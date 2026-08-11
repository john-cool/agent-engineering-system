import test from 'node:test';
import assert from 'node:assert/strict';
import type { KnowledgeRecord } from '../index.js';

test('typed knowledge preserves provenance, applicability and relations', () => {
  const record: KnowledgeRecord = {
    id: 'K42',
    key: 'routing.approved-plan.typescript.execution',
    kind: 'experience',
    scope: 'project',
    status: 'active',
    statement: 'Prefer balanced for approved-plan TypeScript execution in this project.',
    applicability: { stage: 'execution', planStatus: 'approved', language: 'typescript' },
    evidenceRefs: ['trace-1'],
    evaluationRefs: ['eval-1'],
    provenance: { source: 'experience_miner', refs: ['trace-1'] },
    relations: [{ kind: 'supports', targetId: 'overlay:model:1' }],
    createdAt: '2026-08-09T00:00:00Z',
    updatedAt: '2026-08-09T00:00:00Z'
  };
  assert.equal(record.key, 'routing.approved-plan.typescript.execution');
  assert.equal(record.relations[0]?.kind, 'supports');
});
