export interface GeneralizedExperienceInput {
  taskClass: string;
  recommendation: string;
  [key: string]: unknown;
}

export interface GeneralizedExperience {
  taskClass: string;
  recommendation: string;
}

export function sanitizeGeneralizedExperience(record: GeneralizedExperienceInput): GeneralizedExperience {
  return {
    taskClass: record.taskClass,
    recommendation: record.recommendation
  };
}
