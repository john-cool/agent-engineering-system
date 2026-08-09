export class AesWorkflowTransitionError extends Error {
  readonly code = 'AES_ILLEGAL_TRANSITION' as const;

  constructor(readonly from: string, readonly to: string) {
    super(`Illegal AES workflow transition: ${from} -> ${to}`);
    this.name = 'AesWorkflowTransitionError';
  }
}

export class AesTaskAnalysisError extends Error {
  readonly code = 'AES_TASK_ANALYSIS_INVALID' as const;

  constructor(message: string) {
    super(message);
    this.name = 'AesTaskAnalysisError';
  }
}
