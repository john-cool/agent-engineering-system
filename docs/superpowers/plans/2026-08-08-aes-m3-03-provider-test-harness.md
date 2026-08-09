# AES Milestone 3.3 — Provider Test Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build deterministic provider contract tests, fake App Server infrastructure, replay fixtures, and chaos hooks so Codex integration can be developed without network cost or nondeterminism.

**Architecture:** Put interface-only provider contract helpers in `@aes/runtime-sdk`, while Codex protocol fakes/fixtures live under `@aes/adapter-codex`. The fake uses the same line-delimited request/response shape expected by the transport and supports scripted crash/resume/approval/rate-limit scenarios.

**Tech Stack:** TypeScript 5.8, Node.js 22+, `node:test`, stdio/async-iterable test doubles, JSONL fixtures.

## Global Constraints

- Default suite MUST remain offline and deterministic.
- Fake infrastructure MUST exercise the same neutral `RuntimeProvider` contract as the real provider.
- Sanitized fixtures MUST contain no prompts, source code, secrets, or sensitive tool output.
- Unknown non-critical provider notifications MUST not crash a session.
- A critical test MUST prove ambiguous side effects are not re-executed.

---

## File Structure

```text
packages/runtime-sdk/src/testing/provider-contract.ts      reusable RuntimeProvider contract suite
packages/runtime-sdk/src/testing/in-memory.ts             reusable neutral test doubles
packages/runtime-sdk/src/testing/index.ts                  testing exports
packages/runtime-sdk/package.json                         ./testing subpath export
packages/runtime-sdk/src/index.ts                          production exports unchanged

packages/adapter-codex/src/transport.ts                    Codex transport seam used by real/fake transports
packages/adapter-codex/src/testing/scripted-transport.ts   deterministic request/notification fake
packages/adapter-codex/src/testing/fake-app-server.ts      scenario DSL/process facade
packages/adapter-codex/src/testing/replay.ts               JSONL fixture replay
packages/adapter-codex/fixtures/session-basic.jsonl        sanitized baseline recording
packages/adapter-codex/fixtures/session-approval.jsonl     sanitized approval sequence
packages/adapter-codex/fixtures/session-crash.jsonl        sanitized crash/resume sequence
```

### Task 1: Define reusable provider contract suite

**Files:**
- Create: `packages/runtime-sdk/src/testing/provider-contract.ts`
- Create: `packages/runtime-sdk/src/testing/in-memory.ts`
- Create: `packages/runtime-sdk/src/testing/index.ts`
- Modify: `packages/runtime-sdk/package.json`
- Test: `packages/runtime-sdk/src/__tests__/provider-contract.test.ts`

**Interfaces:**
- Consumes: `RuntimeProvider` and neutral session/event contracts.
- Produces: `runProviderContractTests(name, factory, expectations?)`, `createInMemoryProvider()`, `InMemoryTraceStore`, `InMemoryCheckpointStore`, `RecordingControlBridge`, `FixedVerificationBridge`.

- [ ] **Step 1: Write a failing self-test around an in-memory provider**

