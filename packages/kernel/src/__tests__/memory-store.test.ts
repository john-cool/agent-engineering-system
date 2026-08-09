import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { KnowledgeStore } from '@aes/runtime-sdk';
import type { KnowledgeMetadata } from '@aes/spec';
import { MemoryStore } from '../memory-store.js';


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
