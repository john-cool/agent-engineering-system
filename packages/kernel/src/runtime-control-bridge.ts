import type { ActionRequest, ControlActionType } from '@aes/spec';
import type { RuntimeAuthorizationResult, RuntimeControlBridge } from '@aes/runtime-sdk';
import type { ControlEngine, ControlScopes } from './control-engine.js';

export interface KernelRuntimeControlBridgeOptions {
  controlEngine: ControlEngine;
  scopes: ControlScopes;
  capabilityAvailable: (action: ControlActionType) => boolean;
}

export class KernelRuntimeControlBridge implements RuntimeControlBridge {
  constructor(private readonly options: KernelRuntimeControlBridgeOptions) {}

  async authorize(request: ActionRequest): Promise<RuntimeAuthorizationResult> {
    const mode = this.options.controlEngine.resolveMode(request.type, this.options.scopes);
    const decision = this.options.controlEngine.decide({
      request,
      mode,
      capabilityAvailable: this.options.capabilityAvailable(request.type)
    });
    return { outcome: decision.outcome, reason: decision.reason };
  }
}
