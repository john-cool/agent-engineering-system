# AES Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Agent Engineering Specification (AES) TypeScript/Node.js monorepo with normative schemas, a deterministic reference kernel, runtime adapter contracts, sample declarative documents, and a CLI validator.

**Architecture:** AES is split into `@aes/spec`, `@aes/kernel`, `@aes/runtime-sdk`, `@aes/cli`, and a placeholder `@aes/runtime-codex`. Declarative YAML/JSON documents are validated by `@aes/spec`; `@aes/kernel` executes a deterministic lifecycle and emits structured events without directly calling any model; runtime adapters implement capability-class model/tool requests behind `@aes/runtime-sdk`.

**Tech Stack:** TypeScript 5.x, Node.js 22+, ESM, pnpm workspaces, Vitest, Zod, `yaml`, Commander, Node `EventEmitter`, JSON Schema generated from Zod where practical.

## Global Constraints

- Node.js MUST be version 22 or newer.
- The repository MUST use ESM.
- The workspace MUST use pnpm.
- The first milestone MUST NOT require network access or a live LLM to run tests.
- AES model capability classes MUST be `cheap`, `balanced`, and `powerful`.
- Context health states MUST be `good`, `growing`, and `start_fresh`.
- Markdown is documentation; YAML/JSON validated documents are the machine-readable execution source of truth.
- The reference kernel MUST remain vendor-neutral.
- Runtime-specific model names MUST stay outside `@aes/spec` and `@aes/kernel`.
- Lifecycle and decision events MUST be structured and machine-readable.
- Errors MUST carry stable machine-readable codes.
- RxJS, hosted services, persistent memory, MCP servers, RAG, multi-agent orchestration, web UI, and production telemetry backends are explicitly out of scope for this milestone.

---

## File Structure

```text
AES/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.workspace.ts
├── .gitignore
├── README.md
├── docs/
│   ├── adrs/...
│   ├── rfcs/RFC-0001-vision-and-scope.md
│   └── superpowers/
│       ├── specs/2026-08-08-aes-bootstrap-design.md
│       └── plans/2026-08-08-aes-bootstrap.md
├── packages/
│   ├── spec/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── common.ts
│   │       ├── workflow.ts
│   │       ├── policy.ts
│   │       ├── playbook.ts
│   │       ├── errors.ts
│   │       ├── parse.ts
│   │       └── __tests__/parse.test.ts
│   ├── runtime-sdk/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── model.ts
│   │       ├── tools.ts
│   │       ├── adapter.ts
│   │       └── __tests__/adapter-contract.test.ts
│   ├── kernel/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── events.ts
│   │       ├── errors.ts
│   │       ├── state-machine.ts
│   │       ├── policy-engine.ts
│   │       ├── decision-engine.ts
│   │       ├── kernel.ts
│   │       └── __tests__/
│   │           ├── state-machine.test.ts
│   │           ├── policy-engine.test.ts
│   │           └── kernel.test.ts
│   ├── cli/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── validate-command.ts
│   │       └── __tests__/validate-command.test.ts
│   └── runtime-codex/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts
└── examples/
    ├── workflow.yaml
    ├── policy.yaml
    └── playbook.yaml
```

The root documentation files already produced by the approved design are retained. Each package is intentionally small and exposes a single responsibility.

---

### Task 1: Bootstrap the pnpm/TypeScript workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `.gitignore`
- Create: `README.md`
- Create: `packages/spec/package.json`
- Create: `packages/spec/tsconfig.json`
- Create: `packages/spec/src/index.ts`
- Test: root `pnpm typecheck`

**Interfaces:**
- Produces: workspace commands `pnpm build`, `pnpm typecheck`, and `pnpm test` used by every later task.
- Produces: package namespace convention `@aes/*`.

- [ ] **Step 1: Initialize git and create the root package manifest**

Create `package.json`:

```json
{
  "name": "aes",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@10.14.0",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "test": "vitest --run --workspace vitest.workspace.ts"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.9.0",
    "vitest": "^3.2.0"
  }
}
```

Run:

```bash
git init
pnpm install
```

Expected: `pnpm-lock.yaml` is created with no install errors.

- [ ] **Step 2: Configure the workspace and shared TypeScript settings**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
```

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

Create `vitest.workspace.ts`:

```ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace(['packages/*/vitest.config.ts']);
```

Create `.gitignore`:

```text
node_modules/
dist/
coverage/
.DS_Store
```

- [ ] **Step 3: Create the first compilable package**

Create `packages/spec/package.json`:

```json
{
  "name": "@aes/spec",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  }
}
```

Create `packages/spec/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

Create `packages/spec/src/index.ts`:

```ts
export const AES_SPEC_VERSION = '0.1.0' as const;
```

- [ ] **Step 4: Add a minimal package Vitest configuration and run checks**

Create `packages/spec/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node'
  }
});
```

Run:

```bash
pnpm typecheck
pnpm build
```

Expected: both commands exit 0.

- [ ] **Step 5: Add root project description and commit**

Create `README.md`:

```md
# Agent Engineering Specification (AES)

AES is a vendor-neutral specification and TypeScript reference kernel for engineering-agent workflows, decisions, context management, model capability routing, verification, and handoff.

The project is currently implementing milestone 1 of RFC-0001.
```

Run:

```bash
git add .
git commit -m "chore: bootstrap AES monorepo"
```

Expected: clean working tree after commit.

---

### Task 2: Implement normative AES document schemas and parsing

**Files:**
- Modify: `packages/spec/package.json`
- Create: `packages/spec/src/common.ts`
- Create: `packages/spec/src/workflow.ts`
- Create: `packages/spec/src/policy.ts`
- Create: `packages/spec/src/playbook.ts`
- Create: `packages/spec/src/errors.ts`
- Create: `packages/spec/src/parse.ts`
- Modify: `packages/spec/src/index.ts`
- Create: `packages/spec/src/__tests__/parse.test.ts`

