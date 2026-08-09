# AES Milestone 2B — Context and Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add context pressure/relevance assessment, hard-signal overrides, compact handoff generation, and sufficiency validation without depending on live model APIs.

**Architecture:** Context health is a deterministic two-axis decision (`pressure × relevance`) with explicit unknown telemetry and hard signals. Handoff generation consumes structured session facts and produces minimal working state; optional semantic generation is injected behind a runtime-neutral interface.

**Tech Stack:** TypeScript 5.8+, Node.js 22+, ESM, node:test, filesystem-free deterministic unit tests.

## Global Constraints

- Large context alone MUST NOT force `start_fresh`.
- Missing token telemetry MUST remain `unknown` rather than fabricated.
- High relevance MAY block fresh-chat recommendations despite high pressure.
- Handoff MUST exclude stale reasoning/logs and prefer canonical file/document references.
- Handoff sufficiency is judged against handoff + repository + canonical docs.
- Handoff generation and conversation transition remain separate controlled actions.

---

### Task 1: Add context and handoff specification types

**Files:**
- Create: `packages/spec/src/context.ts`
- Create: `packages/spec/src/handoff.ts`
- Modify: `packages/spec/src/index.ts`
- Test: `packages/spec/src/__tests__/context-handoff.test.ts`

**Interfaces:**
- Produces `ContextPressure`, `ContextRelevance`, `ContextFacts`, `ContextDecision`, `ContextRecommendation`, `HandoffInput`, `HandoffDocument`, `HandoffValidation`.

- [ ] **Step 1: Write failing type/constant test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTEXT_PRESSURES, CONTEXT_RELEVANCES, type HandoffDocument } from '../index.js';

