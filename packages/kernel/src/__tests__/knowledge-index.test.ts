import test from 'node:test';
import assert from 'node:assert/strict';
import { renderIndexJson, renderIndexMarkdown } from '../knowledge-index.js';
import type { KnowledgeRecord } from '@aes/spec';

const record = (id: string): KnowledgeRecord => ({
  id, key: `k.${id}`, kind: 'fact', scope: 'project', status: 'active', statement: `Statement ${id}`,
  evidenceRefs: [], evaluationRefs: [], provenance: { source: 'compiler', refs: [] }, relations: [],
  createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z'
});

test('knowledge indexes sort records deterministically and expose only metadata', () => {
  assert.equal(renderIndexJson([record('b'), record('a')]), `${JSON.stringify({
    version: 1,
    records: [
      { id: 'a', key: 'k.a', kind: 'fact', scope: 'project', status: 'active', updatedAt: '2026-08-08T00:00:00Z' },
      { id: 'b', key: 'k.b', kind: 'fact', scope: 'project', status: 'active', updatedAt: '2026-08-08T00:00:00Z' }
    ]
  }, null, 2)}\n`);
  assert.equal(renderIndexMarkdown([record('b'), record('a')]), '# AES Knowledge Index\n\n- a [fact/project/active] Statement a\n- b [fact/project/active] Statement b\n');
});
