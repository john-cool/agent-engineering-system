import type {
  RuntimeAuthorizationResult,
  RuntimeControlBridge,
  SessionCheckpoint
} from '@aes/runtime-sdk';

export interface ProviderRecoveryState {
  sessionAvailable: boolean;
  providerSessionId?: string;
  lastEventId?: string;
  actionState: 'none' | 'completed' | 'unknown';
}

export interface RecoveryReconcileInput {
  checkpoint: SessionCheckpoint;
  providerState: ProviderRecoveryState;
}

export type RecoveryReconcileResult =
  | { kind: 'safe'; providerSessionId: string }
  | { kind: 'ambiguous'; actionId: string; authorization: RuntimeAuthorizationResult }
  | { kind: 'lost'; reason: string };

export class RecoveryCoordinator {
  constructor(private readonly options: { control: RuntimeControlBridge }) {}

  async reconcile(input: RecoveryReconcileInput): Promise<RecoveryReconcileResult> {
    const { checkpoint, providerState } = input;

    if (
      !providerState.sessionAvailable ||
      !providerState.providerSessionId ||
      providerState.providerSessionId !== checkpoint.providerSessionId
    ) {
      return { kind: 'lost', reason: 'provider session could not be reconciled with checkpoint' };
    }

    if (checkpoint.lastActionId && providerState.actionState === 'unknown') {
      const authorization = await this.options.control.authorize({
        id: `recovery-${checkpoint.lastActionId}`,
        type: 'toolExecution',
        source: 'runtime-provider',
        reason: 'provider crashed with an ambiguous side-effect boundary; automatic replay is prohibited',
        confidence: 'low',
        payload: {
          actionId: checkpoint.lastActionId,
          providerSessionId: checkpoint.providerSessionId,
          lastEventId: providerState.lastEventId ?? checkpoint.lastEventId ?? null
        }
      });
      return { kind: 'ambiguous', actionId: checkpoint.lastActionId, authorization };
    }

    return { kind: 'safe', providerSessionId: providerState.providerSessionId };
  }
}
