# Start Here in Codex

Paste this as the first instruction after opening the AES repository:

> Continue AES from the approved Milestone 4 handoff. Read `AGENTS.md` and `HANDOFF.md`, then read the global constraints and Task 1 from `docs/superpowers/plans/2026-08-09-aes-milestone-4-adaptive-learning-knowledge.md`. Treat `docs/superpowers/specs/2026-08-09-aes-milestone-4-adaptive-learning-knowledge-design.md` as the approved architecture. Use Superpowers. First verify the clean baseline with Node >=22 / pnpm 10.14.0 and the complete offline test suite. If green, create/use an isolated worktree and implement Task 1 strictly with TDD. Do not redesign Milestone 4 unless repository evidence invalidates the approved plan. Use subagents/review gates where available, keep context minimal, and verify before every completion claim.

## Expected continuation

The first implementation target is **Task 1: Add normative Milestone 4 contracts without breaking Milestone 3 callers**.

Do not begin with documentation or live Codex integration; follow the implementation plan ordering unless a verified dependency forces a change.
