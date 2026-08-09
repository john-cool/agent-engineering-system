# AES Milestone 3.2 — Runtime Resilience & Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local trace/checkpoint persistence and bounded recovery primitives that make runtime execution inspectable, restart-safe, and resistant to runaway retries or duplicate ambiguous side effects.

**Architecture:** Keep resilience primitives provider-neutral inside `@aes/runtime`. Persist normalized traces as append-only monthly JSONL and checkpoints as JSON. Make retry budgets, circuit breaker, fingerprinting, event buffering, and trace accumulation deterministic pure/local components before wiring them to Codex.

**Tech Stack:** TypeScript 5.8, Node.js 22+, ESM/NodeNext, `node:fs/promises`, `node:test`, no database dependency.

## Global Constraints

- Default tests MUST be offline and deterministic.
- Raw normalized traces MUST NOT include prompts, source bodies, transcripts, secrets, or raw tool output by default.
- Unknown telemetry MUST remain unknown.
- Runtime retry loops MUST be bounded.
- Ambiguous side effects MUST NOT be automatically repeated.
- Provider crashes/rate limits/cancellation MUST remain distinguishable from model-quality failures.
- Storage interfaces MUST allow future SQLite/Postgres implementations without changing callers.

---

## File Structure

```text
packages/runtime/src/local-jsonl-trace-store.ts   append/query/aggregate normalized traces
packages/runtime/src/local-checkpoint-store.ts    atomic JSON checkpoint persistence
packages/runtime/src/retry-budget.ts              bounded retry accounting
packages/runtime/src/failure-fingerprint.ts       normalized non-secret fingerprints
packages/runtime/src/circuit-breaker.ts           closed/open/half-open state machine
packages/runtime/src/event-buffer.ts              bounded lossless/coalescible queue
packages/runtime/src/trace-accumulator.ts          turn-level telemetry accumulator
packages/runtime/src/privacy.ts                    trace/generalization allowlist filtering
packages/runtime/src/index.ts                      exports
packages/runtime/src/__tests__/fixtures.ts         shared normalized test fixtures
```

### Task 1: Implement append-only monthly JSONL trace storage

**Files:**
- Create: `packages/runtime/src/local-jsonl-trace-store.ts`
- Create: `packages/runtime/src/__tests__/fixtures.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/__tests__/local-jsonl-trace-store.test.ts`

**Interfaces:**
- Consumes: `TraceStore`, `RuntimeDecisionTrace`, `TraceQuery`, `AggregateQuery`, `AggregateResult`.
- Produces: `LocalJsonlTraceStore`.

- [ ] **Step 1: Write a failing persistence/query test using a temporary directory**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalJsonlTraceStore } from '../index.js';
import { sampleTrace } from './fixtures.js';

test('LocalJsonlTraceStore appends normalized traces to a monthly file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-traces-'));
  const store = new LocalJsonlTraceStore(root);
  await store.append(sampleTrace({ traceId: 'tr-1', timestamp: '2026-08-08T10:00:00Z' }));
  const raw = await readFile(join(root, '2026-08.jsonl'), 'utf8');
  assert.equal(raw.trim().split('\n').length, 1);
  assert.equal(JSON.parse(raw).traceId, 'tr-1');
});
```

Create `packages/runtime/src/__tests__/fixtures.ts` with these exact reusable helpers:

```ts
import type {
  RuntimeDecisionTrace,
  RuntimeEvent,
  SessionCheckpoint
} from '@aes/runtime-sdk';

