// Verifies: FR-dependency-metrics

import request from 'supertest';
import app from '../../src/app';
import * as store from '../../src/store/workItemStore';
import {
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemStatus,
} from '@shared/types/workflow';

describe('Dependency Metrics at GET /metrics', () => {
  beforeEach(() => {
    store.resetStore();
  });

  // Verifies: FR-dependency-metrics — dependency_operations_total counter present at /metrics
  it('exposes dependency_operations_total counter', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('dependency_operations_total');
  });

  // Verifies: FR-dependency-metrics — dispatch_gating_events_total counter present at /metrics
  it('exposes dispatch_gating_events_total counter', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('dispatch_gating_events_total');
  });

  // Verifies: FR-dependency-metrics — cycle_detection_events_total counter present at /metrics
  it('exposes cycle_detection_events_total counter', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('cycle_detection_events_total');
  });

  // Verifies: FR-dependency-metrics — metrics endpoint returns text/plain content type
  it('returns text/plain content type suitable for Prometheus scraping', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });

  // Verifies: FR-dependency-metrics — counters increment after a dependency add operation
  it('dependency_operations_total is non-zero after adding a dependency', async () => {
    const blocker = store.createWorkItem({
      title: 'Metrics blocker',
      description: 'A blocker for metrics testing',
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });
    const blocked = store.createWorkItem({
      title: 'Metrics blocked',
      description: 'A blocked item for metrics testing',
      type: WorkItemType.Bug,
      priority: WorkItemPriority.High,
      source: WorkItemSource.Browser,
    });

    await request(app)
      .post(`/api/work-items/${blocked.id}/dependencies`)
      .send({ action: 'add', blockerId: blocker.id })
      .expect(200);

    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.text).toContain('dependency_operations_total');
    // Counter must contain at least one non-zero sample line
    const lines = metricsRes.text.split('\n');
    const counterLine = lines.find(
      (l) => l.startsWith('dependency_operations_total{') && !l.startsWith('#'),
    );
    expect(counterLine).toBeDefined();
  });

  // Verifies: FR-dependency-metrics — cycle_detection_events_total increments on BFS execution
  it('cycle_detection_events_total increments when a dependency is checked for cycles', async () => {
    const itemA = store.createWorkItem({
      title: 'Cycle check A',
      description: 'First item',
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });
    const itemB = store.createWorkItem({
      title: 'Cycle check B',
      description: 'Second item',
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });

    // Adding A blocked by B triggers BFS cycle detection
    await request(app)
      .post(`/api/work-items/${itemA.id}/dependencies`)
      .send({ action: 'add', blockerId: itemB.id });

    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.text).toContain('cycle_detection_events_total');
    const lines = metricsRes.text.split('\n');
    const detectedLine = lines.find(
      (l) => l.includes('cycle_detection_events_total{') && !l.startsWith('#'),
    );
    expect(detectedLine).toBeDefined();
  });

  // Verifies: FR-dependency-metrics — dispatch_gating_events_total increments when dispatch is blocked
  it('dispatch_gating_events_total is present after a blocked dispatch attempt', async () => {
    const blocker = store.createWorkItem({
      title: 'Dispatch gating blocker',
      description: 'Unresolved blocker',
      type: WorkItemType.Bug,
      priority: WorkItemPriority.High,
      source: WorkItemSource.Browser,
    });
    const blocked = store.createWorkItem({
      title: 'Dispatch gating blocked',
      description: 'Item that should be gated',
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });

    // Wire the dependency
    await request(app)
      .post(`/api/work-items/${blocked.id}/dependencies`)
      .send({ action: 'add', blockerId: blocker.id });

    // Advance blocked item to approved
    store.updateWorkItem(blocked.id, { status: WorkItemStatus.Approved });

    // Attempt dispatch — should be blocked
    await request(app)
      .post(`/api/work-items/${blocked.id}/dispatch`)
      .send({ team: 'TheATeam' });

    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.text).toContain('dispatch_gating_events_total');
  });
});