```ts
import type {
  CreateRuntimeSessionInput,
  RuntimeProvider,
  RuntimeSession,
  SessionCheckpoint
} from '@aes/runtime-sdk';
import { runProviderContractTests } from '../testing/index.js';

function createSession(input: CreateRuntimeSessionInput, providerSessionId = 'provider-session-1'): RuntimeSession {
  let state: SessionCheckpoint['state'] = 'ready';
  return {
    sessionId: input.sessionId,
    providerSessionId,
    async *runTurn(request) {
      state = 'running';
      yield {
        type: 'turn_started', delivery: 'lossless',
        meta: { sessionId: input.sessionId, turnId: request.turnId, eventId: 'e1', timestamp: '2026-08-08T10:00:00Z' }
      };
      state = 'completed';
      yield {
        type: 'turn_completed', delivery: 'lossless',
        meta: { sessionId: input.sessionId, turnId: request.turnId, eventId: 'e2', timestamp: '2026-08-08T10:00:01Z' },
        data: { outcome: 'success' }
      };
    },
    async respondToApproval() {},
    async compact() {},
    async cancel() { state = 'cancelled'; },
    async checkpoint() {
      return {
        sessionId: input.sessionId,
        provider: 'memory',
        providerSessionId,
        state,
        modelProfile: input.model,
        contextRevision: 0,
        checkpointAt: '2026-08-08T10:00:01Z'
      };
    },
    async close() {}
  };
}

function createInMemoryProvider(): RuntimeProvider {
  const model = {
    id: 'memory-balanced', provider: 'memory',
    capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium' as const] },
    traits: { qualityClass: 'balanced' as const, latencyClass: 'fast' as const },
    availability: 'available' as const,
    selectedReasoning: 'medium' as const
  };
  return {
    id: 'memory',
    async getCapabilities() {
      return {
        modelDiscovery: true, modelRouting: true, fastMode: true, streaming: true,
        toolExecution: true, approvals: true, tokenTelemetry: true, contextTelemetry: true,
        contextCompaction: true, sessionResume: true, sessionCancellation: true,
        conversationTransition: false, persistentMemory: false
      };
    },
    async discoverModels() { return [model]; },
    async createSession(input) { return createSession(input); },
    async resumeSession(checkpoint) {
      return createSession({ sessionId: checkpoint.sessionId, workspaceId: '/test', model: checkpoint.modelProfile }, checkpoint.providerSessionId);
    },
    async shutdown() {}
  };
}

runProviderContractTests('in-memory provider', async () => createInMemoryProvider(), {
  supportsResume: true,
  supportsCancellation: true,
  supportsApprovals: true
});
```

Move the neutral `createSession`/`createInMemoryProvider` implementation above into `testing/in-memory.ts` and export it. In the same file add these exact reusable stores/bridge so later runtime tests do not invent incompatible test doubles:

```ts
export class InMemoryTraceStore implements TraceStore {
  readonly items: RuntimeDecisionTrace[] = [];
  async append(trace: RuntimeDecisionTrace) { this.items.push(trace); }
  async query() { return [...this.items]; }
  async aggregate() {
    return {
      count: this.items.length,
      successCount: this.items.filter((x) => x.telemetry.outcome === 'success').length,
      retryCount: this.items.reduce((sum, x) => sum + x.telemetry.retries, 0)
    };
  }
}

export class InMemoryCheckpointStore implements SessionCheckpointStore {
  readonly items = new Map<string, SessionCheckpoint>();
  async save(checkpoint: SessionCheckpoint) { this.items.set(checkpoint.sessionId, checkpoint); }
  async load(sessionId: string) { return this.items.get(sessionId); }
  async remove(sessionId: string) { this.items.delete(sessionId); }
}

export class RecordingControlBridge implements RuntimeControlBridge {
  readonly requests: ActionRequest[] = [];
  constructor(private readonly outcome: RuntimeAuthorizationResult['outcome'] = 'execute') {}
  async authorize(request: ActionRequest): Promise<RuntimeAuthorizationResult> {
    this.requests.push(request);
    return { outcome: this.outcome, reason: `test:${this.outcome}` };
  }
}

export class FixedVerificationBridge implements RuntimeVerificationBridge {
  constructor(private readonly outcome: RuntimeVerification = 'passed') {}
  async verify(): Promise<RuntimeVerification> { return this.outcome; }
}
```

In `testing/in-memory.ts`, import `TraceStore`, `RuntimeDecisionTrace`, `SessionCheckpointStore`, `SessionCheckpoint`, `RuntimeControlBridge`, `RuntimeAuthorizationResult`, and `RuntimeVerificationBridge` from `../index.js`; import `ActionRequest` and `RuntimeVerification` from `@aes/spec`. `testing/index.ts` re-exports `provider-contract.ts` and `in-memory.ts`.

Expose them only through a test-support subpath in `packages/runtime-sdk/package.json`; do not pollute the production root API:

```json
"exports": {
  ".": "./dist/index.js",
  "./testing": "./dist/testing/index.js"
}
```