test('context and handoff types expose stable vocabulary', () => {
  assert.deepEqual(CONTEXT_PRESSURES, ['low', 'medium', 'high', 'unknown']);
  assert.deepEqual(CONTEXT_RELEVANCES, ['low', 'medium', 'high']);
  const handoff: HandoffDocument = {
    goal: 'implement M2', currentState: 'planning', activePlan: 'm2b', keyDecisions: [], relevantFiles: [],
    constraints: [], openProblems: [], verificationState: 'not_started', nextAction: 'implement context engine'
  };
  assert.equal(handoff.goal, 'implement M2');
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/spec/tsconfig.json`

Expected: FAIL because new exports do not exist.

- [ ] **Step 3: Implement minimal types**

```ts
import type { Confidence, ContextHealth } from './index.js';
export const CONTEXT_PRESSURES = ['low', 'medium', 'high', 'unknown'] as const;
export type ContextPressure = (typeof CONTEXT_PRESSURES)[number];
export const CONTEXT_RELEVANCES = ['low', 'medium', 'high'] as const;
export type ContextRelevance = (typeof CONTEXT_RELEVANCES)[number];
export interface ContextFacts {
  inputTokens?: number; contextWindow?: number; cachedTokens?: number;
  completedTasks: number; nextTaskIndependent: boolean; staleLogs: boolean;
  repeatedContent: boolean; activeDependsOnPriorEvidence: boolean; handoffPossible: boolean;
}
export type ContextRecommendation = 'continue' | 'compact' | 'create_handoff' | 'start_fresh';
export interface ContextDecision {
  health: ContextHealth; pressure: ContextPressure; relevance: ContextRelevance; confidence: Confidence;
  reasons: string[]; recommendations: ContextRecommendation[];
}
```

```ts
export interface HandoffInput {
  goal: string; currentState: string; activePlan?: string; keyDecisions: string[]; relevantFiles: string[];
  constraints: string[]; openProblems: string[]; verificationState: string; nextAction: string;
}
export type HandoffDocument = Omit<HandoffInput, 'activePlan'> & { activePlan?: string };
export interface HandoffValidation { sufficient: boolean; missingFacts: string[]; }
```

- [ ] **Step 4: Run spec tests**

Run: `npm exec -- tsc -p packages/spec/tsconfig.json && node --test packages/spec/dist/__tests__/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/spec/src/context.ts packages/spec/src/handoff.ts packages/spec/src/index.ts packages/spec/src/__tests__/context-handoff.test.ts
git commit -m "feat(spec): add context and handoff contracts"
```

---

### Task 2: Implement two-axis ContextEngine and hard signals

**Files:**
- Create: `packages/kernel/src/context-engine.ts`
- Create: `packages/kernel/src/__tests__/context-engine.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Consumes `ContextFacts`.
- Produces `ContextEngine.evaluate(facts): ContextDecision`.

- [ ] **Step 1: Write failing matrix tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ContextEngine } from '../context-engine.js';

const engine = new ContextEngine();

test('high pressure plus high relevance does not force fresh chat', () => {
  const result = engine.evaluate({ inputTokens: 900, contextWindow: 1000, completedTasks: 2, nextTaskIndependent: false, staleLogs: false, repeatedContent: false, activeDependsOnPriorEvidence: true, handoffPossible: true });
  assert.equal(result.pressure, 'high');
  assert.equal(result.relevance, 'high');
  assert.notEqual(result.health, 'start_fresh');
});

test('unknown telemetry stays unknown', () => {
  const result = engine.evaluate({ completedTasks: 3, nextTaskIndependent: true, staleLogs: true, repeatedContent: false, activeDependsOnPriorEvidence: false, handoffPossible: true });
  assert.equal(result.pressure, 'unknown');
});

test('independent next task plus stale history recommends fresh handoff', () => {
  const result = engine.evaluate({ inputTokens: 500, contextWindow: 1000, completedTasks: 3, nextTaskIndependent: true, staleLogs: true, repeatedContent: true, activeDependsOnPriorEvidence: false, handoffPossible: true });
  assert.equal(result.health, 'start_fresh');
  assert.ok(result.recommendations.includes('create_handoff'));
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because `ContextEngine` is missing.

- [ ] **Step 3: Implement minimal pressure/relevance/hard-rule engine**

```ts
import type { ContextDecision, ContextFacts, ContextPressure, ContextRelevance } from '@aes/spec';

export class ContextEngine {
  evaluate(facts: ContextFacts): ContextDecision {
    const pressure: ContextPressure = facts.inputTokens === undefined || facts.contextWindow === undefined
      ? 'unknown'
      : facts.inputTokens / facts.contextWindow >= 0.75 ? 'high'
      : facts.inputTokens / facts.contextWindow >= 0.4 ? 'medium' : 'low';
    const relevance: ContextRelevance = facts.activeDependsOnPriorEvidence ? 'high'
      : facts.nextTaskIndependent ? 'low' : 'medium';
    const reasons: string[] = [];
    if (facts.activeDependsOnPriorEvidence) reasons.push('active work depends on prior evidence');
    if (facts.nextTaskIndependent) reasons.push('next task is largely independent');
    if (facts.staleLogs) reasons.push('old debugging logs are stale');
    if (pressure === 'unknown') reasons.push('token telemetry unavailable');

    if (relevance === 'high') return { health: pressure === 'high' ? 'growing' : 'good', pressure, relevance, confidence: 'high', reasons, recommendations: ['continue'] };
    if (relevance === 'low' && facts.handoffPossible && (facts.staleLogs || facts.completedTasks >= 2)) {
      return { health: 'start_fresh', pressure, relevance, confidence: 'high', reasons, recommendations: ['create_handoff', 'start_fresh'] };
    }
    return { health: pressure === 'high' ? 'growing' : 'good', pressure, relevance, confidence: pressure === 'unknown' ? 'medium' : 'high', reasons, recommendations: pressure === 'high' ? ['compact'] : ['continue'] };
  }
}
```

- [ ] **Step 4: Run context tests**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/context-engine.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/context-engine.ts packages/kernel/src/__tests__/context-engine.test.ts packages/kernel/src/index.ts
git commit -m "feat(kernel): add context health engine"
```

---

### Task 3: Implement compact HandoffEngine and deterministic sufficiency validator

**Files:**
- Create: `packages/kernel/src/handoff-engine.ts`
- Create: `packages/kernel/src/__tests__/handoff-engine.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Produces `HandoffGenerator` optional injectable interface, `HandoffEngine.create()`, `HandoffEngine.validate()`.

- [ ] **Step 1: Write failing handoff filtering/validation tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { HandoffEngine } from '../handoff-engine.js';

test('handoff preserves actionable state without conversation transcript', async () => {
  const engine = new HandoffEngine();
  const handoff = await engine.create({
    goal: 'finish context engine', currentState: 'execution', activePlan: 'm2b',
    keyDecisions: ['core stays vendor neutral'], relevantFiles: ['packages/kernel/src/context-engine.ts'],
    constraints: ['offline tests'], openProblems: ['handoff tests missing'], verificationState: 'partial',
    nextAction: 'implement handoff tests'
  });
  assert.deepEqual(handoff.keyDecisions, ['core stays vendor neutral']);
  assert.equal('transcript' in handoff, false);
});

test('handoff validation reports exact missing fields', async () => {
  const engine = new HandoffEngine();
  const result = engine.validate({
    goal: '', currentState: 'execution', keyDecisions: [], relevantFiles: [], constraints: [], openProblems: [], verificationState: '', nextAction: ''
  });
  assert.deepEqual(result.missingFacts, ['goal', 'verificationState', 'nextAction']);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because `HandoffEngine` is missing.

- [ ] **Step 3: Implement minimal engine**

```ts
import type { HandoffDocument, HandoffInput, HandoffValidation } from '@aes/spec';
export interface HandoffGenerator { generate(input: HandoffInput): Promise<HandoffDocument>; }
export class HandoffEngine {
  constructor(private readonly generator?: HandoffGenerator) {}
  async create(input: HandoffInput): Promise<HandoffDocument> {
    return this.generator ? this.generator.generate(input) : { ...input };
  }
  validate(handoff: HandoffDocument): HandoffValidation {
    const missingFacts: string[] = [];
    if (!handoff.goal.trim()) missingFacts.push('goal');
    if (!handoff.verificationState.trim()) missingFacts.push('verificationState');
    if (!handoff.nextAction.trim()) missingFacts.push('nextAction');
    return { sufficient: missingFacts.length === 0, missingFacts };
  }
}
```

- [ ] **Step 4: Run handoff tests and full kernel tests**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/handoff-engine.test.js packages/kernel/dist/__tests__/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/handoff-engine.ts packages/kernel/src/__tests__/handoff-engine.test.ts packages/kernel/src/index.ts
git commit -m "feat(kernel): add compact handoff engine"
```
