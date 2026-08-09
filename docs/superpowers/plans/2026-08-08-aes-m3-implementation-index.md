# AES Milestone 3 Implementation Index

Approved design: `docs/superpowers/specs/2026-08-08-aes-milestone-3-adaptive-runtime-codex-design.md`

Execute the implementation plans in this order:

1. `2026-08-08-aes-m3-01-runtime-contracts-model-resolution.md`
2. `2026-08-08-aes-m3-02-runtime-resilience-storage.md`
3. `2026-08-08-aes-m3-02a-resource-governance.md`
4. `2026-08-08-aes-m3-03-provider-test-harness.md`
5. `2026-08-08-aes-m3-04-codex-provider.md`
6. `2026-08-08-aes-m3-05-adaptive-runtime-integration.md`

Dependency rationale:

- 3.1 freezes neutral contracts before implementations depend on them.
- 3.2 makes persistence/recovery primitives testable without any provider.
- 3.2a adds token/cost resource governance before provider execution is wired.
- 3.3 creates deterministic provider testing infrastructure before real Codex behavior is implemented.
- 3.4 implements Codex strictly against the neutral contracts and fake/replay harness.
- 3.5 composes runtime + kernel control + provider + learning, then adds the opt-in live smoke path.

Every plan ends with a full offline green-suite gate. A plan must not start if the previous plan's gate is red.

## Spec Coverage Map

- Sections 1–4 and 54: enforced as global constraints/invariants across all five plans and the final architecture gate.
- Sections 5–10, 14, 17–20: Plan 3.1.
- Section 15 plus Sections 21–25, 27, 29–33, 37–41: Plan 3.2.
- Section 22.1 plus resource-governance additions to Sections 7, 50–53: Plan 3.2a + Plan 3.5 integration.
- Sections 42–45, 47–48: Plan 3.3.
- Sections 11–13, 16, 18, 34–35, and compatibility façade 49.1: Plan 3.4.
- Sections 6–7, 12, 16, 23, 26, 28, 33–40, 46, 49–52: Plan 3.5.
- Section 25 is covered by Plan 3.1 (`KnowledgeStore` contract) plus Plan 3.2 (`MemoryStore` implementation).
- Section 36 is covered by Plan 3.1 (`RuntimeObservationSink`) plus Plan 3.5 (`KernelRuntimeObservationSink`).
- Section 46 live Codex verification is explicitly opt-in and may finish as SKIPPED/NOT VERIFIED when the environment lacks a working Codex binary/account.
- Section 53 is this five-plan decomposition itself.
- Every Section 4 normative invariant has either a focused test or an assertion in the Plan 3.5 end-to-end/vendor-boundary gate.
