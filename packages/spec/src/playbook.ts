import { AesValidationError } from './errors.js';

export interface PlaybookDocument {
  kind: 'Playbook';
  version: 1;
  name: string;
  steps: string[];
}

export function validatePlaybookDocument(value: unknown): PlaybookDocument {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AesValidationError('Playbook must be an object');
  }
  const input = value as Record<string, unknown>;
  if (input.kind !== 'Playbook' || input.version !== 1) {
    throw new AesValidationError('Invalid Playbook kind or version');
  }
  if (typeof input.name !== 'string' || input.name.length === 0) {
    throw new AesValidationError('Playbook name must be a non-empty string');
  }
  if (!Array.isArray(input.steps) || input.steps.length === 0 || !input.steps.every((step) => typeof step === 'string' && step.length > 0)) {
    throw new AesValidationError('Playbook steps must be a non-empty string array');
  }
  return { kind: 'Playbook', version: 1, name: input.name, steps: [...input.steps] };
}
