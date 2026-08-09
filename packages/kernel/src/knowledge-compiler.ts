import type { EvaluationDecision, KnowledgeMetadata } from '@aes/spec';

export class KnowledgeCompiler {
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
