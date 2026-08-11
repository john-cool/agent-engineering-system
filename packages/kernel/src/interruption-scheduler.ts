import type { InterruptionUrgency } from '@aes/spec';
export interface ScheduledInterruption { id: string; summary: string; urgency: InterruptionUrgency; }
export interface InterruptionSchedule { immediate: ScheduledInterruption[]; boundary: ScheduledInterruption[]; digest: ScheduledInterruption[]; }
export class InterruptionScheduler { schedule(items: readonly ScheduledInterruption[]): InterruptionSchedule { return { immediate: items.filter((item) => item.urgency === 'immediate'), boundary: items.filter((item) => item.urgency === 'boundary'), digest: items.filter((item) => item.urgency === 'digest') }; } }
