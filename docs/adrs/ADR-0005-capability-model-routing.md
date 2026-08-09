# ADR-0005: Capability-Based Model Routing

Status: Accepted

## Decision

AES uses capability classes (`cheap`, `balanced`, `powerful`) instead of concrete model names.

## Rationale

Model names, prices, and availability change. Engineering intent should remain stable.

## Consequences

Runtime adapters are responsible for mapping capability classes to concrete models and optional fast/low-latency modes.
