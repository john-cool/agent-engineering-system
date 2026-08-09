import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRuntimeConfig } from '../runtime-config.js';

test('runtime config defaults raw provider event capture off and quality degradation to assisted', () => {
  const config = normalizeRuntimeConfig({ runtime: { provider: 'codex' } });
  assert.equal(config.runtime.provider, 'codex');
  assert.equal(config.telemetry.providerRawEvents, false);
  assert.equal(config.modelResolution.qualityDegradation, 'assisted');
  assert.equal(config.codex.processScope, 'workspace');
});