Tests in other packages import helpers from `@aes/runtime-sdk/testing`.

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/runtime-sdk/tsconfig.json
```
Expected: missing testing helper.

- [ ] **Step 3: Implement contract assertions**

The suite must register tests for capability reporting, non-empty model discovery, session creation, normalized event delivery, cancellation when supported, approval response when supported, checkpoint/resume when supported, and graceful unsupported-capability behavior. Do not assert provider-specific IDs or protocol methods.

- [ ] **Step 4: Run the contract self-test**

Run:
```bash
tsc -p packages/runtime-sdk/tsconfig.json && node --test packages/runtime-sdk/dist/__tests__/provider-contract.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime-sdk/package.json packages/runtime-sdk/src/testing packages/runtime-sdk/src/__tests__/provider-contract.test.ts
git commit -m "test(runtime-sdk): add reusable provider contract suite"
```

### Task 2: Build a deterministic scripted Codex transport fake

**Files:**
- Create: `packages/adapter-codex/src/transport.ts`
- Create: `packages/adapter-codex/src/testing/scripted-transport.ts`
- Create: `packages/adapter-codex/src/testing/fake-app-server.ts`
- Test: `packages/adapter-codex/src/__tests__/fake-app-server.test.ts`

**Interfaces:**
- Produces: `ScriptedCodexTransport` and `FakeCodexAppServer` scenario API consumed by Codex transport/provider tests.

- [ ] **Step 1: Write failing request/notification/crash test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeCodexAppServer } from '../testing/fake-app-server.js';

async function nextValue<T>(source: AsyncIterable<T>): Promise<T> {
  const iterator = source[Symbol.asyncIterator]();
  const value = await iterator.next();
  if (value.done) throw new Error('expected another fake provider event');
  return value.value;
}

test('fake app server can emit notifications and fail at a deterministic boundary', async () => {
  const fake = new FakeCodexAppServer()
    .onRequest('initialize', { result: { serverInfo: { name: 'fake-codex' } } })
    .onRequest('thread/start', { result: { thread: { id: 'thread-1' } } })
    .emitAfter('thread/start', { method: 'turn/started', params: { turnId: 'turn-1' } })
    .crashAfter('turn/started');

  const transport = fake.createTransport();
  await transport.request('initialize', {});
  await transport.request('thread/start', {});
  const notifications = transport.notifications();
  const event = await nextValue(notifications) as { method: string };
  assert.equal(event.method, 'turn/started');
  await assert.rejects(() => nextValue(notifications), /fake app server crashed/);
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json
```
Expected: missing test fake.

- [ ] **Step 3: Implement the transport seam and a small scripted scenario engine**

Create the production-facing seam first so both real and fake transports implement one contract:

```ts
export interface CodexTransport {
  request(method: string, params: unknown): Promise<unknown>;
  notifications(): AsyncIterable<unknown>;
  serverRequests(): AsyncIterable<{ id: string | number; method: string; params: unknown }>;
  respond(id: string | number, result: unknown): Promise<void>;
  close(): Promise<void>;
}
```

`ScriptedCodexTransport` implements that interface. `FakeCodexAppServer.createTransport()` returns a `CodexTransport`. Support exact scenario primitives required by the approved spec: request response, emitted notification, server-initiated approval request, crash boundary, rate-limit error, malformed line, unknown notification, and session-lost response.

Also expose deterministic named scenarios used by later plans:

```ts
type FakeCodexScenarioName =
  | 'normal-turn'
  | 'stream-with-approval'
  | 'provider-contract'
  | 'rate-limit'
  | 'session-lost'
  | 'tool-completed-then-crash';

FakeCodexAppServer.scenario(name: FakeCodexScenarioName): FakeCodexAppServer;
```

`stream-with-approval` must produce `turn/started`, one server-initiated approval request, a successful approval response path, and `turn/completed`. `provider-contract` must additionally support model discovery, cancellation, checkpoint/resume, and compaction requests. Keep scenario logic in `src/testing`; production code may import only `CodexTransport` from `transport.ts`.

