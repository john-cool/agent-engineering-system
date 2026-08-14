# Budgets

Controlled evaluation is bounded by daily tokens, explicit pricing currency, maximum runs, sandbox requirements, and Control Engine permission. Unknown usage blocks a configured budget rather than becoming free.

Evidence acquisition follows this order:

1. sufficient natural comparative evidence;
2. replay/offline evidence;
3. controlled evaluation only when it is eligible and justified.

`ReplayEvaluationRunner` returns replay-tagged evidence but cannot activate a policy by itself. `ControlledEvaluationRunner` blocks fixtures with external side-effect risk, requires a sandbox when `sandboxOnly` is enabled, enforces per-candidate and daily budgets, and asks the Control Engine before execution. A blocked or unresolved evaluation is not interpreted as a model-quality failure.
