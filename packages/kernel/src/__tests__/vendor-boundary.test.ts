import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function tsFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : tsFiles(path);
    return entry.name.endsWith('.ts') ? [path] : [];
  }));
  return nested.flat();
}

test('kernel source never imports vendor adapter packages', async () => {
  for (const path of await tsFiles(resolve(process.cwd(), 'packages/kernel/src'))) {
    const source = await readFile(path, 'utf8');
    assert.equal(source.includes('@aes/adapter-'), false, path);
  }
});

test('runtime source never imports kernel or concrete vendor adapters', async () => {
  for (const path of await tsFiles(resolve(process.cwd(), 'packages/runtime/src'))) {
    const source = await readFile(path, 'utf8');
    assert.equal(source.includes('@aes/kernel'), false, path);
    assert.equal(source.includes('@aes/adapter-'), false, path);
  }
});