export function sampleTrace(overrides: Partial<RuntimeDecisionTrace> = {}): RuntimeDecisionTrace {
  const requirement = {
    class: 'balanced' as const,
    reasoning: 'medium' as const,
    latency: 'prefer_fast' as const,
    context: 'standard' as const
  };
  const selected = {
    id: 'model-balanced',
    provider: 'test',
    capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium' as const] },
    traits: { qualityClass: 'balanced' as const, latencyClass: 'fast' as const },
    availability: 'available' as const,
    selectedReasoning: 'medium' as const
  };
  return {
    traceId: 'trace-1',
    taskId: 'task-1',
    taskClass: 'approved-plan/typescript/execution',
    sessionId: 'session-1',
    turnId: 'turn-1',
    timestamp: '2026-08-08T10:00:00Z',
    requirement,
    resolution: {
      requested: requirement,
      selected,
      reasons: ['exact balanced fit'],
      alternatives: [],
      fallback: { used: false, type: 'none' }
    },
    telemetry: {
      provider: 'test', model: selected.id,
      durationMs: 10, retries: 0, compactions: 0,
      outcome: 'success', verification: 'passed'
    },
    providerRecoveries: 0,
    userInterruptions: 0,
    ...overrides
  };
}

export function checkpoint(overrides: Partial<SessionCheckpoint> = {}): SessionCheckpoint {
  const trace = sampleTrace();
  return {
    sessionId: trace.sessionId,
    provider: 'test',
    providerSessionId: 'provider-session-1',
    state: 'ready',
    modelProfile: trace.resolution.selected,
    contextRevision: 0,
    checkpointAt: '2026-08-08T10:00:00Z',
    ...overrides
  };
}

function meta(eventId: string) {
  return { sessionId: 'session-1', turnId: 'turn-1', eventId, timestamp: '2026-08-08T10:00:00Z' };
}

export function usage(eventId: string, inputTokens: number): RuntimeEvent {
  return { type: 'usage_updated', delivery: 'coalescible', meta: meta(eventId), data: { inputTokens } };
}

export function approval(eventId: string): RuntimeEvent {
  return {
    type: 'approval_requested', delivery: 'lossless', meta: meta(eventId), requestId: `request-${eventId}`,
    action: { id: `action-${eventId}`, type: 'toolExecution', source: 'runtime-provider', reason: 'test', confidence: 'high', payload: {} }
  };
}

export function outputDelta(text: string): RuntimeEvent {
  return { type: 'output_delta', delivery: 'coalescible', meta: meta('output-1'), data: { text } };
}

export function usageUpdated(data: { inputTokens?: number; outputTokens?: number }): RuntimeEvent {
  return { type: 'usage_updated', delivery: 'coalescible', meta: meta('usage-1'), data };
}
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: missing `LocalJsonlTraceStore`.

- [ ] **Step 3: Implement append/query/aggregate without loading provider raw events**

`append()` chooses `YYYY-MM.jsonl` from `trace.timestamp`, creates the directory recursively, and appends one JSON object plus `\n`. `query()` reads only matching monthly files and filters by supported normalized fields such as `provider`, `model`, `outcome`, `verification`, `taskClass`, and time range. `aggregate()` returns counts/success/retry totals from `query()` results.

- [ ] **Step 4: Run focused tests**

Run:
```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/local-jsonl-trace-store.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/local-jsonl-trace-store.ts packages/runtime/src/index.ts packages/runtime/src/__tests__/fixtures.ts packages/runtime/src/__tests__/local-jsonl-trace-store.test.ts
git commit -m "feat(runtime): persist normalized traces as jsonl"
```

### Task 2: Implement checkpoint persistence independent of in-memory sessions

**Files:**
- Create: `packages/runtime/src/local-checkpoint-store.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/__tests__/local-checkpoint-store.test.ts`

**Interfaces:**
- Consumes: `SessionCheckpointStore`, `SessionCheckpoint`.
- Produces: `LocalCheckpointStore`.

- [ ] **Step 1: Write failing round-trip and replacement tests**

