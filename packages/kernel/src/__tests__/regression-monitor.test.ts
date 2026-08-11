import test from 'node:test';
import assert from 'node:assert/strict';
import { RegressionMonitor } from '../regression-monitor.js';

const monitor = new RegressionMonitor({ regressionWindow: 20, qualityNonInferiorityMargin: 0.01 });

test('quality regression degrades an active overlay', () => {
  const result = monitor.evaluate({
    baseline: { verifiedRate: .96, retryRate: .18, interruptionRate: .24 },
    observed: Array.from({ length: 20 }, (_, i) => ({ attributable: true, verification: i < 16 ? 'passed' : 'failed', retries: 0, userInterruptions: 0 })),
    overlayId: 'ov-1'
  });
  assert.equal(result.action, 'degrade');
});

test('non-attributable provider failures do not degrade model advice', () => {
  const observed = [
    ...Array.from({ length: 20 }, () => ({ attributable: true, verification: 'passed' as const, retries: 0, userInterruptions: 0 })),
    ...Array.from({ length: 5 }, () => ({ attributable: false, verification: 'failed' as const, retries: 0, userInterruptions: 0 }))
  ];
  assert.equal(monitor.evaluate({ baseline: { verifiedRate: .96, retryRate: .18, interruptionRate: .24 }, observed, overlayId: 'ov-1' }).action, 'keep');
});
