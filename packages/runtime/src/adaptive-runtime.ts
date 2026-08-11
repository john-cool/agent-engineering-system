import type {
  ModelRequirement,
  ModelResolution,
  PricingProvider,
  ResourceBudget,
  ResourceDecision,
  ResourceUsageSnapshot,
  RuntimeControlBridge,
  RuntimeDecisionTrace,
  RuntimeEvent,
  RuntimeFailureEvidence,
  RuntimeObservationSink,
  RuntimeLearningObserver,
  RuntimeSession,
  RuntimeTurnRequest,
  RuntimeVerificationBridge,
  SessionCheckpointStore,
  TraceStore
} from '@aes/runtime-sdk';
import type { RuntimeFailureKind, RuntimeOutcome, RuntimeVerification } from '@aes/spec';
import { ModelResolver } from './model-resolver.js';
import { RecoveryCoordinator } from './recovery-coordinator.js';
import { ResourcePolicyEngine } from './resource-policy.js';
import { RuntimeTraceAccumulator } from './trace-accumulator.js';
import { WorkspaceRuntimeSupervisor } from './workspace-runtime-supervisor.js';

export interface AdaptiveRuntimeResourceRequest {
  scopeKey: string;
  budget?: ResourceBudget;
  usage: ResourceUsageSnapshot;
  projected?: ResourceUsageSnapshot;
  now?: number;
}

export interface AdaptiveRuntimeRequest {
  workspaceId: string;
  taskId: string;
  taskClass: string;
  requirement: ModelRequirement;
  turn: RuntimeTurnRequest;
  resource?: AdaptiveRuntimeResourceRequest;
  onEvent?: (event: RuntimeEvent) => void;
}

export type AdaptiveRuntimeOutcome =
  | RuntimeOutcome
  | 'awaiting_approval'
  | 'resource_denied'
  | 'throttled';

export interface AdaptiveRuntimeResult {
  outcome: AdaptiveRuntimeOutcome;
  resolution?: ModelResolution;
  trace?: RuntimeDecisionTrace;
  failure?: RuntimeFailureEvidence;
  resource?: ResourceDecision;
  recovery?: { circuitState: 'closed' | 'open' | 'half_open' };
}

export interface AdaptiveRuntimeOptions {
  resolver: ModelResolver;
  supervisor: WorkspaceRuntimeSupervisor;
  control: RuntimeControlBridge;
  traceStore: TraceStore;
  checkpointStore: SessionCheckpointStore;
  pricing?: PricingProvider;
  verification?: RuntimeVerificationBridge;
  observations?: RuntimeObservationSink;
  resources?: ResourcePolicyEngine;
  learning?: RuntimeLearningObserver;
}

const RESOURCE_RANK = { allow: 0, warn: 1, throttle: 2, deny: 3 } as const;
const FAILURE_KINDS = new Set<RuntimeFailureKind>([
  'transport_failed', 'provider_crashed', 'provider_unavailable', 'model_unavailable',
  'rate_limited', 'session_lost', 'approval_failed', 'action_ambiguous',
  'execution_failed', 'context_exhausted', 'verification_failed', 'cancelled'
]);

function strictestResource(a: ResourceDecision | undefined, b: ResourceDecision): ResourceDecision {
  if (!a) return b;
  return RESOURCE_RANK[b.outcome] > RESOURCE_RANK[a.outcome] ? b : a;
}

function totalTokens(usage: ResourceUsageSnapshot): number | undefined {
  if (usage.totalTokens !== undefined) return usage.totalTokens;
  if (usage.inputTokens !== undefined && usage.outputTokens !== undefined) {
    return usage.inputTokens + usage.outputTokens;
  }
  return undefined;
}

function addKnown(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined && b === undefined) return undefined;
  return (a ?? 0) + (b ?? 0);
}

function mergeObservedUsage(base: ResourceUsageSnapshot, observed: ResourceUsageSnapshot): ResourceUsageSnapshot {
  const merged: ResourceUsageSnapshot = {};
  const inputTokens = addKnown(base.inputTokens, observed.inputTokens);
  const outputTokens = addKnown(base.outputTokens, observed.outputTokens);
  const baseTotal = totalTokens(base);
  const observedTotal = totalTokens(observed);
  const combinedTotal = addKnown(baseTotal, observedTotal);
  if (inputTokens !== undefined) merged.inputTokens = inputTokens;
  if (outputTokens !== undefined) merged.outputTokens = outputTokens;
  if (combinedTotal !== undefined) merged.totalTokens = combinedTotal;
  if (base.estimatedCost !== undefined) merged.estimatedCost = base.estimatedCost;
  if (base.retries !== undefined) merged.retries = base.retries;
  if (base.durationMs !== undefined) merged.durationMs = base.durationMs;
  return merged;
}

