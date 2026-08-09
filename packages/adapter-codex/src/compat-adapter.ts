import type { ModelClass } from '@aes/spec';
import type {
  ModelRequest,
  ModelResponse,
  RuntimeAdapter,
  ToolRequest,
  ToolResponse
} from '@aes/runtime-sdk';

export interface CodexRuntimeConfig {
  models: Record<ModelClass, string>;
}

/** Legacy deterministic façade retained for Milestone 2 compatibility. */
export class CodexRuntimeAdapter implements RuntimeAdapter {
  constructor(private readonly config: CodexRuntimeConfig) {}

  getCapabilities() {
    return {
      modelRouting: true,
      fastMode: false,
      toolExecution: false,
      contextTelemetry: false,
      tokenTelemetry: false,
      contextCompaction: false,
      handoffInjection: false,
      conversationTransition: false,
      persistentMemory: false
    } as const;
  }

  resolveModel(modelClass: ModelClass): string {
    return this.config.models[modelClass];
  }

  async invokeModel(request: ModelRequest): Promise<ModelResponse> {
    return { text: `codex-adapter-placeholder:${this.resolveModel(request.modelClass)}` };
  }

  async invokeTool(request: ToolRequest): Promise<ToolResponse> {
    return {
      ok: false,
      error: `Codex tool bridge not implemented in legacy façade: ${request.name}`
    };
  }
}
