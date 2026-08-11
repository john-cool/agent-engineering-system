# Runtime API

`AdaptiveRuntime.execute()` returns a normalized result and persists a `RuntimeDecisionTrace`. `RuntimeLearningObserver.observe()` is optional and failure-isolated. Replay and controlled runners return evidence; they do not activate overlays.
