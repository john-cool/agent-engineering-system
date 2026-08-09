import { appendFile, mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  AggregateQuery,
  AggregateResult,
  RuntimeDecisionTrace,
  TraceQuery,
  TraceStore
} from '@aes/runtime-sdk';

function monthKey(timestamp: string): string {
  const match = /^(\d{4}-\d{2})-\d{2}T/.exec(timestamp);
  if (!match) throw new Error(`Invalid trace timestamp: ${timestamp}`);
  return match[1]!;
}

function matches(trace: RuntimeDecisionTrace, query: TraceQuery): boolean {
  if (query.provider !== undefined && trace.telemetry.provider !== query.provider) return false;
  if (query.model !== undefined && trace.telemetry.model !== query.model) return false;
  if (query.outcome !== undefined && trace.telemetry.outcome !== query.outcome) return false;
  if (query.verification !== undefined && trace.telemetry.verification !== query.verification) return false;
  if (query.taskClass !== undefined && trace.taskClass !== query.taskClass) return false;
  if (query.from !== undefined && trace.timestamp < query.from) return false;
  if (query.to !== undefined && trace.timestamp > query.to) return false;
  return true;
}

export class LocalJsonlTraceStore implements TraceStore {
  constructor(private readonly root: string) {}

  async append(trace: RuntimeDecisionTrace): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await appendFile(join(this.root, `${monthKey(trace.timestamp)}.jsonl`), `${JSON.stringify(trace)}\n`, 'utf8');
  }

  async query(query: TraceQuery): Promise<RuntimeDecisionTrace[]> {
    let files: string[];
    try {
      files = await readdir(this.root);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw error;
    }

    const monthly = files.filter((file) => /^\d{4}-\d{2}\.jsonl$/.test(file)).sort();
    const traces: RuntimeDecisionTrace[] = [];
    for (const file of monthly) {
      const raw = await readFile(join(this.root, file), 'utf8');
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue;
        const trace = JSON.parse(line) as RuntimeDecisionTrace;
        if (matches(trace, query)) traces.push(trace);
      }
    }
    return traces;
  }

  async aggregate(query: AggregateQuery): Promise<AggregateResult> {
    const traces = await this.query(query);
    return {
      count: traces.length,
      successCount: traces.filter((trace) => trace.telemetry.outcome === 'success').length,
      retryCount: traces.reduce((sum, trace) => sum + trace.telemetry.retries, 0)
    };
  }
}
