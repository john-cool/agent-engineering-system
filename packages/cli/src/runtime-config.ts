import type { ControlMode } from '@aes/spec';

export interface RuntimeConfigInput {
  runtime?: { provider?: string };
  telemetry?: { providerRawEvents?: boolean };
  modelResolution?: { qualityDegradation?: ControlMode };
  codex?: { processScope?: 'workspace' };
}

export interface NormalizedRuntimeConfig {
  runtime: { provider: string };
  telemetry: { providerRawEvents: boolean };
  modelResolution: { qualityDegradation: ControlMode };
  codex: { processScope: 'workspace' };
}

export function normalizeRuntimeConfig(input: RuntimeConfigInput): NormalizedRuntimeConfig {
  return {
    runtime: { provider: input.runtime?.provider ?? 'codex' },
    telemetry: { providerRawEvents: input.telemetry?.providerRawEvents ?? false },
    modelResolution: { qualityDegradation: input.modelResolution?.qualityDegradation ?? 'assisted' },
    codex: { processScope: 'workspace' }
  };
}
