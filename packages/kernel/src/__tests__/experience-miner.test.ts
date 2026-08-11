import test from 'node:test';
import assert from 'node:assert/strict';
import type { LearningEvidence } from '@aes/spec';
import { ExperienceMiner } from '../experience-miner.js';

function evidence(
  id: string,
  modelClass: 'cheap' | 'balanced',
  verification: 'passed' | 'failed',
  overrides: Partial<LearningEvidence> = {}
): LearningEvidence {
  return {
    id, traceId: id,
    signature: { taskClass: 'implementation', stage: 'execution', planStatus: 'approved', language: 'typescript' },
    verification, attributable: true, modelClass, latencyMode: 'fast', retries: 0,
    userInterruptions: 0, providerRecoveries: 0, timestamp: '2026-08-09T00:00:00Z',
    ...overrides
  };
}

test('miner excludes non-attributable model failures and preserves missing cost coverage', () => {
  const miner = new ExperienceMiner();
  const result = miner.aggregate([
    evidence('b1', 'balanced', 'passed', { estimatedCost: { amount: 0.1, currency: 'USD' } }),
    evidence('b2', 'balanced', 'failed', { attributable: false }),
    evidence('b3', 'balanced', 'passed')
  ]);
  assert.equal(result.sampleCount, 2);
  assert.equal(result.verifiedSuccessRate, 1);
  assert.equal(result.coverage.estimatedCost, 0.5);
});

test('comparative evidence can create a model preference candidate', () => {
  const rows = [
    ...Array.from({ length: 10 }, (_, i) => evidence(`b${i}`, 'balanced', i === 9 ? 'failed' : 'passed')),
    ...Array.from({ length: 10 }, (_, i) => evidence(`c${i}`, 'cheap', i < 6 ? 'passed' : 'failed'))
  ];
  const candidates = new ExperienceMiner().mineModelPreference(rows, 'project', '2026-08-09T00:00:00Z');
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.effect?.kind, 'model_preference');
  assert.equal(candidates[0]?.effect?.kind === 'model_preference' && candidates[0].effect.prefer, 'balanced');
  assert.equal(candidates[0]?.evidenceStrength, 'comparative');
});

test('miner never merges different applicability scopes into one candidate', () => {
  const rows = [
    ...Array.from({ length: 10 }, (_, i) => evidence(`exec-b${i}`, 'balanced', 'passed')),
    ...Array.from({ length: 10 }, (_, i) => evidence(`exec-c${i}`, 'cheap', i < 7 ? 'passed' : 'failed')),
    ...Array.from({ length: 10 }, (_, i) => evidence(`plan-b${i}`, 'balanced', i < 6 ? 'passed' : 'failed', { signature: { taskClass: 'implementation', stage: 'planning', language: 'typescript' } })),
    ...Array.from({ length: 10 }, (_, i) => evidence(`plan-c${i}`, 'cheap', 'passed', { signature: { taskClass: 'implementation', stage: 'planning', language: 'typescript' } }))
  ];
  const candidates = new ExperienceMiner().mineModelPreference(rows, 'project', '2026-08-09T00:00:00Z');
  assert.equal(candidates.length, 2);
  const execution = candidates.find((c) => c.applicability.stage === 'execution')!;
  const planning = candidates.find((c) => c.applicability.stage === 'planning')!;
  assert.equal(execution.effect?.kind, 'model_preference');
  assert.equal(planning.effect?.kind, 'model_preference');
  assert.notEqual(execution.effect?.kind === 'model_preference' && execution.effect.prefer,
    planning.effect?.kind === 'model_preference' && planning.effect.prefer);
});
