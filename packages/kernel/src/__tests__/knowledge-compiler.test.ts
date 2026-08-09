import test from 'node:test';
import assert from 'node:assert/strict';
import { KnowledgeCompiler } from '../knowledge-compiler.js';

const metadata = {
  id: 'k1',
  status: 'candidate' as const,
  scope: 'project' as const,
  confidence: 'medium' as const,
  createdAt: '2026-08-08T00:00:00Z',
  updatedAt: '2026-08-08T00:00:00Z',
  evidenceRefs: ['trace-1']
};

test('project-specific knowledge cannot silently promote to user scope', () => {
  const compiler = new KnowledgeCompiler();
  assert.throws(
    () => compiler.validateScope({ sourceScope: 'project', targetScope: 'user', generalized: false }),
    /project content.*user/i
  );
});

test('generalized procedural knowledge may be proposed for user scope', () => {
  const compiler = new KnowledgeCompiler();
  assert.equal(compiler.validateScope({ sourceScope: 'project', targetScope: 'user', generalized: true }), true);
});

test('promotion and supersession preserve evidence and history', () => {
  const compiler = new KnowledgeCompiler();
  const promoted = compiler.promote(metadata, { hypothesisId: 'h1', outcome: 'promote', reasons: [] }, 'eval-1', '2026-08-08T01:00:00Z');
  assert.equal(promoted.status, 'trusted');
  assert.deepEqual(promoted.evidenceRefs, ['trace-1', 'eval-1']);
  const superseded = compiler.supersede(promoted, 'k2', '2026-08-08T02:00:00Z');
  assert.equal(superseded.status, 'superseded');
  assert.equal(superseded.supersededBy, 'k2');
});

test('trusted promotion requires a positive evaluation decision', () => {
  const compiler = new KnowledgeCompiler();
  assert.throws(
    () => compiler.promote(metadata, { hypothesisId: 'h1', outcome: 'keep_candidate', reasons: ['insufficient sample count'] }, 'eval-1', '2026-08-08T01:00:00Z'),
    /evaluation gate/i
  );
  const promoted = compiler.promote(metadata, { hypothesisId: 'h1', outcome: 'promote', reasons: [] }, 'eval-2', '2026-08-08T01:00:00Z');
  assert.equal(promoted.status, 'trusted');
});
