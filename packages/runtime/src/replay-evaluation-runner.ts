import type { ReplayEvaluationExecutor } from '@aes/runtime-sdk';
export class ReplayEvaluationRunner { constructor(private readonly executor: ReplayEvaluationExecutor) {} async run(input: { candidateId: string; evidenceRefs: string[] }) { return (await this.executor.replay(input)).map((row) => ({ ...row, origin: 'replay' as const })); } }
