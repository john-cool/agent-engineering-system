import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalCheckpointStore } from '../index.js';
import { checkpoint } from './fixtures.js';

test('checkpoint survives a new store instance and replaces older revision', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-checkpoints-'));
  const first = new LocalCheckpointStore(root);
  await first.save(checkpoint({ sessionId: 's1', contextRevision: 1 }));
  await first.save(checkpoint({ sessionId: 's1', contextRevision: 2 }));

  const second = new LocalCheckpointStore(root);
  const loaded = await second.load('s1');
  assert.equal(loaded?.contextRevision, 2);
});
