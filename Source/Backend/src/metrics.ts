// Verifies: FR-WF-013 — Prometheus metrics for domain operations
import { Registry, Counter, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

// Verifies: FR-WF-013 — workflow_items_created_total
export const itemsCreatedCounter = new Counter({
  name: 'workflow_items_created_total',
  help: 'Total number of work items created',
  labelNames: ['source', 'type'] as const,
  registers: [registry],
});

// Verifies: FR-WF-013 — workflow_items_routed_total
export const itemsRoutedCounter = new Counter({
  name: 'workflow_items_routed_total',
  help: 'Total number of work items routed',
  labelNames: ['route'] as const,
  registers: [registry],
});

// Verifies: FR-WF-013 — workflow_items_assessed_total
export const itemsAssessedCounter = new Counter({
  name: 'workflow_items_assessed_total',
  help: 'Total number of work items assessed',
  labelNames: ['verdict'] as const,
  registers: [registry],
});

// Verifies: FR-WF-013 — workflow_items_dispatched_total
export const itemsDispatchedCounter = new Counter({
  name: 'workflow_items_dispatched_total',
  help: 'Total number of work items dispatched',
  labelNames: ['team'] as const,
  registers: [registry],
});

// Verifies: FR-dependency-metrics — dependency_operations_total
export const dependencyOperationsCounter = new Counter({
  name: 'dependency_operations_total',
  help: 'Total dependency link operations (add/remove/set)',
  labelNames: ['action'] as const,
  registers: [registry],
});

// Verifies: FR-dependency-metrics — dispatch_gating_events_total
export const dispatchGatingEventsCounter = new Counter({
  name: 'dispatch_gating_events_total',
  help: 'Total dispatch gating events (blocked or cascade dispatched)',
  labelNames: ['event'] as const,
  registers: [registry],
});

// Verifies: FR-dependency-metrics — cycle_detection_events_total
export const cycleDetectionEventsCounter = new Counter({
  name: 'cycle_detection_events_total',
  help: 'Total cycle detection BFS executions',
  labelNames: ['detected'] as const,
  registers: [registry],
});

// Verifies: FR-preflight-validator — preflight_validations_total
// Domain-significant: security gate on work submission (token + repo + branch checks)
export const preflightValidationsCounter = new Counter({
  name: 'preflight_validations_total',
  help: 'Total pre-flight validation attempts on work submission',
  labelNames: ['result', 'failureReason'] as const,
  registers: [registry],
});
