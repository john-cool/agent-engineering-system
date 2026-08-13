import {
  FixedVerificationBridge,
  InMemoryCheckpointStore,
  InMemoryTraceStore,
  createInMemoryProvider
} from '@aes/runtime-sdk/testing';
import type { RuntimeAuthorizationResult } from '@aes/runtime-sdk';
import {
  AdaptiveRuntime,
  ModelResolver,
  WorkspaceRuntimeSupervisor
} from '@aes/runtime';

export interface DemoSummary {
  provider: string;
  model: string;
  capabilityClass: string;
  outcome: string;
  verification: string;
  totalTokens: number | undefined;
}

function totalTokens(inputTokens: number | undefined, outputTokens: number | undefined): number | undefined {
  if (inputTokens === undefined && outputTokens === undefined) return undefined;
  return (inputTokens ?? 0) + (outputTokens ?? 0);
}

export async function runDemo(): Promise<DemoSummary> {
  const traceStore = new InMemoryTraceStore();
  const control = {
    async authorize(): Promise<RuntimeAuthorizationResult> {
      return { outcome: 'execute', reason: 'offline demo execution' };
    }
  };
  const runtime = new AdaptiveRuntime({
    resolver: new ModelResolver(),
    supervisor: new WorkspaceRuntimeSupervisor({
      providerFactory: async () => createInMemoryProvider()
    }),
    control,
    traceStore,
    checkpointStore: new InMemoryCheckpointStore(),
    verification: new FixedVerificationBridge('passed')
  });

  const result = await runtime.execute({
    workspaceId: '/demo',
    taskId: 'demo-task',
    taskClass: 'offline-demo',
    requirement: {
      class: 'balanced',
      reasoning: 'medium',
      latency: 'prefer_fast',
      context: 'standard'
    },
    turn: {
      turnId: 'demo-turn',
      input: { kind: 'text', text: 'Demonstrate one deterministic AES runtime turn.' }
    }
  });

  const trace = result.trace ?? traceStore.items[0];
  if (!trace) throw new Error('AES demo did not produce a runtime trace.');

  return {
    provider: trace.telemetry.provider,
    model: trace.telemetry.model,
    capabilityClass: trace.resolution.selected.traits.qualityClass,
    outcome: trace.telemetry.outcome,
    verification: trace.telemetry.verification,
    totalTokens: totalTokens(trace.telemetry.inputTokens, trace.telemetry.outputTokens)
  };
}

export function formatDemoSummary(summary: DemoSummary): string {
  return [
    'AES demo',
    `Provider: ${summary.provider}`,
    `Model: ${summary.model}`,
    `Capability class: ${summary.capabilityClass}`,
    `Outcome: ${summary.outcome}`,
    `Verification: ${summary.verification}`,
    `Tokens: ${summary.totalTokens ?? 'unknown'}`
  ].join('\n');
}