- [ ] **Step 4: Run fake tests and commit**

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json && node --test packages/adapter-codex/dist/__tests__/fake-app-server.test.js
```
Expected: PASS.

```bash
git add packages/adapter-codex/src/transport.ts packages/adapter-codex/src/testing packages/adapter-codex/src/__tests__/fake-app-server.test.ts
git commit -m "test(codex): add deterministic fake app server"
```

### Task 3: Add sanitized record/replay fixtures

**Files:**
- Create: `packages/adapter-codex/src/testing/replay.ts`
- Create: `packages/adapter-codex/fixtures/session-basic.jsonl`
- Create: `packages/adapter-codex/fixtures/session-approval.jsonl`
- Create: `packages/adapter-codex/fixtures/session-crash.jsonl`
- Test: `packages/adapter-codex/src/__tests__/replay.test.ts`

**Interfaces:**
- Produces: `replayFixture(path)` async iterable and `sanitizeRecordedProtocol(record)`.

- [ ] **Step 1: Write failing sanitizer/replay test**

```ts
test('protocol sanitizer removes content-bearing fields before fixture persistence', () => {
  const sanitized = sanitizeRecordedProtocol({
    method: 'item/outputDelta',
    params: { text: 'secret source', cwd: '/private/repo', tokenUsage: { input: 10 } }
  });
  const json = JSON.stringify(sanitized);
  assert.equal(json.includes('secret source'), false);
  assert.equal(json.includes('/private/repo'), false);
  assert.equal(json.includes('10'), true);
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json
```
Expected: missing replay/sanitizer.

- [ ] **Step 3: Implement allowlist sanitizer and fixture replay**

The sanitizer may keep method/event IDs, status, normalized usage counts, and synthetic placeholder IDs, but must omit prompt/text/tool-output/cwd/environment/auth fields. Fixtures use only synthetic IDs and placeholder content-free events.

- [ ] **Step 4: Run tests and commit**

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json && node --test packages/adapter-codex/dist/__tests__/replay.test.js
```
Expected: PASS.

```bash
git add packages/adapter-codex/src/testing/replay.ts packages/adapter-codex/fixtures packages/adapter-codex/src/__tests__/replay.test.ts
git commit -m "test(codex): add sanitized protocol replay fixtures"
```

### Task 4: Add deterministic chaos scenarios around side effects

**Files:**
- Modify: `packages/adapter-codex/src/testing/fake-app-server.ts`
- Test: `packages/adapter-codex/src/__tests__/chaos-scenarios.test.ts`

**Interfaces:**
- Produces named failure injection points: `after_turn_start`, `after_tool_completion`, `before_approval_response`, `during_compaction`, `after_turn_completion_before_checkpoint`.

- [ ] **Step 1: Write failing scenario tests that expose each failure point exactly once**

```ts
test('crash after tool completion marks side-effect boundary as ambiguous', async () => {
  const fake = FakeCodexAppServer.scenario('tool-completed-then-crash');
  const events = [];
  await assert.rejects(async () => {
    for await (const event of fake.events()) events.push(event);
  });
  assert.ok(events.some((event) => event.kind === 'tool_completed'));
  assert.equal(fake.lastFailurePoint, 'after_tool_completion');
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json && node --test packages/adapter-codex/dist/__tests__/chaos-scenarios.test.js
```
Expected: FAIL because named failure injection is absent.

- [ ] **Step 3: Add exact deterministic scenario helpers**

Each scenario must be deterministic and restartable; no timers or random values. The fake exposes a monotonically increasing synthetic event ID so later reconciliation tests can prove whether a provider event happened before the crash.

- [ ] **Step 4: Re-run test suite and commit**

```bash
tsc -p packages/adapter-codex/tsconfig.json && node --test packages/adapter-codex/dist/__tests__/*.test.js
```
Expected: PASS.

```bash
git add packages/adapter-codex/src/testing/fake-app-server.ts packages/adapter-codex/src/__tests__/chaos-scenarios.test.ts
git commit -m "test(codex): add deterministic recovery chaos scenarios"
```

## Plan 3.3 Verification Gate

Run:
```bash
for p in spec runtime-sdk runtime kernel adapter-codex cli; do tsc -p "packages/$p/tsconfig.json"; done
for p in spec runtime-sdk runtime kernel adapter-codex cli; do
  if compgen -G "packages/$p/dist/__tests__/*.test.js" > /dev/null; then node --test packages/$p/dist/__tests__/*.test.js; fi
done
```
Expected: zero failures and no command that starts a real Codex binary.