**Interfaces:**
- Produces: `ModelClass = 'cheap' | 'balanced' | 'powerful'`
- Produces: `ContextHealth = 'good' | 'growing' | 'start_fresh'`
- Produces: `LifecycleState = 'discovery' | 'planning' | 'execution' | 'verification' | 'completed'`
- Produces: `WorkflowDocument`, `PolicyDocument`, `PlaybookDocument`
- Produces: `parseWorkflowText(text, format)`, `parsePolicyText(text, format)`, `parsePlaybookText(text, format)`
- Produces: `AesValidationError` with stable code `AES_VALIDATION_ERROR`.

- [ ] **Step 1: Add validation dependencies**

Modify `packages/spec/package.json` dependencies:

```json
{
  "dependencies": {
    "yaml": "^2.8.0",
    "zod": "^4.0.0"
  }
}
```

Run:

```bash
pnpm install
```

Expected: install succeeds.

- [ ] **Step 2: Write failing parser tests**

Create `packages/spec/src/__tests__/parse.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  AesValidationError,
  parsePlaybookText,
  parsePolicyText,
  parseWorkflowText
} from '../index.js';

describe('AES declarative document parsing', () => {
  it('parses a valid YAML workflow', () => {
    const result = parseWorkflowText(`
kind: Workflow
version: 1
name: default
initial: discovery
states:
  discovery:
    next: [planning]
  planning:
    next: [execution, discovery]
  execution:
    next: [verification, planning]
  verification:
    next: [completed, execution, planning]
  completed:
    next: []
`, 'yaml');

    expect(result.name).toBe('default');
    expect(result.initial).toBe('discovery');
  });

  it('parses a valid JSON policy', () => {
    const result = parsePolicyText(JSON.stringify({
      kind: 'Policy',
      version: 1,
      name: 'architecture-escalation',
      when: { architecture: true },
      action: { modelClass: 'powerful' }
    }), 'json');

    expect(result.action.modelClass).toBe('powerful');
  });

  it('parses a valid YAML playbook', () => {
    const result = parsePlaybookText(`
kind: Playbook
version: 1
name: bugfix
steps:
  - reproduce
  - inspect
  - patch
  - verify
`, 'yaml');

    expect(result.steps).toEqual(['reproduce', 'inspect', 'patch', 'verify']);
  });

  it('throws a structured validation error for invalid model class', () => {
    expect(() => parsePolicyText(JSON.stringify({
      kind: 'Policy',
      version: 1,
      name: 'bad-policy',
      when: { architecture: true },
      action: { modelClass: 'ultra' }
    }), 'json')).toThrow(AesValidationError);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run:

```bash
pnpm --filter @aes/spec test
```

Expected: FAIL because parser exports do not exist.

- [ ] **Step 4: Implement shared enums and document schemas**

Create `packages/spec/src/common.ts`:

```ts
import { z } from 'zod';

export const ModelClassSchema = z.enum(['cheap', 'balanced', 'powerful']);
export type ModelClass = z.infer<typeof ModelClassSchema>;

export const ContextHealthSchema = z.enum(['good', 'growing', 'start_fresh']);
export type ContextHealth = z.infer<typeof ContextHealthSchema>;

export const LifecycleStateSchema = z.enum([
  'discovery',
  'planning',
  'execution',
  'verification',
  'completed'
]);
export type LifecycleState = z.infer<typeof LifecycleStateSchema>;
```

Create `packages/spec/src/workflow.ts`:

```ts
import { z } from 'zod';
import { LifecycleStateSchema } from './common.js';

export const WorkflowDocumentSchema = z.object({
  kind: z.literal('Workflow'),
  version: z.literal(1),
  name: z.string().min(1),
  initial: LifecycleStateSchema,
  states: z.record(
    LifecycleStateSchema,
    z.object({ next: z.array(LifecycleStateSchema) })
  )
});

export type WorkflowDocument = z.infer<typeof WorkflowDocumentSchema>;
```

Create `packages/spec/src/policy.ts`:

```ts
import { z } from 'zod';
import { ModelClassSchema } from './common.js';

export const PolicyDocumentSchema = z.object({
  kind: z.literal('Policy'),
  version: z.literal(1),
  name: z.string().min(1),
  when: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  action: z.object({
    modelClass: ModelClassSchema.optional(),
    fastMode: z.boolean().optional(),
    recommendFreshChat: z.boolean().optional()
  }).refine(
    (action) => Object.values(action).some((value) => value !== undefined),
    'policy action must contain at least one action'
  )
});

export type PolicyDocument = z.infer<typeof PolicyDocumentSchema>;
```

Create `packages/spec/src/playbook.ts`:

```ts
import { z } from 'zod';

export const PlaybookDocumentSchema = z.object({
  kind: z.literal('Playbook'),
  version: z.literal(1),
  name: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1)
});

export type PlaybookDocument = z.infer<typeof PlaybookDocumentSchema>;
```

- [ ] **Step 5: Implement structured validation errors and parsers**

Create `packages/spec/src/errors.ts`:

```ts
export class AesValidationError extends Error {
  readonly code = 'AES_VALIDATION_ERROR' as const;

  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'AesValidationError';
  }
}
```

Create `packages/spec/src/parse.ts`:

```ts
import YAML from 'yaml';
import type { ZodType } from 'zod';
import { AesValidationError } from './errors.js';
import { PlaybookDocumentSchema, type PlaybookDocument } from './playbook.js';
import { PolicyDocumentSchema, type PolicyDocument } from './policy.js';
import { WorkflowDocumentSchema, type WorkflowDocument } from './workflow.js';

export type DocumentFormat = 'yaml' | 'json';

function decode(text: string, format: DocumentFormat): unknown {
  try {
    return format === 'yaml' ? YAML.parse(text) : JSON.parse(text);
  } catch (error) {
    throw new AesValidationError(`Unable to parse ${format} document`, error);
  }
}