```ts
import { LocalCheckpointStore } from '../index.js';
import { checkpoint } from './fixtures.js';

test('checkpoint survives a new store instance and replaces older revision', async () => {
  const root = await mkdtemp(join(tmpdir(), 'aes-checkpoints-'));
  const first = new LocalCheckpointStore(root);
  await first.save(checkpoint({ sessionId: 's1', contextRevision: 1 }));
  await first.save(checkpoint({ sessionId: 's1', contextRevision: 2 }));

  const second = new LocalCheckpointStore(root);
  const loaded = await second.load('s1');
  assert.equal(loaded?.contextRevision, 2);
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: missing store implementation.

- [ ] **Step 3: Implement atomic save/load/remove**

Write to `<sessionId>.json.tmp`, then rename to `<sessionId>.json` so a process crash cannot expose partially-written JSON as a valid checkpoint. `load()` returns `undefined` on missing file and throws a structured error on malformed existing JSON.

- [ ] **Step 4: Run focused tests**

Run:
```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/local-checkpoint-store.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime/src/local-checkpoint-store.ts packages/runtime/src/index.ts packages/runtime/src/__tests__/local-checkpoint-store.test.ts
git commit -m "feat(runtime): persist recoverable session checkpoints"
```

### Task 3: Add retry budgets and failure fingerprinting

**Files:**
- Create: `packages/runtime/src/retry-budget.ts`
- Create: `packages/runtime/src/failure-fingerprint.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/__tests__/retry-budget.test.ts`
- Test: `packages/runtime/src/__tests__/failure-fingerprint.test.ts`

**Interfaces:**
- Consumes: `RuntimeFailureKind`.
- Produces: `RetryBudget`, `RetryBudgetPolicy`, `fingerprintFailure(input)`.

- [ ] **Step 1: Write failing retry-exhaustion test**

```ts
test('transport retry budget stops after configured attempts', () => {
  const budget = new RetryBudget({ transport_failed: 2 });
  assert.equal(budget.consume('transport_failed').allowed, true);
  assert.equal(budget.consume('transport_failed').allowed, true);
  assert.equal(budget.consume('transport_failed').allowed, false);
});
```

- [ ] **Step 2: Write failing fingerprint stability/privacy test**

```ts
test('failure fingerprint is stable without embedding raw secret text', () => {
  const a = fingerprintFailure({ kind: 'execution_failed', code: 'E_FAIL', normalizedMessage: 'TypeError at worker', strategyId: 'fix-a' });
  const b = fingerprintFailure({ kind: 'execution_failed', code: 'E_FAIL', normalizedMessage: 'TypeError at worker', strategyId: 'fix-a' });
  assert.equal(a, b);
  assert.equal(a.includes('TypeError at worker'), false);
});
```

- [ ] **Step 3: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: missing symbols.

- [ ] **Step 4: Implement deterministic primitives**

`RetryBudget` tracks counts per failure kind. `fingerprintFailure` hashes normalized non-secret fields with Node `createHash('sha256')`; do not accept raw logs or arbitrary tool output in its input contract.

- [ ] **Step 5: Run tests and commit**

Run:
```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/retry-budget.test.js packages/runtime/dist/__tests__/failure-fingerprint.test.js
```
Expected: PASS.

```bash
git add packages/runtime/src/retry-budget.ts packages/runtime/src/failure-fingerprint.ts packages/runtime/src/index.ts packages/runtime/src/__tests__/retry-budget.test.ts packages/runtime/src/__tests__/failure-fingerprint.test.ts
git commit -m "feat(runtime): bound retries and fingerprint repeated failures"
```

### Task 4: Add provider circuit breaker

**Files:**
- Create: `packages/runtime/src/circuit-breaker.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/__tests__/circuit-breaker.test.ts`

**Interfaces:**
- Produces: `CircuitBreaker` with `state`, `recordFailure(now)`, `canAttempt(now)`, `recordSuccess()`, `reset()`.

- [ ] **Step 1: Write failing transition test**

```ts
test('circuit opens after threshold and only probes after cooldown', () => {
  const breaker = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000 });
  breaker.recordFailure(0);
  breaker.recordFailure(10);
  assert.equal(breaker.state, 'open');
  assert.equal(breaker.canAttempt(500), false);
  assert.equal(breaker.canAttempt(1010), true);
  assert.equal(breaker.state, 'half_open');
  breaker.recordSuccess();
  assert.equal(breaker.state, 'closed');
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: missing breaker.

