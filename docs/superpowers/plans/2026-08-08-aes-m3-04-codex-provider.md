# AES Milestone 3.4 — Codex App Server Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Codex adapter with a real provider implementation over Codex App Server while keeping all protocol/process details below the adapter boundary.

**Architecture:** Split the adapter into process transport, protocol validation/mapping, provider model discovery, and stateful `CodexRuntimeSession`. Production transport speaks JSON-RPC/JSONL over a spawned `codex app-server`; tests inject the scripted transport from plan 3.3. The legacy `CodexRuntimeAdapter` remains as a compatibility façade rather than the primary architecture.

**Tech Stack:** TypeScript 5.8, Node.js 22+ `child_process`, stdio JSONL, `node:test`; Codex binary only for opt-in integration tests, never default tests.

## Global Constraints

- `@aes/adapter-codex` is the only package allowed to know Codex JSON-RPC method names/types.
- Incoming JSON MUST be parsed/validated before normalization; unchecked `JSON.parse(...) as CodexEvent` is prohibited.
- Unknown non-critical notifications MUST NOT crash the runtime.
- Provider MUST NOT grant itself authority.
- One Codex App Server process per workspace is the intended process scope; process reuse itself is wired by the supervisor in plan 3.5.
- No live Codex requirement in the default suite.

---

## File Structure

```text
packages/adapter-codex/src/transport.ts              transport interface from Plan 3.3
packages/adapter-codex/src/app-server-transport.ts   child_process JSON-RPC/JSONL transport
packages/adapter-codex/src/protocol.ts               validated provider message shapes
packages/adapter-codex/src/protocol-mapper.ts        Codex -> RuntimeEvent and request mapping
packages/adapter-codex/src/model-catalog.ts           Codex model discovery normalization/cache
packages/adapter-codex/src/session.ts                 CodexRuntimeSession
packages/adapter-codex/src/provider.ts                CodexProvider
packages/adapter-codex/src/compat-adapter.ts          legacy RuntimeAdapter façade
packages/adapter-codex/src/index.ts                   exports
```

### Task 1: Implement JSONL transport framing and request correlation

**Files:**
- Modify: `packages/adapter-codex/src/transport.ts` only if the real transport exposes a missing neutral I/O seam
- Create: `packages/adapter-codex/src/app-server-transport.ts`
- Modify: `packages/adapter-codex/src/index.ts`
- Test: `packages/adapter-codex/src/__tests__/transport.test.ts`

**Interfaces:**
- Consumes: `CodexTransport` from Plan 3.3.
- Produces: `CodexAppServerTransport` implementing `CodexTransport` over a real child process or injected line I/O.

- [ ] **Step 1: Write failing transport framing test using an injected fake child IO**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { CodexAppServerTransport, type CodexLineIo } from '../index.js';

function createFakeLineIo(): CodexLineIo & { writes: string[]; pushLine(line: string): void } {
  const writes: string[] = [];
  const queue: string[] = [];
  const waiters: Array<(line: string) => void> = [];
  return {
    writes,
    writeLine(line) { writes.push(line); },
    async *lines() {
      while (true) {
        if (queue.length > 0) { yield queue.shift()!; continue; }
        yield await new Promise<string>((resolve) => waiters.push(resolve));
      }
    },
    pushLine(line) {
      const waiter = waiters.shift();
      if (waiter) waiter(line); else queue.push(line);
    },
    async close() {}
  };
}

async function nextValue<T>(source: AsyncIterable<T>): Promise<T> {
  const result = await source[Symbol.asyncIterator]().next();
  if (result.done) throw new Error('expected transport value');
  return result.value;
}

