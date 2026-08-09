# ADR-0006: Keep the Milestone-1 Bootstrap Core Dependency-Free

Status: Accepted for milestone 1
Date: 2026-08-08

## Context

The approved bootstrap design selected Zod, `yaml`, Commander, and Vitest as convenient reference dependencies. During implementation, the execution environment had Node.js 22 and TypeScript available but no working npm/pnpm registry access.

The architecture does not require those libraries: schema validation, document decoding, CLI dispatch, and tests are replaceable implementation details beneath the public AES contracts.

## Decision

The milestone-1 reference core uses:

- TypeScript and Node.js 22+;
- Node's built-in test runner;
- a small AES-focused YAML subset decoder plus JSON decoding;
- explicit TypeScript validation functions;
- a minimal Node CLI entry point.

The repository remains a pnpm workspace and declares TypeScript / Node types as development dependencies for normal installations.

## Consequences

Positive:

- the bootstrap is deterministic and has no runtime third-party dependencies;
- kernel/spec/runtime boundaries remain unchanged;
- the implementation can be exercised without network access after toolchain availability.

Trade-offs:

- the built-in YAML decoder intentionally supports the AES configuration subset, not the complete YAML specification;
- validation is explicit TypeScript code rather than Zod schemas;
- the test runner is `node:test` rather than Vitest;
- the CLI does not depend on Commander.

A later RFC/ADR MAY replace any of these implementation details without changing the AES document or runtime contracts.
