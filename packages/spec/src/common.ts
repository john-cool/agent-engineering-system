export const MODEL_CLASSES = ['cheap', 'balanced', 'powerful'] as const;
export type ModelClass = (typeof MODEL_CLASSES)[number];

export const CONTEXT_HEALTH_STATES = ['good', 'growing', 'start_fresh'] as const;
export type ContextHealth = (typeof CONTEXT_HEALTH_STATES)[number];

export const LIFECYCLE_STATES = [
  'discovery',
  'planning',
  'execution',
  'verification',
  'completed'
] as const;
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];

export function isModelClass(value: unknown): value is ModelClass {
  return typeof value === 'string' && (MODEL_CLASSES as readonly string[]).includes(value);
}

export function isLifecycleState(value: unknown): value is LifecycleState {
  return typeof value === 'string' && (LIFECYCLE_STATES as readonly string[]).includes(value);
}