test('transport correlates JSON-RPC response to request id and yields notifications separately', async () => {
  const io = createFakeLineIo();
  const transport = new CodexAppServerTransport({ io });
  const pending = transport.request('initialize', { clientInfo: { name: 'aes', version: '0.1.0' }, capabilities: {} });
  const written = JSON.parse(io.writes[0]!);
  io.pushLine(JSON.stringify({ id: written.id, result: { ok: true } }));
  assert.deepEqual(await pending, { ok: true });

  io.pushLine(JSON.stringify({ method: 'turn/started', params: { turn: { id: 't1' } } }));
  const notification = await nextValue(transport.notifications()) as { method: string };
  assert.equal(notification.method, 'turn/started');
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json
```
Expected: missing transport implementation.

- [ ] **Step 3: Implement transport with injectable line IO**

Add this adapter-local I/O seam in `transport.ts`:

```ts
export interface CodexLineIo {
  writeLine(line: string): void | Promise<void>;
  lines(): AsyncIterable<string>;
  close(): Promise<void>;
}
```

Production constructor spawns `codex app-server` and wraps stdout/stdin as `CodexLineIo`, but core framing logic accepts injected line IO so tests do not spawn processes. Track pending request IDs, reject pending requests on process exit, and route server-initiated messages with an `id` but no local pending request to the approval/request stream instead of treating them as responses.

- [ ] **Step 4: Run transport tests and commit**

```bash
tsc -p packages/adapter-codex/tsconfig.json && node --test packages/adapter-codex/dist/__tests__/transport.test.js
```
Expected: PASS.

```bash
git add packages/adapter-codex/src/transport.ts packages/adapter-codex/src/app-server-transport.ts packages/adapter-codex/src/index.ts packages/adapter-codex/src/__tests__/transport.test.ts
git commit -m "feat(codex): add app server jsonl transport"
```

### Task 2: Validate and normalize Codex protocol messages

**Files:**
- Create: `packages/adapter-codex/src/protocol.ts`
- Create: `packages/adapter-codex/src/protocol-mapper.ts`
- Test: `packages/adapter-codex/src/__tests__/protocol-mapper.test.ts`

**Interfaces:**
- Consumes: raw parsed JSON objects from transport.
- Produces: validated `CodexProtocolMessage` internal union and `mapCodexMessage(message): RuntimeEvent | undefined`.

- [ ] **Step 1: Write failing malformed/unknown/known event tests**

```ts
test('malformed provider message is rejected without unchecked casting', () => {
  assert.throws(() => parseCodexProtocolMessage({ method: 42 }), /invalid codex protocol message/i);
});

test('unknown non-critical notification is ignored by normal mapper', () => {
  const parsed = parseCodexProtocolMessage({ method: 'future/newNotification', params: { x: 1 } });
  assert.equal(mapCodexMessage(parsed), undefined);
});

test('usage notification becomes normalized usage_updated event', () => {
  const event = mapCodexMessage(parseCodexProtocolMessage({
    method: 'thread/tokenUsage/updated',
    params: { threadId: 'thread-1', inputTokens: 12, outputTokens: 3 }
  }));
  assert.equal(event?.type, 'usage_updated');
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json
```
Expected: missing parser/mapper.

- [ ] **Step 3: Implement explicit structural guards**

Use narrow helper functions (`isRecord`, `hasString`, `hasNumber`) and a small internal discriminated union for methods exercised by this milestone. Preserve unknown method envelopes as `kind: 'unknown_notification'` internally so debugging capture can retain metadata without exposing it as an AES event.

- [ ] **Step 4: Run tests and commit**

```bash
tsc -p packages/adapter-codex/tsconfig.json && node --test packages/adapter-codex/dist/__tests__/protocol-mapper.test.js
```
Expected: PASS.

```bash
git add packages/adapter-codex/src/protocol.ts packages/adapter-codex/src/protocol-mapper.ts packages/adapter-codex/src/__tests__/protocol-mapper.test.ts
git commit -m "feat(codex): validate and normalize app server protocol"
```

### Task 3: Implement normalized model discovery with bounded cache refresh

**Files:**
- Create: `packages/adapter-codex/src/model-catalog.ts`
- Test: `packages/adapter-codex/src/__tests__/model-catalog.test.ts`

**Interfaces:**
- Consumes: `CodexTransport`, neutral `AvailableModel`.
- Produces: `CodexModelCatalog.discover({ forceRefresh? })`.

- [ ] **Step 1: Write failing cache/refresh/normalization tests**

```ts
import type { CodexTransport } from '../transport.js';

function modelListTransport(): CodexTransport {
  let calls = 0;
  const responses = [
    { data: [{ id: 'm1', supportedReasoningEfforts: ['medium'], isDefault: true }] },
    { data: [{ id: 'm2', supportedReasoningEfforts: ['high'], isDefault: true }] }
  ];
  return {
    async request(method) {
      assert.equal(method, 'model/list');
      return responses[Math.min(calls++, responses.length - 1)]!;
    },
    async *notifications() {},
    async *serverRequests() {},
    async respond() {},
    async close() {}
  };
}

test('model catalog normalizes provider models and refreshes once when forced', async () => {
  const catalog = new CodexModelCatalog(modelListTransport(), { ttlMs: 60_000 });
  assert.equal((await catalog.discover())[0]?.id, 'm1');
  assert.equal((await catalog.discover())[0]?.id, 'm1');
  assert.equal((await catalog.discover({ forceRefresh: true }))[0]?.id, 'm2');
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json
```
Expected: missing catalog implementation.

- [ ] **Step 3: Implement normalized catalog mapping**

Map installed provider metadata to neutral `AvailableModel`. Keep uncertain quality/latency traits configurable through adapter-local classification rules; do not hard-code provider model names in `@aes/spec`, `@aes/runtime-sdk`, or `@aes/runtime`. Cache with TTL, and expose explicit `forceRefresh`.

- [ ] **Step 4: Test and commit**

```bash
tsc -p packages/adapter-codex/tsconfig.json && node --test packages/adapter-codex/dist/__tests__/model-catalog.test.js
```
Expected: PASS.

```bash
git add packages/adapter-codex/src/model-catalog.ts packages/adapter-codex/src/__tests__/model-catalog.test.ts
git commit -m "feat(codex): discover and normalize provider models"
```

### Task 4: Implement stateful Codex runtime session

**Files:**
- Create: `packages/adapter-codex/src/session.ts`
- Modify: `packages/adapter-codex/src/index.ts`
- Test: `packages/adapter-codex/src/__tests__/session.test.ts`

**Interfaces:**
- Consumes: `CodexTransport`, `RuntimeSession`, `RuntimeEvent`, `SessionCheckpoint`.
- Produces: `CodexRuntimeSession` implementing create/run/approval/compact/cancel/checkpoint/close behavior.

- [ ] **Step 1: Write failing streamed turn/approval/checkpoint test using FakeCodexAppServer**

```ts
test('CodexRuntimeSession streams normalized events and persists provider identity in checkpoint', async () => {
  const fake = FakeCodexAppServer.scenario('stream-with-approval');
  const session = new CodexRuntimeSession({
    sessionId: 's1',
    providerSessionId: 'thread-1',
    transport: fake.createTransport(),
    modelProfile: {
      id: 'm1', provider: 'codex',
      capabilities: { coding: true, toolUse: true, reasoningLevels: ['medium'] },
      traits: { qualityClass: 'balanced', latencyClass: 'standard' },
      availability: 'available', selectedReasoning: 'medium'
    }
  });

  const seen = [];
  for await (const event of session.runTurn({ turnId: 't1', input: { kind: 'text', text: 'safe synthetic request' } })) {
    seen.push(event.type);
    if (event.type === 'approval_requested') {
      await session.respondToApproval(event.requestId, { decision: 'approved' });
    }
  }
  assert.ok(seen.includes('approval_requested'));
  assert.ok(seen.includes('turn_completed'));
  assert.equal((await session.checkpoint()).providerSessionId, 'thread-1');
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json
```
Expected: missing session implementation.

- [ ] **Step 3: Implement session state machine and provider operations**

Maintain explicit state transitions from `created -> starting -> ready -> running` and temporary `awaiting_approval`, `compacting`, `recovering`; terminal `completed`, `cancelled`, `failed`. `respondToApproval`, `compact`, and `cancel` translate to adapter-local protocol methods. `checkpoint()` returns only normalized identity/state/model/context revision fields.

- [ ] **Step 4: Add cancellation/compaction tests and run suite**

Add tests that `cancel()` yields/records cancelled state and `compact()` emits normalized compaction events when the fake supports it.

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json && node --test packages/adapter-codex/dist/__tests__/session.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/adapter-codex/src/session.ts packages/adapter-codex/src/index.ts packages/adapter-codex/src/__tests__/session.test.ts
git commit -m "feat(codex): add stateful runtime sessions"
```

### Task 5: Implement CodexProvider and compatibility façade

**Files:**
- Create: `packages/adapter-codex/src/provider.ts`
- Create: `packages/adapter-codex/src/compat-adapter.ts`
- Modify: `packages/adapter-codex/src/index.ts`
- Modify: `packages/adapter-codex/src/__tests__/mapping.test.ts`
- Test: `packages/adapter-codex/src/__tests__/provider-contract.test.ts`

**Interfaces:**
- Consumes: `RuntimeProvider`, `CodexModelCatalog`, `CodexRuntimeSession`, `runProviderContractTests` from `@aes/runtime-sdk/testing`.
- Produces: `CodexProvider`, legacy `CodexRuntimeAdapter` façade.

- [ ] **Step 1: Write failing provider contract test**

```ts
import { runProviderContractTests } from '@aes/runtime-sdk/testing';

runProviderContractTests('codex provider with fake app server', async () => {
  const fake = FakeCodexAppServer.scenario('provider-contract');
  return new CodexProvider({ transportFactory: () => fake.createTransport() });
}, {
  supportsResume: true,
  supportsCancellation: true,
  supportsApprovals: true
});
```

- [ ] **Step 2: Verify RED**

Run:
```bash
tsc -p packages/adapter-codex/tsconfig.json
```
Expected: `CodexProvider` absent or incomplete.

- [ ] **Step 3: Implement provider façade and compatibility adapter**

`CodexProvider` returns normalized capabilities, delegates model discovery to catalog, creates/resumes sessions, and owns transport shutdown. Preserve the existing `CodexRuntimeAdapter` constructor, `resolveModel()`, `invokeModel()`, and `invokeTool()` compatibility behavior so Milestone 2 consumers keep compiling; mark it in comments/docs as the legacy deterministic façade. All real App Server execution in Milestone 3 goes through `CodexProvider`/`CodexRuntimeSession`, not through new vendor logic added to the legacy façade.

- [ ] **Step 4: Run adapter suite and vendor-boundary test**

```bash
tsc -p packages/adapter-codex/tsconfig.json
node --test packages/adapter-codex/dist/__tests__/*.test.js
tsc -p packages/kernel/tsconfig.json
node --test packages/kernel/dist/__tests__/vendor-boundary.test.js
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/adapter-codex/src packages/adapter-codex/src/__tests__
git commit -m "feat(codex): expose provider over app server sessions"
```

## Plan 3.4 Verification Gate

```bash
for p in spec runtime-sdk runtime kernel adapter-codex cli; do tsc -p "packages/$p/tsconfig.json"; done
for p in spec runtime-sdk runtime kernel adapter-codex cli; do
  if compgen -G "packages/$p/dist/__tests__/*.test.js" > /dev/null; then node --test packages/$p/dist/__tests__/*.test.js; fi
done
```
Expected: zero failures. Default test suite must use fakes/fixtures only and never spawn the real Codex binary.