- [ ] **Step 3: Implement the exact state machine**

States are `closed | open | half_open`. Repeated failures in `closed` open the breaker at threshold. `open` denies attempts before cooldown. The first allowed probe moves to `half_open`; success closes, failure reopens.

- [ ] **Step 4: Test and commit**

Run:
```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/circuit-breaker.test.js
```
Expected: PASS.

```bash
git add packages/runtime/src/circuit-breaker.ts packages/runtime/src/index.ts packages/runtime/src/__tests__/circuit-breaker.test.ts
git commit -m "feat(runtime): add provider circuit breaker"
```

### Task 5: Add bounded event buffer with coalescing

**Files:**
- Create: `packages/runtime/src/event-buffer.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/__tests__/event-buffer.test.ts`

**Interfaces:**
- Consumes: `RuntimeEvent`, event `delivery` metadata.
- Produces: `RuntimeEventBuffer.push(event)`, `shift()`, `size`.

- [ ] **Step 1: Write failing lossless/coalescible tests**

```ts
import { RuntimeEventBuffer } from '../index.js';
import { approval, usage } from './fixtures.js';

test('coalesces usage snapshots but never drops approval requests', () => {
  const queue = new RuntimeEventBuffer(2);
  queue.push(usage('e1', 10));
  queue.push(usage('e2', 20));
  queue.push(approval('e3'));
  assert.equal(queue.size, 2);
  assert.equal(queue.shift()?.type, 'usage_updated');
  assert.equal(queue.shift()?.type, 'approval_requested');
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: missing buffer.

- [ ] **Step 3: Implement bounded semantics**

Coalesce pending `output_delta`, `usage_updated`, and `context_updated` events by type/session/turn. If the queue is full and a lossless event arrives, evict/coalesce eligible coalescible entries first; if the queue contains only lossless events, allow temporary overflow rather than dropping them.

- [ ] **Step 4: Test and commit**

Run:
```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/event-buffer.test.js
```
Expected: PASS.

```bash
git add packages/runtime/src/event-buffer.ts packages/runtime/src/index.ts packages/runtime/src/__tests__/event-buffer.test.ts
git commit -m "feat(runtime): buffer runtime events without losing authority events"
```

### Task 6: Add privacy-safe runtime trace accumulator

**Files:**
- Create: `packages/runtime/src/trace-accumulator.ts`
- Create: `packages/runtime/src/privacy.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/__tests__/trace-accumulator.test.ts`
- Test: `packages/runtime/src/__tests__/privacy.test.ts`

**Interfaces:**
- Consumes: normalized `RuntimeEvent`, `ModelResolution`, `RuntimeDecisionTrace`.
- Produces: `RuntimeTraceAccumulator.record(event)`, `finalize(input)`, `sanitizeGeneralizedExperience(record)`.

- [ ] **Step 1: Write failing aggregation/privacy tests**

```ts
import { RuntimeTraceAccumulator, sanitizeGeneralizedExperience } from '../index.js';
import { outputDelta, sampleTrace, usageUpdated } from './fixtures.js';

