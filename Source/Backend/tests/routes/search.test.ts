// Verifies: FR-dependency-search
//
// NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into
// Source/Backend/src/app.ts. These tests document the expected contract and will
// FAIL until the route is implemented. This is intentional — the failing tests
// surface the implementation gap.

import request from 'supertest';
import app from '../../src/app';
import * as store from '../../src/store/workItemStore';
import {
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
} from '@shared/types/workflow';

describe('GET /api/search — cross-entity typeahead search', () => {
  beforeEach(() => {
    store.resetStore();
  });

  // Verifies: FR-dependency-search — returns 200 with matching work items
  it('returns 200 and {data:[...]} with items matching the query', async () => {
    store.createWorkItem({
      title: 'Authentication refactor',
      description: 'Refactor the auth module for security',
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });
    store.createWorkItem({
      title: 'Unrelated work item',
      description: 'Nothing to do with the search query',
      type: WorkItemType.Bug,
      priority: WorkItemPriority.Low,
      source: WorkItemSource.Manual,
    });

    const res = await request(app).get('/api/search?q=auth');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toMatch(/auth/i);
  });

  // Verifies: FR-dependency-search — empty query returns empty data array
  it('returns empty data array when query is empty', async () => {
    store.createWorkItem({
      title: 'Some feature',
      description: 'A regular work item',
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });

    const res = await request(app).get('/api/search?q=');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveLength(0);
  });

  // Verifies: FR-dependency-search — returns items from both feature and bug types
  it('returns results from multiple work item types', async () => {
    store.createWorkItem({
      title: 'Auth feature request',
      description: 'Add OAuth support',
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });
    store.createWorkItem({
      title: 'Auth bug report',
      description: 'Login fails intermittently',
      type: WorkItemType.Bug,
      priority: WorkItemPriority.High,
      source: WorkItemSource.Browser,
    });

    const res = await request(app).get('/api/search?q=auth');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    const types = res.body.data.map((i: { type: string }) => i.type);
    expect(types).toContain('feature');
    expect(types).toContain('bug');
  });

  // Verifies: FR-dependency-search — description match also returns results
  it('returns items whose description matches the query', async () => {
    store.createWorkItem({
      title: 'Generic title',
      description: 'Involves authentication flow',
      type: WorkItemType.Feature,
      priority: WorkItemPriority.Medium,
      source: WorkItemSource.Browser,
    });

    const res = await request(app).get('/api/search?q=authentication');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  // Verifies: FR-dependency-search — excludes soft-deleted items from results
  it('excludes deleted work items from search results', async () => {
    const item = store.createWorkItem({
      title: 'Deleted auth item',
      description: 'This item has been soft-deleted',
      type: WorkItemType.Bug,
      priority: WorkItemPriority.High,
      source: WorkItemSource.Browser,
    });
    store.softDelete(item.id);

    const res = await request(app).get('/api/search?q=auth');

    expect(res.status).toBe(200);
    const ids = res.body.data?.map((i: { id: string }) => i.id) ?? [];
    expect(ids).not.toContain(item.id);
  });
});
