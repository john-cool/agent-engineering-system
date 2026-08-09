import test from 'node:test';
import assert from 'node:assert/strict';
import { TaskAnalyzer } from '../task-analyzer.js';

test('approved execution plan resolves without semantic classifier', async () => {
  let calls = 0;
  const analyzer = new TaskAnalyzer({
    classify: async () => {
      calls++;
      throw new Error('should not call');
    }
  });
  const result = await analyzer.analyze({ stage: 'execution', planStatus: 'approved', failedAttempts: 0 });
  assert.equal(result.taskComplexity, 'standard');
  assert.equal(result.evidenceSufficient, true);
  assert.equal(calls, 0);
});

test('unknown discovery request uses semantic classifier when rules are insufficient', async () => {
  const analyzer = new TaskAnalyzer({
    classify: async () => ({
      ambiguity: 'high',
      risk: 'medium',
      taskComplexity: 'complex',
      confidence: 'high',
      architecturalDecisionRequired: true,
      reasons: ['cross-system design requested']
    })
  });
  const result = await analyzer.analyze({ stage: 'discovery', planStatus: 'none', failedAttempts: 0, request: 'redesign auth' });
  assert.equal(result.architecturalDecisionRequired, true);
  assert.equal(result.confidence, 'high');
});

test('invalidated plan deterministically requires planning', async () => {
  const analyzer = new TaskAnalyzer();
  const result = await analyzer.analyze({ stage: 'execution', planStatus: 'invalidated', failedAttempts: 2 });
  assert.equal(result.architecturalDecisionRequired, true);
  assert.equal(result.evidenceSufficient, true);
});

test('malformed semantic classifier output fails with structured analysis error', async () => {
  const analyzer = new TaskAnalyzer({
    classify: async () => ({ ambiguity: 'impossible' } as never)
  });
  await assert.rejects(
    () => analyzer.analyze({ stage: 'discovery', planStatus: 'none', failedAttempts: 0, request: 'unknown task' }),
    (error: unknown) => error instanceof Error && 'code' in error && error.code === 'AES_TASK_ANALYSIS_INVALID'
  );
});
