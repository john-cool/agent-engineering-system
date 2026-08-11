import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthorityLearning } from '@aes/kernel';
import type { InteractionEvidence, AuthorityCandidate, InteractionEvidence as Evidence, ScopedAuthorityGrant } from '@aes/spec';
import type { LearningArtifactStore } from '@aes/runtime-sdk';
import { InteractionLearningCoordinator } from '../interaction-learning-coordinator.js';

test('coordinator persists exact-scope authority candidate and grants only after approval', async () => {
  const interactions: Evidence[] = []; const candidates: AuthorityCandidate[] = []; const grants: ScopedAuthorityGrant[] = [];
  const artifacts = { appendInteraction: async (value: InteractionEvidence) => { interactions.push(value); }, listInteractions: async () => interactions, putAuthorityCandidate: async (value: AuthorityCandidate) => { candidates.push(value); }, listAuthorityCandidates: async () => candidates, putAuthorityGrant: async (value: ScopedAuthorityGrant) => { grants.push(value); }, listAuthorityGrants: async () => grants } as unknown as LearningArtifactStore;
  const coordinator = new InteractionLearningCoordinator({ authority: new AuthorityLearning({ promotionSamples: 1, regressionRate: 0.5 }), artifacts, now: () => '2026-08-09T00:00:00Z' });
  const evidence: InteractionEvidence = { id: 'i1', actionType: 'modelRouting', applicability: { stage: 'planning' }, currentMode: 'assisted', proposedMode: 'autonomous', userDecision: 'approved', urgency: 'boundary', verifiedOutcome: 'passed', timestamp: '2026-08-09T00:00:00Z' };
  const result = await coordinator.record(evidence); assert.equal(result.candidate?.approvalCount, 1); await assert.rejects(() => coordinator.accept('missing', true), /unknown authority candidate/); const grant = await coordinator.accept(result.candidate!.id, true); assert.equal(grant.mode, 'autonomous'); assert.equal(grants.length, 1);
});
