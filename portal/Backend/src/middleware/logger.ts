// Verifies: FR-DUP-016 — Structured logging (no console.log)

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const logs: LogEntry[] = [];

function createEntry(level: LogEntry['level'], message: string, context?: Record<string, unknown>): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  };
  logs.push(entry);
  return entry;
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>): LogEntry => createEntry('info', message, context),
  warn: (message: string, context?: Record<string, unknown>): LogEntry => createEntry('warn', message, context),
  error: (message: string, context?: Record<string, unknown>): LogEntry => createEntry('error', message, context),
  debug: (message: string, context?: Record<string, unknown>): LogEntry => createEntry('debug', message, context),
  getLogs: (): LogEntry[] => [...logs],
  clear: (): void => { logs.length = 0; },
};
