import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import type { KnowledgeMetadata, KnowledgeRecord } from '@aes/spec';

export function migrateLegacyKnowledge(path: string, content: string, legacy: KnowledgeMetadata): KnowledgeRecord {
  return {
    id: legacy.id,
    key: `legacy.${path.replace(/[^a-zA-Z0-9]+/g, '.').replace(/^\.|\.$/g, '').toLowerCase()}`,
    kind: 'fact',
    scope: legacy.scope,
    status: legacy.status === 'trusted' ? 'active' : legacy.status === 'superseded' ? 'superseded' : 'candidate',
    statement: content.replace(/^#+\s+.*$/m, '').trim().replace(/\s+/g, ' '),
    evidenceRefs: [...legacy.evidenceRefs],
    evaluationRefs: [],
    confidence: legacy.confidence,
    provenance: { source: 'compiler', refs: [...legacy.evidenceRefs] },
    relations: [],
    ...(legacy.supersededBy ? { supersededBy: legacy.supersededBy } : {}),
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt
  };
}

async function walkFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const absolute = join(root, entry.name);
    if (entry.isDirectory()) out.push(...await walkFiles(absolute));
    else out.push(absolute);
  }
  return out.sort();
}

export async function migrateLegacyKnowledgeDirectory(
  knowledgeRoot: string,
  target: { getRecord(id: string): Promise<KnowledgeRecord | undefined>; putRecord(record: KnowledgeRecord): Promise<void> }
): Promise<number> {
  const files = await walkFiles(knowledgeRoot);
  let migrated = 0;
  for (const metadataPath of files.filter((path) => path.endsWith('.meta.json'))) {
    const parsed = JSON.parse(await readFile(metadataPath, 'utf8')) as KnowledgeMetadata | KnowledgeRecord;
    if ('key' in parsed && 'provenance' in parsed) continue;
    if (await target.getRecord(parsed.id)) continue;
    const markdownPath = metadataPath.slice(0, -'.meta.json'.length);
    const content = await readFile(markdownPath, 'utf8');
    const relativePath = relative(knowledgeRoot, markdownPath).replaceAll('\\', '/');
    await target.putRecord(migrateLegacyKnowledge(relativePath, content, parsed));
    migrated += 1;
  }
  return migrated;
}
