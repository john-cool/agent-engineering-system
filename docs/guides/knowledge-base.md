# Knowledge base

Use typed records and deterministic indexes under `.aes`. Run `rebuildIndexes()` after repair. Keep provenance and evidence; do not use filenames to encode trust.

The local store separates operational data by purpose:

```text
.aes/
├── raw/traces/                  # normalized runtime evidence
├── experience/candidates/       # mined learning candidates
├── experience/shadow/           # hypothetical decisions
├── experience/active/           # active learning artifacts
├── experience/interactions/     # truthful user approvals/rejections
├── experience/authority-candidates/
├── decisions/authority/         # scoped authority grants
├── overlays/project/            # reversible project overlays
├── overlays/user/               # explicitly promoted user overlays
├── index.json
└── index.md
```

`MemoryStore` can persist and list knowledge records, candidates, evaluations, overlays, interaction evidence, authority candidates, and grants. Index rebuilds are deterministic. Repair or migration must preserve provenance and must not silently resolve semantic conflicts.

Project-specific records remain project-scoped. Promotion to a broader scope requires privacy filtering, generalization, evidence, and explicit policy approval; uncertain promotion fails closed.
