# ADR-0001: Separate Specification, Kernel, and Runtime Adapters

Status: Accepted

## Decision

AES is split into:
1. normative specification
2. runtime-neutral kernel
3. runtime adapters

## Rationale

This prevents the standard from becoming coupled to Codex, Claude Code, Cursor, or any future runtime.

## Consequences

Positive:
- portability
- testability
- clearer contracts

Negative:
- more package boundaries
- adapter maintenance
