# Runtime API

`AdaptiveRuntime.execute()` returns a normalized result and persists a `RuntimeDecisionTrace`. `RuntimeLearningObserver.observe()` is optional and failure-isolated. Replay and controlled runners return evidence; they do not activate overlays.

The runtime package also exports:

- `AdaptiveLearningCoordinator` for candidate observation, overlay listing, explanation, disabling, and lifecycle orchestration;
- `InteractionLearningCoordinator` for project-scoped interaction evidence, authority candidates, explicit grant acceptance, and conservative degradation;
- `ReplayEvaluationRunner` and `ControlledEvaluationRunner` for bounded evidence acquisition;
- `PatternAnalysisCoordinator` for budgeted optional hypothesis analysis with deterministic evidence validation;
- `WorkspaceRuntimeSupervisor` for one provider process per workspace and bounded shutdown/recovery.

Learning components are optional side effects of execution. If learning or persistence is unavailable, base task execution falls back safely where possible.
