import test from 'node:test';
import assert from 'node:assert/strict';
import type { DecisionTrace, PolicyDocument, TaskAnalysis, WorkflowDocument } from '@aes/spec';
import type { RuntimeAdapter, RuntimeCapabilities } from '@aes/runtime-sdk';
import {
  AESKernel,
  AuthorityLearning,
  ContextEngine,
  ControlEngine,
  EvaluationGate,
  ExperienceEngine,
  InterruptionPolicy,
  KnowledgeCompiler,
  ModelRouter
} from '../index.js';

const workflow: WorkflowDocument = {
  kind: 'Workflow', version: 1, name: 'default', initial: 'discovery',
  states: {
    discovery: { next: ['planning'] },
    planning: { next: ['execution', 'discovery'] },
    execution: { next: ['verification', 'planning'] },
    verification: { next: ['completed', 'execution', 'planning'] },
    completed: { next: [] }
  }
};
const policies: PolicyDocument[] = [];
const capabilities: RuntimeCapabilities = {
  modelRouting: true, fastMode: true, toolExecution: true, contextTelemetry: true,
  tokenTelemetry: true, contextCompaction: true, handoffInjection: true,
  conversationTransition: false, persistentMemory: true
};
const adapter: RuntimeAdapter = {
  getCapabilities: () => capabilities,
  async invokeModel() { return { text: 'ok' }; },
  async invokeTool(request) { return { ok: true, output: request.input }; }
};

function mechanicalAnalysis(): TaskAnalysis {
  return {
    stage: 'execution', planStatus: 'approved', ambiguity: 'low', risk: 'low', taskComplexity: 'mechanical',
    confidence: 'high', failedAttempts: 0, architecturalDecisionRequired: false, evidenceSufficient: true,
    reasons: ['approved mechanical implementation']
  };
}

function trace(outcome: 'passed' | 'failed', retries = 0): DecisionTrace {
  return {
    taskClass: 'approved-plan-refactor',
    analysis: mechanicalAnalysis(),
    modelDecisions: [], contextDecisions: [], controlOutcomes: [], retries,
    verificationOutcome: outcome, userOverrides: [], timestamp: '2026-08-08T00:00:00Z'
  };
}

test('scenario 1: simple mechanical task routes cheaply and does not interrupt', () => {
  const model = new ModelRouter().route(mechanicalAnalysis(), 'balanced');
  const control = new ControlEngine().decide({
    request: { id: 'm1', type: 'modelRouting', source: 'model-router', reason: model.reasons.join('; '), confidence: model.confidence, payload: model },
    mode: 'autonomous', capabilityAvailable: true
  });
  const interruption = new InterruptionPolicy().evaluate({
    controlOutcome: control.outcome, confidence: model.confidence, impact: 'low', authorityIncrease: false,
    capabilityFailure: false, durableConflict: false
  });
  assert.equal(model.modelClass, 'cheap');
  assert.equal(control.outcome, 'execute');
  assert.equal(interruption.interrupt, false);
  assert.ok(model.reasons.length > 0);
});

test('scenario 2: architecture planning upgrades then approved execution downgrades', async () => {
  const kernel = new AESKernel({
    workflow, policies, adapter,
    classifier: { classify: async () => ({ ambiguity: 'high', risk: 'medium', taskComplexity: 'complex', confidence: 'high', architecturalDecisionRequired: true, reasons: ['architecture decision required'] }) }
  });
  kernel.transition('planning');
  const analysis = await kernel.analyzeTask({ stage: 'planning', planStatus: 'none', failedAttempts: 0, request: 'redesign auth' });
  const planning = kernel.routeModel(analysis, 'balanced');
  kernel.transition('execution');
  const executionAnalysis = await kernel.analyzeTask({ stage: 'execution', planStatus: 'approved', failedAttempts: 0 });
  const execution = kernel.routeModel(executionAnalysis, 'powerful');
  assert.equal(planning.modelClass, 'powerful');
  assert.equal(execution.modelClass, 'balanced');
  assert.equal(execution.transition, 'downgrade');
});