function failureFrom(error: unknown): RuntimeFailureEvidence {
  let kind: RuntimeFailureKind = 'execution_failed';
  if (typeof error === 'object' && error !== null && 'kind' in error) {
    const candidate = (error as { kind?: unknown }).kind;
    if (typeof candidate === 'string' && FAILURE_KINDS.has(candidate as RuntimeFailureKind)) {
      kind = candidate as RuntimeFailureKind;
    }
  }
  return {
    kind,
    attributableToModelQuality: ![
      'transport_failed', 'provider_crashed', 'provider_unavailable', 'rate_limited', 'cancelled'
    ].includes(kind)
  };
}

function syntheticResourceWarning(
  sessionId: string,
  turnId: string,
  decision: ResourceDecision
): RuntimeEvent {
  return {
    type: 'runtime_warning',
    delivery: 'lossless',
    meta: {
      sessionId,
      turnId,
      eventId: `resource-warning:${turnId}`,
      timestamp: new Date().toISOString()
    },
    data: { code: 'resource_warn', message: decision.reasons.join('; ') || 'resource warning threshold reached' }
  };
}

export class AdaptiveRuntime {
  readonly #activeSessions = new Map<string, RuntimeSession>();

  constructor(private readonly options: AdaptiveRuntimeOptions) {}

