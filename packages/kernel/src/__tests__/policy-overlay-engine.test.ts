import test from 'node:test';
import assert from 'node:assert/strict';
import type { PolicyOverlay } from '@aes/spec';
import { PolicyOverlayEngine } from '../policy-overlay-engine.js';

function overlay(id: string, status: PolicyOverlay['status'], applicability: PolicyOverlay['applicability'], prefer: 'cheap' | 'balanced' | 'powerful', score: number, strength: PolicyOverlay['evidenceStrength'] = 'comparative'): PolicyOverlay {
  return {
    id, sourceCandidateId: `candidate:${id}`, scope: 'project', status, applicability,
    effect: { kind: 'model_preference', prefer }, evidenceRefs: ['e'], evaluationRefs: ['v'],
    evidenceStrength: strength, evaluationScore: score,
    createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-09T00:00:00Z'
  };
}

test('more specific applicability outranks generic advice', () => {
  const result = new PolicyOverlayEngine().resolve('model_preference', {
    taskClass: 'implementation', stage: 'planning', architecturalDecisionRequired: true
  }, [
    overlay('generic', 'active', { taskClass: 'implementation' }, 'balanced', 5),
    overlay('specific', 'active', { taskClass: 'implementation', stage: 'planning', architecturalDecisionRequired: true }, 'powerful', 4)
  ]);
  assert.equal(result.effect?.kind === 'model_preference' && result.effect.prefer, 'powerful');
});

test('unresolved equal conflict removes learned influence', () => {
  const result = new PolicyOverlayEngine().resolve('model_preference', { taskClass: 'implementation' }, [
    overlay('a', 'active', { taskClass: 'implementation' }, 'cheap', 5),
    overlay('b', 'active', { taskClass: 'implementation' }, 'balanced', 5)
  ]);
  assert.equal(result.effect, undefined);
  assert.deepEqual(result.conflictIds.sort(), ['a', 'b']);
});

test('shadow and degraded overlays never influence production resolution', () => {
  const result = new PolicyOverlayEngine().resolve('model_preference', { taskClass: 'implementation' }, [
    overlay('shadow', 'shadow', { taskClass: 'implementation' }, 'cheap', 100, 'controlled'),
    overlay('degraded', 'degraded', { taskClass: 'implementation' }, 'powerful', 100, 'controlled')
  ]);
  assert.equal(result.effect, undefined);
});

test('active resolution explains the evidence behind learned advice', () => {
  const result = new PolicyOverlayEngine().resolve('model_preference', { taskClass: 'implementation' }, [
    overlay('explained', 'active', { taskClass: 'implementation' }, 'balanced', 5)
  ]);
  assert.equal(result.explanation?.overlayId, 'explained');
  assert.deepEqual(result.explanation?.evidenceRefs, ['e']);
  assert.deepEqual(result.explanation?.evaluationRefs, ['v']);
});
