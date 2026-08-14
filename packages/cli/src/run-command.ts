import { CodexProvider } from '@aes/adapter-codex';
import {
  FixedVerificationBridge,
  InMemoryCheckpointStore,
  InMemoryTraceStore
} from '@aes/runtime-sdk/testing';
import type { RuntimeProvider } from '@aes/runtime-sdk';
import type { RuntimeVerification } from '@aes/spec';
import {
  AdaptiveRuntime,
  ModelResolver,
  WorkspaceRuntimeSupervisor
} from '@aes/runtime';

export interface RunTaskOptions {
  workspaceId?: string;
  providerFactory?: (workspaceId: string) => Promise<RuntimeProvider>;
  readOnly?: boolean;
}

export interface ParsedRunArguments {
  task: string;
  readOnly: boolean;
}

export interface RunTaskResult {
  output: string;
  outcome: string;
  verification: RuntimeVerification;
  provider: string;
  model: string;
}

export function parseRunArguments(argv: readonly string[]): ParsedRunArguments {
  const readOnly = argv[0] === '--read-only';
  const task = (readOnly ? argv.slice(1) : argv).join(' ').trim();
  if (!task) throw new Error('task must not be empty');
  return { task, readOnly };
}

export async function runTask(task: string, options: RunTaskOptions = {}): Promise<RunTaskResult> {
  const text = task.trim();
  if (!text) throw new Error('task must not be empty');

  const workspaceId = options.workspaceId ?? process.cwd();
  const traceStore = new InMemoryTraceStore();
  const output: string[] = [];
  const supervisor = new WorkspaceRuntimeSupervisor({
    providerFactory: options.providerFactory ?? (async (workspace) => new CodexProvider({
      workspaceId: workspace,
      ...(options.readOnly ? { approvalPolicy: 'never', sandbox: 'read-only' } : {})
    }))
  });
  const runtime = new AdaptiveRuntime({
    resolver: new ModelResolver(),
    supervisor,
    control: {
      async authorize() {
        if (options.readOnly) {
          return { outcome: 'execute', reason: 'read-only sandbox permits non-mutating tool execution' };
        }
        return { outcome: 'request_approval', reason: 'non-interactive run command requires explicit tool approval' };
      }
    },
    traceStore,
    checkpointStore: new InMemoryCheckpointStore(),
    verification: new FixedVerificationBridge('passed')
  });

  const turnId = `turn:${Date.now()}`;
  try {
    const result = await runtime.execute({
      workspaceId,
      taskId: `cli-run:${Date.now()}`,
      taskClass: 'user-task',
      requirement: {
        class: 'balanced',
        reasoning: 'medium',
        latency: 'prefer_fast',
        context: 'standard'
      },
      turn: { turnId, input: { kind: 'text', text } },
      onEvent(event) {
        if (event.type === 'output_delta') output.push(event.data.text);
      }
    });

    const trace = result.trace;
    return {
      output: output.join(''),
      outcome: result.outcome,
      verification: trace?.telemetry.verification ?? 'not_run',
      provider: trace?.telemetry.provider ?? 'unknown',
      model: trace?.telemetry.model ?? result.resolution?.selected.id ?? 'unknown'
    };
  } finally {
    await supervisor.shutdownAll();
  }
}

export function formatRunSummary(result: RunTaskResult): string {
  return [
    result.output,
    '',
    `Provider: ${result.provider}`,
    `Model: ${result.model}`,
    `Outcome: ${result.outcome}`,
    `Verification: ${result.verification}`
  ].join('\n');
}
