import type { Applicability, AuthorityCandidate, ControlActionType, ControlMode, InteractionEvidence, ScopedAuthorityGrant } from '@aes/spec';
import { applicabilityKey } from './task-signature.js';

export interface AuthorityLearningResult {
  action: 'keep' | 'propose_autonomous' | 'degrade_to_assisted';
  reason: string;
}

export class AuthorityLearning {
  constructor(private readonly policy: { promotionSamples: number; regressionRate: number; maxPromotionRejections?: number }) {}

  evaluateInteractions(input: { actionType: ControlActionType; scope: 'project' | 'user'; current: ControlMode; applicability: Applicability; evidence: readonly InteractionEvidence[]; now: string }): AuthorityCandidate | undefined {
    if (input.current === 'autonomous') return undefined;
    const key = applicabilityKey(input.applicability); const rows = input.evidence.filter((e) => e.actionType === input.actionType && applicabilityKey(e.applicability) === key);
    const approvals = rows.filter((e) => e.userDecision === 'approved').length; const rejections = rows.filter((e) => e.userDecision === 'rejected').length; const successes = rows.filter((e) => e.userDecision === 'approved' && e.verifiedOutcome === 'passed').length;
    if (approvals < this.policy.promotionSamples || rejections > (this.policy.maxPromotionRejections ?? 0) || successes !== approvals) return undefined;
    return { id: `authority:${input.scope}:${input.actionType}:${key}:${input.now}`, actionType: input.actionType, scope: input.scope, applicability: input.applicability, currentMode: input.current, proposedMode: 'autonomous', approvalCount: approvals, rejectionCount: rejections, verifiedSuccessCount: successes, evidenceRefs: rows.map((e) => e.id).sort(), createdAt: input.now };
  }

  acceptCandidate(candidate: AuthorityCandidate, approved: boolean, now: string): ScopedAuthorityGrant { if (!approved) throw new Error('AES authority increase requires explicit user approval'); return { id: `grant:${candidate.id}`, actionType: candidate.actionType, scope: candidate.scope, applicability: candidate.applicability, mode: 'autonomous', grantedAt: now, updatedAt: now, sourceCandidateId: candidate.id }; }

  evaluate(input: {
    current: ControlMode;
    approvals: number;
    rejections: number;
    verifiedSuccesses: number;
    regressions: number;
  }): AuthorityLearningResult {
    const total = Math.max(input.approvals, input.verifiedSuccesses + input.regressions);
    const observedRegressionRate = total === 0 ? 0 : input.regressions / total;

    if (input.current === 'autonomous' && observedRegressionRate > this.policy.regressionRate) {
      return {
        action: 'degrade_to_assisted',
        reason: 'verified quality regression exceeded threshold'
      };
    }

    if (
      input.current !== 'autonomous' &&
      input.approvals >= this.policy.promotionSamples &&
      input.rejections <= (this.policy.maxPromotionRejections ?? 0) &&
      input.verifiedSuccesses === input.approvals
    ) {
      return {
        action: 'propose_autonomous',
        reason: 'repeated approved actions verified successfully'
      };
    }

    return {
      action: 'keep',
      reason: 'insufficient evidence for authority change'
    };
  }
}
