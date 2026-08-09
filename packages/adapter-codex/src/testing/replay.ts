import { readFile } from 'node:fs/promises';

const SENSITIVE_KEYS = new Set([
  'text', 'prompt', 'cwd', 'path', 'filePath', 'env', 'environment', 'auth', 'authorization',
  'apiKey', 'secret', 'command', 'args', 'toolOutput', 'stdout', 'stderr', 'content', 'source',
  'code', 'patch', 'diff'
]);

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && SENSITIVE_KEYS.has(key)) return undefined;
  if ((key === 'input' || key === 'output') && typeof value !== 'number') return undefined;
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value !== 'object' || value === null) return value;

  const sanitized: Record<string, unknown> = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    const next = sanitizeValue(childValue, childKey);
    if (next !== undefined) sanitized[childKey] = next;
  }
  return sanitized;
}

export function sanitizeRecordedProtocol(record: unknown): unknown {
  return sanitizeValue(record);
}

export async function* replayFixture(path: string): AsyncIterable<unknown> {
  const text = await readFile(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    yield JSON.parse(trimmed) as unknown;
  }
}
