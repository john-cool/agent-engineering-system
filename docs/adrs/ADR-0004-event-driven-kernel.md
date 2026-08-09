# ADR-0004: Event-Driven Kernel Surface

Status: Accepted

## Decision

The AES kernel emits structured events for lifecycle transitions, decisions, policy results, tool activity, context state, and verification.

## Rationale

UI, observability, metrics, and streaming should attach without changing core orchestration logic.

## Consequences

Milestone 1 uses a lightweight EventEmitter-compatible interface. More complex reactive dependencies are deferred.
