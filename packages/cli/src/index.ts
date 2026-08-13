#!/usr/bin/env node
import { validateFile } from './validate-command.js';
import { formatDemoSummary, runDemo } from './demo-command.js';

async function main(argv: readonly string[]): Promise<void> {
  const [command, argument] = argv;
  if (command === 'demo' && !argument) {
    try {
      console.log(formatDemoSummary(await runDemo()));
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
    return;
  }

  if (command !== 'validate' || !argument) {
    console.error('Usage: aes validate <path> | aes demo');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await validateFile(argument);
    console.log(`valid ${result.kind}: ${result.name}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

await main(process.argv.slice(2));
