import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionCheckpoint, SessionCheckpointStore } from '@aes/runtime-sdk';

export class CheckpointStoreError extends Error {
  constructor(message: string, readonly code: 'MALFORMED_CHECKPOINT') {
    super(message);
    this.name = 'CheckpointStoreError';
  }
}

function filename(sessionId: string): string {
  return `${encodeURIComponent(sessionId)}.json`;
}

export class LocalCheckpointStore implements SessionCheckpointStore {
  constructor(private readonly root: string) {}

  async save(checkpoint: SessionCheckpoint): Promise<void> {
    await mkdir(this.root, { recursive: true });
    const target = join(this.root, filename(checkpoint.sessionId));
    const temporary = `${target}.tmp`;
    await writeFile(temporary, `${JSON.stringify(checkpoint)}\n`, 'utf8');
    await rename(temporary, target);
  }

  async load(sessionId: string): Promise<SessionCheckpoint | undefined> {
    const target = join(this.root, filename(sessionId));
    let raw: string;
    try {
      raw = await readFile(target, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
      throw error;
    }
    try {
      return JSON.parse(raw) as SessionCheckpoint;
    } catch {
      throw new CheckpointStoreError(`Malformed checkpoint for session ${sessionId}.`, 'MALFORMED_CHECKPOINT');
    }
  }

  async remove(sessionId: string): Promise<void> {
    try {
      await unlink(join(this.root, filename(sessionId)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