function parseWithSchema<T>(text: string, format: DocumentFormat, schema: ZodType<T>): T {
  const result = schema.safeParse(decode(text, format));
  if (!result.success) {
    throw new AesValidationError('AES document validation failed', result.error);
  }
  return result.data;
}

export const parseWorkflowText = (text: string, format: DocumentFormat): WorkflowDocument =>
  parseWithSchema(text, format, WorkflowDocumentSchema);

export const parsePolicyText = (text: string, format: DocumentFormat): PolicyDocument =>
  parseWithSchema(text, format, PolicyDocumentSchema);

export const parsePlaybookText = (text: string, format: DocumentFormat): PlaybookDocument =>
  parseWithSchema(text, format, PlaybookDocumentSchema);
```

Update `packages/spec/src/index.ts`:

```ts
export const AES_SPEC_VERSION = '0.1.0' as const;
export * from './common.js';
export * from './errors.js';
export * from './parse.js';
export * from './playbook.js';
export * from './policy.js';
export * from './workflow.js';
```

- [ ] **Step 6: Run tests and typecheck**

Run:

```bash
pnpm --filter @aes/spec test
pnpm --filter @aes/spec typecheck
```

Expected: all parser tests PASS and typecheck exits 0.

- [ ] **Step 7: Commit**

```bash
git add packages/spec pnpm-lock.yaml
git commit -m "feat(spec): add declarative AES schemas"
```

---

### Task 3: Implement the lifecycle state machine

**Files:**
- Create: `packages/kernel/package.json`
- Create: `packages/kernel/tsconfig.json`
- Create: `packages/kernel/vitest.config.ts`
- Create: `packages/kernel/src/errors.ts`
- Create: `packages/kernel/src/events.ts`
- Create: `packages/kernel/src/state-machine.ts`
- Create: `packages/kernel/src/index.ts`
- Create: `packages/kernel/src/__tests__/state-machine.test.ts`

**Interfaces:**
- Consumes: `WorkflowDocument`, `LifecycleState` from `@aes/spec`.
- Produces: `WorkflowStateMachine.current(): LifecycleState`.
- Produces: `WorkflowStateMachine.canTransition(to): boolean`.
- Produces: `WorkflowStateMachine.transition(to): LifecycleState`.
- Produces: `AesWorkflowTransitionError` with code `AES_ILLEGAL_TRANSITION`.
- Produces: `KernelEventMap` event type foundation.

- [ ] **Step 1: Create kernel package manifest and failing state machine tests**

Create `packages/kernel/package.json`:

```json
{
  "name": "@aes/kernel",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./dist/index.js" },
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@aes/spec": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3.2.0"
  }
}
```

Create `packages/kernel/tsconfig.json` and `packages/kernel/vitest.config.ts` using the same patterns as `@aes/spec`.

Create `packages/kernel/src/__tests__/state-machine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { WorkflowDocument } from '@aes/spec';
import { AesWorkflowTransitionError, WorkflowStateMachine } from '../index.js';

const workflow: WorkflowDocument = {
  kind: 'Workflow',
  version: 1,
  name: 'default',
  initial: 'discovery',
  states: {
    discovery: { next: ['planning'] },
    planning: { next: ['execution', 'discovery'] },
    execution: { next: ['verification', 'planning'] },
    verification: { next: ['completed', 'execution', 'planning'] },
    completed: { next: [] }
  }
};

