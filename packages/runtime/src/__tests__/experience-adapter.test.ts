import assert from 'node:assert/strict';
import test from 'node:test';
import { toExperienceEvidence } from '../experience-adapter.js';
import { sampleTrace } from './fixtures.js';

test('provider crash is excluded from model-quality success statistics', () => {
  const base = sampleTrace();
  const evidence = toExperienceEvidence(sampleTrace({
    telemetry: { ...base.telemetry, outcome: 'failed', verification: 'not_run' },
    failure: { kind: 'provider_crashed', attributableToModelQuality: false }
  }));

  assert.equal(evidence.attributableToModelQuality, false);
  assert.equal(evidence.verification, 'not_run');
});

test('verified successful runtime trace becomes attributable compact evidence without task body', () => {
  const evidence = toExperienceEvidence(sampleTrace());

  assert.deepEqual(evidence, {
    id: 'trace-1',
    taskClass: 'approved-plan/typescript/execution',
    verification: 'passed',
    retries: 0,
    userInterruptions: 0,
    attributableToModelQuality: true,
    providerRecoveries: 0,
    durationMs: 10
  });
});
