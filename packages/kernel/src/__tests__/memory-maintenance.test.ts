import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryMaintenanceService } from '../memory-maintenance.js';
import { MemoryLint } from '../memory-lint.js';
import { MemoryStore } from '../memory-store.js';
import type { KnowledgeRecord } from '@aes/spec';

const make = (id: string, applicability: NonNullable<KnowledgeRecord['applicability']>): KnowledgeRecord => ({ id, key: 'routing.key', kind: 'decision', scope: 'project', status: 'active', statement: 'Prefer balanced.', applicability, evidenceRefs: [`e-${id}`], evaluationRefs: [], provenance: { source: 'compiler', refs: [`e-${id}`] }, relations: [], createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z' });

test('full maintenance consolidates exact duplicates, preserves applicability distinctions, and is idempotent', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-memory-')); const store = new MemoryStore(root); await store.initialize();
  await store.putRecord(make('b', { stage: 'execution' })); await store.putRecord(make('a', { stage: 'execution' })); await store.putRecord(make('c', { stage: 'planning' }));
  const service = new MemoryMaintenanceService({ store, lint: new MemoryLint(), budget: { maxActiveRecords: 500, maxRecordTokens: 800, maxIndexTokens: 4000 } });
  await service.full(); const first = await readFile(join(root, '.aes', 'index.json'), 'utf8'); await service.full();
  assert.equal(await readFile(join(root, '.aes', 'index.json'), 'utf8'), first); assert.deepEqual((await store.listRecords()).map((record) => [record.id, record.status]), [['a', 'active'], ['b', 'superseded'], ['c', 'active']]);
});
