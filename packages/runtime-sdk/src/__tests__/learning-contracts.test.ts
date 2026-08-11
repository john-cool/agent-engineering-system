import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  ControlledEvaluationExecutor,
  LearningArtifactStore,
  PatternAnalyzer,
  RuntimeObservation,
  TypedKnowledgeStore
} from '../index.js';

test('learning SDK contracts remain provider-neutral and metadata-only', () => {
  const analyzer: PatternAnalyzer = {
    async analyze() { return []; }
  };
  const evaluator: ControlledEvaluationExecutor = {
    async evaluate() {
      throw new Error('test fixture');
    }
  };
  const artifactStore: LearningArtifactStore = {} as LearningArtifactStore;
  const knowledgeStore: TypedKnowledgeStore = {} as TypedKnowledgeStore;
  const event = {
    type: 'learning.candidate.created', candidateId: 'c1', kind: 'model_preference', scope: 'project'
  } satisfies RuntimeObservation;

  assert.equal(typeof analyzer.analyze, 'function');
  assert.equal(typeof evaluator.evaluate, 'function');
  assert.ok(artifactStore);
  assert.ok(knowledgeStore);
  assert.equal(JSON.stringify(event).includes('prompt'), false);
  assert.equal(JSON.stringify(event).includes('payload'), false);
});
