import test from 'node:test';
import assert from 'node:assert/strict';
import { migrateLegacyKnowledge } from '../knowledge-migration.js';

test('legacy trusted knowledge becomes active fact without becoming an overlay', () => {
  const record = migrateLegacyKnowledge('architecture/vendor-neutral.md', 'Core never imports adapters.', {
    id: 'k1', status: 'trusted', scope: 'project', confidence: 'high',
    createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', evidenceRefs: ['adr-1']
  });
  assert.equal(record.status, 'active');
  assert.equal(record.kind, 'fact');
  assert.equal(record.provenance.source, 'compiler');
  assert.deepEqual(record.evidenceRefs, ['adr-1']);
});
