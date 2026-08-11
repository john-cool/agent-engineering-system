import type { OverlayEffect, PolicyOverlay, TaskSignature } from '@aes/spec';
import { matchesApplicability } from './task-signature.js';

const EVIDENCE_RANK = { observational: 0, comparative: 1, controlled: 2 } as const;

export interface OverlayResolution {
  effect?: OverlayEffect;
  appliedIds: string[];
  conflictIds: string[];
  reasons: string[];
  explanation?: {
    overlayId: string;
    evidenceStrength: PolicyOverlay['evidenceStrength'];
    evidenceRefs: string[];
    evaluationRefs: string[];
  };
}

function specificity(overlay: PolicyOverlay): number {
  const a = overlay.applicability;
  return [a.taskClass, a.stage, a.planStatus, a.taskComplexity, a.risk,
    a.architecturalDecisionRequired, a.language, a.stackTags, a.operationTags]
    .filter((value) => value !== undefined).length;
}

function sameEffect(a: OverlayEffect, b: OverlayEffect): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class PolicyOverlayEngine {
  resolve(kind: OverlayEffect['kind'], signature: TaskSignature, overlays: readonly PolicyOverlay[]): OverlayResolution {
    const applicable = overlays
      .filter((overlay) => overlay.status === 'active' && overlay.effect.kind === kind && matchesApplicability(signature, overlay.applicability))
      .sort((a, b) =>
        specificity(b) - specificity(a) ||
        EVIDENCE_RANK[b.evidenceStrength] - EVIDENCE_RANK[a.evidenceStrength] ||
        b.evaluationScore - a.evaluationScore ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        a.id.localeCompare(b.id));
    if (applicable.length === 0) return { appliedIds: [], conflictIds: [], reasons: ['no active applicable learned overlay'] };
    const winner = applicable[0]!;
    const tied = applicable.filter((overlay) =>
      specificity(overlay) === specificity(winner) &&
      EVIDENCE_RANK[overlay.evidenceStrength] === EVIDENCE_RANK[winner.evidenceStrength] &&
      overlay.evaluationScore === winner.evaluationScore &&
      overlay.updatedAt === winner.updatedAt);
    if (tied.some((overlay) => !sameEffect(overlay.effect, winner.effect))) {
      return { appliedIds: [], conflictIds: tied.map((overlay) => overlay.id), reasons: ['equally supported learned overlays conflict; base policy required'] };
    }
    return {
      effect: winner.effect,
      appliedIds: [winner.id],
      conflictIds: [],
      reasons: [`applied learned overlay ${winner.id}`],
      explanation: {
        overlayId: winner.id,
        evidenceStrength: winner.evidenceStrength,
        evidenceRefs: [...winner.evidenceRefs],
        evaluationRefs: [...winner.evaluationRefs]
      }
    };
  }
}
