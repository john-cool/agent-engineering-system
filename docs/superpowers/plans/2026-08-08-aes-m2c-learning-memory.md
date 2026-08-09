# AES Milestone 2C — Learning and Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add evidence-backed decision traces, experience aggregation, conservative evaluation/promotion, filesystem project knowledge storage, and memory-scope privacy rules.

**Architecture:** Learning changes no model weights. Verified outcomes become traces; traces aggregate into hypotheses; only evaluated hypotheses can become trusted guidance. Project memory is filesystem-backed under `.aes/`, with explicit scope metadata and a strict project-to-user privacy boundary.

**Tech Stack:** TypeScript 5.8+, Node.js 22+, ESM, node:test, `node:fs/promises`; no database or vector store.

## Global Constraints

- Experience hypotheses MUST NOT silently mutate trusted policy.
- Promotion requires evaluation evidence and must preserve evidence references.
- Project-specific content MUST NOT automatically enter user/global scope.
- Durable records use `candidate | trusted | superseded` status.
- Retrieval begins with index/metadata and lexical matching; no vector database in Milestone 2.
- Authority may automatically degrade after regressions but may not silently promote to autonomous.

---

### Task 1: Add decision trace, knowledge, experience, and evaluation spec contracts

**Files:**
- Create: `packages/spec/src/learning.ts`
- Modify: `packages/spec/src/index.ts`
- Test: `packages/spec/src/__tests__/learning.test.ts`

**Interfaces:**
- Produces `DecisionTrace`, `CostTelemetry`, `UserOverrideEvent`, `KnowledgeMetadata`, `ExperienceHypothesis`, `EvaluationEvidence`, `EvaluationDecision`.

- [ ] **Step 1: Write failing contract test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import type { DecisionTrace, KnowledgeMetadata } from '../index.js';

