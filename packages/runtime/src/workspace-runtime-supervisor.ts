import type {
  CreateRuntimeSessionInput,
  RuntimeProvider,
  RuntimeSession,
  SessionCheckpoint
} from '@aes/runtime-sdk';
import type { CircuitBreakerState } from './circuit-breaker.js';
import { CircuitBreaker } from './circuit-breaker.js';
import { RetryBudget } from './retry-budget.js';

export interface WorkspaceRuntimeRecoveryOptions {
  providerRestartRetries: number;
  circuitBreakerThreshold: number;
}

export interface WorkspaceRuntimeSupervisorOptions {
  providerFactory: (workspaceId: string) => Promise<RuntimeProvider>;
  recovery?: WorkspaceRuntimeRecoveryOptions;
}

export class WorkspaceRuntimeSupervisor {
  readonly #providers = new Map<string, Promise<RuntimeProvider>>();
  readonly #breakers = new Map<string, CircuitBreaker>();
  readonly #retryBudgets = new Map<string, RetryBudget>();
  readonly #providerFactory: WorkspaceRuntimeSupervisorOptions['providerFactory'];
  readonly recovery: WorkspaceRuntimeRecoveryOptions;

  constructor(options: WorkspaceRuntimeSupervisorOptions) {
    this.#providerFactory = options.providerFactory;
    this.recovery = options.recovery ?? {
      providerRestartRetries: 2,
      circuitBreakerThreshold: 2
    };
  }

  #breaker(workspaceId: string): CircuitBreaker {
    let breaker = this.#breakers.get(workspaceId);
    if (!breaker) {
      breaker = new CircuitBreaker({
        failureThreshold: this.recovery.circuitBreakerThreshold,
        cooldownMs: 30_000
      });
      this.#breakers.set(workspaceId, breaker);
    }
    return breaker;
  }

  #retryBudget(workspaceId: string): RetryBudget {
    let budget = this.#retryBudgets.get(workspaceId);
    if (!budget) {
      budget = new RetryBudget({ provider_crashed: this.recovery.providerRestartRetries });
      this.#retryBudgets.set(workspaceId, budget);
    }
    return budget;
  }

  getProvider(workspaceId: string): Promise<RuntimeProvider> {
    const existing = this.#providers.get(workspaceId);
    if (existing) return existing;

    const created = this.#providerFactory(workspaceId).catch((error: unknown) => {
      this.#providers.delete(workspaceId);
      throw error;
    });
    this.#providers.set(workspaceId, created);
    return created;
  }

  async createSession(input: CreateRuntimeSessionInput): Promise<RuntimeSession> {
    const provider = await this.getProvider(input.workspaceId);
    return provider.createSession(input);
  }

  async resumeSession(workspaceId: string, checkpoint: SessionCheckpoint): Promise<RuntimeSession> {
    const provider = await this.getProvider(workspaceId);
    return provider.resumeSession(checkpoint);
  }

  recordProviderFailure(workspaceId: string, now = Date.now()): CircuitBreakerState {
    const breaker = this.#breaker(workspaceId);
    breaker.recordFailure(now);
    return breaker.state;
  }

  recordProviderSuccess(workspaceId: string): void {
    this.#breaker(workspaceId).recordSuccess();
    this.#retryBudget(workspaceId).reset('provider_crashed');
  }

  getCircuitState(workspaceId: string): CircuitBreakerState {
    return this.#breaker(workspaceId).state;
  }

  async restartProvider(workspaceId: string, now = Date.now()): Promise<RuntimeProvider | undefined> {
    const breaker = this.#breaker(workspaceId);
    if (!breaker.canAttempt(now)) return undefined;
    const retry = this.#retryBudget(workspaceId).consume('provider_crashed');
    if (!retry.allowed) return undefined;

    await this.shutdownWorkspace(workspaceId);
    try {
      return await this.getProvider(workspaceId);
    } catch (error) {
      breaker.recordFailure(now);
      throw error;
    }
  }

  async shutdownWorkspace(workspaceId: string): Promise<void> {
    const provider = this.#providers.get(workspaceId);
    if (!provider) return;
    this.#providers.delete(workspaceId);
    await (await provider).shutdown();
  }

  async shutdownAll(): Promise<void> {
    const providers = [...this.#providers.values()];
    this.#providers.clear();
    this.#breakers.clear();
    this.#retryBudgets.clear();
    await Promise.all(providers.map(async (provider) => (await provider).shutdown()));
  }
}
