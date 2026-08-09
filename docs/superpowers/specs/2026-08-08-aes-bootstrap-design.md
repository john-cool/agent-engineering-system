# AES Bootstrap Design

Date: 2026-08-08
Status: Approved design, pending implementation-plan review

## Goal

Bootstrap the Agent Engineering Specification (AES) as a vendor-neutral specification plus a TypeScript/Node.js reference kernel.

The first implementation milestone will produce three foundations:

1. Architecture Decision Records (ADRs)
2. RFC-0001: Vision & Scope
3. A TypeScript/Node.js monorepo scaffold

## Scope

AES defines how an engineering agent should decide, route, execute, verify, manage context, and hand off work.

AES does not initially implement a full agent product, IDE, hosted service, UI, memory store, RAG platform, or model provider.

## Architecture

AES is split into four layers:

1. Specification
   - normative RFCs
   - MUST / SHOULD / MAY requirements
   - schemas and declarative contracts

2. Kernel
   - state machine
   - decision engine
   - policy engine
   - workflow engine
   - context policy
   - model routing
   - event bus

3. Runtime adapters
   - Codex
   - Claude Code
   - Cursor
   - future runtimes

4. External capabilities
   - models
   - tools
   - MCP
   - RAG
   - memory
   - observability

## Initial Package Boundaries

- `@aes/spec`: schemas, normative types, validators
- `@aes/kernel`: runtime-neutral orchestration kernel
- `@aes/runtime-sdk`: adapter interfaces and shared runtime contracts
- `@aes/cli`: local validation and workflow inspection
- `@aes/runtime-codex`: placeholder adapter package, no deep integration in milestone 1

## Technology

- TypeScript
- Node.js 22+
- ESM
- pnpm workspaces
- Vitest
- Zod for runtime validation
- JSON Schema generation where interoperability requires it
- Node EventEmitter-compatible event surface for milestone 1

RxJS and heavier workflow dependencies are intentionally deferred until a concrete need appears.

## Declarative Source of Truth

Machine-readable behavior is defined through YAML/JSON documents validated by schemas.

Markdown documents explain the standard but are not the execution source of truth.

Initial document kinds:

- Workflow
- Policy
- Playbook

## State Model

Initial lifecycle:

Discovery -> Planning -> Execution -> Verification -> Completed

Permitted recovery transitions:

- Discovery -> Discovery
- Planning -> Discovery
- Execution -> Planning
- Verification -> Execution
- Verification -> Planning

A workflow MUST NOT jump directly from Discovery to Completed.

## Model Strategy

AES exposes model capability classes rather than vendor-specific model names:

- cheap
- balanced
- powerful

Runtimes map these classes to concrete models.

Fast/low-latency mode is a runtime capability, not a model identity.

## Context Strategy

AES treats context as a managed resource.

The kernel exposes qualitative states:

- good
- growing
- start_fresh

The runtime MAY provide exact token telemetry, but AES MUST NOT depend on it.

## Events

The kernel emits lifecycle and decision events.

Initial event families:

- lifecycle.*
- decision.*
- policy.*
- tool.*
- context.*
- verification.*
- handoff.*

The event system is designed so observability and UI can be added without coupling them to the kernel.

## Error Handling

Errors are separated into:

- configuration errors
- validation errors
- runtime adapter errors
- tool execution errors
- policy violations
- workflow transition errors

Errors MUST be structured and carry machine-readable codes.

## Testing Strategy

Milestone 1 tests:

- schema validation
- state transition legality
- policy evaluation
- deterministic workflow execution
- adapter contract tests
- CLI validation smoke tests

No networked model tests are required for milestone 1.

## Non-Goals for Milestone 1

- multi-agent orchestration
- hosted control plane
- web UI
- persistent memory
- MCP server implementation
- RAG implementation
- production observability backend
- automatic cost billing
- autonomous model purchasing/routing

## Success Criteria

Milestone 1 is successful when:

1. The RFC and ADRs are internally consistent.
2. The monorepo installs with one `pnpm install`.
3. `pnpm test` passes.
4. A sample workflow validates against the schema.
5. The kernel can execute a deterministic sample lifecycle without calling an LLM.
6. A mock runtime adapter can receive model/tool requests.
7. The CLI can validate a workflow file.

## Implementation Order

1. Repository scaffold
2. Shared TypeScript configuration
3. `@aes/spec`
4. `@aes/kernel`
5. `@aes/runtime-sdk`
6. sample workflow/policy/playbook
7. CLI
8. mock adapter
9. tests
10. runtime-codex placeholder package

## Self-review

- No TBD/TODO placeholders remain.
- The first milestone is intentionally small and testable.
- Specification, kernel, and adapters have explicit boundaries.
- Vendor-specific integration is deferred.
- YAML is supported as an authoring format; schemas remain format-neutral.