test('learning contracts separate traces and durable knowledge metadata', () => {
  const metadata: KnowledgeMetadata = {
    id: 'k-1', status: 'candidate', scope: 'project', confidence: 'medium',
    createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', evidenceRefs: ['trace-1']
  };
  const trace = { taskClass: 'refactor', retries: 0, verificationOutcome: 'passed', userOverrides: [], timestamp: '2026-08-08T00:00:00Z' } as DecisionTrace;
  assert.equal(metadata.scope, 'project');
  assert.equal(trace.verificationOutcome, 'passed');
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/spec/tsconfig.json`

Expected: FAIL because learning contracts are absent.

- [ ] **Step 3: Implement exact learning contracts from the design**

```ts
import type { Confidence, ContextDecision, ControlDecision, ModelDecision, TaskAnalysis } from './index.js';
export interface CostTelemetry { inputTokens?: number; outputTokens?: number; estimatedCost?: number; wallClockMs?: number; }
export interface UserOverrideEvent { action: string; decision: 'approved' | 'rejected' | 'manual_override'; timestamp: string; }
export interface DecisionTrace {
  taskClass: string; analysis: TaskAnalysis; modelDecisions: ModelDecision[]; contextDecisions: ContextDecision[];
  controlOutcomes: ControlDecision[]; retries: number; verificationOutcome: 'passed' | 'failed' | 'partial';
  userOverrides: UserOverrideEvent[]; cost?: CostTelemetry; timestamp: string;
}
export interface KnowledgeMetadata {
  id: string; status: 'candidate' | 'trusted' | 'superseded'; scope: 'session' | 'project' | 'user';
  confidence: Confidence; createdAt: string; updatedAt: string; evidenceRefs: string[]; supersededBy?: string;
}
export interface ExperienceHypothesis {
  id: string; taskClass: string; recommendation: string; sampleCount: number; successCount: number;
  retryCount: number; overrideCount: number; evidenceRefs: string[];
}
export interface EvaluationEvidence {
  hypothesisId: string; sampleCount: number; successRate: number; retryRate: number; overrideRate: number; qualityRegressionRate: number;
}
export interface EvaluationDecision { hypothesisId: string; outcome: 'promote' | 'keep_candidate' | 'reject'; reasons: string[]; }
```

- [ ] **Step 4: Run spec suite**

Run: `npm exec -- tsc -p packages/spec/tsconfig.json && node --test packages/spec/dist/__tests__/*.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/spec/src/learning.ts packages/spec/src/index.ts packages/spec/src/__tests__/learning.test.ts
git commit -m "feat(spec): add learning and knowledge contracts"
```

---

### Task 2: Implement ExperienceEngine aggregation from verified traces

**Files:**
- Create: `packages/kernel/src/experience-engine.ts`
- Create: `packages/kernel/src/__tests__/experience-engine.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Produces `ExperienceEngine.aggregate(traces, recommendation): ExperienceHypothesis`.

- [ ] **Step 1: Write failing verified-outcome aggregation test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { ExperienceEngine } from '../experience-engine.js';

const trace = (outcome: 'passed' | 'failed', retries = 0) => ({
  taskClass: 'approved-plan-refactor', analysis: {} as never, modelDecisions: [], contextDecisions: [], controlOutcomes: [],
  retries, verificationOutcome: outcome, userOverrides: [], timestamp: '2026-08-08T00:00:00Z'
});

test('experience hypothesis counts only supplied verified outcomes and preserves evidence refs', () => {
  const engine = new ExperienceEngine();
  const hypothesis = engine.aggregate([
    { id: 'trace-1', trace: trace('passed') },
    { id: 'trace-2', trace: trace('passed', 1) },
    { id: 'trace-3', trace: trace('failed', 1) }
  ], 'prefer balanced+fast');
  assert.equal(hypothesis.sampleCount, 3);
  assert.equal(hypothesis.successCount, 2);
  assert.deepEqual(hypothesis.evidenceRefs, ['trace-1', 'trace-2', 'trace-3']);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because `ExperienceEngine` is missing.

- [ ] **Step 3: Implement minimal deterministic aggregator**

```ts
import type { DecisionTrace, ExperienceHypothesis } from '@aes/spec';
export class ExperienceEngine {
  aggregate(entries: readonly { id: string; trace: DecisionTrace }[], recommendation: string): ExperienceHypothesis {
    if (entries.length === 0) throw new Error('AES experience aggregation requires at least one trace');
    const taskClass = entries[0]!.trace.taskClass;
    return {
      id: `experience:${taskClass}:${recommendation}`,
      taskClass,
      recommendation,
      sampleCount: entries.length,
      successCount: entries.filter(({ trace }) => trace.verificationOutcome === 'passed').length,
      retryCount: entries.reduce((sum, { trace }) => sum + trace.retries, 0),
      overrideCount: entries.reduce((sum, { trace }) => sum + trace.userOverrides.length, 0),
      evidenceRefs: entries.map(({ id }) => id)
    };
  }
}
```

- [ ] **Step 4: Run targeted test**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/experience-engine.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/experience-engine.ts packages/kernel/src/__tests__/experience-engine.test.ts packages/kernel/src/index.ts
git commit -m "feat(kernel): aggregate verified experience traces"
```

---

### Task 3: Implement conservative EvaluationGate and authority-promotion proposal

**Files:**
- Create: `packages/kernel/src/evaluation-gate.ts`
- Create: `packages/kernel/src/__tests__/evaluation-gate.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Produces `EvaluationPolicy`, `EvaluationGate.evaluate(hypothesis, evidence)`, `EvaluationGate.shouldProposeAuthorityPromotion()`.

- [ ] **Step 1: Write failing promotion/rejection tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { EvaluationGate } from '../evaluation-gate.js';

const gate = new EvaluationGate({ minSamples: 10, minSuccessRate: 0.9, maxRetryRate: 0.2, maxOverrideRate: 0.1, maxQualityRegressionRate: 0.05 });

test('strong evidence promotes hypothesis', () => {
  const result = gate.evaluate({ id: 'h1', taskClass: 'refactor', recommendation: 'balanced+fast', sampleCount: 12, successCount: 12, retryCount: 1, overrideCount: 0, evidenceRefs: ['t'] },
    { hypothesisId: 'h1', sampleCount: 12, successRate: 1, retryRate: 1/12, overrideRate: 0, qualityRegressionRate: 0 });
  assert.equal(result.outcome, 'promote');
});

test('authority is proposed, never silently promoted', () => {
  assert.equal(gate.shouldProposeAuthorityPromotion({ approvals: 12, rejections: 0, verifiedSuccesses: 12 }), true);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because EvaluationGate is absent.

- [ ] **Step 3: Implement thresholds and proposal-only authority learning**

```ts
import type { EvaluationDecision, EvaluationEvidence, ExperienceHypothesis } from '@aes/spec';
export interface EvaluationPolicy { minSamples: number; minSuccessRate: number; maxRetryRate: number; maxOverrideRate: number; maxQualityRegressionRate: number; }
export class EvaluationGate {
  constructor(private readonly policy: EvaluationPolicy) {}
  evaluate(hypothesis: ExperienceHypothesis, evidence: EvaluationEvidence): EvaluationDecision {
    const reasons: string[] = [];
    if (evidence.sampleCount < this.policy.minSamples) reasons.push('insufficient sample count');
    if (evidence.successRate < this.policy.minSuccessRate) reasons.push('success rate below threshold');
    if (evidence.retryRate > this.policy.maxRetryRate) reasons.push('retry rate above threshold');
    if (evidence.overrideRate > this.policy.maxOverrideRate) reasons.push('override rate above threshold');
    if (evidence.qualityRegressionRate > this.policy.maxQualityRegressionRate) reasons.push('quality regression rate above threshold');
    return { hypothesisId: hypothesis.id, outcome: reasons.length === 0 ? 'promote' : evidence.sampleCount < this.policy.minSamples ? 'keep_candidate' : 'reject', reasons };
  }
  shouldProposeAuthorityPromotion(input: { approvals: number; rejections: number; verifiedSuccesses: number }): boolean {
    return input.approvals >= this.policy.minSamples && input.rejections === 0 && input.verifiedSuccesses === input.approvals;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/evaluation-gate.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/evaluation-gate.ts packages/kernel/src/__tests__/evaluation-gate.test.ts packages/kernel/src/index.ts
git commit -m "feat(kernel): add experience evaluation gate"
```

---

### Task 4: Add filesystem-backed `.aes/` MemoryStore and lexical retrieval

**Files:**
- Create: `packages/kernel/src/memory-store.ts`
- Create: `packages/kernel/src/__tests__/memory-store.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Produces `MemoryRecord`, `MemoryStore.initialize()`, `appendRaw()`, `writeKnowledge()`, `searchKnowledge()`, `appendLog()`.

- [ ] **Step 1: Write failing filesystem layout/retrieval test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MemoryStore } from '../memory-store.js';

test('memory store creates five-folder project layout and retrieves lexically', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-memory-'));
  const store = new MemoryStore(root);
  await store.initialize();
  await store.writeKnowledge('architecture/vendor-neutral.md', '# Vendor neutral\nCore never imports adapters.', { id: 'k1', status: 'trusted', scope: 'project', confidence: 'high', createdAt: '2026-08-08T00:00:00Z', updatedAt: '2026-08-08T00:00:00Z', evidenceRefs: ['adr-1'] });
  const results = await store.searchKnowledge('vendor adapters');
  assert.equal(results.length, 1);
  assert.match(await readFile(join(root, '.aes', 'index.md'), 'utf8'), /vendor-neutral/);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because MemoryStore is absent.

- [ ] **Step 3: Implement project-local layout and lexical search**

Implementation MUST create:

```text
.aes/raw
.aes/knowledge
.aes/decisions
.aes/experience
.aes/evals
.aes/index.md
.aes/log.md
.aes/MEMORY.md
```

Use `node:fs/promises` only. Store knowledge metadata in a sibling `<name>.meta.json` file. `searchKnowledge(query)` reads `index.md`, ranks paths by case-insensitive term matches, and reads at most the top 3 matching notes.

- [ ] **Step 4: Run memory tests**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/memory-store.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/memory-store.ts packages/kernel/src/__tests__/memory-store.test.ts packages/kernel/src/index.ts
git commit -m "feat(kernel): add filesystem knowledge memory store"
```

---

### Task 5: Implement KnowledgeCompiler privacy and promotion lifecycle

**Files:**
- Create: `packages/kernel/src/knowledge-compiler.ts`
- Create: `packages/kernel/src/__tests__/knowledge-compiler.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Produces `KnowledgeCandidate`, `KnowledgeCompiler.validateScope()`, `promote()`, `supersede()`.

- [ ] **Step 1: Write failing privacy/promotion tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { KnowledgeCompiler } from '../knowledge-compiler.js';

test('project-specific knowledge cannot silently promote to user scope', () => {
  const compiler = new KnowledgeCompiler();
  assert.throws(() => compiler.validateScope({ sourceScope: 'project', targetScope: 'user', generalized: false }), /project content.*user/i);
});

test('generalized procedural knowledge may be proposed for user scope', () => {
  const compiler = new KnowledgeCompiler();
  assert.equal(compiler.validateScope({ sourceScope: 'project', targetScope: 'user', generalized: true }), true);
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because KnowledgeCompiler is absent.

- [ ] **Step 3: Implement scope guard and status transitions**

```ts
import type { KnowledgeMetadata } from '@aes/spec';
export class KnowledgeCompiler {
  validateScope(input: { sourceScope: KnowledgeMetadata['scope']; targetScope: KnowledgeMetadata['scope']; generalized: boolean }): true {
    if (input.sourceScope === 'project' && input.targetScope === 'user' && !input.generalized) {
      throw new Error('AES memory scope violation: project content cannot be promoted to user scope without generalization');
    }
    return true;
  }
  promote(metadata: KnowledgeMetadata, evidenceRef: string): KnowledgeMetadata {
    return { ...metadata, status: 'trusted', confidence: 'high', updatedAt: new Date().toISOString(), evidenceRefs: [...new Set([...metadata.evidenceRefs, evidenceRef])] };
  }
  supersede(metadata: KnowledgeMetadata, replacementId: string): KnowledgeMetadata {
    return { ...metadata, status: 'superseded', supersededBy: replacementId, updatedAt: new Date().toISOString() };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/knowledge-compiler.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/knowledge-compiler.ts packages/kernel/src/__tests__/knowledge-compiler.test.ts packages/kernel/src/index.ts
git commit -m "feat(kernel): add knowledge promotion privacy rules"
```

---

### Task 6: Add authority-learning regression guard

**Files:**
- Create: `packages/kernel/src/authority-learning.ts`
- Create: `packages/kernel/src/__tests__/authority-learning.test.ts`
- Modify: `packages/kernel/src/index.ts`

**Interfaces:**
- Produces `AuthorityLearning.evaluate()` returning either `keep`, `propose_autonomous`, or `degrade_to_assisted`.

- [ ] **Step 1: Write failing authority behavior tests**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthorityLearning } from '../authority-learning.js';

const engine = new AuthorityLearning({ promotionSamples: 10, regressionRate: 0.1 });

test('successful approvals only propose autonomy', () => {
  assert.equal(engine.evaluate({ current: 'assisted', approvals: 12, rejections: 0, verifiedSuccesses: 12, regressions: 0 }).action, 'propose_autonomous');
});

test('autonomous quality regressions may degrade authority without approval', () => {
  assert.equal(engine.evaluate({ current: 'autonomous', approvals: 20, rejections: 0, verifiedSuccesses: 17, regressions: 3 }).action, 'degrade_to_assisted');
});
```

- [ ] **Step 2: Verify RED**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json`

Expected: FAIL because `AuthorityLearning` is absent.

- [ ] **Step 3: Implement asymmetric authority learning**

```ts
import type { ControlMode } from '@aes/spec';
export class AuthorityLearning {
  constructor(private readonly policy: { promotionSamples: number; regressionRate: number }) {}
  evaluate(input: { current: ControlMode; approvals: number; rejections: number; verifiedSuccesses: number; regressions: number }) {
    const total = Math.max(input.approvals, input.verifiedSuccesses + input.regressions);
    const regressionRate = total === 0 ? 0 : input.regressions / total;
    if (input.current === 'autonomous' && regressionRate > this.policy.regressionRate) return { action: 'degrade_to_assisted' as const, reason: 'verified quality regression exceeded threshold' };
    if (input.current !== 'autonomous' && input.approvals >= this.policy.promotionSamples && input.rejections === 0 && input.verifiedSuccesses === input.approvals) return { action: 'propose_autonomous' as const, reason: 'repeated approved actions verified successfully' };
    return { action: 'keep' as const, reason: 'insufficient evidence for authority change' };
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm exec -- tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/authority-learning.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/authority-learning.ts packages/kernel/src/__tests__/authority-learning.test.ts packages/kernel/src/index.ts
git commit -m "feat(kernel): add asymmetric authority learning"
```
