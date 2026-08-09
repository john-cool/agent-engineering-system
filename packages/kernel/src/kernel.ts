import type {
  ActionRequest,
  ContextDecision,
  ContextFacts,
  ControlDecision,
  DecisionTrace,
  EvaluationDecision,
  EvaluationEvidence,
  ExperienceHypothesis,
  HandoffDocument,
  HandoffInput,
  LifecycleState,
  ModelClass,
  ModelDecision as RoutedModelDecision,
  PolicyDocument,
  TaskAnalysis,
  WorkflowDocument
} from '@aes/spec';
import type { RuntimeAdapter, RuntimeCapabilities } from '@aes/runtime-sdk';
import { DecisionEngine, type ModelDecision as LegacyModelDecision } from './decision-engine.js';
import { KernelEventBus, type KernelEventMap } from './events.js';
import type { Facts } from './policy-engine.js';
import { WorkflowStateMachine } from './state-machine.js';
import { TaskAnalyzer, type SemanticTaskClassifier, type TaskAnalyzerInput } from './task-analyzer.js';
import { ModelRouter } from './model-router.js';
import { ContextEngine } from './context-engine.js';
import { HandoffEngine } from './handoff-engine.js';
import { ControlEngine, type ControlScopes } from './control-engine.js';
import { ExperienceEngine } from './experience-engine.js';
import { EvaluationGate, type EvaluationPolicy } from './evaluation-gate.js';
import { DecisionTraceBuilder } from './decision-trace.js';

export interface AESKernelOptions {
  workflow: WorkflowDocument;
  policies: readonly PolicyDocument[];
  adapter: RuntimeAdapter;
  classifier?: SemanticTaskClassifier;
  evaluationPolicy?: EvaluationPolicy;
}

export class AESKernel {
  readonly #machine: WorkflowStateMachine;
  readonly #decisions: DecisionEngine;
  readonly #taskAnalyzer: TaskAnalyzer;
  readonly #modelRouter = new ModelRouter();
  readonly #contextEngine = new ContextEngine();
  readonly #handoffEngine = new HandoffEngine();
  readonly #controlEngine = new ControlEngine();
  readonly #experienceEngine = new ExperienceEngine();
  readonly #evaluationGate: EvaluationGate;
  readonly #traceBuilder = new DecisionTraceBuilder();
  readonly #events = new KernelEventBus();
  readonly adapter: RuntimeAdapter;

  constructor(options: AESKernelOptions) {
    this.#machine = new WorkflowStateMachine(options.workflow);
    this.#decisions = new DecisionEngine(options.policies);
    this.#taskAnalyzer = new TaskAnalyzer(options.classifier);
    this.#evaluationGate = new EvaluationGate(options.evaluationPolicy ?? {
      minSamples: 10, minSuccessRate: 0.9, maxRetryRate: 0.2, maxOverrideRate: 0.1, maxQualityRegressionRate: 0.05
    });
    this.adapter = options.adapter;
  }

  currentState(): LifecycleState {
    return this.#machine.current();
  }

  on<K extends keyof KernelEventMap>(event: K, listener: (payload: KernelEventMap[K]) => void): this {
    this.#events.on(event, listener);
    return this;
  }

  transition(to: LifecycleState): LifecycleState {
    const from = this.#machine.current();
    const result = this.#machine.transition(to);
    this.#events.emit('lifecycle.transition', { from, to: result });
    return result;
  }

  decideModel(facts: Facts): LegacyModelDecision {
    const decision = this.#decisions.chooseModel({ stage: this.#machine.current(), ...facts });
    this.#events.emit('decision.model', decision);
    return decision;
  }

  async analyzeTask(input: TaskAnalyzerInput): Promise<TaskAnalysis> {
    const analysis = await this.#taskAnalyzer.analyze(input);
    this.#events.emit('analysis.completed', analysis);
    return analysis;
  }

  routeModel(analysis: TaskAnalysis, current: ModelClass = 'balanced'): RoutedModelDecision {
    const decision = this.#modelRouter.route(analysis, current);
    this.#events.emit('model.route.changed', decision);
    return decision;
  }

  evaluateContext(facts: ContextFacts): ContextDecision {
    const decision = this.#contextEngine.evaluate(facts);
    this.#events.emit('context.health.changed', decision);
    return decision;
  }

  async createHandoff(input: HandoffInput): Promise<HandoffDocument> {
    const handoff = await this.#handoffEngine.create(input);
    this.#events.emit('handoff.generated', handoff);
    return handoff;
  }

  controlAction(request: ActionRequest, scopes: ControlScopes): ControlDecision {
    const mode = this.#controlEngine.resolveMode(request.type, scopes);
    const capabilityAvailable = this.capabilityAvailable(request.type);
    const decision = this.#controlEngine.decide({ request, mode, capabilityAvailable });
    this.#events.emit('control.decision', decision);
    return decision;
  }

  buildDecisionTrace(input: DecisionTrace): DecisionTrace {
    const trace = this.#traceBuilder.build(input);
    this.#events.emit('decision.trace.created', trace);
    return trace;
  }

  aggregateExperience(
    entries: readonly { id: string; trace: DecisionTrace }[],
    recommendation: string
  ): ExperienceHypothesis {
    const hypothesis = this.#experienceEngine.aggregate(entries, recommendation);
    this.#events.emit('experience.hypothesis.created', hypothesis);
    return hypothesis;
  }

  evaluateExperience(
    hypothesis: ExperienceHypothesis,
    evidence: EvaluationEvidence
  ): EvaluationDecision {
    const decision = this.#evaluationGate.evaluate(hypothesis, evidence);
    this.#events.emit('eval.completed', decision);
    return decision;
  }

  private capabilityAvailable(action: ActionRequest['type']): boolean {
    if (action === 'handoffCreation' || action === 'modelQualityDegradation' || action === 'resourceBudgetOverride') return true;
    const capabilities = this.adapter.getCapabilities?.();
    if (!capabilities) return false;
    const mapping: Record<
      Exclude<ActionRequest['type'], 'handoffCreation' | 'modelQualityDegradation' | 'resourceBudgetOverride'>,
      keyof RuntimeCapabilities
    > = {
      modelRouting: 'modelRouting',
      fastMode: 'fastMode',
      toolExecution: 'toolExecution',
      contextCompaction: 'contextCompaction',
      memoryPromotion: 'persistentMemory',
      conversationTransition: 'conversationTransition'
    };
    return capabilities[mapping[action]];
  }
}
