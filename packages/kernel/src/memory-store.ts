import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import type { KnowledgeMetadata } from '@aes/spec';
import type { KnowledgeSearchResult, KnowledgeStore } from '@aes/runtime-sdk';

const ROOT_FOLDERS = ['raw', 'knowledge', 'decisions', 'experience', 'evals'] as const;

export class MemoryStore implements KnowledgeStore<KnowledgeMetadata> {
  readonly #aesRoot: string;
  #sequence = 0;

  constructor(private readonly projectRoot: string) {
    this.#aesRoot = join(projectRoot, '.aes');
  }

  async initialize(): Promise<void> {
    await mkdir(this.#aesRoot, { recursive: true });
    await Promise.all(ROOT_FOLDERS.map((folder) => mkdir(join(this.#aesRoot, folder), { recursive: true })));
    await this.ensureFile('index.md', '# AES Knowledge Index\n');
    await this.ensureFile('log.md', '# AES Knowledge Log\n');
    await this.ensureFile('MEMORY.md', '# AES Memory\n\nProject knowledge is retrieved selectively through index metadata.\n');
  }

  async appendRaw(category: string, content: string): Promise<string> {
    const dir = join(this.#aesRoot, 'raw', category);
    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${this.#sequence++}.md`;
    const path = join(dir, name);
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
    if (!current.includes(relativeKnowledgePath)) {
      const summary = content.replace(/\s+/g, ' ').trim().slice(0, 240);
      await appendFile(indexPath, `- ${relativeKnowledgePath} :: ${summary}\n`);
    }
  }

  async searchKnowledge(query: string, limit = 3): Promise<KnowledgeSearchResult<KnowledgeMetadata>[]> {
    const index = await readFile(join(this.#aesRoot, 'index.md'), 'utf8');
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const paths = index
      .split(/\r?\n/)
      .map((line) => line.match(/^\-\s+(.+?)(?:\s+::\s+(.*))?$/))
      .filter((match): match is RegExpMatchArray => !!match)
      .map((match) => ({ path: match[1]!, searchable: `${match[1]} ${match[2] ?? ''}`.toLowerCase() }));

    const ranked = paths
      .map(({ path, searchable }) => ({
        path,
        score: terms.reduce((score, term) => score + (searchable.includes(term) ? 1 : 0), 0)
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
      .slice(0, limit);

    return Promise.all(ranked.map(async ({ path }) => {
      const absolute = join(this.#aesRoot, path);
      const content = await readFile(absolute, 'utf8');
      let metadata: KnowledgeMetadata | undefined;
      try {
        metadata = JSON.parse(await readFile(`${absolute}.meta.json`, 'utf8')) as KnowledgeMetadata;
      } catch {
        metadata = undefined;
      }
      return metadata ? { path, content, metadata } : { path, content };
    }));
  }

  async appendLog(message: string): Promise<void> {
    await appendFile(join(this.#aesRoot, 'log.md'), `- ${message}\n`);
  }

  private async ensureFile(path: string, initialContent: string): Promise<void> {
    try {
      await writeFile(join(this.#aesRoot, path), initialContent, { flag: 'wx' });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw error;
    }
  }
}
