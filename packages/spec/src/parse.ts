import { AesValidationError } from './errors.js';
import { validatePlaybookDocument, type PlaybookDocument } from './playbook.js';
import { validatePolicyDocument, type PolicyDocument } from './policy.js';
import { validateWorkflowDocument, type WorkflowDocument } from './workflow.js';

export type DocumentFormat = 'yaml' | 'json';

type Line = { indent: number; text: string };

function splitTopLevel(source: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: string | undefined;

  for (let index = 0; index < source.length; index++) {
    const char = source[index]!;
    if (quote) {
      if (char === quote && source[index - 1] !== '\\') quote = undefined;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '[' || char === '{') depth++;
    else if (char === ']' || char === '}') depth--;
    else if (char === ',' && depth === 0) {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }

  parts.push(source.slice(start).trim());
  return parts.filter((part) => part.length > 0);
}

function splitInlineList(source: string): string[] {
  const inner = source.slice(1, -1).trim();
  if (!inner) return [];
  return splitTopLevel(inner);
}

function parseScalar(source: string): unknown {
  const value = source.trim();
  if (value.startsWith('[') && value.endsWith(']')) return splitInlineList(value).map(parseScalar);
  if (value.startsWith('{') && value.endsWith('}')) {
    const inner = value.slice(1, -1).trim();
    const result: Record<string, unknown> = {};
    if (!inner) return result;
    for (const part of splitTopLevel(inner)) {
      const colon = part.indexOf(':');
      if (colon < 0) throw new AesValidationError(`Invalid inline YAML object: ${value}`);
      result[part.slice(0, colon).trim()] = parseScalar(part.slice(colon + 1));
    }
    return result;
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function parseYamlSubset(text: string): unknown {
  const lines: Line[] = text
    .split(/\r?\n/)
    .map((raw) => raw.replace(/\s+#.*$/, ''))
    .filter((raw) => raw.trim().length > 0)
    .map((raw) => ({ indent: raw.match(/^\s*/)?.[0].length ?? 0, text: raw.trim() }));

  function parseBlock(start: number, indent: number): [unknown, number] {
    const first = lines[start];
    if (!first) return [{}, start];
    if (first.indent < indent) return [{}, start];

    if (first.text.startsWith('- ')) {
      const result: unknown[] = [];
      let index = start;
      while (index < lines.length && lines[index]!.indent === indent && lines[index]!.text.startsWith('- ')) {
        result.push(parseScalar(lines[index]!.text.slice(2)));
        index++;
      }
      return [result, index];
    }

    const result: Record<string, unknown> = {};
    let index = start;
    while (index < lines.length && lines[index]!.indent === indent && !lines[index]!.text.startsWith('- ')) {
      const line = lines[index]!;
      const colon = line.text.indexOf(':');
      if (colon < 0) throw new AesValidationError(`Invalid YAML line: ${line.text}`);
      const key = line.text.slice(0, colon).trim();
      const remainder = line.text.slice(colon + 1).trim();
      if (remainder) {
        result[key] = parseScalar(remainder);
        index++;
      } else {
        const next = lines[index + 1];
        if (!next || next.indent <= indent) {
          result[key] = {};
          index++;
        } else {
          const [child, nextIndex] = parseBlock(index + 1, next.indent);
          result[key] = child;
          index = nextIndex;
        }
      }
    }
    return [result, index];
  }

  if (lines.length === 0) return {};
  return parseBlock(0, lines[0]!.indent)[0];
}

function decode(text: string, format: DocumentFormat): unknown {
  try {
    return format === 'json' ? JSON.parse(text) : parseYamlSubset(text);
  } catch (error) {
    if (error instanceof AesValidationError) throw error;
    throw new AesValidationError(`Unable to parse ${format} document`, error);
  }
}

export const parseWorkflowText = (text: string, format: DocumentFormat): WorkflowDocument =>
  validateWorkflowDocument(decode(text, format));

export const parsePolicyText = (text: string, format: DocumentFormat): PolicyDocument =>
  validatePolicyDocument(decode(text, format));

export const parsePlaybookText = (text: string, format: DocumentFormat): PlaybookDocument =>
  validatePlaybookDocument(decode(text, format));
