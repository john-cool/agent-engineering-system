import test from 'node:test';
import assert from 'node:assert/strict';
import { KnowledgeCompiler } from '../knowledge-compiler.js';
import type { KnowledgeRecord } from '@aes/spec';

const metadata = {
  id: 'k1',
  status: 'candidate' as const,
  scope: 'project' as const,
  confidence: 'medium' as const,
  createdAt: '2026-08-08T00:00:00Z',
  updatedAt: '2026-08-08T00:00:00Z',
  evidenceRefs: ['trace-1']
};

const record = (overrides: Partial<KnowledgeRecord> = {}): KnowledgeRecord => ({
  id: 'K1', key: 'routing.ts.execution', kind: 'decision', scope: 'project', status: 'active', statement: 'Prefer balanced.',
  applicability: { stage: 'execution', language: 'typescript' }, evidenceRefs: ['e1'], evaluationRefs: [],
  provenance: { source: 'compiler', refs: ['e1'] }, relations: [], createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', ...overrides
});

test('typed compiler merges exact knowledge, coexists by applicability, and reports conflicts', () => {
  const compiler = new KnowledgeCompiler();
  const existing = record();
  assert.equal(compiler.compile(existing, []).outcome, 'create');
  const merged = compiler.compile(record({ id: 'K2', evidenceRefs: ['e2'] }), [existing]);
  assert.equal(merged.outcome, 'merge');
  assert.deepEqual(merged.record?.evidenceRefs.sort(), ['e1', 'e2']);
  assert.equal(compiler.compile(record({ id: 'K3', applicability: { stage: 'planning', language: 'typescript' }, statement: 'Prefer powerful.' }), [existing]).outcome, 'create');
  assert.equal(compiler.compile(record({ id: 'K4', statement: 'Prefer powerful.' }), [existing]).outcome, 'conflict');
});

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
