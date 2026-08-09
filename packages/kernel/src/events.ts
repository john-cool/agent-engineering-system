import { EventEmitter } from 'node:events';
import type { RuntimeObservation } from '@aes/runtime-sdk';
import type {
  ContextDecision,
  ContextHealth,
  ControlDecision,
  EvaluationDecision,
  ExperienceHypothesis,
  DecisionTrace,
  HandoffDocument,
  LifecycleState,
  ModelClass,
  ModelDecision as RoutedModelDecision,
  TaskAnalysis
} from '@aes/spec';

export interface KernelEventMap {
  'lifecycle.transition': { from: LifecycleState; to: LifecycleState };
  'decision.model': { modelClass: ModelClass; fastMode: boolean; reason: string };
  'policy.matched': { policy: string };
  'context.health': { health: ContextHealth; reason: string };
  'verification.result': { passed: boolean; summary: string };
  'handoff.recommended': { reason: string };
  'analysis.completed': TaskAnalysis;
  'context.health.changed': ContextDecision;
  'model.route.changed': RoutedModelDecision;
  'control.decision': ControlDecision;
  'handoff.generated': HandoffDocument;
  'decision.trace.created': DecisionTrace;
  'experience.hypothesis.created': ExperienceHypothesis;
  'eval.completed': EvaluationDecision;
  'runtime.observation': RuntimeObservation;
}

export class KernelEventBus {
  readonly #emitter = new EventEmitter();

  on<K extends keyof KernelEventMap>(event: K, listener: (payload: KernelEventMap[K]) => void): this {
    this.#emitter.on(event, listener);
    return this;
  }

  emit<K extends keyof KernelEventMap>(event: K, payload: KernelEventMap[K]): boolean {
    return this.#emitter.emit(event, payload);
  }
}
