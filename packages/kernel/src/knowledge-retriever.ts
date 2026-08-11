import type { KnowledgePacket, KnowledgeQuery, KnowledgeRecord } from '@aes/spec';
import { matchesApplicability } from './task-signature.js';
const tokens = (text: string) => Math.ceil(text.length / 4);
export class KnowledgeRetriever {
  retrieve(records: readonly KnowledgeRecord[], query: KnowledgeQuery): KnowledgePacket {
    const terms = [...new Set(query.text.toLowerCase().split(/\s+/).filter(Boolean))];
    const candidates = records.filter((record) => record.scope === query.scope || (query.scope === 'project' && record.scope === 'user'))
      .filter((record) => (query.statuses ?? ['active']).includes(record.status)).filter((record) => !query.kinds || query.kinds.includes(record.kind))
      .filter((record) => !record.applicability || !query.signature || matchesApplicability(query.signature, record.applicability)).map((record) => ({ record, estimatedTokens: tokens(record.statement), score: terms.reduce((score, term) => score + (`${record.key} ${record.statement}`.toLowerCase().includes(term) ? 1 : 0), 0) + (record.applicability ? 3 : 0) + (record.confidence === 'high' ? 2 : record.confidence === 'medium' ? 1 : 0) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || b.record.updatedAt.localeCompare(a.record.updatedAt) || a.record.id.localeCompare(b.record.id));
    const entries: KnowledgePacket['entries'] = []; let estimatedTokens = 0;
    for (const item of candidates) { if (entries.length >= query.maxRecords) break; if (estimatedTokens + item.estimatedTokens > query.maxEstimatedTokens) continue; entries.push({ id: item.record.id, path: `knowledge/${item.record.kind}/${item.record.id}.md`, statement: item.record.statement, score: item.score, estimatedTokens: item.estimatedTokens, reasons: ['scope/applicability matched', 'lexical/metadata ranking'], record: item.record }); estimatedTokens += item.estimatedTokens; }
    return { entries, estimatedTokens, truncated: entries.length < candidates.length };
  }
}
