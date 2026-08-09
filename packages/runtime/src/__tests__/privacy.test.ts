import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeGeneralizedExperience } from '../index.js';

test('global generalization removes project identifiers', () => {
  const result = sanitizeGeneralizedExperience({
    taskClass: 'approved-plan/typescript/execution',
    projectPath: '/secret/customer-repo',
    repositoryName: 'customer-repo',
    recommendation: 'balanced'
  });
  assert.deepEqual(result, {
    taskClass: 'approved-plan/typescript/execution',
    recommendation: 'balanced'
  });
});
