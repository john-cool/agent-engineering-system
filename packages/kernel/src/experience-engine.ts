import type { DecisionTrace, ExperienceHypothesis } from '@aes/spec';
import type { RuntimeExperienceEvidence } from '@aes/runtime-sdk';

export class ExperienceEngine {
  aggregate(
    entries: readonly { id: string; trace: DecisionTrace }[],
    recommendation: string
  ): ExperienceHypothesis {
    if (entries.length === 0) {
      throw new Error('AES experience aggregation requires at least one trace');
    }
    const taskClass = entries[0]!.trace.taskClass;
    if (!entries.every(({ trace }) => trace.taskClass === taskClass)) {
      throw new Error('AES experience aggregation requires a single task class');
    }
    return {
      id: `experience:${taskClass}:${recommendation}`,
      taskClass,
      recommendation,
      sampleCount: entries.length,
      successCount: entries.filter(({ trace }) => trace.verificationOutcome === 'passed').length,
      retryCount: entries.reduce((sum, { trace }) => sum + trace.retries, 0),
      overrideCount: entries.reduce((sum, { trace }) => sum + trace.userOverrides.length, 0),
      evidenceRefs: entries.map(({ id }) => id)
    };
  }


  aggregateRuntimeEvidence(
    entries: readonly RuntimeExperienceEvidence[],
    recommendation: string
  ): ExperienceHypothesis {
    const attributable = entries.filter((entry) => entry.attributableToModelQuality);
    if (attributable.length === 0) {
      throw new Error('AES runtime experience aggregation requires at least one attributable verified trace');
    }
    const taskClass = attributable[0]!.taskClass;
    if (!attributable.every((entry) => entry.taskClass === taskClass)) {
      throw new Error('AES runtime experience aggregation requires a single task class');
    }
    return {
      id: `experience:${taskClass}:${recommendation}`,
      taskClass,
      recommendation,
      sampleCount: attributable.length,
      successCount: attributable.filter((entry) => entry.verification === 'passed').length,
      retryCount: attributable.reduce((sum, entry) => sum + entry.retries, 0),
      overrideCount: attributable.reduce((sum, entry) => sum + entry.userInterruptions, 0),
      evidenceRefs: attributable.map((entry) => entry.id)
    };
  }
}
