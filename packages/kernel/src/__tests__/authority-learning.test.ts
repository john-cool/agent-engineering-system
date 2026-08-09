import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthorityLearning } from '../authority-learning.js';

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
