import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextEngine } from '../context-engine.js';

const engine = new ContextEngine();

test('high pressure plus high relevance does not force fresh chat', () => {
  const result = engine.evaluate({
    inputTokens: 900, contextWindow: 1000, completedTasks: 2, nextTaskIndependent: false,
    staleLogs: false, repeatedContent: false, activeDependsOnPriorEvidence: true, handoffPossible: true
  });
  assert.equal(result.pressure, 'high');
  assert.equal(result.relevance, 'high');
  assert.notEqual(result.health, 'start_fresh');
});

test('unknown telemetry stays unknown', () => {
  const result = engine.evaluate({
    completedTasks: 3, nextTaskIndependent: true, staleLogs: true, repeatedContent: false,
    activeDependsOnPriorEvidence: false, handoffPossible: true
  });
  assert.equal(result.pressure, 'unknown');
});

test('independent next task plus stale history recommends fresh handoff', () => {
  const result = engine.evaluate({
    inputTokens: 500, contextWindow: 1000, completedTasks: 3, nextTaskIndependent: true,
    staleLogs: true, repeatedContent: true, activeDependsOnPriorEvidence: false, handoffPossible: true
  });
  assert.equal(result.health, 'start_fresh');
  assert.ok(result.recommendations.includes('create_handoff'));
  assert.ok(result.recommendations.includes('start_fresh'));
});

test('high pressure medium relevance recommends compaction rather than fresh chat', () => {
  const result = engine.evaluate({
    inputTokens: 800, contextWindow: 1000, completedTasks: 1, nextTaskIndependent: false,
    staleLogs: false, repeatedContent: true, activeDependsOnPriorEvidence: false, handoffPossible: true
  });
  assert.equal(result.health, 'growing');
  assert.ok(result.recommendations.includes('compact'));
});

test('learned context advice can prefer earlier compaction without overriding dependencies', () => {
  const result = engine.evaluate({
    completedTasks: 1, nextTaskIndependent: false, staleLogs: false, repeatedContent: false,
    activeDependsOnPriorEvidence: false, handoffPossible: true
  }, { kind: 'context_preference', preferCompactionBeforeHandoff: true });
  assert.equal(result.health, 'growing');
  assert.ok(result.reasons.some((reason) => reason.includes('learned')));
});
