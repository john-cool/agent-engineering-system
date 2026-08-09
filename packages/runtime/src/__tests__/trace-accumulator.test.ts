import test from 'node:test';
import assert from 'node:assert/strict';
import { RuntimeTraceAccumulator } from '../index.js';
import { outputDelta, sampleTrace, usageUpdated } from './fixtures.js';

test('trace accumulator stores usage totals but no output text', () => {
  const acc = new RuntimeTraceAccumulator(sampleTrace());
  acc.record(outputDelta('secret project output'));
  acc.record(usageUpdated({ inputTokens: 100, outputTokens: 20 }));
  const trace = acc.finalize({ outcome: 'success', verification: 'passed' });
  assert.equal(trace.telemetry.inputTokens, 100);
  assert.equal(trace.telemetry.outputTokens, 20);
  assert.equal(JSON.stringify(trace).includes('secret project output'), false);
});
