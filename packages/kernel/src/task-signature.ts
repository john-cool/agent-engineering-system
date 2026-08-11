import type { Applicability, TaskSignature } from '@aes/spec';

const MAX_TAGS = 16;
const MAX_TAG_LENGTH = 64;

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeTags(values: readonly string[] | undefined): string[] | undefined {
  if (!values) return undefined;
  const normalized = [...new Set(values.map(normalizeText).filter(Boolean).map((value) => value.slice(0, MAX_TAG_LENGTH)))]
    .sort()
    .slice(0, MAX_TAGS);
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizeTaskSignature(input: TaskSignature): TaskSignature {
  const stackTags = normalizeTags(input.stackTags);
  const operationTags = normalizeTags(input.operationTags);
  return {
    taskClass: normalizeText(input.taskClass),
    ...(input.stage ? { stage: input.stage } : {}),
    ...(input.planStatus ? { planStatus: input.planStatus } : {}),
    ...(input.taskComplexity ? { taskComplexity: input.taskComplexity } : {}),
    ...(input.risk ? { risk: input.risk } : {}),
    ...(input.architecturalDecisionRequired !== undefined
      ? { architecturalDecisionRequired: input.architecturalDecisionRequired } : {}),
    ...(input.language ? { language: normalizeText(input.language) } : {}),
    ...(stackTags ? { stackTags } : {}),
    ...(operationTags ? { operationTags } : {})
  };
}

function includesAll(actual: readonly string[] | undefined, expected: readonly string[] | undefined): boolean {
  return !expected || expected.every((value) => actual?.includes(value));
}

export function matchesApplicability(signature: TaskSignature, applicability: Applicability): boolean {
  if (applicability.taskClass && signature.taskClass !== normalizeText(applicability.taskClass)) return false;
  if (applicability.stage && signature.stage !== applicability.stage) return false;
  if (applicability.planStatus && signature.planStatus !== applicability.planStatus) return false;
  if (applicability.taskComplexity && !signature.taskComplexity ||
      applicability.taskComplexity && !applicability.taskComplexity.includes(signature.taskComplexity!)) return false;
  if (applicability.risk && !signature.risk ||
      applicability.risk && !applicability.risk.includes(signature.risk!)) return false;
  if (applicability.architecturalDecisionRequired !== undefined &&
      signature.architecturalDecisionRequired !== applicability.architecturalDecisionRequired) return false;
  if (applicability.language && signature.language !== normalizeText(applicability.language)) return false;
  if (!includesAll(signature.stackTags, normalizeTags(applicability.stackTags))) return false;
  if (!includesAll(signature.operationTags, normalizeTags(applicability.operationTags))) return false;
  return true;
}

export function applicabilityKey(input: Applicability): string {
  const stackTags = normalizeTags(input.stackTags);
  const operationTags = normalizeTags(input.operationTags);
  return JSON.stringify({
    ...(input.taskClass ? { taskClass: normalizeText(input.taskClass) } : {}),
    ...(input.stage ? { stage: input.stage } : {}),
    ...(input.planStatus ? { planStatus: input.planStatus } : {}),
    ...(input.taskComplexity ? { taskComplexity: [...input.taskComplexity].sort() } : {}),
    ...(input.risk ? { risk: [...input.risk].sort() } : {}),
    ...(input.architecturalDecisionRequired !== undefined
      ? { architecturalDecisionRequired: input.architecturalDecisionRequired } : {}),
    ...(input.language ? { language: normalizeText(input.language) } : {}),
    ...(stackTags ? { stackTags } : {}),
    ...(operationTags ? { operationTags } : {})
  });
}
