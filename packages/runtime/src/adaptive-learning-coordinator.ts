import type { LearningCandidate, PolicyOverlay } from '@aes/spec';
import type { LearningArtifactStore, RuntimeDecisionTrace, RuntimeLearningObserver } from '@aes/runtime-sdk';
import { toLearningEvidence } from './experience-adapter.js';

export class AdaptiveLearningCoordinator implements RuntimeLearningObserver {
  constructor(private readonly deps: { artifacts: LearningArtifactStore; evidence?: { append(value: ReturnType<typeof toLearningEvidence>): Promise<void> }; signatureForTrace?: (trace: RuntimeDecisionTrace) => Parameters<typeof toLearningEvidence>[1] }) {}
  async observe(trace: RuntimeDecisionTrace): Promise<void> { if (!this.deps.evidence || !this.deps.signatureForTrace) return; await this.deps.evidence.append(toLearningEvidence(trace, this.deps.signatureForTrace(trace))); }
  async listActiveOverlays(): Promise<PolicyOverlay[]> { return (await this.deps.artifacts.listOverlays()).filter((overlay) => overlay.status === 'active'); }
  async disableOverlay(id: string, now: string): Promise<void> { const overlay = (await this.deps.artifacts.listOverlays()).find((item) => item.id === id); if (!overlay) throw new Error(`unknown overlay ${id}`); await this.deps.artifacts.putOverlay({ ...overlay, status: 'disabled', updatedAt: now }); }
  async explainOverlay(id: string): Promise<PolicyOverlay | undefined> { return (await this.deps.artifacts.listOverlays()).find((overlay) => overlay.id === id); }
}
