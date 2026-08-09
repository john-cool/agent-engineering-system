import test from 'node:test';
import assert from 'node:assert/strict';
import type { AvailableModel } from '@aes/runtime-sdk';
import { ModelResolver } from '../index.js';

const models: AvailableModel[] = [
  {
    id: 'cheap-fast', provider: 'test',
    capabilities: { coding: true, toolUse: true, reasoningLevels: ['low'] },
    traits: { qualityClass: 'cheap', latencyClass: 'fast' },
    availability: 'available'
  },
  {
    id: 'balanced', provider: 'test',
    capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium'] },
    traits: { qualityClass: 'balanced', latencyClass: 'standard' },
    availability: 'available'
  }
];

test('hard filtering never selects a lower quality model for a balanced requirement', () => {
  const resolution = new ModelResolver().resolve({
    requirement: {
      class: 'balanced', reasoning: 'medium', latency: 'balanced', context: 'standard'
    },
    models
  });
  assert.equal(resolution.selected.id, 'balanced');
  assert.ok(resolution.alternatives.some((x) => x.modelId === 'cheap-fast' && x.status === 'rejected'));
});

function balanced(id: string, latencyClass: 'fast' | 'standard' | 'slow'): AvailableModel {
  return {
    id,
    provider: 'test',
    capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium'] },
    traits: { qualityClass: 'balanced', latencyClass },
    availability: 'available'
  };
}

test('prefer_fast chooses fast candidate after hard filtering', () => {
  const resolver = new ModelResolver();
  const resolution = resolver.resolve({
    requirement: {
      class: 'balanced', reasoning: 'medium', latency: 'prefer_fast', context: 'standard'
    },
    models: [
      balanced('a-standard', 'standard'),
      balanced('z-fast', 'fast')
    ]
  });
  assert.equal(resolution.selected.id, 'z-fast');
});

test('lower quality availability produces explicit quality degradation instead of silent selection', () => {
  const resolver = new ModelResolver();
  const resolution = resolver.resolve({
    requirement: {
      class: 'powerful', reasoning: 'high', latency: 'quality_first', context: 'standard'
    },
    models: [balanced('only-balanced', 'standard')],
    allowQualityDegradationCandidate: true
  });
  assert.equal(resolution.fallback.type, 'quality_degradation');
  assert.equal(resolution.selected.traits.qualityClass, 'balanced');
});
