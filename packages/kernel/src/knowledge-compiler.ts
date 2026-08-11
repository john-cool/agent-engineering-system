import type { EvaluationDecision, KnowledgeMetadata, KnowledgeRecord } from '@aes/spec';
import { applicabilityKey } from './task-signature.js';

export interface TypedCompileResult { outcome: 'create' | 'merge' | 'supersede' | 'conflict'; record?: KnowledgeRecord; conflictingIds?: string[]; }

export class KnowledgeCompiler {
  compile(incoming: KnowledgeRecord, existing: readonly KnowledgeRecord[]): TypedCompileResult {
    const same = existing.filter((record) => record.key === incoming.key && record.scope === incoming.scope && applicabilityKey(record.applicability ?? {}) === applicabilityKey(incoming.applicability ?? {}));
    if (!same.length) return { outcome: 'create', record: incoming };
    const exact = same[0]!;
    if (exact.statement === incoming.statement) return { outcome: 'merge', record: { ...exact, evidenceRefs: [...new Set([...exact.evidenceRefs, ...incoming.evidenceRefs])].sort(), evaluationRefs: [...new Set([...exact.evaluationRefs, ...incoming.evaluationRefs])].sort(), updatedAt: incoming.updatedAt > exact.updatedAt ? incoming.updatedAt : exact.updatedAt } };
    if (incoming.relations.some((relation) => relation.kind === 'supersedes' && relation.targetId === exact.id)) return { outcome: 'supersede', record: incoming };
    return { outcome: 'conflict', conflictingIds: [exact.id, incoming.id] };
  }
  validateScope(input: {
    sourceScope: KnowledgeMetadata['scope'];
    targetScope: KnowledgeMetadata['scope'];
    generalized: boolean;
  }): true {
    if (input.sourceScope === 'project' && input.targetScope === 'user' && !input.generalized) {
      throw new Error('AES memory scope violation: project content cannot be promoted to user scope without generalization');
    }
    return true;
  }

  promote(
    metadata: KnowledgeMetadata,
    evaluation: EvaluationDecision,
    evidenceRef: string,
    updatedAt = new Date().toISOString()
  ): KnowledgeMetadata {
    if (evaluation.outcome !== 'promote') {
      throw new Error('AES evaluation gate rejected durable knowledge promotion');
    }
    return {
      ...metadata,
      status: 'trusted',
      confidence: 'high',
      updatedAt,
      evidenceRefs: [...new Set([...metadata.evidenceRefs, evidenceRef])]
    };
  }

  supersede(metadata: KnowledgeMetadata, replacementId: string, updatedAt = new Date().toISOString()): KnowledgeMetadata {
    return {
      ...metadata,
      status: 'superseded',
      supersededBy: replacementId,
      updatedAt
    };
  }
}
