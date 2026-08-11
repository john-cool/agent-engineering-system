import type { RuntimeOutcome, RuntimeVerification } from '@aes/spec';
import type { KnowledgePacket, KnowledgeQuery, KnowledgeRecord } from '@aes/spec';
import type { SessionCheckpoint } from './session.js';
import type { RuntimeDecisionTrace } from './telemetry.js';

export interface TraceQuery {
  provider?: string;
  model?: string;
  outcome?: RuntimeOutcome;
  verification?: RuntimeVerification;
  taskClass?: string;
  from?: string;
  to?: string;
}

export interface AggregateQuery extends TraceQuery {}

export interface AggregateResult {
  count: number;
  successCount: number;
  retryCount: number;
}

export interface TraceStore {
  append(trace: RuntimeDecisionTrace): Promise<void>;
  query(query: TraceQuery): Promise<RuntimeDecisionTrace[]>;
  aggregate(query: AggregateQuery): Promise<AggregateResult>;
}

export interface SessionCheckpointStore {
  save(checkpoint: SessionCheckpoint): Promise<void>;
  load(sessionId: string): Promise<SessionCheckpoint | undefined>;
  remove(sessionId: string): Promise<void>;
}

export interface KnowledgeSearchResult<TMetadata = unknown> {
  path: string;
  content: string;
  metadata?: TMetadata;
}

export interface KnowledgeStore<TMetadata = unknown> {
  initialize(): Promise<void>;
  searchKnowledge(query: string, limit?: number): Promise<KnowledgeSearchResult<TMetadata>[]>;
  writeKnowledge(path: string, content: string, metadata: TMetadata): Promise<void>;
  appendLog(message: string): Promise<void>;
}

export interface TypedKnowledgeStore {
  initialize(): Promise<void>;
  putRecord(record: KnowledgeRecord): Promise<void>;
  getRecord(id: string): Promise<KnowledgeRecord | undefined>;
  listRecords(): Promise<KnowledgeRecord[]>;
  queryKnowledge(query: KnowledgeQuery): Promise<KnowledgePacket>;
  rebuildIndexes(): Promise<void>;
  appendLog(message: string): Promise<void>;
}
