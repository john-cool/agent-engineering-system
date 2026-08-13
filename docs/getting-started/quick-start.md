# Quick start

Install Node >=22 and pnpm 10.14.0, then run `corepack pnpm@10.14.0 test`. Live Codex smoke tests are opt-in; the offline suite uses fakes and replay fixtures.

To see one complete AES runtime turn without a provider account or network access:

```powershell
node packages/cli/dist/index.js demo
```

The demo uses the deterministic in-memory provider. It shows model selection, runtime execution, verification, and the normalized token trace. It does not call a real AI model.
