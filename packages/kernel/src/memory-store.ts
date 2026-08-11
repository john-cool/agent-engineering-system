import { access, appendFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import type { KnowledgeMetadata, KnowledgePacket, KnowledgeQuery, KnowledgeRecord, LearningCandidate, LearningEvaluation, PolicyOverlay, ShadowDecisionTrace, InteractionEvidence, AuthorityCandidate, ScopedAuthorityGrant } from '@aes/spec';
import type { KnowledgeSearchResult, KnowledgeStore, LearningArtifactStore, TypedKnowledgeStore } from '@aes/runtime-sdk';
import { migrateLegacyKnowledgeDirectory } from './knowledge-migration.js';
import { renderIndexJson, renderIndexMarkdown } from './knowledge-index.js';

const ROOT_FOLDERS = ['raw', 'knowledge', 'decisions', 'experience', 'evals', 'overlays'] as const;
const NESTED_FOLDERS = ['raw/traces', 'experience/candidates', 'experience/shadow', 'experience/active', 'experience/interactions', 'experience/authority-candidates', 'decisions/authority', 'overlays/project', 'overlays/user'] as const;

export class MemoryStore implements KnowledgeStore<KnowledgeMetadata>, TypedKnowledgeStore, LearningArtifactStore {
  readonly #aesRoot: string;
  #sequence = 0;

  constructor(private readonly projectRoot: string) { this.#aesRoot = join(projectRoot, '.aes'); }

  async initialize(): Promise<void> {
    await mkdir(this.#aesRoot, { recursive: true });
    for (const folder of [...ROOT_FOLDERS, ...NESTED_FOLDERS]) await mkdir(join(this.#aesRoot, folder), { recursive: true });
    await this.ensureFile('index.json', renderIndexJson([]));
    await this.ensureFile('index.md', '# AES Knowledge Index\n');
    await this.ensureFile('log.md', '# AES Knowledge Log\n');
    await this.ensureFile('MEMORY.md', '# AES Memory\n\nProject knowledge is retrieved selectively through index metadata.\n');
    await migrateLegacyKnowledgeDirectory(join(this.#aesRoot, 'knowledge'), this);
    await this.rebuildIndexes();
  }

  async appendRaw(category: string, content: string): Promise<string> {
    const dir = join(this.#aesRoot, 'raw', category);
    await mkdir(dir, { recursive: true });
    const path = join(dir, `${Date.now()}-${this.#sequence++}.md`);
    await writeFile(path, content, { flag: 'wx' });
    return relative(this.projectRoot, path);
  }

  async writeKnowledge(path: string, content: string, metadata: KnowledgeMetadata): Promise<void> {
    const absolute = join(this.#aesRoot, 'knowledge', path);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, content);
    await writeFile(`${absolute}.meta.json`, `${JSON.stringify(metadata, null, 2)}\n`);
    const indexPath = join(this.#aesRoot, 'index.md');
    const relativeKnowledgePath = `knowledge/${path}`;
    const current = await readFile(indexPath, 'utf8');
    if (!current.includes(relativeKnowledgePath)) await appendFile(indexPath, `- ${relativeKnowledgePath} :: ${content.replace(/\s+/g, ' ').trim().slice(0, 240)}\n`);
  }

  async searchKnowledge(query: string, limit = 3): Promise<KnowledgeSearchResult<KnowledgeMetadata>[]> {
    const index = await readFile(join(this.#aesRoot, 'index.md'), 'utf8');
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const ranked = index.split(/\r?\n/).map((line) => line.match(/^\-\s+(.+?)(?:\s+::\s+(.*))?$/)).filter((match): match is RegExpMatchArray => !!match)
      .map((match) => ({ path: match[1]!, searchable: `${match[1]} ${match[2] ?? ''}`.toLowerCase() }))
      .map(({ path, searchable }) => ({ path, score: terms.reduce((score, term) => score + (searchable.includes(term) ? 1 : 0), 0) }))
      .filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, limit);
    return Promise.all(ranked.map(async ({ path }) => {
      const absolute = join(this.#aesRoot, path);
      const content = await readFile(absolute, 'utf8');
      try { return { path, content, metadata: JSON.parse(await readFile(`${absolute}.meta.json`, 'utf8')) as KnowledgeMetadata }; }
      catch { return { path, content }; }
    }));
  }

  async appendLog(message: string): Promise<void> { await appendFile(join(this.#aesRoot, 'log.md'), `- ${message}\n`); }

  async getRecord(id: string): Promise<KnowledgeRecord | undefined> { return (await this.listRecords()).find((record) => record.id === id); }

  async listRecords(): Promise<KnowledgeRecord[]> {
    const records: KnowledgeRecord[] = [];
    for (const kind of ['fact', 'decision', 'experience', 'preference'] as const) {
      const dir = join(this.#aesRoot, 'knowledge', kind);
      await mkdir(dir, { recursive: true });
      records.push(...await this.readJsonDirectory<KnowledgeRecord>(dir, '.meta.json'));
    }
    return records.sort((a, b) => a.id.localeCompare(b.id));
  }

  async putRecord(record: KnowledgeRecord): Promise<void> {
    const dir = join(this.#aesRoot, 'knowledge', record.kind);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${record.id}.meta.json`), `${JSON.stringify(record, null, 2)}\n`);
    await writeFile(join(dir, `${record.id}.md`), `# ${record.key}\n\n${record.statement}\n`);
    await this.rebuildIndexes();
  }

  async queryKnowledge(query: KnowledgeQuery): Promise<KnowledgePacket> {
    const records = (await this.listRecords()).filter((record) => record.status === 'active' && (record.scope === query.scope || (query.scope === 'project' && record.scope === 'user')))
      .filter((record) => !query.kinds || query.kinds.includes(record.kind)).filter((record) => !query.statuses || query.statuses.includes(record.status));
    const entries: KnowledgePacket['entries'] = []; let estimatedTokens = 0;
    for (const record of records) {
      if (entries.length >= query.maxRecords) break;
      const tokens = Math.ceil(record.statement.length / 4);
      if (estimatedTokens + tokens > query.maxEstimatedTokens) continue;
      entries.push({ id: record.id, path: `knowledge/${record.kind}/${record.id}.md`, statement: record.statement, score: 0, estimatedTokens: tokens, reasons: ['typed-store compatibility retrieval'], record });
      estimatedTokens += tokens;
    }
    return { entries, estimatedTokens, truncated: entries.length < records.length };
  }

  async rebuildIndexes(): Promise<void> { const records = await this.listRecords(); await writeFile(join(this.#aesRoot, 'index.json'), renderIndexJson(records)); await writeFile(join(this.#aesRoot, 'index.md'), renderIndexMarkdown(records)); }

  async putCandidate(value: LearningCandidate): Promise<void> { await this.writeJson(`experience/candidates/${value.id}.json`, value); }
  async putEvaluation(value: LearningEvaluation): Promise<void> { await this.writeJson(`evals/${value.id}.json`, value); }
  async putOverlay(value: PolicyOverlay): Promise<void> { await this.writeJson(`overlays/${value.scope}/${value.id}.json`, value); }
  async putShadowDecision(value: ShadowDecisionTrace): Promise<void> { await appendFile(join(this.#aesRoot, 'experience', 'shadow', `${value.candidateId}.jsonl`), `${JSON.stringify(value)}\n`); }
  async appendInteraction(value: InteractionEvidence): Promise<void> { await this.writeJson(`experience/interactions/${value.id}.json`, value); }
  async putAuthorityCandidate(value: AuthorityCandidate): Promise<void> { await this.writeJson(`experience/authority-candidates/${value.id}.json`, value); }
  async putAuthorityGrant(value: ScopedAuthorityGrant): Promise<void> { await this.writeJson(`decisions/authority/${value.id}.json`, value); }
  async listCandidates(): Promise<LearningCandidate[]> { return this.readJsonDirectory(join(this.#aesRoot, 'experience/candidates')); }
  async listOverlays(): Promise<PolicyOverlay[]> { return (await this.readJsonDirectory<PolicyOverlay>(join(this.#aesRoot, 'overlays/project'))).concat(await this.readJsonDirectory<PolicyOverlay>(join(this.#aesRoot, 'overlays/user'))).sort((a, b) => a.id.localeCompare(b.id)); }
  async listInteractions(): Promise<InteractionEvidence[]> { return this.readJsonDirectory(join(this.#aesRoot, 'experience/interactions')); }
  async listAuthorityCandidates(): Promise<AuthorityCandidate[]> { return this.readJsonDirectory(join(this.#aesRoot, 'experience/authority-candidates')); }
  async listAuthorityGrants(): Promise<ScopedAuthorityGrant[]> { return this.readJsonDirectory(join(this.#aesRoot, 'decisions/authority')); }

  private async writeJson(path: string, value: unknown): Promise<void> { const absolute = join(this.#aesRoot, path); await mkdir(dirname(absolute), { recursive: true }); await writeFile(absolute, `${JSON.stringify(value, null, 2)}\n`); }
  private async readJsonDirectory<T = unknown>(directory: string, suffix = '.json'): Promise<T[]> { const entries = (await readdir(directory, { withFileTypes: true })).filter((entry) => entry.isFile() && entry.name.endsWith(suffix)).map((entry) => entry.name).sort(); return Promise.all(entries.map(async (name) => JSON.parse(await readFile(join(directory, name), 'utf8')) as T)); }
  private async ensureFile(path: string, content: string): Promise<void> { try { await access(join(this.#aesRoot, path)); } catch { await writeFile(join(this.#aesRoot, path), content); } }
}
