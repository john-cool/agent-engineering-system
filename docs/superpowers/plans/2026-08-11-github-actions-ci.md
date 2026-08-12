# GitHub Actions CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a deterministic GitHub Actions workflow that validates pull requests and pushes to `main`.

**Architecture:** Use one repository workflow with Node.js 22 and pnpm 10.14.0. The workflow runs the existing `typecheck` and offline `test` scripts; it does not run live Codex integration or require secrets.

**Tech Stack:** GitHub Actions, `actions/checkout@v4`, `actions/setup-node@v4`, Node.js 22, Corepack, pnpm 10.14.0.

## Global Constraints

- Node.js version: `>=22`.
- Package manager: `pnpm@10.14.0`.
- Offline tests must not require a live provider.
- Live Codex integration remains opt-in.
- Do not change the approved AES architecture.

---

### Task 1: Add repository CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: root `package.json` scripts `typecheck` and `test`.
- Produces: required CI checks for pull requests and pushes to `main`.

- [x] **Step 1: Create the workflow**

Create a workflow named `CI` triggered by `pull_request` and pushes to `main`. Use `ubuntu-latest`, Node.js `22.x`, pnpm `10.14.0`, dependency caching through `actions/setup-node`, then run:

```yaml
corepack pnpm@10.14.0 install --frozen-lockfile=false
corepack pnpm@10.14.0 typecheck
corepack pnpm@10.14.0 test
```

- [x] **Step 2: Verify the workflow content**

Run `git diff --check` and inspect the changed YAML for the required triggers, runtime versions, and commands. The workflow must not contain live-provider commands or secrets.

- [x] **Step 3: Run the same checks locally**

Run `corepack pnpm@10.14.0 typecheck` and `corepack pnpm@10.14.0 test`. Expected: exit code 0 with all existing suites passing.

- [x] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml docs/superpowers/plans/2026-08-11-github-actions-ci.md
git commit -m "ci: add offline GitHub Actions checks"
```
