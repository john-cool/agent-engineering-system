import type { ActionRequest } from '@aes/spec';

export interface RuntimeAuthorizationResult {
  outcome: 'recommend' | 'request_approval' | 'execute' | 'blocked';
  reason: string;
}

export interface RuntimeControlBridge {
  authorize(request: ActionRequest): Promise<RuntimeAuthorizationResult>;
}
