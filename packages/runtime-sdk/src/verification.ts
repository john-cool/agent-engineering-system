import type { RuntimeVerification } from '@aes/spec';

export interface RuntimeVerificationInput {
  taskId: string;
  sessionId: string;
  turnId?: string;
  provider: string;
  model: string;
}

export interface RuntimeVerificationBridge {
  verify(input: RuntimeVerificationInput): Promise<RuntimeVerification>;
}
