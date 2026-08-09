import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalJsonlTraceStore } from '../index.js';
import { sampleTrace } from './fixtures.js';

test('LocalJsonlTraceStore appends normalized traces to a monthly file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-traces-'));
  const store = new LocalJsonlTraceStore(root);
  await store.append(sampleTrace({ traceId: 'tr-1', timestamp: '2026-08-08T10:00:00Z' }));
  const raw = await readFile(join(root, '2026-08.jsonl'), 'utf8');
  assert.equal(raw.trim().split('\n').length, 1);
  assert.equal(JSON.parse(raw).traceId, 'tr-1');
});
