import type { RuntimeFailureKind } from '@aes/spec';
import type { ModelResolution } from './resolution.js';

export type RuntimeObservation =
  | { type: 'runtime.session.started'; sessionId: string; workspaceId: string }
  | { type: 'runtime.provider.failed'; workspaceId: string; kind: RuntimeFailureKind }
  | { type: 'runtime.session.recovering'; sessionId: string }
  | { type: 'runtime.session.recovered'; sessionId: string }
  | { type: 'decision.model.selected'; resolution: ModelResolution }
  | { type: 'decision.model.fallback'; resolution: ModelResolution }
  | { type: 'experience.trace.recorded'; traceId: string }
  | { type: 'learning.evidence.accepted'; evidenceId: string; scope: string }
  | { type: 'learning.candidate.created'; candidateId: string; kind: string; scope: string }
  | { type: 'learning.candidate.shadowed'; candidateId: string }
  | { type: 'learning.evaluation.completed'; candidateId: string; outcome: string }
  | { type: 'learning.overlay.activated'; overlayId: string; scope: string }
  | { type: 'learning.overlay.degraded'; overlayId: string; reason: string }
  | { type: 'learning.overlay.disabled'; overlayId: string; reason: string }
  | { type: 'learning.overlay.superseded'; overlayId: string; replacementId: string }
  | { type: 'knowledge.record.created'; recordId: string; scope: string }
  | { type: 'knowledge.record.merged'; recordId: string; mergedEvidenceCount: number }
  | { type: 'knowledge.conflict.detected'; recordIds: string[] }
  | { type: 'knowledge.index.rebuilt'; recordCount: number }
  | { type: 'interaction.authority_candidate.created'; candidateId: string; actionType: string }
  | { type: 'authority.degraded'; actionType: string; scope: string }
  | { type: 'controlled_eval.requested'; candidateId: string; fixtureId: string }
  | { type: 'controlled_eval.completed'; candidateId: string; fixtureId: string; outcome: 'completed'; evidenceId: string };

export interface RuntimeObservationSink {
  emit(event: RuntimeObservation): void;
}
