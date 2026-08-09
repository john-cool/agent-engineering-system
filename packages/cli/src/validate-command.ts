import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import {
  parsePlaybookText,
  parsePolicyText,
  parseWorkflowText,
  type DocumentFormat
} from '@aes/spec';

function detectKind(text: string, format: DocumentFormat): string | undefined {
  if (format === 'json') {
    const raw = JSON.parse(text) as { kind?: unknown };
    return typeof raw.kind === 'string' ? raw.kind : undefined;
  }
  const match = text.match(/^\s*kind\s*:\s*([^\s#]+)\s*$/m);
  return match?.[1];
}

export async function validateFile(path: string): Promise<{ kind: string; name: string }> {
  const text = await readFile(path, 'utf8');
  const format: DocumentFormat = extname(path).toLowerCase() === '.json' ? 'json' : 'yaml';
  const kind = detectKind(text, format);

  switch (kind) {
    case 'Workflow': {
      const doc = parseWorkflowText(text, format);
      return { kind: doc.kind, name: doc.name };
    }
    case 'Policy': {
      const doc = parsePolicyText(text, format);
      return { kind: doc.kind, name: doc.name };
    }
    case 'Playbook': {
      const doc = parsePlaybookText(text, format);
      return { kind: doc.kind, name: doc.name };
    }
    default:
      throw new Error('Unsupported AES document kind');
  }
}
