import type {
  ActionRequest,
  ControlActionType,
  ControlConfig,
  ControlDecision,
  ControlMode
} from '@aes/spec';
import type { ScopedAuthorityGrant, TaskSignature } from '@aes/spec';
import { matchesApplicability } from './task-signature.js';

export interface ControlScopes {
  aes: ControlConfig;
  user?: ControlConfig;
  project?: ControlConfig;
  session?: ControlConfig;
  explicit?: Partial<Record<ControlActionType, ControlMode>>;
  authorityContext?: TaskSignature;
  acceptedAuthority?: readonly ScopedAuthorityGrant[];
}

function matchingGrant(action: ControlActionType, scope: 'user' | 'project', context: TaskSignature | undefined, grants: readonly ScopedAuthorityGrant[] | undefined): ScopedAuthorityGrant | undefined {
  if (!context || !grants) return undefined;
  return grants.filter((grant) => grant.actionType === action && grant.scope === scope && matchesApplicability(context, grant.applicability)).sort((a, b) => Object.keys(b.applicability).length - Object.keys(a.applicability).length || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))[0];
}

export class ControlEngine {
  resolveMode(action: ControlActionType, scopes: ControlScopes): ControlMode {
    const configs = [scopes.aes, scopes.user, scopes.project, scopes.session]
      .filter((value): value is ControlConfig => value !== undefined);

    let mode: ControlMode = scopes.aes.default;
    for (const config of configs) {
      mode = config.actions?.[action] ?? config.default;
      const scope = config === scopes.user ? 'user' : config === scopes.project ? 'project' : undefined;
      if (scope) mode = matchingGrant(action, scope, scopes.authorityContext, scopes.acceptedAuthority)?.mode ?? mode;
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