test('scenario 3: high context pressure plus high relevance never forces fresh chat', () => {
  const decision = new ContextEngine().evaluate({
    inputTokens: 950, contextWindow: 1000, completedTasks: 4, nextTaskIndependent: false,
    staleLogs: false, repeatedContent: true, activeDependsOnPriorEvidence: true, handoffPossible: true
  });
  assert.equal(decision.pressure, 'high');
  assert.equal(decision.relevance, 'high');
  assert.notEqual(decision.health, 'start_fresh');
  assert.ok(decision.reasons.includes('active work depends on prior evidence'));
});

test('scenario 4: independent next task creates handoff and asks before conversation transition', async () => {
  const kernel = new AESKernel({ workflow, policies, adapter });
  const context = kernel.evaluateContext({
    inputTokens: 600, contextWindow: 1000, completedTasks: 3, nextTaskIndependent: true,
    staleLogs: true, repeatedContent: true, activeDependsOnPriorEvidence: false, handoffPossible: true
  });
  const handoff = await kernel.createHandoff({
    goal: 'start independent feature', currentState: 'completed', keyDecisions: ['core stays vendor neutral'],
    relevantFiles: ['README.md'], constraints: ['offline tests'], openProblems: [], verificationState: 'passed', nextAction: 'start discovery'
  });
  const control = kernel.controlAction(
    { id: 'chat-1', type: 'conversationTransition', source: 'handoff-engine', reason: 'independent task after stale context', confidence: 'high', payload: handoff },
    { aes: { default: 'assisted' } }
  );
  assert.equal(context.health, 'start_fresh');
  assert.equal(control.outcome, 'request_approval');
  assert.equal(handoff.nextAction, 'start discovery');
});

test('scenario 5: unsupported autonomous runtime capability falls back to recommendation', () => {
  const result = new ControlEngine().decide({
    request: { id: 'chat-2', type: 'conversationTransition', source: 'handoff-engine', reason: 'fresh chat recommended', confidence: 'high', payload: {} },
    mode: 'autonomous', capabilityAvailable: false
  });
  assert.equal(result.outcome, 'recommend');
  assert.match(result.reason, /capability unavailable/);
});

test('scenario 6: repeated successful approvals propose autonomy but do not grant it', () => {
  const learning = new AuthorityLearning({ promotionSamples: 10, regressionRate: 0.1 });
  const result = learning.evaluate({ current: 'assisted', approvals: 12, rejections: 0, verifiedSuccesses: 12, regressions: 0 });
  assert.equal(result.action, 'propose_autonomous');
  assert.notEqual(result.action, 'keep');
});

test('scenario 7: learned autonomous routing degrades after verified quality regression', () => {
  const learning = new AuthorityLearning({ promotionSamples: 10, regressionRate: 0.1 });
  const result = learning.evaluate({ current: 'autonomous', approvals: 20, rejections: 0, verifiedSuccesses: 17, regressions: 3 });
  assert.equal(result.action, 'degrade_to_assisted');
  assert.match(result.reason, /quality regression/);
});

test('scenario 8: project knowledge cannot silently leak to user scope', () => {
  const compiler = new KnowledgeCompiler();
  assert.throws(() => compiler.validateScope({ sourceScope: 'project', targetScope: 'user', generalized: false }), /scope violation/);
});

test('kernel exposes learning audit methods for verified experience lifecycle', () => {
  const kernel = new AESKernel({ workflow, policies, adapter });
  const events: string[] = [];
  kernel.on('experience.hypothesis.created', () => events.push('experience'));
  kernel.on('eval.completed', () => events.push('eval'));
  const hypothesis = kernel.aggregateExperience([
    { id: 't1', trace: trace('passed') }, { id: 't2', trace: trace('passed') }, { id: 't3', trace: trace('passed') },
    { id: 't4', trace: trace('passed') }, { id: 't5', trace: trace('passed') }, { id: 't6', trace: trace('passed') },
    { id: 't7', trace: trace('passed') }, { id: 't8', trace: trace('passed') }, { id: 't9', trace: trace('passed') },
    { id: 't10', trace: trace('passed') }
  ], 'prefer balanced+fast');
  const evaluated = kernel.evaluateExperience(hypothesis, {
    hypothesisId: hypothesis.id, sampleCount: 10, successRate: 1, retryRate: 0, overrideRate: 0, qualityRegressionRate: 0
  });
  assert.equal(evaluated.outcome, 'promote');
  assert.deepEqual(events, ['experience', 'eval']);
});
