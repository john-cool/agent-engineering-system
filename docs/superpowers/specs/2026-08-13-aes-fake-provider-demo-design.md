# AES Fake Provider Demo Design

## Goal

Add a small offline CLI demonstration that shows the AES runtime selecting a model, executing one deterministic turn through the existing in-memory provider, and reporting the resulting trace.

## User experience

From the repository root, a user runs:

```powershell
node packages/cli/dist/index.js demo
```

The command prints the provider, selected model, capability class, outcome, verification result, and known token count. It must not require API credentials, network access, a live provider, or irreversible side effects.

## Design

The demo composes existing provider-neutral runtime pieces:

1. `createInMemoryProvider()` supplies a deterministic `memory-balanced` model and lifecycle events.
2. `ModelResolver` selects that model for a `balanced` requirement.
3. `AdaptiveRuntime` executes one turn with in-memory trace and checkpoint stores.
4. `FixedVerificationBridge('passed')` provides deterministic verification.
5. A CLI formatter prints a short human-readable summary.

The demo is an example and diagnostic entry point, not a new production provider. It must not add provider-specific assumptions to `@aes/kernel`, `@aes/runtime`, or `@aes/spec`.

## Error behavior

If the demo cannot execute, the CLI prints the error message and exits with a non-zero status, matching the existing `validate` command behavior.

## Testing

Add a CLI test that invokes the demo composition with the in-memory provider and asserts the summary contains `Provider: memory`, `Model: memory-balanced`, and `Outcome: success`. Keep the test deterministic and offline. Run the focused test first, then typecheck and the complete offline suite.

## Scope boundary

This change does not add real-model integration, a new provider adapter, streaming output, arbitrary user prompts, persistent project storage, or a web interface.
