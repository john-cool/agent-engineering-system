import type { RuntimeEvent } from '@aes/runtime-sdk';

function coalescingKey(event: RuntimeEvent): string | undefined {
  if (event.delivery !== 'coalescible') return undefined;
  return `${event.type}:${event.meta.sessionId}:${event.meta.turnId ?? ''}`;
}

function merge(previous: RuntimeEvent, next: RuntimeEvent): RuntimeEvent {
  if (previous.type === 'output_delta' && next.type === 'output_delta') {
    return { ...next, data: { text: previous.data.text + next.data.text } };
  }
  return next;
}

export class RuntimeEventBuffer {
  readonly #queue: RuntimeEvent[] = [];

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('RuntimeEventBuffer capacity must be a positive integer.');
    }
  }

  get size(): number {
    return this.#queue.length;
  }

  push(event: RuntimeEvent): void {
    const key = coalescingKey(event);
    if (key) {
      const existingIndex = this.#queue.findIndex((candidate) => coalescingKey(candidate) === key);
      if (existingIndex >= 0) {
        this.#queue[existingIndex] = merge(this.#queue[existingIndex]!, event);
        return;
      }
    }

    if (this.#queue.length < this.capacity) {
      this.#queue.push(event);
      return;
    }

    const coalescibleIndex = this.#queue.findIndex((candidate) => candidate.delivery === 'coalescible');
    if (event.delivery === 'lossless') {
      if (coalescibleIndex >= 0) this.#queue.splice(coalescibleIndex, 1);
      this.#queue.push(event);
      return;
    }

    if (coalescibleIndex >= 0) {
      this.#queue.splice(coalescibleIndex, 1);
      this.#queue.push(event);
    }
  }

  shift(): RuntimeEvent | undefined {
    return this.#queue.shift();
  }
}
