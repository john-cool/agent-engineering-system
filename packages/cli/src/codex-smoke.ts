import { execFile } from 'node:child_process';
import {
  CodexAppServerTransport,
  CodexProvider
} from '@aes/adapter-codex';

export type CodexSmokeResult =
  | { status: 'skipped'; reason: string }
  | { status: 'passed'; model: string; observedUsage: boolean }
  | { status: 'failed'; reason: string };

export interface CodexSmokeOptions {
  findBinary?: () => Promise<string | undefined>;
  workspaceId?: string;
}

type CodexExecFile = (
  file: string,
  args: string[],
  options: { shell: boolean },
  callback: (error: Error | null) => void
) => void;

export interface FindCodexBinaryOptions {
  platform?: NodeJS.Platform;
  execFile?: CodexExecFile;
}

export async function findCodexBinary(
  options: FindCodexBinaryOptions = {}
): Promise<string | undefined> {
  const command = (options.platform ?? process.platform) === 'win32' ? 'codex.cmd' : 'codex';
  const runExecFile: CodexExecFile = options.execFile ?? ((file, args, execOptions, callback) => {
    execFile(file, args, execOptions, callback);
  });
  return new Promise((resolve) => {
    runExecFile(command, ['--version'], { shell: command.endsWith('.cmd') }, (error) => resolve(error ? undefined : command));
  });
}

export async function runCodexSmoke(options: CodexSmokeOptions = {}): Promise<CodexSmokeResult> {
  const binary = await (options.findBinary ?? findCodexBinary)();
  if (!binary) return { status: 'skipped', reason: 'codex binary not found' };

  const workspaceId = options.workspaceId ?? process.cwd();
  const provider = new CodexProvider({
    workspaceId,
    transportFactory: () => new CodexAppServerTransport({ command: binary, cwd: workspaceId })
  });

  try {
    const models = await provider.discoverModels();
    const model = models.find((candidate) => candidate.availability === 'available');
    if (!model) return { status: 'skipped', reason: 'codex reported no available models' };

    const session = await provider.createSession({
      sessionId: `codex-smoke-${Date.now()}`,
      workspaceId,
      model
    });
    let completed = false;
    let observedUsage = false;
    try {
      for await (const event of session.runTurn({
        turnId: 'smoke-turn',
        input: {
          kind: 'text',
          text: 'Reply with the single word AES. Do not run tools or modify files.'
        }
      })) {
        if (event.type === 'approval_requested') {
          await session.respondToApproval(event.requestId, { decision: 'rejected' });
        }
        if (event.type === 'usage_updated') observedUsage = true;
        if (event.type === 'turn_completed') {
          completed = event.data.outcome === 'success';
          break;
        }
      }
    } finally {
      await session.close();
    }

    return completed
      ? { status: 'passed', model: model.id, observedUsage }
      : { status: 'failed', reason: 'codex smoke turn did not complete successfully' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/auth|login|account|credential/i.test(message)) {
      return { status: 'skipped', reason: `codex is not configured for live use: ${message}` };
    }
    return { status: 'failed', reason: message };
  } finally {
    await provider.shutdown();
  }
}
