import { createHash } from 'node:crypto';
import type { RuntimeFailureKind } from '@aes/spec';

export interface FailureFingerprintInput {
  kind: RuntimeFailureKind;
  code?: string;
  normalizedMessage?: string;
  strategyId?: string;
}

export function fingerprintFailure(input: FailureFingerprintInput): string {
  const payload = JSON.stringify({
    kind: input.kind,
    code: input.code ?? null,
    normalizedMessage: input.normalizedMessage ?? null,
    strategyId: input.strategyId ?? null
  });
  return createHash('sha256').update(payload).digest('hex');
}
