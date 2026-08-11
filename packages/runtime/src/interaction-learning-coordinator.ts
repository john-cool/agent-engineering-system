import type { AuthorityCandidate, InteractionEvidence, ScopedAuthorityGrant } from '@aes/spec';
import type { LearningArtifactStore, RuntimeObservationSink } from '@aes/runtime-sdk';
import { applicabilityKey, AuthorityLearning } from '@aes/kernel';

export class InteractionLearningCoordinator {
  constructor(private readonly deps: { authority: AuthorityLearning; artifacts: LearningArtifactStore; observations?: RuntimeObservationSink; now: () => string }) {}
  async record(input: InteractionEvidence): Promise<{ candidate?: AuthorityCandidate; degradedGrant?: ScopedAuthorityGrant }> {
    await this.deps.artifacts.appendInteraction(input); const all = await this.deps.artifacts.listInteractions(); const key = applicabilityKey(input.applicability); const rows = all.filter((row) => row.actionType === input.actionType && applicabilityKey(row.applicability) === key);
    if (input.currentMode !== 'autonomous') { const candidate = this.deps.authority.evaluateInteractions({ actionType: input.actionType, scope: 'project', current: input.currentMode, applicability: input.applicability, evidence: rows, now: this.deps.now() }); if (!candidate) return {}; await this.deps.artifacts.putAuthorityCandidate(candidate); this.deps.observations?.emit({ type: 'interaction.authority_candidate.created', candidateId: candidate.id, actionType: candidate.actionType }); return { candidate }; }
    const result = this.deps.authority.evaluate({ current: 'autonomous', approvals: rows.filter((row) => row.userDecision === 'approved').length, rejections: rows.filter((row) => row.userDecision === 'rejected').length, verifiedSuccesses: rows.filter((row) => row.verifiedOutcome === 'passed').length, regressions: rows.filter((row) => row.verifiedOutcome === 'failed').length }); if (result.action !== 'degrade_to_assisted') return {};
    const grant = (await this.deps.artifacts.listAuthorityGrants()).find((item) => item.actionType === input.actionType && applicabilityKey(item.applicability) === key && item.mode === 'autonomous'); if (!grant) return {}; const degradedGrant = { ...grant, mode: 'assisted' as const, updatedAt: this.deps.now() }; await this.deps.artifacts.putAuthorityGrant(degradedGrant); this.deps.observations?.emit({ type: 'authority.degraded', actionType: grant.actionType, scope: grant.scope }); return { degradedGrant };
  }
  async accept(candidateId: string, approved: boolean): Promise<ScopedAuthorityGrant> { const candidate = (await this.deps.artifacts.listAuthorityCandidates()).find((item) => item.id === candidateId); if (!candidate) throw new Error(`unknown authority candidate ${candidateId}`); const grant = this.deps.authority.acceptCandidate(candidate, approved, this.deps.now()); await this.deps.artifacts.putAuthorityGrant(grant); return grant; }
}
