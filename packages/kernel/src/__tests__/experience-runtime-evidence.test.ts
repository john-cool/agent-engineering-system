import assert from 'node:assert/strict';
import test from 'node:test';
import type { RuntimeExperienceEvidence } from '@aes/runtime-sdk';
import { ExperienceEngine } from '../experience-engine.js';

const cancelled: RuntimeExperienceEvidence = {
  id: 'ev-cancelled', taskClass: 'approved-plan/typescript/execution',
  verification: 'not_run', retries: 0, userInterruptions: 1,
  attributableToModelQuality: false, providerRecoveries: 0
};
const passed: RuntimeExperienceEvidence = {
  id: 'ev-passed', taskClass: 'approved-plan/typescript/execution',
  verification: 'passed', retries: 0, userInterruptions: 0,
  attributableToModelQuality: true, providerRecoveries: 0
};

test('cancelled runtime evidence does not count as a failed model result', () => {
  const hypothesis = new ExperienceEngine().aggregateRuntimeEvidence([cancelled, passed], 'prefer-balanced');
  assert.equal(hypothesis.sampleCount, 1);
  assert.equal(hypothesis.successCount, 1);
  assert.deepEqual(hypothesis.evidenceRefs, ['ev-passed']);
});
