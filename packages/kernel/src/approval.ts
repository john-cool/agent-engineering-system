export interface ApprovalRequest {
  id: string;
  actionId: string;
  summary: string;
  reason: string;
  expiresAt?: string;
}

export type ApprovalDecision = 'approved' | 'rejected';

export interface ApprovalRecord extends ApprovalRequest {
  decision: ApprovalDecision;
  decidedAt: string;
}

export const recordApproval = (
  request: ApprovalRequest,
  decision: ApprovalDecision,
  decidedAt = new Date().toISOString()
): ApprovalRecord => ({ ...request, decision, decidedAt });
