import type { RuntimeObservation, RuntimeObservationSink } from '@aes/runtime-sdk';
import type { KernelEventBus } from './events.js';

export class KernelRuntimeObservationSink implements RuntimeObservationSink {
  constructor(private readonly events: KernelEventBus) {}

  emit(event: RuntimeObservation): void {
    this.events.emit('runtime.observation', event);
  }
}
