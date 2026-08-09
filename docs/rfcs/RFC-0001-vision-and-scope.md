# RFC-0001: AES Vision & Scope

Status: Draft for bootstrap approval
Date: 2026-08-08

## Abstract

Agent Engineering Specification (AES) defines a vendor-neutral engineering lifecycle and runtime contract for coding agents.

AES separates engineering behavior from the underlying model provider, agent runtime, tool transport, and user interface.

## Problem

Current coding agents frequently encode engineering behavior in tool-specific instruction files. These rules are difficult to reuse, validate, observe, test, and port across runtimes.

AES defines a common layer for:

- lifecycle
- decisions
- policies
- context management
- model capability routing
- verification
- handoff
- runtime integration

## Principles

1. Behavior over vendor identity.
2. Evidence before escalation.
3. Minimal sufficient context.
4. Powerful reasoning only where it changes decisions.
5. Verification before completion.
6. Declarative workflows where practical.
7. Runtime-neutral contracts.
8. Observable decisions.

## Normative Language

The terms MUST, MUST NOT, SHOULD, SHOULD NOT, and MAY are normative.

## Conformance

An AES-compatible runtime MUST:

- represent AES lifecycle states
- validate legal state transitions
- expose model capability classes
- support policy evaluation
- expose structured lifecycle events
- support verification outcomes
- support compact handoff generation or delegation

A runtime MAY omit optional subsystems such as memory, RAG, MCP, streaming, or persistent telemetry.

## Initial Lifecycle

Discovery -> Planning -> Execution -> Verification -> Completed

Recovery paths MAY return execution to planning, verification to execution, or planning to discovery.

## Model Classes

AES specifies:

- cheap
- balanced
- powerful

Concrete model names are runtime-specific.

## Context Health

AES specifies:

- good
- growing
- start_fresh

Exact token counts are optional telemetry.

## Runtime Boundary

AES does not prescribe:

- model vendor
- transport protocol
- UI
- memory database
- RAG implementation
- MCP implementation
- hosting topology

## Milestone 1

The initial reference implementation is TypeScript/Node.js and provides:

- schemas
- kernel
- runtime SDK
- CLI validator
- sample declarative workflows
- deterministic tests

## Future Work

Possible later RFCs may cover:

- multi-agent orchestration
- persistent memory contracts
- observability semantic conventions
- evals
- cost controls
- MCP integration profiles
- secure tool execution

## Milestone 2 Intelligence Layer

The adaptive routing, context, control, handoff, learning, and knowledge-memory design is specified in:

`docs/superpowers/specs/2026-08-08-aes-milestone-2-intelligence-layer-design.md`

Milestone 2 preserves the RFC-0001 vendor-neutral runtime boundary while adding deterministic intelligence engines and optional injected semantic classification.