test('trace accumulator stores usage totals but no output text', () => {
  const acc = new RuntimeTraceAccumulator(sampleTrace());
  acc.record(outputDelta('secret project output'));
  acc.record(usageUpdated({ inputTokens: 100, outputTokens: 20 }));
  const trace = acc.finalize({ outcome: 'success', verification: 'passed' });
  assert.equal(trace.telemetry.inputTokens, 100);
  assert.equal(JSON.stringify(trace).includes('secret project output'), false);
});
```

```ts
test('global generalization removes project identifiers', () => {
  const result = sanitizeGeneralizedExperience({
    taskClass: 'approved-plan/typescript/execution',
    projectPath: '/secret/customer-repo',
    repositoryName: 'customer-repo',
    recommendation: 'balanced'
  });
  assert.deepEqual(result, {
    taskClass: 'approved-plan/typescript/execution',
    recommendation: 'balanced'
  });
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime/tsconfig.json
```
Expected: missing accumulator/privacy functions.

- [ ] **Step 3: Implement allowlist-based persistence**

Never build privacy by deleting a blacklist from an arbitrary object. Construct `RuntimeDecisionTrace` and global experience records from a fixed allowlist of normalized fields. `output_delta.data.text`, tool output, prompts, and provider raw payloads are not copied.

- [ ] **Step 4: Run runtime suite and commit**

Run:
```bash
tsc -p packages/runtime/tsconfig.json && node --test packages/runtime/dist/__tests__/*.test.js
```
Expected: PASS.

```bash
git add packages/runtime/src/trace-accumulator.ts packages/runtime/src/privacy.ts packages/runtime/src/index.ts packages/runtime/src/__tests__/trace-accumulator.test.ts packages/runtime/src/__tests__/privacy.test.ts
git commit -m "feat(runtime): accumulate privacy-safe execution evidence"
```


### Task 7: Make Milestone 2 `MemoryStore` implement the neutral `KnowledgeStore` contract

**Files:**
- Modify: `packages/kernel/src/memory-store.ts`
- Test: `packages/kernel/src/__tests__/memory-store.test.ts`

**Interfaces:**
- Consumes: `KnowledgeStore<KnowledgeMetadata>` and `KnowledgeSearchResult<KnowledgeMetadata>` from `@aes/runtime-sdk`.
- Produces: existing `MemoryStore` satisfying the neutral storage contract without changing `.aes/knowledge`, `.aes/decisions`, `.aes/experience`, or `.aes/evals` layout.

- [ ] **Step 1: Add a failing compile/runtime contract assertion**

Add these imports/assertions to `memory-store.test.ts`:

```ts
import type { KnowledgeStore } from '@aes/runtime-sdk';
import type { KnowledgeMetadata } from '@aes/spec';

function acceptsKnowledgeStore(_store: KnowledgeStore<KnowledgeMetadata>) {}

const store = new MemoryStore(projectRoot);
acceptsKnowledgeStore(store);
```

Keep the existing initialize/write/search assertions in the same test so behavior is proven, not only assignability.

- [ ] **Step 2: Verify RED or compile mismatch before the declaration is updated**

Run:
```bash
tsc -p packages/kernel/tsconfig.json
```
Expected: if the existing method return type is not structurally compatible with the new generic contract, TypeScript reports the mismatch; otherwise the compile assertion is already green and Step 3 is a declaration-only clarification with no behavior change.

- [ ] **Step 3: Declare the contract explicitly without changing storage behavior**

Update the class declaration and reuse the existing result type through the SDK contract:

```ts
export class MemoryStore implements KnowledgeStore<KnowledgeMetadata> {
  // existing initialize/searchKnowledge/writeKnowledge/appendLog bodies stay behaviorally unchanged
}
```

Import `KnowledgeStore` from `@aes/runtime-sdk`. Keep `appendRaw()` as a MemoryStore-specific extension; it is intentionally not part of the neutral knowledge interface.

- [ ] **Step 4: Run kernel memory tests**

Run:
```bash
tsc -p packages/kernel/tsconfig.json && node --test packages/kernel/dist/__tests__/memory-store.test.js
```
Expected: PASS with the existing `.aes/` semantics unchanged.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/memory-store.ts packages/kernel/src/__tests__/memory-store.test.ts
git commit -m "refactor(memory): expose neutral knowledge store contract"
```

## Plan 3.2 Verification Gate

```bash
for p in spec runtime-sdk runtime kernel adapter-codex cli; do tsc -p "packages/$p/tsconfig.json"; done
for p in spec runtime-sdk runtime kernel adapter-codex cli; do
  if compgen -G "packages/$p/dist/__tests__/*.test.js" > /dev/null; then node --test packages/$p/dist/__tests__/*.test.js; fi
done
```

Expected: zero failures, no live provider dependency, and no persisted trace fixture containing prompt/source/tool-output fields.
