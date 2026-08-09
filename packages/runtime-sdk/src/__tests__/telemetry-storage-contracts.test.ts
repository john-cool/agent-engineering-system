import test from 'node:test';
import assert from 'node:assert/strict';
import type { PricingProvider, RuntimeTelemetry, UsageRecord } from '../index.js';

class NoPricing implements PricingProvider {
  estimate(_usage: UsageRecord) { return undefined; }
}

test('missing pricing and token telemetry remain unknown', () => {
  const telemetry: RuntimeTelemetry = {
    provider: 'test',
    model: 'm1',
    durationMs: 10,
    retries: 0,
    compactions: 0,
    outcome: 'success',
    verification: 'not_run'
  };
  assert.equal(telemetry.inputTokens, undefined);
  assert.equal(new NoPricing().estimate({ provider: 'test', model: 'm1' }), undefined);
});
