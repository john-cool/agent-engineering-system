import type { ModelRequest, ModelResponse } from './model.js';
import type { ToolRequest, ToolResponse } from './tools.js';
import type { RuntimeCapabilities } from './capabilities.js';
import type { RuntimeAction, RuntimeActionResult } from './actions.js';

export interface RuntimeAdapter {
  invokeModel(request: ModelRequest): Promise<ModelResponse>;
  invokeTool(request: ToolRequest): Promise<ToolResponse>;
  getCapabilities?(): RuntimeCapabilities;
  executeAction?(action: RuntimeAction): Promise<RuntimeActionResult>;
}
