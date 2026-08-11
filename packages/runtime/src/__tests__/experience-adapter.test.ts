import assert from 'node:assert/strict';
import test from 'node:test';
import { toExperienceEvidence, toLearningEvidence } from '../experience-adapter.js';
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

test('runtime trace becomes normalized learning evidence without inventing missing telemetry', () => {
  const trace = sampleTrace();
  const evidence = toLearningEvidence(trace, {
    taskClass: 'Implementation', stage: 'execution', planStatus: 'approved', language: 'TypeScript'
  });
  assert.equal(evidence.signature.language, 'typescript');
  assert.equal(evidence.modelClass, trace.resolution.selected.traits.qualityClass);
  assert.equal(evidence.totalTokens,
    trace.telemetry.inputTokens !== undefined && trace.telemetry.outputTokens !== undefined
      ? trace.telemetry.inputTokens + trace.telemetry.outputTokens
      : undefined);
  assert.equal(evidence.qualityRegression, undefined);
});
