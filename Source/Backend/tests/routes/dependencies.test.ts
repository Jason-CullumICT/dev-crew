// Verifies: FR-dependency-endpoints, FR-dependency-dispatch-gating, FR-dependency-backend-tests

import express from 'express';
import request from 'supertest';
import {
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
} from '@shared/types/workflow';
import workItemsRouter from '../../src/routes/workItems';
import workflowRouter from '../../src/routes/workflow';
import * as store from '../../src/store/workItemStore';
import { addDependency } from '../../src/services/dependency';

const app = express();
app.use(express.json());
app.use('/api/work-items', workItemsRouter);
app.use('/api/work-items', workflowRouter);

function createTestItem(overrides: Record<string, unknown> = {}) {
  return store.createWorkItem({
    title: 'Test work item',
    description: 'A test work item description',
    type: WorkItemType.Feature,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    ...overrides,
  } as Parameters<typeof store.createWorkItem>[0]);
}

describe('Dependency Endpoints', () => {
  beforeEach(() => {
    store.resetStore();
  });

  // ─── POST /api/work-items/:id/dependencies ────────────────────────────────────

  describe('POST /api/work-items/:id/dependencies', () => {
    // Verifies: FR-dependency-endpoints — add a dependency
    it('should add a dependency link (action=add)', async () => {
      const blocker = createTestItem();
      const blocked = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${blocked.id}/dependencies`)
        .send({ action: 'add', blockerId: blocker.id });

      expect(res.status).toBe(200);
      expect(res.body.blockedItemId).toBe(blocked.id);
      expect(res.body.blockerItemId).toBe(blocker.id);

      // Verify store updated
      const updatedBlocked = store.findById(blocked.id)!;
      expect(updatedBlocked.blockedBy).toHaveLength(1);
      expect(updatedBlocked.hasUnresolvedBlockers).toBe(true);
    });

    // Verifies: FR-dependency-endpoints — remove a dependency
    it('should remove a dependency link (action=remove)', async () => {
      const blocker = createTestItem();
      const blocked = createTestItem();

      addDependency(blocked.id, blocker.id);

      const res = await request(app)
        .post(`/api/work-items/${blocked.id}/dependencies`)
        .send({ action: 'remove', blockerId: blocker.id });

      expect(res.status).toBe(204);

      const updatedBlocked = store.findById(blocked.id)!;
      expect(updatedBlocked.blockedBy).toHaveLength(0);
    });

    // Verifies: FR-dependency-backend-tests — 404 on unknown item
    it('should return 404 when work item not found', async () => {
      const blocker = createTestItem();

      const res = await request(app)
        .post('/api/work-items/non-existent/dependencies')
        .send({ action: 'add', blockerId: blocker.id });

      expect(res.status).toBe(404);
    });

    // Verifies: FR-dependency-backend-tests — 404 on unknown blocker
    it('should return 404 when blocker not found', async () => {
      const item = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${item.id}/dependencies`)
        .send({ action: 'add', blockerId: 'non-existent' });

      expect(res.status).toBe(404);
    });

    // Verifies: FR-dependency-backend-tests — self-ref rejection
    it('should return 400 for self-referencing dependency', async () => {
      const item = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${item.id}/dependencies`)
        .send({ action: 'add', blockerId: item.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/self/i);
    });

    // Verifies: FR-dependency-backend-tests — circular rejection (409)
    it('should return 409 for circular dependency', async () => {
      const itemA = createTestItem();
      const itemB = createTestItem();

      addDependency(itemA.id, itemB.id); // A blocked by B

      const res = await request(app)
        .post(`/api/work-items/${itemB.id}/dependencies`)
        .send({ action: 'add', blockerId: itemA.id });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/cycle|circular/i);
    });

    it('should return 400 for missing blockerId', async () => {
      const item = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${item.id}/dependencies`)
        .send({ action: 'add' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid action', async () => {
      const item = createTestItem();
      const blocker = createTestItem();

      const res = await request(app)
        .post(`/api/work-items/${item.id}/dependencies`)
        .send({ action: 'invalid', blockerId: blocker.id });

      expect(res.status).toBe(400);
    });
  });

  // ─── GET /api/work-items/:id/ready ────────────────────────────────────────────

  describe('GET /api/work-items/:id/ready', () => {
    // Verifies: FR-dependency-endpoints — readiness check
    it('should return ready=true for item with no blockers', async () => {
      const item = createTestItem();

      const res = await request(app)
        .get(`/api/work-items/${item.id}/ready`);

      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });

    it('should return ready=false with unresolved blockers', async () => {
      const blocker = createTestItem();
      const blocked = createTestItem();

      addDependency(blocked.id, blocker.id);

      const res = await request(app)
        .get(`/api/work-items/${blocked.id}/ready`);

      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(false);
      expect(res.body.unresolvedBlockers).toHaveLength(1);
    });

    it('should return ready=true when all blockers are completed', async () => {
      const blocker = createTestItem();
      const blocked = createTestItem();

      addDependency(blocked.id, blocker.id);
      store.updateWorkItem(blocker.id, { status: WorkItemStatus.Completed });

      const res = await request(app)
        .get(`/api/work-items/${blocked.id}/ready`);

      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });

    it('should return 404 for non-existent item', async () => {
      const res = await request(app)
        .get('/api/work-items/non-existent/ready');

      expect(res.status).toBe(404);
    });
  });

  // ─── Dispatch gating ────────────────────────────────────────────────────────

  describe('POST /api/work-items/:id/dispatch — dependency gating', () => {
    // Verifies: FR-dependency-dispatch-gating — blocked dispatch
    it('should block dispatch when item has unresolved blockers', async () => {
      const blocker = createTestItem();
      const blocked = createTestItem();

      addDependency(blocked.id, blocker.id);
      store.updateWorkItem(blocked.id, { status: WorkItemStatus.Approved });

      const res = await request(app)
        .post(`/api/work-items/${blocked.id}/dispatch`)
        .send({ team: 'TheATeam' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/block|depend/i);
    });

    // Verifies: FR-dependency-dispatch-gating — allow dispatch when all resolved
    it('should allow dispatch when all blockers are resolved', async () => {
      const blocker = createTestItem();
      const blocked = createTestItem();

      addDependency(blocked.id, blocker.id);
      store.updateWorkItem(blocked.id, { status: WorkItemStatus.Approved });
      store.updateWorkItem(blocker.id, { status: WorkItemStatus.Completed });

      const res = await request(app)
        .post(`/api/work-items/${blocked.id}/dispatch`)
        .send({ team: 'TheATeam' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.InProgress);
    });

    it('should allow dispatch when item has no dependencies at all', async () => {
      const item = createTestItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Approved });

      const res = await request(app)
        .post(`/api/work-items/${item.id}/dispatch`)
        .send({ team: 'TheATeam' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(WorkItemStatus.InProgress);
    });
  });

  // ─── PATCH blockedBy ────────────────────────────────────────────────────────

  describe('PATCH /api/work-items/:id — blockedBy field', () => {
    // Verifies: FR-dependency-endpoints — PATCH accepts blocked_by
    it('should set blockedBy via PATCH (bulk replace)', async () => {
      const blocker1 = createTestItem();
      const blocker2 = createTestItem();
      const item = createTestItem();

      const res = await request(app)
        .patch(`/api/work-items/${item.id}`)
        .send({ blockedBy: [blocker1.id, blocker2.id] });

      expect(res.status).toBe(200);

      const updated = store.findById(item.id)!;
      expect(updated.blockedBy).toHaveLength(2);
      expect(updated.hasUnresolvedBlockers).toBe(true);
    });

    it('should clear blockedBy when PATCH passes empty array', async () => {
      const blocker = createTestItem();
      const item = createTestItem();

      addDependency(item.id, blocker.id);

      const res = await request(app)
        .patch(`/api/work-items/${item.id}`)
        .send({ blockedBy: [] });

      expect(res.status).toBe(200);
      const updated = store.findById(item.id)!;
      expect(updated.blockedBy).toHaveLength(0);
    });
  });

  // ─── Cascade auto-dispatch via reject ────────────────────────────────────────

  describe('Cascade: reject triggers auto-dispatch of dependents', () => {
    // Verifies: FR-dependency-dispatch-gating — cascade on reject
    it('auto-dispatches approved dependents when their blocker is rejected', async () => {
      const blocker = createTestItem();
      const blocked = createTestItem();

      addDependency(blocked.id, blocker.id);
      // Set blocker to proposed so it can be rejected
      store.updateWorkItem(blocker.id, { status: WorkItemStatus.Proposed });
      // Set blocked to approved
      store.updateWorkItem(blocked.id, { status: WorkItemStatus.Approved });

      const res = await request(app)
        .post(`/api/work-items/${blocker.id}/reject`)
        .send({ reason: 'No longer needed' });

      expect(res.status).toBe(200);

      // The blocked item should now be dispatched (in-progress) since its blocker resolved
      const updatedBlocked = store.findById(blocked.id)!;
      expect(updatedBlocked.status).toBe(WorkItemStatus.InProgress);
    });
  });
});
