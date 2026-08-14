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

export const DEFAULT_RUN_TIMEOUT_MS = 300_000;

export type RunProgressStage =
  | 'starting'
  | 'model_selected'
  | 'turn_started'
  | 'tool_requested'
  | 'approval_requested'
  | 'completed'
  | 'failed';

export interface RunProgressEvent {
  stage: RunProgressStage;
  message: string;
}

export interface RunTaskOptions {
  workspaceId?: string;
  providerFactory?: (workspaceId: string) => Promise<RuntimeProvider>;
  readOnly?: boolean;
  timeoutMs?: number;
  onProgress?: (event: RunProgressEvent) => void;
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

  const timeoutMs = options.timeoutMs ?? DEFAULT_RUN_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('timeoutMs must be a positive finite number');
  }

  const workspaceId = options.workspaceId ?? process.cwd();
  const traceStore = new InMemoryTraceStore();
  const output: string[] = [];
  let cleanupStarted = false;
  const emitProgress = (event: RunProgressEvent): void => {
    try {
      options.onProgress?.(event);
    } catch {
      // Progress is observational and must not change task execution.
    }
  };
  emitProgress({ stage: 'starting', message: 'task accepted' });
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
  const execute = async (): Promise<RunTaskResult> => {
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
        if (event.type === 'turn_started') emitProgress({ stage: 'turn_started', message: 'provider turn started' });
        if (event.type === 'tool_requested') emitProgress({ stage: 'tool_requested', message: `tool requested: ${event.toolName}` });
        if (event.type === 'approval_requested') emitProgress({ stage: 'approval_requested', message: 'provider approval requested' });
      }
    });

    const trace = result.trace;
    emitProgress({
      stage: 'model_selected',
      message: `model selected: ${trace?.telemetry.model ?? result.resolution?.selected.id ?? 'unknown'}`
    });
    emitProgress({ stage: 'completed', message: `task completed: ${result.outcome}` });
    return {
      output: output.join(''),
      outcome: result.outcome,
      verification: trace?.telemetry.verification ?? 'not_run',
      provider: trace?.telemetry.provider ?? 'unknown',
      model: trace?.telemetry.model ?? result.resolution?.selected.id ?? 'unknown'
    };
  };

  try {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(async () => {
        cleanupStarted = true;
        emitProgress({ stage: 'failed', message: `task timed out after ${timeoutMs} ms` });
        await supervisor.shutdownAll();
        reject(new Error(`task timed out after ${timeoutMs} ms`));
      }, timeoutMs);
    });
    try {
      return await Promise.race([execute(), timeout]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
  } finally {
    if (!cleanupStarted) {
      cleanupStarted = true;
      await supervisor.shutdownAll();
    }
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

export function formatRunProgress(event: RunProgressEvent): string {
  return `[aes] ${event.stage}: ${event.message}`;
}