  async execute(request: AdaptiveRuntimeRequest): Promise<AdaptiveRuntimeResult> {
    const startedAt = Date.now();
    const provider = await this.options.supervisor.getProvider(request.workspaceId);
    await provider.getCapabilities();
    const models = await provider.discoverModels();
    const resolution = this.options.resolver.resolve({
      requirement: request.requirement,
      models,
      allowQualityDegradationCandidate: true
    });

    this.options.observations?.emit({
      type: resolution.fallback.used ? 'decision.model.fallback' : 'decision.model.selected',
      resolution
    });

    if (resolution.fallback.type === 'quality_degradation') {
      const authorization = await this.options.control.authorize({
        id: `model-quality:${request.taskId}:${request.turn.turnId}`,
        type: 'modelQualityDegradation',
        source: 'model-router',
        reason: resolution.fallback.reason ?? 'model quality degradation requested',
        confidence: 'high',
        payload: {
          requestedClass: request.requirement.class,
          selectedClass: resolution.selected.traits.qualityClass,
          selectedModel: resolution.selected.id
        }
      });
      if (authorization.outcome !== 'execute') {
        return { outcome: 'awaiting_approval', resolution };
      }
    }

    const sessionId = `session:${request.taskId}:${request.turn.turnId}`;
    let resourceDecision: ResourceDecision | undefined;
    let resourceOverrideGranted = false;

    if (this.options.resources && request.resource) {
      const preflight = await this.options.resources.evaluate({
        scopeKey: request.resource.scopeKey,
        ...(request.resource.budget !== undefined ? { budget: request.resource.budget } : {}),
        usage: request.resource.usage,
        ...(request.resource.projected !== undefined ? { projected: request.resource.projected } : {}),
        ...(request.resource.now !== undefined ? { now: request.resource.now } : {})
      });
      resourceDecision = strictestResource(resourceDecision, preflight);

      if (preflight.outcome === 'throttle') {
        return { outcome: 'throttled', resolution, resource: preflight };
      }
      if (preflight.outcome === 'deny') {
        const authorization = await this.options.control.authorize({
          id: `resource-override:${request.taskId}:${request.turn.turnId}`,
          type: 'resourceBudgetOverride',
          source: 'policy-engine',
          reason: preflight.reasons.join('; ') || 'resource budget denied execution',
          confidence: 'high',
          payload: { scopeKey: request.resource.scopeKey, decision: preflight }
        });
        if (authorization.outcome === 'request_approval') {
          return { outcome: 'awaiting_approval', resolution, resource: preflight };
        }
        if (authorization.outcome !== 'execute') {
          return { outcome: 'resource_denied', resolution, resource: preflight };
        }
        resourceOverrideGranted = true;
      }
      if (preflight.outcome === 'warn') {
        request.onEvent?.(syntheticResourceWarning(sessionId, request.turn.turnId, preflight));
      }
    }

    let currentProvider = provider;
    let session = await this.options.supervisor.createSession({
      sessionId,
      workspaceId: request.workspaceId,
      model: resolution.selected
    });
    this.#activeSessions.set(sessionId, session);
    this.options.observations?.emit({ type: 'runtime.session.started', sessionId, workspaceId: request.workspaceId });
    await this.options.checkpointStore.save(await session.checkpoint());

    const seed: RuntimeDecisionTrace = {
      traceId: `trace:${request.taskId}:${request.turn.turnId}`,
      taskId: request.taskId,
      taskClass: request.taskClass,
      sessionId,
      turnId: request.turn.turnId,
      timestamp: new Date(startedAt).toISOString(),
      requirement: request.requirement,
      resolution,
      telemetry: {
        provider: provider.id,
        model: resolution.selected.id,
        durationMs: 0,
        retries: 0,
        compactions: 0,
        outcome: 'failed',
        verification: 'not_run'
      },
      providerRecoveries: 0,
      userInterruptions: 0,
      ...(resourceDecision !== undefined ? { resource: resourceDecision } : {})
    };
    const accumulator = new RuntimeTraceAccumulator(seed);
    const recovery = new RecoveryCoordinator({ control: this.options.control });
    let outcome: RuntimeOutcome = 'failed';
    let failure: RuntimeFailureEvidence | undefined;
    let pendingApproval = false;
    let providerRecoveries = 0;

    while (true) {
      try {
        for await (const event of session.runTurn(request.turn)) {
          accumulator.record(event);
          request.onEvent?.(event);

          if (event.type === 'approval_requested') {
            const authorization = await this.options.control.authorize(event.action);
            if (authorization.outcome === 'execute') {
              await session.respondToApproval(event.requestId, { decision: 'approved' });
            } else if (authorization.outcome === 'blocked') {
              await session.respondToApproval(event.requestId, { decision: 'rejected' });
            } else {
              pendingApproval = true;
            }
          }

          if (event.type === 'usage_updated' && this.options.resources && request.resource) {
            const observed: ResourceUsageSnapshot = {};
            if (event.data.inputTokens !== undefined) observed.inputTokens = event.data.inputTokens;
            if (event.data.outputTokens !== undefined) observed.outputTokens = event.data.outputTokens;
            const observedTotal = totalTokens(observed);
            if (observedTotal !== undefined) observed.totalTokens = observedTotal;
            const currentUsage = mergeObservedUsage(request.resource.usage, observed);
            const post = await this.options.resources.evaluate({
              scopeKey: request.resource.scopeKey,
              ...(request.resource.budget !== undefined ? { budget: request.resource.budget } : {}),
              usage: currentUsage,
              ...(request.resource.now !== undefined ? { now: request.resource.now } : {})
            });
            resourceDecision = strictestResource(resourceDecision, post);
            if (post.outcome === 'warn') {
              request.onEvent?.(syntheticResourceWarning(sessionId, request.turn.turnId, post));
            }
            if (!resourceOverrideGranted && (post.outcome === 'deny' || post.outcome === 'throttle')) {
              await session.cancel(`resource policy ${post.outcome}`);
            }
          }

          if (event.type === 'runtime_failed') {
            failure = {
              kind: event.data.kind,
              attributableToModelQuality: ![
                'transport_failed', 'provider_crashed', 'provider_unavailable', 'rate_limited', 'cancelled'
              ].includes(event.data.kind)
            };
            outcome = 'failed';
          }
          if (event.type === 'turn_completed') outcome = event.data.outcome;

          if (event.delivery === 'lossless') {
            await this.options.checkpointStore.save(await session.checkpoint());
          }
          if (pendingApproval) break;
        }
        break;
      } catch (error) {
        const crashFailure = failureFrom(error);
        if (crashFailure.kind !== 'provider_crashed') {
          failure = crashFailure;
          outcome = crashFailure.kind === 'cancelled' ? 'cancelled' : 'failed';
          break;
        }

        this.options.observations?.emit({
          type: 'runtime.provider.failed',
          workspaceId: request.workspaceId,
          kind: 'provider_crashed'
        });
        this.options.supervisor.recordProviderFailure(request.workspaceId);
        const checkpoint = await this.options.checkpointStore.load(sessionId) ?? await session.checkpoint();
        await session.close();
        this.#activeSessions.delete(sessionId);
        this.options.observations?.emit({ type: 'runtime.session.recovering', sessionId });

        let restarted;
        try {
          restarted = await this.options.supervisor.restartProvider(request.workspaceId);
        } catch {
          restarted = undefined;
        }
        if (!restarted) {
          failure = { kind: 'provider_unavailable', attributableToModelQuality: false };
          outcome = 'failed';
          break;
        }
        currentProvider = restarted;

        let resumed: RuntimeSession;
        try {
          resumed = await this.options.supervisor.resumeSession(request.workspaceId, checkpoint);
        } catch {
          failure = { kind: 'session_lost', attributableToModelQuality: false };
          outcome = 'failed';
          break;
        }

        const resumedCheckpoint = await resumed.checkpoint();
        const reconciliation = await recovery.reconcile({
          checkpoint,
          providerState: {
            sessionAvailable: true,
            providerSessionId: resumed.providerSessionId,
            ...(resumedCheckpoint.lastEventId !== undefined ? { lastEventId: resumedCheckpoint.lastEventId } : {}),
            actionState: checkpoint.lastActionId ? 'unknown' : 'none'
          }
        });

        if (reconciliation.kind === 'ambiguous') {
          session = resumed;
          this.#activeSessions.set(sessionId, session);
          failure = { kind: 'action_ambiguous', attributableToModelQuality: false };
          return {
            outcome: 'awaiting_approval',
            resolution,
            failure,
            ...(resourceDecision ? { resource: resourceDecision } : {}),
            recovery: { circuitState: this.options.supervisor.getCircuitState(request.workspaceId) }
          };
        }
        if (reconciliation.kind === 'lost') {
          await resumed.close();
          failure = { kind: 'session_lost', attributableToModelQuality: false };
          outcome = 'failed';
          break;
        }

        providerRecoveries += 1;
        failure = undefined;
        session = resumed;
        this.#activeSessions.set(sessionId, session);
        await this.options.checkpointStore.save(resumedCheckpoint);
        this.options.observations?.emit({ type: 'runtime.session.recovered', sessionId });
      }
    }

    if (pendingApproval) {
      return {
        outcome: 'awaiting_approval',
        resolution,
        ...(resourceDecision ? { resource: resourceDecision } : {})
      };
    }

    if (!failure) {
      await this.options.checkpointStore.save(await session.checkpoint());
      this.options.supervisor.recordProviderSuccess(request.workspaceId);
    }

    const finalOutcome: RuntimeOutcome = !failure && providerRecoveries > 0 && outcome === 'success'
      ? 'recovered'
      : outcome;
    const verification: RuntimeVerification = failure
      ? 'not_run'
      : this.options.verification
        ? await this.options.verification.verify({
            taskId: request.taskId,
            sessionId,
            turnId: request.turn.turnId,
            provider: currentProvider.id,
            model: resolution.selected.id
          })
        : 'not_run';

    let trace = accumulator.finalize({
      outcome: finalOutcome,
      verification,
      durationMs: Date.now() - startedAt,
      providerRecoveries
    });
    const estimate = this.options.pricing?.estimate({
      provider: trace.telemetry.provider,
      model: trace.telemetry.model,
      ...(trace.telemetry.inputTokens !== undefined ? { inputTokens: trace.telemetry.inputTokens } : {}),
      ...(trace.telemetry.outputTokens !== undefined ? { outputTokens: trace.telemetry.outputTokens } : {}),
      ...(trace.telemetry.cachedInputTokens !== undefined ? { cachedInputTokens: trace.telemetry.cachedInputTokens } : {})
    });
    trace = {
      ...trace,
      telemetry: {
        ...trace.telemetry,
        ...(estimate !== undefined ? { estimatedCost: estimate } : {})
      },
      ...(resourceDecision !== undefined ? { resource: resourceDecision } : {}),
      ...(failure !== undefined ? { failure } : {})
    };
    await this.options.traceStore.append(trace);
    this.options.observations?.emit({ type: 'experience.trace.recorded', traceId: trace.traceId });
    try { await this.options.learning?.observe(trace); } catch { /* learning is advisory and failure-isolated */ }

    this.#activeSessions.delete(sessionId);
    await session.close();
    return {
      outcome: finalOutcome,
      resolution,
      trace,
      ...(failure !== undefined ? { failure } : {}),
      ...(resourceDecision !== undefined ? { resource: resourceDecision } : {}),
      ...(providerRecoveries > 0 || failure?.kind === 'provider_unavailable'
        ? { recovery: { circuitState: this.options.supervisor.getCircuitState(request.workspaceId) } }
        : {})
    };
  }

  async cancel(sessionId: string, reason?: string): Promise<void> {
    const session = this.#activeSessions.get(sessionId);
    if (!session) return;
    await session.cancel(reason);
  }
}
