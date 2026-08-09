import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { replayFixture, sanitizeRecordedProtocol } from '../testing/replay.js';

test('protocol sanitizer removes content-bearing fields before fixture persistence', () => {
  const sanitized = sanitizeRecordedProtocol({
    method: 'item/outputDelta',
    params: {
      text: 'secret source',
      cwd: '/private/repo',
      env: { SECRET: 'value' },
      tokenUsage: { input: 10, output: 4 },
      itemId: 'synthetic-item'
    }
  });
  const json = JSON.stringify(sanitized);
  assert.equal(json.includes('secret source'), false);
  assert.equal(json.includes('/private/repo'), false);
  assert.equal(json.includes('SECRET'), false);
  assert.equal(json.includes('10'), true);
  assert.equal(json.includes('synthetic-item'), true);
});

test('sanitized JSONL fixture replays deterministic protocol records', async () => {
  const path = join(process.cwd(), 'packages/adapter-codex/fixtures/session-basic.jsonl');
  const records: unknown[] = [];
  for await (const record of replayFixture(path)) records.push(record);
  assert.ok(records.length >= 2);
  assert.equal(JSON.stringify(records).includes('secret source'), false);
});
