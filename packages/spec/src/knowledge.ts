import type { Applicability, LearningScope, TaskSignature } from './learning.js';

export type KnowledgeKind = 'fact' | 'decision' | 'experience' | 'preference';
export type KnowledgeStatus = 'candidate' | 'shadow' | 'active' | 'degraded' | 'superseded' | 'disabled';
export type KnowledgeRelationKind = 'depends_on' | 'supports' | 'contradicts' | 'supersedes' | 'derived_from' | 'applies_to';
export type KnowledgeSource = 'user' | 'project_source' | 'decision_trace' | 'experience_miner' | 'llm_pattern_analyst' | 'controlled_eval' | 'compiler';

export interface KnowledgeRelation { kind: KnowledgeRelationKind; targetId: string; }
export interface KnowledgeProvenance { source: KnowledgeSource; refs: string[]; }

export interface KnowledgeRecord {
  id: string;
  key: string;
  kind: KnowledgeKind;
  scope: LearningScope;
  status: KnowledgeStatus;
  statement: string;
  applicability?: Applicability;
  evidenceRefs: string[];
  evaluationRefs: string[];
  confidence?: 'low' | 'medium' | 'high';
  provenance: KnowledgeProvenance;
  relations: KnowledgeRelation[];
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  supersededBy?: string;
}

export interface KnowledgeQuery {
  text: string;
  scope: LearningScope;
  signature?: TaskSignature;
  kinds?: KnowledgeKind[];
  statuses?: KnowledgeStatus[];
  maxRecords: number;
  maxEstimatedTokens: number;
}

export interface KnowledgePacketEntry {
  id: string;
  path: string;
  statement: string;
  score: number;
  estimatedTokens: number;
  reasons: string[];
  record: KnowledgeRecord;
}

export interface KnowledgePacket {
  entries: KnowledgePacketEntry[];
  estimatedTokens: number;
  truncated: boolean;
}

export interface KnowledgeRetentionPolicy {
  rawTracesDays: number;
  failedTracesDays: number;
  promotedEvidence: 'keep';
}

export interface KnowledgeHealthBudget {
  maxActiveRecords: number;
  maxRecordTokens: number;
  maxIndexTokens: number;
}
