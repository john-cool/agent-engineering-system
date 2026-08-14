# Configure AES

Start from `examples/learning.yaml`. Normalize configuration through `@aes/cli`; partial nested settings preserve independent defaults.

The currently implemented `normalizeRuntimeConfig()` helper exposes defaults for the provider, raw-event telemetry, quality degradation mode, Codex workspace process scope, learning analysis/evaluation/controlled-evaluation limits, knowledge retrieval/budgets, and controlled-evaluation authority modes.

The example also shows the broader Milestone 4 vocabulary (`projectAutoActivation`, `interactionLearning`, maintenance, and retention). Those fields are part of the approved configuration design, but they are not all accepted by the current CLI normalization helper yet. Treat them as specification-level configuration until the parser/normalizer is extended; do not assume that every field in the example changes current CLI behavior.