describe('WorkflowStateMachine', () => {
  it('starts in the workflow initial state', () => {
    expect(new WorkflowStateMachine(workflow).current()).toBe('discovery');
  });

  it('performs a legal transition', () => {
    const machine = new WorkflowStateMachine(workflow);
    expect(machine.transition('planning')).toBe('planning');
  });

  it('rejects an illegal transition', () => {
    const machine = new WorkflowStateMachine(workflow);
    expect(() => machine.transition('completed')).toThrow(AesWorkflowTransitionError);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @aes/kernel test
```

Expected: FAIL because state machine exports do not exist.

- [ ] **Step 3: Implement the transition error and state machine**

Create `packages/kernel/src/errors.ts`:

```ts
export class AesWorkflowTransitionError extends Error {
  readonly code = 'AES_ILLEGAL_TRANSITION' as const;

  constructor(readonly from: string, readonly to: string) {
    super(`Illegal AES workflow transition: ${from} -> ${to}`);
    this.name = 'AesWorkflowTransitionError';
  }
}
```

Create `packages/kernel/src/state-machine.ts`:

```ts
import type { LifecycleState, WorkflowDocument } from '@aes/spec';
import { AesWorkflowTransitionError } from './errors.js';

export class WorkflowStateMachine {
  #state: LifecycleState;

  constructor(private readonly workflow: WorkflowDocument) {
    this.#state = workflow.initial;
  }

  current(): LifecycleState {
    return this.#state;
  }

  canTransition(to: LifecycleState): boolean {
    return this.workflow.states[this.#state].next.includes(to);
  }

  transition(to: LifecycleState): LifecycleState {
    if (!this.canTransition(to)) {
      throw new AesWorkflowTransitionError(this.#state, to);
    }
    this.#state = to;
    return this.#state;
  }
}
```

Create `packages/kernel/src/events.ts`:

```ts
import type { ContextHealth, LifecycleState, ModelClass } from '@aes/spec';

export interface KernelEventMap {
  'lifecycle.transition': { from: LifecycleState; to: LifecycleState };
  'decision.model': { modelClass: ModelClass; reason: string };
  'policy.matched': { policy: string };
  'context.health': { health: ContextHealth; reason: string };
  'verification.result': { passed: boolean; summary: string };
  'handoff.recommended': { reason: string };
}
```

Create `packages/kernel/src/index.ts`:

```ts
export * from './errors.js';
export * from './events.js';
export * from './state-machine.js';
```

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
pnpm --filter @aes/kernel test
pnpm --filter @aes/kernel typecheck
```

Expected: all state-machine tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel
git commit -m "feat(kernel): add lifecycle state machine"
```

---

### Task 4: Implement policy and decision evaluation

**Files:**
- Create: `packages/kernel/src/policy-engine.ts`
- Create: `packages/kernel/src/decision-engine.ts`
- Modify: `packages/kernel/src/index.ts`
- Create: `packages/kernel/src/__tests__/policy-engine.test.ts`

**Interfaces:**
- Consumes: `PolicyDocument`, `ModelClass` from `@aes/spec`.
- Produces: `PolicyEngine.evaluate(facts): PolicyAction[]`.
- Produces: `DecisionEngine.chooseModel(input): ModelDecision`.
- `ModelDecision` shape: `{ modelClass: ModelClass; fastMode: boolean; reason: string }`.

- [ ] **Step 1: Write failing policy and decision tests**

Create `packages/kernel/src/__tests__/policy-engine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { PolicyDocument } from '@aes/spec';
import { DecisionEngine, PolicyEngine } from '../index.js';

const architecturePolicy: PolicyDocument = {
  kind: 'Policy',
  version: 1,
  name: 'architecture-escalation',
  when: { architecture: true },
  action: { modelClass: 'powerful' }
};

describe('PolicyEngine', () => {
  it('returns actions from matching policies', () => {
    const actions = new PolicyEngine([architecturePolicy]).evaluate({ architecture: true });
    expect(actions).toEqual([{ policy: 'architecture-escalation', action: { modelClass: 'powerful' } }]);
  });

  it('does not return non-matching policies', () => {
    const actions = new PolicyEngine([architecturePolicy]).evaluate({ architecture: false });
    expect(actions).toEqual([]);
  });
});

describe('DecisionEngine', () => {
  it('defaults execution to balanced + fast mode', () => {
    const decision = new DecisionEngine([]).chooseModel({ stage: 'execution' });
    expect(decision).toEqual({
      modelClass: 'balanced',
      fastMode: true,
      reason: 'default execution routing'
    });
  });

  it('uses powerful for a matching architecture policy', () => {
    const decision = new DecisionEngine([architecturePolicy]).chooseModel({
      stage: 'planning',
      architecture: true
    });
    expect(decision.modelClass).toBe('powerful');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @aes/kernel test
```

Expected: FAIL because engines do not exist.

- [ ] **Step 3: Implement `PolicyEngine`**

Create `packages/kernel/src/policy-engine.ts`:

```ts
import type { PolicyDocument } from '@aes/spec';

export type Facts = Readonly<Record<string, string | number | boolean | undefined>>;

export interface MatchedPolicyAction {
  policy: string;
  action: PolicyDocument['action'];
}

export class PolicyEngine {
  constructor(private readonly policies: readonly PolicyDocument[]) {}

  evaluate(facts: Facts): MatchedPolicyAction[] {
    return this.policies
      .filter((policy) =>
        Object.entries(policy.when).every(([key, value]) => facts[key] === value)
      )
      .map((policy) => ({ policy: policy.name, action: policy.action }));
  }
}
```

- [ ] **Step 4: Implement `DecisionEngine`**

Create `packages/kernel/src/decision-engine.ts`:

```ts
import type { LifecycleState, ModelClass, PolicyDocument } from '@aes/spec';
import { PolicyEngine, type Facts } from './policy-engine.js';

export interface ModelDecision {
  modelClass: ModelClass;
  fastMode: boolean;
  reason: string;
}

export interface DecisionInput extends Facts {
  stage: LifecycleState;
}

export class DecisionEngine {
  readonly #policies: PolicyEngine;

  constructor(policies: readonly PolicyDocument[]) {
    this.#policies = new PolicyEngine(policies);
  }

  chooseModel(input: DecisionInput): ModelDecision {
    const matched = this.#policies.evaluate(input);
    const explicitModel = matched.find((item) => item.action.modelClass)?.action.modelClass;
    const explicitFast = matched.find((item) => item.action.fastMode !== undefined)?.action.fastMode;

    if (explicitModel) {
      return {
        modelClass: explicitModel,
        fastMode: explicitFast ?? true,
        reason: `matched policy: ${matched.find((item) => item.action.modelClass)?.policy}`
      };
    }

    if (input.stage === 'planning') {
      return { modelClass: 'balanced', fastMode: true, reason: 'default planning routing' };
    }

    return { modelClass: 'balanced', fastMode: true, reason: 'default execution routing' };
  }
}
```

Update `packages/kernel/src/index.ts`:

```ts
export * from './decision-engine.js';
export * from './errors.js';
export * from './events.js';
export * from './policy-engine.js';
export * from './state-machine.js';
```

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm --filter @aes/kernel test
pnpm --filter @aes/kernel typecheck
```

Expected: all kernel tests PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/kernel
git commit -m "feat(kernel): add policy and decision engines"
```

---

### Task 5: Define the runtime adapter SDK

**Files:**
- Create: `packages/runtime-sdk/package.json`
- Create: `packages/runtime-sdk/tsconfig.json`
- Create: `packages/runtime-sdk/vitest.config.ts`
- Create: `packages/runtime-sdk/src/model.ts`
- Create: `packages/runtime-sdk/src/tools.ts`
- Create: `packages/runtime-sdk/src/adapter.ts`
- Create: `packages/runtime-sdk/src/index.ts`
- Create: `packages/runtime-sdk/src/__tests__/adapter-contract.test.ts`

**Interfaces:**
- Consumes: `ModelClass` from `@aes/spec`.
- Produces: `RuntimeAdapter`.
- Produces: `ModelRequest`, `ModelResponse`, `ToolRequest`, `ToolResponse`.
- Runtime mapping remains outside the kernel.

- [ ] **Step 1: Create package and failing contract test**

Create `packages/runtime-sdk/package.json`:

```json
{
  "name": "@aes/runtime-sdk",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./dist/index.js" },
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@aes/spec": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3.2.0"
  }
}
```

Create matching `tsconfig.json` and `vitest.config.ts`.

Create `packages/runtime-sdk/src/__tests__/adapter-contract.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { RuntimeAdapter } from '../index.js';

class MockAdapter implements RuntimeAdapter {
  async invokeModel(request: Parameters<RuntimeAdapter['invokeModel']>[0]) {
    return {
      text: `mock:${request.modelClass}:${request.prompt}`,
      usage: { inputTokens: 0, outputTokens: 0 }
    };
  }

  async invokeTool(request: Parameters<RuntimeAdapter['invokeTool']>[0]) {
    return { ok: true, output: request.input };
  }
}

describe('RuntimeAdapter contract', () => {
  it('routes model capability classes without concrete model names', async () => {
    const adapter = new MockAdapter();
    const result = await adapter.invokeModel({
      modelClass: 'balanced',
      fastMode: true,
      prompt: 'hello'
    });
    expect(result.text).toBe('mock:balanced:hello');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @aes/runtime-sdk test
```

Expected: FAIL because `RuntimeAdapter` does not exist.

- [ ] **Step 3: Implement model and tool request types**

Create `packages/runtime-sdk/src/model.ts`:

```ts
import type { ModelClass } from '@aes/spec';

export interface ModelRequest {
  modelClass: ModelClass;
  fastMode: boolean;
  prompt: string;
}

export interface ModelResponse {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}
```

Create `packages/runtime-sdk/src/tools.ts`:

```ts
export interface ToolRequest {
  name: string;
  input: unknown;
}

export interface ToolResponse {
  ok: boolean;
  output?: unknown;
  error?: string;
}
```

Create `packages/runtime-sdk/src/adapter.ts`:

```ts
import type { ModelRequest, ModelResponse } from './model.js';
import type { ToolRequest, ToolResponse } from './tools.js';

export interface RuntimeAdapter {
  invokeModel(request: ModelRequest): Promise<ModelResponse>;
  invokeTool(request: ToolRequest): Promise<ToolResponse>;
}
```

Create `packages/runtime-sdk/src/index.ts`:

```ts
export * from './adapter.js';
export * from './model.js';
export * from './tools.js';
```

- [ ] **Step 4: Run test and typecheck**

Run:

```bash
pnpm --filter @aes/runtime-sdk test
pnpm --filter @aes/runtime-sdk typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime-sdk
git commit -m "feat(runtime-sdk): define runtime adapter contracts"
```

---

### Task 6: Implement the event-driven deterministic AES kernel

**Files:**
- Modify: `packages/kernel/package.json`
- Modify: `packages/kernel/src/events.ts`
- Create: `packages/kernel/src/kernel.ts`
- Modify: `packages/kernel/src/index.ts`
- Create: `packages/kernel/src/__tests__/kernel.test.ts`

**Interfaces:**
- Consumes: `WorkflowDocument`, `PolicyDocument` from `@aes/spec`.
- Consumes: `RuntimeAdapter` from `@aes/runtime-sdk`.
- Produces: `AESKernel`.
- Produces: `AESKernel.transition(to)`.
- Produces: `AESKernel.decideModel(facts)`.
- Produces: typed event emission for transition and decision events.
- The kernel MUST NOT select concrete vendor model names.

- [ ] **Step 1: Add runtime-sdk dependency and write failing kernel test**

Modify `packages/kernel/package.json` dependencies:

```json
{
  "dependencies": {
    "@aes/runtime-sdk": "workspace:*",
    "@aes/spec": "workspace:*"
  }
}
```

Create `packages/kernel/src/__tests__/kernel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { PolicyDocument, WorkflowDocument } from '@aes/spec';
import type { RuntimeAdapter } from '@aes/runtime-sdk';
import { AESKernel } from '../index.js';

const workflow: WorkflowDocument = {
  kind: 'Workflow',
  version: 1,
  name: 'default',
  initial: 'discovery',
  states: {
    discovery: { next: ['planning'] },
    planning: { next: ['execution', 'discovery'] },
    execution: { next: ['verification', 'planning'] },
    verification: { next: ['completed', 'execution', 'planning'] },
    completed: { next: [] }
  }
};

const policies: PolicyDocument[] = [{
  kind: 'Policy',
  version: 1,
  name: 'architecture-escalation',
  when: { architecture: true },
  action: { modelClass: 'powerful' }
}];

const adapter: RuntimeAdapter = {
  async invokeModel() {
    return { text: 'ok' };
  },
  async invokeTool(request) {
    return { ok: true, output: request.input };
  }
};

describe('AESKernel', () => {
  it('emits lifecycle transition events', () => {
    const kernel = new AESKernel({ workflow, policies, adapter });
    const events: unknown[] = [];
    kernel.on('lifecycle.transition', (event) => events.push(event));

    kernel.transition('planning');

    expect(events).toEqual([{ from: 'discovery', to: 'planning' }]);
  });

  it('emits model decisions without invoking a live model', () => {
    const kernel = new AESKernel({ workflow, policies, adapter });
    kernel.transition('planning');
    const decision = kernel.decideModel({ architecture: true });
    expect(decision.modelClass).toBe('powerful');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @aes/kernel test
```

Expected: FAIL because `AESKernel` does not exist.

- [ ] **Step 3: Implement typed event helpers**

Replace `packages/kernel/src/events.ts` with:

```ts
import { EventEmitter } from 'node:events';
import type { ContextHealth, LifecycleState, ModelClass } from '@aes/spec';

export interface KernelEventMap {
  'lifecycle.transition': { from: LifecycleState; to: LifecycleState };
  'decision.model': { modelClass: ModelClass; fastMode: boolean; reason: string };
  'policy.matched': { policy: string };
  'context.health': { health: ContextHealth; reason: string };
  'verification.result': { passed: boolean; summary: string };
  'handoff.recommended': { reason: string };
}

export class KernelEventBus {
  readonly #emitter = new EventEmitter();

  on<K extends keyof KernelEventMap>(event: K, listener: (payload: KernelEventMap[K]) => void): this {
    this.#emitter.on(event, listener);
    return this;
  }

  emit<K extends keyof KernelEventMap>(event: K, payload: KernelEventMap[K]): boolean {
    return this.#emitter.emit(event, payload);
  }
}
```

- [ ] **Step 4: Implement `AESKernel`**

Create `packages/kernel/src/kernel.ts`:

```ts
import type { LifecycleState, PolicyDocument, WorkflowDocument } from '@aes/spec';
import type { RuntimeAdapter } from '@aes/runtime-sdk';
import { DecisionEngine, type DecisionInput, type ModelDecision } from './decision-engine.js';
import { KernelEventBus, type KernelEventMap } from './events.js';
import { WorkflowStateMachine } from './state-machine.js';

export interface AESKernelOptions {
  workflow: WorkflowDocument;
  policies: readonly PolicyDocument[];
  adapter: RuntimeAdapter;
}

export class AESKernel {
  readonly #machine: WorkflowStateMachine;
  readonly #decisions: DecisionEngine;
  readonly #events = new KernelEventBus();
  readonly adapter: RuntimeAdapter;

  constructor(options: AESKernelOptions) {
    this.#machine = new WorkflowStateMachine(options.workflow);
    this.#decisions = new DecisionEngine(options.policies);
    this.adapter = options.adapter;
  }

  currentState(): LifecycleState {
    return this.#machine.current();
  }

  on<K extends keyof KernelEventMap>(event: K, listener: (payload: KernelEventMap[K]) => void): this {
    this.#events.on(event, listener);
    return this;
  }

  transition(to: LifecycleState): LifecycleState {
    const from = this.#machine.current();
    const result = this.#machine.transition(to);
    this.#events.emit('lifecycle.transition', { from, to: result });
    return result;
  }

  decideModel(facts: Omit<DecisionInput, 'stage'>): ModelDecision {
    const decision = this.#decisions.chooseModel({ stage: this.#machine.current(), ...facts });
    this.#events.emit('decision.model', decision);
    return decision;
  }
}
```

Update `packages/kernel/src/index.ts`:

```ts
export * from './decision-engine.js';
export * from './errors.js';
export * from './events.js';
export * from './kernel.js';
export * from './policy-engine.js';
export * from './state-machine.js';
```

- [ ] **Step 5: Run tests and all workspace checks**

Run:

```bash
pnpm --filter @aes/kernel test
pnpm typecheck
pnpm test
```

Expected: all tests PASS; no live model calls occur.

- [ ] **Step 6: Commit**

```bash
git add packages/kernel packages/runtime-sdk pnpm-lock.yaml
git commit -m "feat(kernel): add event-driven AES kernel"
```

---

### Task 7: Add canonical sample workflow, policy, and playbook

**Files:**
- Create: `examples/workflow.yaml`
- Create: `examples/policy.yaml`
- Create: `examples/playbook.yaml`
- Create: `packages/spec/src/__tests__/examples.test.ts`

**Interfaces:**
- Consumes: parser APIs from `@aes/spec`.
- Produces: canonical examples used by the CLI and integration tests.

- [ ] **Step 1: Create canonical examples**

Create `examples/workflow.yaml`:

```yaml
kind: Workflow
version: 1
name: engineering-default
initial: discovery
states:
  discovery:
    next: [planning]
  planning:
    next: [execution, discovery]
  execution:
    next: [verification, planning]
  verification:
    next: [completed, execution, planning]
  completed:
    next: []
```

Create `examples/policy.yaml`:

```yaml
kind: Policy
version: 1
name: architecture-escalation
when:
  architecture: true
action:
  modelClass: powerful
  fastMode: true
```

Create `examples/playbook.yaml`:

```yaml
kind: Playbook
version: 1
name: bugfix
steps:
  - reproduce
  - inspect
  - hypothesize
  - patch
  - verify
```

- [ ] **Step 2: Write an integration test that validates all examples**

Create `packages/spec/src/__tests__/examples.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePlaybookText, parsePolicyText, parseWorkflowText } from '../index.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../../../');

async function readExample(name: string) {
  return readFile(resolve(root, 'examples', name), 'utf8');
}

describe('canonical examples', () => {
  it('validates workflow.yaml', async () => {
    expect(parseWorkflowText(await readExample('workflow.yaml'), 'yaml').name).toBe('engineering-default');
  });

  it('validates policy.yaml', async () => {
    expect(parsePolicyText(await readExample('policy.yaml'), 'yaml').name).toBe('architecture-escalation');
  });

  it('validates playbook.yaml', async () => {
    expect(parsePlaybookText(await readExample('playbook.yaml'), 'yaml').name).toBe('bugfix');
  });
});
```

- [ ] **Step 3: Run example validation tests**

Run:

```bash
pnpm --filter @aes/spec test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add examples packages/spec/src/__tests__/examples.test.ts
git commit -m "docs(examples): add canonical AES documents"
```

---

### Task 8: Implement the AES CLI validator

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`
- Create: `packages/cli/vitest.config.ts`
- Create: `packages/cli/src/validate-command.ts`
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/__tests__/validate-command.test.ts`

**Interfaces:**
- Consumes: `parseWorkflowText`, `parsePolicyText`, `parsePlaybookText` from `@aes/spec`.
- Produces CLI: `aes validate <path>`.
- Exit code `0` on valid document, `1` on invalid/unsupported document.

- [ ] **Step 1: Create CLI package and failing test**

Create `packages/cli/package.json`:

```json
{
  "name": "@aes/cli",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "aes": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@aes/spec": "workspace:*",
    "commander": "^14.0.0"
  },
  "devDependencies": {
    "vitest": "^3.2.0"
  }
}
```

Create matching `tsconfig.json` and `vitest.config.ts`.

Create `packages/cli/src/__tests__/validate-command.test.ts`:

```ts
import { writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateFile } from '../validate-command.js';

describe('validateFile', () => {
  it('accepts a valid workflow', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aes-cli-'));
    const file = join(dir, 'workflow.yaml');
    await writeFile(file, `kind: Workflow\nversion: 1\nname: default\ninitial: discovery\nstates:\n  discovery: { next: [planning] }\n  planning: { next: [execution, discovery] }\n  execution: { next: [verification, planning] }\n  verification: { next: [completed, execution, planning] }\n  completed: { next: [] }\n`);

    await expect(validateFile(file)).resolves.toEqual({ kind: 'Workflow', name: 'default' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @aes/cli test
```

Expected: FAIL because `validateFile` does not exist.

- [ ] **Step 3: Implement validation by document `kind`**

Create `packages/cli/src/validate-command.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import YAML from 'yaml';
import {
  parsePlaybookText,
  parsePolicyText,
  parseWorkflowText,
  type DocumentFormat
} from '@aes/spec';

export async function validateFile(path: string): Promise<{ kind: string; name: string }> {
  const text = await readFile(path, 'utf8');
  const format: DocumentFormat = extname(path).toLowerCase() === '.json' ? 'json' : 'yaml';
  const raw = format === 'json' ? JSON.parse(text) : YAML.parse(text);

  switch (raw?.kind) {
    case 'Workflow': {
      const doc = parseWorkflowText(text, format);
      return { kind: doc.kind, name: doc.name };
    }
    case 'Policy': {
      const doc = parsePolicyText(text, format);
      return { kind: doc.kind, name: doc.name };
    }
    case 'Playbook': {
      const doc = parsePlaybookText(text, format);
      return { kind: doc.kind, name: doc.name };
    }
    default:
      throw new Error('Unsupported AES document kind');
  }
}
```

Note: because this file imports `yaml` directly, add `"yaml": "^2.8.0"` to `@aes/cli` dependencies. This is intentional: document-kind detection happens before the schema-specific parser is selected.

- [ ] **Step 4: Implement Commander entry point**

Create `packages/cli/src/index.ts`:

```ts
#!/usr/bin/env node
import { Command } from 'commander';
import { validateFile } from './validate-command.js';

const program = new Command();

program
  .name('aes')
  .description('Agent Engineering Specification tools')
  .command('validate')
  .argument('<path>')
  .action(async (path: string) => {
    try {
      const result = await validateFile(path);
      console.log(`valid ${result.kind}: ${result.name}`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  });

await program.parseAsync(process.argv);
```

- [ ] **Step 5: Run tests, build, and smoke-test CLI**

Run:

```bash
pnpm --filter @aes/cli test
pnpm --filter @aes/cli build
node packages/cli/dist/index.js validate examples/workflow.yaml
```

Expected output:

```text
valid Workflow: engineering-default
```

- [ ] **Step 6: Commit**

```bash
git add packages/cli pnpm-lock.yaml
git commit -m "feat(cli): validate AES declarative documents"
```

---

### Task 9: Add a mock runtime and deterministic end-to-end lifecycle test

**Files:**
- Create: `packages/kernel/src/__tests__/integration.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `AESKernel`, canonical parsed workflow/policy, mock `RuntimeAdapter`.
- Demonstrates: Discovery -> Planning -> Execution -> Verification -> Completed without a networked LLM.

- [ ] **Step 1: Write end-to-end lifecycle test**

Create `packages/kernel/src/__tests__/integration.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parsePolicyText, parseWorkflowText } from '@aes/spec';
import type { RuntimeAdapter } from '@aes/runtime-sdk';
import { AESKernel } from '../index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');

const adapter: RuntimeAdapter = {
  async invokeModel(request) {
    return { text: `mock:${request.modelClass}` };
  },
  async invokeTool(request) {
    return { ok: true, output: request.input };
  }
};

describe('AES deterministic lifecycle', () => {
  it('completes a lifecycle and routes architecture planning to powerful', async () => {
    const workflow = parseWorkflowText(
      await readFile(resolve(root, 'examples/workflow.yaml'), 'utf8'),
      'yaml'
    );
    const policy = parsePolicyText(
      await readFile(resolve(root, 'examples/policy.yaml'), 'utf8'),
      'yaml'
    );
    const kernel = new AESKernel({ workflow, policies: [policy], adapter });

    kernel.transition('planning');
    expect(kernel.decideModel({ architecture: true }).modelClass).toBe('powerful');
    kernel.transition('execution');
    expect(kernel.decideModel({}).modelClass).toBe('balanced');
    kernel.transition('verification');
    kernel.transition('completed');

    expect(kernel.currentState()).toBe('completed');
  });
});
```

- [ ] **Step 2: Run integration test**

Run:

```bash
pnpm --filter @aes/kernel test
```

Expected: PASS with zero network calls.

- [ ] **Step 3: Document the first runnable flow**

Append to `README.md`:

```md
## Milestone 1 flow

```text
YAML/JSON -> @aes/spec -> @aes/kernel -> @aes/runtime-sdk adapter
```

The bootstrap kernel is deterministic and can be tested without an LLM. Runtime adapters map AES capability classes such as `balanced` or `powerful` to concrete provider models.

Validate a document locally:

```bash
pnpm build
node packages/cli/dist/index.js validate examples/workflow.yaml
```
```

- [ ] **Step 4: Run complete workspace verification**

Run:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Expected: all three commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/kernel/src/__tests__/integration.test.ts README.md
git commit -m "test: verify deterministic AES lifecycle"
```

---

### Task 10: Add the `@aes/runtime-codex` integration boundary without provider coupling

**Files:**
- Create: `packages/runtime-codex/package.json`
- Create: `packages/runtime-codex/tsconfig.json`
- Create: `packages/runtime-codex/vitest.config.ts`
- Create: `packages/runtime-codex/src/index.ts`
- Create: `packages/runtime-codex/src/__tests__/mapping.test.ts`

**Interfaces:**
- Consumes: `RuntimeAdapter`, `ModelRequest`, `ModelResponse`, `ToolRequest`, `ToolResponse` from `@aes/runtime-sdk`.
- Produces: `CodexRuntimeConfig` and `CodexRuntimeAdapter` boundary.
- This milestone MUST NOT call a live Codex/OpenAI endpoint.
- Concrete model names appear only in runtime configuration, never in the AES kernel/spec.

- [ ] **Step 1: Create package and failing capability mapping test**

Create `packages/runtime-codex/package.json`:

```json
{
  "name": "@aes/runtime-codex",
  "version": "0.1.0",
  "type": "module",
  "exports": { ".": "./dist/index.js" },
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@aes/runtime-sdk": "workspace:*",
    "@aes/spec": "workspace:*"
  },
  "devDependencies": {
    "vitest": "^3.2.0"
  }
}
```

Create matching `tsconfig.json` and `vitest.config.ts`.

Create `packages/runtime-codex/src/__tests__/mapping.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CodexRuntimeAdapter } from '../index.js';

describe('CodexRuntimeAdapter', () => {
  it('maps AES capability classes using runtime configuration', () => {
    const adapter = new CodexRuntimeAdapter({
      models: {
        cheap: 'codex-cheap',
        balanced: 'codex-balanced',
        powerful: 'codex-powerful'
      }
    });

    expect(adapter.resolveModel('powerful')).toBe('codex-powerful');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @aes/runtime-codex test
```

Expected: FAIL because adapter does not exist.

- [ ] **Step 3: Implement the boundary adapter**

Create `packages/runtime-codex/src/index.ts`:

```ts
import type { ModelClass } from '@aes/spec';
import type {
  ModelRequest,
  ModelResponse,
  RuntimeAdapter,
  ToolRequest,
  ToolResponse
} from '@aes/runtime-sdk';

export interface CodexRuntimeConfig {
  models: Record<ModelClass, string>;
}

export class CodexRuntimeAdapter implements RuntimeAdapter {
  constructor(private readonly config: CodexRuntimeConfig) {}

  resolveModel(modelClass: ModelClass): string {
    return this.config.models[modelClass];
  }

  async invokeModel(request: ModelRequest): Promise<ModelResponse> {
    return {
      text: `codex-adapter-placeholder:${this.resolveModel(request.modelClass)}`
    };
  }

  async invokeTool(request: ToolRequest): Promise<ToolResponse> {
    return {
      ok: false,
      error: `Codex tool bridge not implemented in milestone 1: ${request.name}`
    };
  }
}
```

The placeholder response is intentionally deterministic. A real provider bridge requires a later RFC because transport, authentication, tool protocol, and model identifiers are external/runtime-specific concerns.

- [ ] **Step 4: Run package and workspace checks**

Run:

```bash
pnpm --filter @aes/runtime-codex test
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add packages/runtime-codex
git commit -m "feat(runtime-codex): add AES adapter boundary"
```

---

### Task 11: Final milestone verification and documentation consistency check

**Files:**
- Modify if necessary: `README.md`
- Modify if necessary: `docs/rfcs/RFC-0001-vision-and-scope.md`
- Modify if necessary: `docs/adrs/*.md`

**Interfaces:**
- Produces: a repository that meets every milestone-1 success criterion from the approved design.

- [ ] **Step 1: Verify the specification requirement matrix**

Check each item manually:

```text
[ ] spec/kernel/runtime boundaries exist
[ ] TypeScript/Node 22+/ESM/pnpm configuration exists
[ ] Workflow/Policy/Playbook schemas exist
[ ] model classes are cheap/balanced/powerful
[ ] context health types are good/growing/start_fresh
[ ] legal workflow transitions are enforced
[ ] event-driven kernel surface exists
[ ] stable structured validation and transition errors exist
[ ] CLI validates canonical workflow
[ ] deterministic lifecycle requires no LLM/network
[ ] mock/runtime adapter contract exists
[ ] Codex-specific names are isolated to runtime-codex
```

Expected: every box can be checked from concrete code or tests.

- [ ] **Step 2: Run final automated verification**

Run:

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
node packages/cli/dist/index.js validate examples/workflow.yaml
```

Expected:

```text
Node: v22.x or newer
all typechecks pass
all tests pass
all packages build
valid Workflow: engineering-default
```

- [ ] **Step 3: Ensure documentation describes only implemented milestone-1 behavior**

Search:

```bash
grep -RniE 'TBD|TODO|implemented|supports|provides' README.md docs
```

Review every claim mentioning implemented/supports/provides. Remove or reword any claim that describes a future capability as already available.

- [ ] **Step 4: Inspect git diff and status**

Run:

```bash
git status --short
git log --oneline --decorate -12
```

Expected: no uncommitted source changes and a sequence of small milestone commits.

- [ ] **Step 5: Create milestone completion commit only if documentation changed**

If Step 3 required documentation edits:

```bash
git add README.md docs
git commit -m "docs: align AES milestone 1 documentation"
```

If no documentation changed, do not create an empty commit.

---

## Plan Self-Review

### Spec coverage

- RFC/ADR foundation: preserved under `docs/` and verified in Task 11.
- Monorepo scaffold: Task 1.
- Schemas and declarative documents: Tasks 2 and 7.
- State machine: Task 3.
- Policy/decision engine: Task 4.
- Runtime adapter SDK: Task 5.
- Event-driven kernel: Task 6.
- CLI validator: Task 8.
- Deterministic no-LLM execution: Task 9.
- Codex runtime boundary: Task 10.
- Final full-repository verification: Task 11.

No milestone-1 requirement from the approved design is left without an implementation task.

### Placeholder scan

The plan contains no `TBD`, no implementation `TODO`, and no unspecified "add tests" steps. The only appearance of the string `TODO` is inside Task 11's grep command, where it is intentionally searched for as a documentation-quality check.

### Type consistency

- `ModelClass` is consistently `cheap | balanced | powerful`.
- `LifecycleState` is consistently `discovery | planning | execution | verification | completed`.
- `RuntimeAdapter.invokeModel` and `invokeTool` signatures are shared by kernel tests and runtime-codex.
- `AESKernel.decideModel()` returns the `ModelDecision` created by `DecisionEngine`.
- Canonical YAML examples match the Zod schemas defined in Task 2.
