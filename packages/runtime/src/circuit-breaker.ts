export type CircuitBreakerState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
}

export class CircuitBreaker {
  state: CircuitBreakerState = 'closed';
  #failures = 0;
  #openedAt = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  recordFailure(now: number): void {
    if (this.state === 'half_open') {
      this.state = 'open';
      this.#openedAt = now;
      this.#failures = this.options.failureThreshold;
      return;
    }
    this.#failures += 1;
    if (this.#failures >= this.options.failureThreshold) {
      this.state = 'open';
      this.#openedAt = now;
    }
  }

  canAttempt(now: number): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'half_open') return false;
    if (now - this.#openedAt < this.options.cooldownMs) return false;
    this.state = 'half_open';
    return true;
  }

  recordSuccess(): void {
    this.state = 'closed';
    this.#failures = 0;
    this.#openedAt = 0;
  }

  reset(): void {
    this.recordSuccess();
  }
}
