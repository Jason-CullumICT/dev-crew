// Verifies: FR-dependency-linking — Prometheus metrics for domain operations
import { Counter, Histogram, Registry } from 'prom-client';

export const registry = new Registry();

// Verifies: FR-dependency-linking
export const dependencyOperations = new Counter({
  name: 'portal_dependency_operations_total',
  help: 'Total dependency link operations',
  labelNames: ['operation', 'item_type'] as const,
  registers: [registry],
});

// Verifies: FR-dependency-dispatch-gating
export const dispatchGatingEvents = new Counter({
  name: 'portal_dispatch_gating_events_total',
  help: 'Total dispatch gating events',
  labelNames: ['result'] as const, // 'dispatched', 'gated', 'auto_dispatched'
  registers: [registry],
});

// Verifies: FR-dependency-linking
export const dependencyCheckDuration = new Histogram({
  name: 'portal_dependency_check_duration_seconds',
  help: 'Duration of dependency readiness checks',
  labelNames: ['check_type'] as const,
  registers: [registry],
});

// Verifies: FR-dependency-linking
export const cycleDetectionEvents = new Counter({
  name: 'portal_cycle_detection_events_total',
  help: 'Total circular dependency detection events',
  labelNames: ['result'] as const, // 'clean', 'cycle_detected'
  registers: [registry],
});
