#!/usr/bin/env node
import { validateFile } from './validate-command.js';
import { formatDemoSummary, runDemo } from './demo-command.js';
import { formatRunProgress, formatRunSummary, parseRunArguments, runTask } from './run-command.js';

async function main(argv: readonly string[]): Promise<void> {
  const [command, ...commandArguments] = argv;
  if (command === 'run') {
    try {
      const parsed = parseRunArguments(commandArguments);
      const result = await runTask(parsed.task, {
        readOnly: parsed.readOnly,
        onProgress: (event) => console.error(formatRunProgress(event))
      });
      console.log(formatRunSummary(result));
      if (result.outcome !== 'success' && result.outcome !== 'recovered' || result.verification === 'failed') {
        process.exitCode = 1;
      }
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
    return;
  }
  if (command === 'demo' && commandArguments.length === 0) {
    try {
      console.log(formatDemoSummary(await runDemo()));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
    return;
  }

  if (command !== 'validate' || commandArguments.length !== 1) {
    console.error('Usage: aes validate <path> | aes demo | aes run [--read-only] "<task>"');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await validateFile(commandArguments[0]!);
    console.log(`valid ${result.kind}: ${result.name}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

await main(process.argv.slice(2));
