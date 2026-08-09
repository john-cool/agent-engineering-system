import type { ControlActionType } from '@aes/spec';

export interface RuntimeAction {
  id: string;
  type: ControlActionType;
  payload: unknown;
}

export interface RuntimeActionResult {
  actionId: string;
  executed: boolean;
  output?: unknown;
  error?: string;
}
