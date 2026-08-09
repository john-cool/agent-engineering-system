import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateFile } from '../validate-command.js';

test('validateFile accepts a valid workflow', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'aes-cli-'));
  const file = join(dir, 'workflow.yaml');
  await writeFile(file, `kind: Workflow\nversion: 1\nname: default\ninitial: discovery\nstates:\n  discovery: { next: [planning] }\n  planning: { next: [execution, discovery] }\n  execution: { next: [verification, planning] }\n  verification: { next: [completed, execution, planning] }\n  completed: { next: [] }\n`);
  assert.deepEqual(await validateFile(file), { kind: 'Workflow', name: 'default' });
});
