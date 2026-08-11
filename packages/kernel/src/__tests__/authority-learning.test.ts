import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthorityLearning } from '../authority-learning.js';
import type { InteractionEvidence } from '@aes/spec';

test('authority proposals aggregate only exact applicability and require explicit acceptance', () => {
  const engine = new AuthorityLearning({ promotionSamples: 15, regressionRate: 0.2 });
  const evidence: InteractionEvidence[] = Array.from({ length: 15 }, (_, i) => ({ id: `planning-${i}`, actionType: 'modelRouting', applicability: { stage: 'planning', architecturalDecisionRequired: true }, currentMode: 'assisted', proposedMode: 'autonomous', userDecision: 'approved', urgency: 'boundary', verifiedOutcome: 'passed', timestamp: '2026-08-09T00:00:00Z' }));
  const unrelated = Array.from({ length: 20 }, (_, i) => ({ ...evidence[0]!, id: `execution-${i}`, applicability: { stage: 'execution' as const } }));
  const candidate = engine.evaluateInteractions({ actionType: 'modelRouting', scope: 'project', current: 'assisted', applicability: { stage: 'planning', architecturalDecisionRequired: true }, evidence: [...evidence, ...unrelated], now: '2026-08-09T00:00:00Z' });
  assert.equal(candidate?.approvalCount, 15); assert.throws(() => engine.acceptCandidate(candidate!, false, '2026-08-09T00:00:00Z')); const grant = engine.acceptCandidate(candidate!, true, '2026-08-09T00:00:00Z'); assert.equal(grant.mode, 'autonomous');
});

const engine = new AuthorityLearning({ promotionSamples: 10, regressionRate: 0.1 });

test('successful approvals only propose autonomy', () => {
  const result = engine.evaluate({ current: 'assisted', approvals: 12, rejections: 0, verifiedSuccesses: 12, regressions: 0 });
  assert.equal(result.action, 'propose_autonomous');
});

test('autonomous quality regressions may degrade authority without approval', () => {
  const result = engine.evaluate({ current: 'autonomous', approvals: 20, rejections: 0, verifiedSuccesses: 17, regressions: 3 });
  assert.equal(result.action, 'degrade_to_assisted');
});

test('insufficient evidence keeps current authority', () => {
  const result = engine.evaluate({ current: 'assisted', approvals: 3, rejections: 0, verifiedSuccesses: 3, regressions: 0 });
  assert.equal(result.action, 'keep');
});
