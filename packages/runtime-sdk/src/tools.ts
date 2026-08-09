export interface ToolRequest {
  name: string;
  input: unknown;
}

export interface ToolResponse {
  ok: boolean;
  output?: unknown;
  error?: string;
}
