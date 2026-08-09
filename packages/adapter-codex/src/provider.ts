import type {
  CreateRuntimeSessionInput,
  RuntimeProvider,
  RuntimeProviderCapabilities,
  RuntimeSession,
  SessionCheckpoint
} from '@aes/runtime-sdk';
import { CodexAppServerTransport } from './app-server-transport.js';
import {
  CodexModelCatalog,
  type CodexModelCatalogOptions
} from './model-catalog.js';
import { isRecord } from './protocol.js';
import { CodexRuntimeSession } from './session.js';
import type { CodexTransport } from './transport.js';

export interface CodexProviderOptions {
  workspaceId?: string;
  transportFactory?: (workspaceId: string) => CodexTransport | Promise<CodexTransport>;
  modelCatalog?: Omit<CodexModelCatalogOptions, 'ttlMs'> & { ttlMs?: number };
  clientVersion?: string;
}

export class CodexProvider implements RuntimeProvider {
  readonly id = 'codex';
  private transport: CodexTransport | undefined;
  private catalog: CodexModelCatalog | undefined;
  private initialized = false;
  private readonly workspaceId: string;

  constructor(private readonly options: CodexProviderOptions = {}) {
    this.workspaceId = options.workspaceId ?? process.cwd();
  }

  async getCapabilities(): Promise<RuntimeProviderCapabilities> {
    return {
      modelDiscovery: true,
      modelRouting: true,
      fastMode: false,
      streaming: true,
      toolExecution: true,
      approvals: true,
      tokenTelemetry: true,
      contextTelemetry: false,
      contextCompaction: true,
      sessionResume: true,
      sessionCancellation: true,
      conversationTransition: false,
      persistentMemory: false
    };
  }

  async discoverModels(options: { forceRefresh?: boolean } = {}) {
    const { catalog } = await this.ensureInitialized();
    return catalog.discover(options);
  }

  async createSession(input: CreateRuntimeSessionInput): Promise<RuntimeSession> {
    const { transport } = await this.ensureInitialized();
    const response = await transport.request('thread/start', {
      model: input.model.id,
      cwd: input.workspaceId,
      approvalPolicy: 'onRequest',
      sandbox: 'workspaceWrite',
      serviceName: 'aes'
    });
    const providerSessionId = readThreadId(response);
    return new CodexRuntimeSession({
      sessionId: input.sessionId,
      providerSessionId,
      workspaceId: input.workspaceId,
      transport,
      modelProfile: input.model
    });
  }

  async resumeSession(checkpoint: SessionCheckpoint): Promise<RuntimeSession> {
    const { transport } = await this.ensureInitialized();
    const response = await transport.request('thread/resume', {
      threadId: checkpoint.providerSessionId,
      model: checkpoint.modelProfile.id
    });
    const providerSessionId = readThreadId(response);
    return new CodexRuntimeSession({
      sessionId: checkpoint.sessionId,
      providerSessionId,
      workspaceId: this.workspaceId,
      transport,
      modelProfile: checkpoint.modelProfile,
      initialState: 'ready',
      contextRevision: checkpoint.contextRevision
    });
  }

  async shutdown(): Promise<void> {
    const transport = this.transport;
    this.transport = undefined;
    this.catalog = undefined;
    this.initialized = false;
    if (transport) await transport.close();
  }

  private async ensureInitialized(): Promise<{ transport: CodexTransport; catalog: CodexModelCatalog }> {
    if (!this.transport) {
      this.transport = this.options.transportFactory
        ? await this.options.transportFactory(this.workspaceId)
        : new CodexAppServerTransport({ cwd: this.workspaceId });
    }
    if (!this.initialized) {
      await this.transport.request('initialize', {
        clientInfo: {
          name: 'aes',
          title: 'Agent Engineering Specification',
          version: this.options.clientVersion ?? '0.1.0'
        }
      });
      await this.transport.notify('initialized', {});
      this.initialized = true;
    }
    if (!this.catalog) {
      const modelCatalog = this.options.modelCatalog;
      this.catalog = new CodexModelCatalog(this.transport, {
        ttlMs: modelCatalog?.ttlMs ?? 60_000,
        ...(modelCatalog?.classify ? { classify: modelCatalog.classify } : {}),
        ...(modelCatalog?.now ? { now: modelCatalog.now } : {})
      });
    }
    return { transport: this.transport, catalog: this.catalog };
  }
}

function readThreadId(response: unknown): string {
  if (!isRecord(response) || !isRecord(response.thread) || typeof response.thread.id !== 'string') {
    throw new Error('invalid codex thread response: missing thread.id');
  }
  return response.thread.id;
}
