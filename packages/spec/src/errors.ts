export class AesValidationError extends Error {
  readonly code = 'AES_VALIDATION_ERROR' as const;
  readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'AesValidationError';
    this.details = details;
  }
}
