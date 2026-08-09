export interface CodexServerRequest {
  id: string | number;
  method: string;
  params: unknown;
}

export interface CodexTransport {
  request(method: string, params: unknown): Promise<unknown>;
  notify(method: string, params: unknown): Promise<void>;
  notifications(): AsyncIterable<unknown>;
  serverRequests(): AsyncIterable<CodexServerRequest>;
  respond(id: string | number, result: unknown): Promise<void>;
  close(): Promise<void>;
}

/** Adapter-local line oriented I/O seam for Codex App Server JSONL. */
export interface CodexLineIo {
  writeLine(line: string): void | Promise<void>;
  lines(): AsyncIterable<string>;
  close(): Promise<void>;
}
