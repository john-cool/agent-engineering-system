#!/usr/bin/env node
import { validateFile } from './validate-command.js';

async function main(argv: readonly string[]): Promise<void> {
  const [command, path] = argv;
  if (command !== 'validate' || !path) {
    console.error('Usage: aes validate <path>');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await validateFile(path);
    console.log(`valid ${result.kind}: ${result.name}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

await main(process.argv.slice(2));
