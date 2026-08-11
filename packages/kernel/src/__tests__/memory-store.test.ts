import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { KnowledgeStore } from '@aes/runtime-sdk';
import type { KnowledgeMetadata } from '@aes/spec';
import type { LearningCandidate, PolicyOverlay, ShadowDecisionTrace } from '@aes/spec';
import { MemoryStore } from '../memory-store.js';

test('initialize creates the typed knowledge layout and deterministic empty index', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-memory-'));
  const store = new MemoryStore(root);
  await store.initialize();
  for (const folder of ['raw', 'knowledge', 'decisions', 'experience', 'evals', 'overlays']) {
    assert.equal((await stat(join(root, '.aes', folder))).isDirectory(), true);
  }
  assert.deepEqual(JSON.parse(await readFile(join(root, '.aes', 'index.json'), 'utf8')), { version: 1, records: [] });
});

test('initialize migrates legacy sidecars once and preserves source files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-memory-'));
  const legacyDir = join(root, '.aes', 'knowledge', 'architecture');
  const markdown = join(legacyDir, 'vendor-neutral.md');
  await mkdir(legacyDir, { recursive: true });
  await writeFile(markdown, '# Vendor neutral\n\nCore never imports adapters.\n');
  await writeFile(`${markdown}.meta.json`, JSON.stringify({ id: 'k1', status: 'trusted', scope: 'project', confidence: 'high', createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', evidenceRefs: ['adr-1'] }));
  const store = new MemoryStore(root);
  await store.initialize();
  assert.equal((await store.getRecord('k1'))?.status, 'active');
  assert.equal(await readFile(markdown, 'utf8'), '# Vendor neutral\n\nCore never imports adapters.\n');
  const firstIndex = await readFile(join(root, '.aes', 'index.json'), 'utf8');
  await store.initialize();
  assert.equal(await readFile(join(root, '.aes', 'index.json'), 'utf8'), firstIndex);
  assert.equal((await store.listRecords()).filter((record) => record.id === 'k1').length, 1);
});

test('learning artifacts persist across store instances and shadow decisions remain JSONL', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-memory-'));
  const candidate: LearningCandidate = { id: 'c1', kind: 'knowledge', scope: 'project', applicability: { taskClass: 'test' }, source: 'experience_miner', evidenceRefs: ['e1'], evidenceStrength: 'observational', status: 'candidate', createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', evaluationRefs: [] };
  const overlay: PolicyOverlay = { id: 'o1', sourceCandidateId: 'c1', scope: 'project', status: 'active', applicability: { taskClass: 'test' }, effect: { kind: 'latency_preference', prefer: 'fast' }, evidenceRefs: ['e1'], evaluationRefs: ['v1'], evidenceStrength: 'comparative', evaluationScore: 0.9, createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z' };
  const shadow: ShadowDecisionTrace = { candidateId: 'c1', baselineDecision: { model: 'balanced' }, shadowDecision: { model: 'cheap' }, comparable: true, timestamp: '2026-08-08T00:00:00Z' };
  const first = new MemoryStore(root);
  await first.initialize();
  await first.putCandidate(candidate); await first.putOverlay(overlay); await first.putShadowDecision(shadow);
  const second = new MemoryStore(root);
  await second.initialize();
  assert.deepEqual(await second.listCandidates(), [candidate]);
  assert.deepEqual(await second.listOverlays(), [overlay]);
  assert.deepEqual(JSON.parse((await readFile(join(root, '.aes', 'experience', 'shadow', 'c1.jsonl'), 'utf8')).trim()), shadow);
});


function acceptsKnowledgeStore(_store: KnowledgeStore<KnowledgeMetadata>) {}

test('memory store creates five-folder project layout and retrieves lexically', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-memory-'));
  const store = new MemoryStore(root);
  acceptsKnowledgeStore(store);
  await store.initialize();

  for (const folder of ['raw', 'knowledge', 'decisions', 'experience', 'evals']) {
    assert.equal((await stat(join(root, '.aes', folder))).isDirectory(), true);
  }

  await store.writeKnowledge(
    'architecture/vendor-neutral.md',
    '# Vendor neutral\nCore never imports adapters.',
    {
      id: 'k1', status: 'trusted', scope: 'project', confidence: 'high',
      createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', evidenceRefs: ['adr-1']
    }
  );

  const results = await store.searchKnowledge('vendor adapters');
  assert.equal(results.length, 1);
  assert.match(results[0]!.content, /Core never imports adapters/);
  assert.match(await readFile(join(root, '.aes', 'index.md'), 'utf8'), /vendor-neutral/);
});

test('raw evidence and log are append-only operations', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-memory-'));
  const store = new MemoryStore(root);
  await store.initialize();
  const first = await store.appendRaw('sessions', 'trace-one');
  const second = await store.appendRaw('sessions', 'trace-two');
  assert.notEqual(first, second);
  await store.appendLog('knowledge promoted: k1');
  assert.match(await readFile(join(root, '.aes', 'log.md'), 'utf8'), /knowledge promoted: k1/);
});

test('lexical retrieval can match indexed knowledge content, not only filenames', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-memory-'));
  const store = new MemoryStore(root);
  await store.initialize();
  await store.writeKnowledge(
    'architecture/vendor-neutral.md',
    '# Vendor neutral\nCore never imports adapters.',
    {
      id: 'k2', status: 'trusted', scope: 'project', confidence: 'high',
      createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', evidenceRefs: ['adr-1']
    }
  );
  const results = await store.searchKnowledge('adapters');
  assert.equal(results.length, 1);
});
