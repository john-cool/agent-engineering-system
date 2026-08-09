import type { RuntimeProviderCapabilities } from './capabilities.js';
import type { AvailableModel } from './resolution.js';
import type { CreateRuntimeSessionInput, RuntimeSession, SessionCheckpoint } from './session.js';

export interface RuntimeProvider {
  readonly id: string;
  getCapabilities(): Promise<RuntimeProviderCapabilities>;
  discoverModels(options?: { forceRefresh?: boolean }): Promise<AvailableModel[]>;
  createSession(input: CreateRuntimeSessionInput): Promise<RuntimeSession>;
  resumeSession(checkpoint: SessionCheckpoint): Promise<RuntimeSession>;
  shutdown(): Promise<void>;
}
