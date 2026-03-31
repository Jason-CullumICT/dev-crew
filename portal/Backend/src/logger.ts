// Verifies: FR-dependency-linking — Structured logging with pino
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'test'
      ? { target: 'pino/file', options: { destination: '/dev/null' } }
      : undefined,
});
