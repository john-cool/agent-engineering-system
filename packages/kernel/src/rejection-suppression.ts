export class RejectionSuppression {
  readonly #lastRejected = new Map<string, number>();
  constructor(private readonly policy: { runs: number }) {}
  record(input: { actionType: string; applicabilityKey: string; decision: 'approved' | 'rejected' | 'modified'; run: number }): void { const key = `${input.actionType}:${input.applicabilityKey}`; if (input.decision === 'rejected') this.#lastRejected.set(key, input.run); else this.#lastRejected.delete(key); }
  shouldSuppress(input: { actionType: string; applicabilityKey: string; run: number }): boolean { const rejectedAt = this.#lastRejected.get(`${input.actionType}:${input.applicabilityKey}`); return rejectedAt !== undefined && input.run - rejectedAt < this.policy.runs; }
}
