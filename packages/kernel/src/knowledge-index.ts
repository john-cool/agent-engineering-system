import type { KnowledgeRecord } from '@aes/spec';

export function renderIndexJson(records: readonly KnowledgeRecord[]): string {
  const rows = [...records].sort((a, b) => a.id.localeCompare(b.id)).map((record) => ({
    id: record.id, key: record.key, kind: record.kind, scope: record.scope, status: record.status,
    confidence: record.confidence, updatedAt: record.updatedAt
  }));
  return `${JSON.stringify({ version: 1, records: rows }, null, 2)}\n`;
}

export function renderIndexMarkdown(records: readonly KnowledgeRecord[]): string {
  const lines = [...records].sort((a, b) => a.id.localeCompare(b.id)).map((record) =>
    `- ${record.id} [${record.kind}/${record.scope}/${record.status}] ${record.statement.replace(/\s+/g, ' ').slice(0, 240)}`);
  return `# AES Knowledge Index\n\n${lines.join('\n')}${lines.length ? '\n' : ''}`;
}
