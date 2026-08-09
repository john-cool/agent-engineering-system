import type { RuntimeFailureKind } from '@aes/spec';
import type { ModelResolution } from './resolution.js';

export type RuntimeObservation =
  | { type: 'runtime.session.started'; sessionId: string; workspaceId: string }
  | { type: 'runtime.provider.failed'; workspaceId: string; kind: RuntimeFailureKind }
  | { type: 'runtime.session.recovering'; sessionId: string }
  | { type: 'runtime.session.recovered'; sessionId: string }
  | { type: 'decision.model.selected'; resolution: ModelResolution }
  | { type: 'decision.model.fallback'; resolution: ModelResolution }
  | { type: 'experience.trace.recorded'; traceId: string };

export interface RuntimeObservationSink {
  emit(event: RuntimeObservation): void;
}
