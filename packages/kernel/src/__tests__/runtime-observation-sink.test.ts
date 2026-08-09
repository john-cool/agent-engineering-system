import assert from 'node:assert/strict';
import test from 'node:test';
import type { RuntimeObservation } from '@aes/runtime-sdk';
import { KernelEventBus } from '../events.js';
import { KernelRuntimeObservationSink } from '../runtime-observation-sink.js';

test('runtime observation sink forwards normalized observations through kernel event bus', () => {
  const events = new KernelEventBus();
  const sink = new KernelRuntimeObservationSink(events);
  const received: RuntimeObservation[] = [];
  events.on('runtime.observation', (event) => received.push(event));
  const observation: RuntimeObservation = {
    type: 'decision.model.selected',
    resolution: {
      requested: { class: 'balanced', reasoning: 'medium', latency: 'prefer_fast', context: 'standard' },
      selected: {
        id: 'm1', provider: 'test', capabilities: { coding: true, toolUse: true },
        traits: { qualityClass: 'balanced' }, availability: 'available'
      },
      reasons: ['test'], alternatives: [], fallback: { used: false, type: 'none' }
    }
  };

  sink.emit(observation);
  assert.deepEqual(received, [observation]);
});
