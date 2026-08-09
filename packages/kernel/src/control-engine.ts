import type {
  ActionRequest,
  ControlActionType,
  ControlConfig,
  ControlDecision,
  ControlMode
} from '@aes/spec';

export interface ControlScopes {
  aes: ControlConfig;
  user?: ControlConfig;
  project?: ControlConfig;
  session?: ControlConfig;
  explicit?: Partial<Record<ControlActionType, ControlMode>>;
}

export class ControlEngine {
  resolveMode(action: ControlActionType, scopes: ControlScopes): ControlMode {
    const configs = [scopes.aes, scopes.user, scopes.project, scopes.session]
      .filter((value): value is ControlConfig => value !== undefined);

    let mode: ControlMode = scopes.aes.default;
    for (const config of configs) {
      mode = config.actions?.[action] ?? config.default;
    }
    return scopes.explicit?.[action] ?? mode;
  }

  decide(input: {
    request: ActionRequest;
    mode: ControlMode;
    capabilityAvailable: boolean;
  }): ControlDecision {
    if (input.mode === 'manual') {
      return { actionId: input.request.id, mode: input.mode, outcome: 'recommend', reason: 'manual control mode' };
    }
    if (input.mode === 'assisted') {
      return { actionId: input.request.id, mode: input.mode, outcome: 'request_approval', reason: 'assisted control mode' };
    }
    if (!input.capabilityAvailable) {
      return { actionId: input.request.id, mode: input.mode, outcome: 'recommend', reason: 'runtime capability unavailable' };
    }
    return { actionId: input.request.id, mode: input.mode, outcome: 'execute', reason: 'autonomous control mode and capability available' };
  }
}
