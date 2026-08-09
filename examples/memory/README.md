# AES Knowledge & Experience Base

Milestone 2 uses a project-local `.aes/` knowledge base:

```text
.aes/
├── raw/          # append-only evidence
├── knowledge/    # maintained semantic knowledge
├── decisions/    # durable rationale / ADR-like records
├── experience/   # procedural learning and failure patterns
├── evals/        # evidence used to promote or reject hypotheses
├── index.md      # compact retrieval map
├── log.md        # append-only knowledge change log
└── MEMORY.md     # concise project-memory entrypoint
```

Project-specific content must not be promoted to user/global memory automatically. Only generalized procedural learning, stripped of project-specific identifiers and content, may be proposed for broader scope when policy allows it.

Trusted knowledge promotion requires a successful Evaluation Gate result. Experience hypotheses remain candidates until their verified sample count, success rate, retry rate, override rate, and regression rate satisfy the configured thresholds.
