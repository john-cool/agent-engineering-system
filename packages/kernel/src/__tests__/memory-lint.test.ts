import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryLint } from '../memory-lint.js';
import type { KnowledgeRecord } from '@aes/spec';
const record = (id: string): KnowledgeRecord => ({ id, key: id, kind: 'fact', scope: 'project', status: 'active', statement: 'x'.repeat(40), evidenceRefs: [], evaluationRefs: [], provenance: { source: 'compiler', refs: [] }, relations: [], createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z' });
test('lint reports health budgets and stale active records', () => { const findings = new MemoryLint().inspect({ records: [record('b'), record('a')], budget: { maxActiveRecords: 1, maxRecordTokens: 5, maxIndexTokens: 1 }, renderedIndex: 'x'.repeat(20), staleBefore: '2026-08-09T00:00:00Z' }); assert.ok(findings.some((finding) => finding.code === 'active_record_budget')); assert.ok(findings.some((finding) => finding.code === 'oversized_record')); assert.ok(findings.some((finding) => finding.code === 'index_budget')); assert.ok(findings.some((finding) => finding.code === 'stale_active')); });
