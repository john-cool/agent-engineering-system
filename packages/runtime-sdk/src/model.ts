import type { ModelClass } from '@aes/spec';

export interface ModelRequest {
  modelClass: ModelClass;
  fastMode: boolean;
  prompt: string;
}

export interface ModelResponse {
  text: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}
