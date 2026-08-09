export interface RuntimeCapabilities {
  modelRouting: boolean;
  fastMode: boolean;
  toolExecution: boolean;
  contextTelemetry: boolean;
  tokenTelemetry: boolean;
  contextCompaction: boolean;
  handoffInjection: boolean;
  conversationTransition: boolean;
  persistentMemory: boolean;
}

export interface RuntimeProviderCapabilities {
  modelDiscovery: boolean;
  modelRouting: boolean;
  fastMode: boolean;
  streaming: boolean;
  toolExecution: boolean;
  approvals: boolean;
  tokenTelemetry: boolean;
  contextTelemetry: boolean;
  contextCompaction: boolean;
  sessionResume: boolean;
  sessionCancellation: boolean;
  conversationTransition: boolean;
  persistentMemory: boolean;
}
