// Verifies: FR-dependency-linking, FR-dependency-ready-check, FR-dependency-dispatch-gating
// Tests for dependency endpoints, readiness checks, PATCH passthrough, search, and cascade dispatch.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import supertest from 'supertest';
import { createApp } from '../src/index';
import { setDb } from '../src/database/connection';
import { runMigrations } from '../src/database/schema';
import { createBug, updateBug } from '../src/services/bugService';
import { createFeatureRequest, updateFeatureRequest } from '../src/services/featureRequestService';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

describe('Dependency Endpoints', () => {
  let db: Database.Database;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    db = createTestDb();
    setDb(db);
    app = createApp();
  });

  afterEach(() => {
    db.close();
  });

  // --- POST /api/bugs/:id/dependencies ---
  // Verifies: FR-dependency-linking

  describe('POST /api/bugs/:id/dependencies', () => {
    it('should add a dependency link', async () => {
      // Verifies: FR-dependency-linking
      const bug1 = createBug(db, { title: 'Bug 1', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Bug 2', description: 'desc', severity: 'medium' });

      const res = await supertest(app)
        .post(`/api/bugs/${bug1.id}/dependencies`)
        .send({ action: 'add', blocker_id: bug2.id });

      expect(res.status).toBe(200);
      expect(res.body.blocked_by).toHaveLength(1);
      expect(res.body.blocked_by[0].item_id).toBe(bug2.id);
    });

    it('should remove a dependency link', async () => {
      // Verifies: FR-dependency-linking
      const bug1 = createBug(db, { title: 'Bug 1', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Bug 2', description: 'desc', severity: 'medium' });

      await supertest(app)
        .post(`/api/bugs/${bug1.id}/dependencies`)
        .send({ action: 'add', blocker_id: bug2.id });

      const res = await supertest(app)
        .post(`/api/bugs/${bug1.id}/dependencies`)
        .send({ action: 'remove', blocker_id: bug2.id });

      expect(res.status).toBe(200);
      expect(res.body.blocked_by).toHaveLength(0);
    });

    it('should add cross-type dependency (bug blocked by FR)', async () => {
      // Verifies: FR-dependency-linking
      const bug = createBug(db, { title: 'Bug 1', description: 'desc', severity: 'high' });
      const fr = createFeatureRequest(db, { title: 'FR 1', description: 'desc' });

      const res = await supertest(app)
        .post(`/api/bugs/${bug.id}/dependencies`)
        .send({ action: 'add', blocker_id: fr.id });

      expect(res.status).toBe(200);
      expect(res.body.blocked_by).toHaveLength(1);
      expect(res.body.blocked_by[0].item_id).toBe(fr.id);
    });

    it('should return 404 for non-existent bug', async () => {
      // Verifies: FR-dependency-linking
      const res = await supertest(app)
        .post('/api/bugs/BUG-9999/dependencies')
        .send({ action: 'add', blocker_id: 'BUG-0001' });

      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid action', async () => {
      // Verifies: FR-dependency-linking
      const bug = createBug(db, { title: 'Bug', description: 'desc', severity: 'high' });

      const res = await supertest(app)
        .post(`/api/bugs/${bug.id}/dependencies`)
        .send({ action: 'invalid', blocker_id: 'BUG-0001' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for invalid blocker_id format', async () => {
      // Verifies: FR-dependency-linking
      const bug = createBug(db, { title: 'Bug', description: 'desc', severity: 'high' });

      const res = await supertest(app)
        .post(`/api/bugs/${bug.id}/dependencies`)
        .send({ action: 'add', blocker_id: 'INVALID-001' });

      expect(res.status).toBe(400);
    });

    it('should return 409 for cycle detection', async () => {
      // Verifies: FR-dependency-cycle-detection
      const bug1 = createBug(db, { title: 'Bug 1', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Bug 2', description: 'desc', severity: 'medium' });

      // bug1 blocked by bug2
      await supertest(app)
        .post(`/api/bugs/${bug1.id}/dependencies`)
        .send({ action: 'add', blocker_id: bug2.id });

      // bug2 blocked by bug1 → cycle
      const res = await supertest(app)
        .post(`/api/bugs/${bug2.id}/dependencies`)
        .send({ action: 'add', blocker_id: bug1.id });

      expect(res.status).toBe(409);
    });
  });

  // --- POST /api/feature-requests/:id/dependencies ---
  // Verifies: FR-dependency-linking

  describe('POST /api/feature-requests/:id/dependencies', () => {
    it('should add a dependency link', async () => {
      // Verifies: FR-dependency-linking
      const fr1 = createFeatureRequest(db, { title: 'FR 1', description: 'desc' });
      const fr2 = createFeatureRequest(db, { title: 'FR 2', description: 'desc' });

      const res = await supertest(app)
        .post(`/api/feature-requests/${fr1.id}/dependencies`)
        .send({ action: 'add', blocker_id: fr2.id });

      expect(res.status).toBe(200);
      expect(res.body.blocked_by).toHaveLength(1);
      expect(res.body.blocked_by[0].item_id).toBe(fr2.id);
    });

    it('should return 404 for non-existent feature request', async () => {
      // Verifies: FR-dependency-linking
      const res = await supertest(app)
        .post('/api/feature-requests/FR-9999/dependencies')
        .send({ action: 'add', blocker_id: 'FR-0001' });

      expect(res.status).toBe(404);
    });

    it('should return 409 for cycle detection', async () => {
      // Verifies: FR-dependency-cycle-detection
      const fr1 = createFeatureRequest(db, { title: 'FR 1', description: 'desc' });
      const fr2 = createFeatureRequest(db, { title: 'FR 2', description: 'desc' });

      await supertest(app)
        .post(`/api/feature-requests/${fr1.id}/dependencies`)
        .send({ action: 'add', blocker_id: fr2.id });

      const res = await supertest(app)
        .post(`/api/feature-requests/${fr2.id}/dependencies`)
        .send({ action: 'add', blocker_id: fr1.id });

      expect(res.status).toBe(409);
    });
  });

  // --- GET /api/bugs/:id/ready ---
  // Verifies: FR-dependency-ready-check

  describe('GET /api/bugs/:id/ready', () => {
    it('should return ready=true when no blockers', async () => {
      // Verifies: FR-dependency-ready-check
      const bug = createBug(db, { title: 'Bug', description: 'desc', severity: 'high' });

      const res = await supertest(app).get(`/api/bugs/${bug.id}/ready`);

      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
      expect(res.body.unresolved_blockers).toHaveLength(0);
    });

    it('should return ready=false when blockers are unresolved', async () => {
      // Verifies: FR-dependency-ready-check
      const bug1 = createBug(db, { title: 'Bug 1', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Bug 2', description: 'desc', severity: 'medium' });

      await supertest(app)
        .post(`/api/bugs/${bug1.id}/dependencies`)
        .send({ action: 'add', blocker_id: bug2.id });

      const res = await supertest(app).get(`/api/bugs/${bug1.id}/ready`);

      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(false);
      expect(res.body.unresolved_blockers).toHaveLength(1);
    });

    it('should return ready=true when all blockers are resolved', async () => {
      // Verifies: FR-dependency-ready-check
      const bug1 = createBug(db, { title: 'Bug 1', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Bug 2', description: 'desc', severity: 'medium' });

      await supertest(app)
        .post(`/api/bugs/${bug1.id}/dependencies`)
        .send({ action: 'add', blocker_id: bug2.id });

      // Resolve the blocker
      updateBug(db, bug2.id, { status: 'resolved' });

      const res = await supertest(app).get(`/api/bugs/${bug1.id}/ready`);

      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });

    it('should return 404 for non-existent bug', async () => {
      // Verifies: FR-dependency-ready-check
      const res = await supertest(app).get('/api/bugs/BUG-9999/ready');
      expect(res.status).toBe(404);
    });
  });

  // --- GET /api/feature-requests/:id/ready ---
  // Verifies: FR-dependency-ready-check

  describe('GET /api/feature-requests/:id/ready', () => {
    it('should return ready=true when no blockers', async () => {
      // Verifies: FR-dependency-ready-check
      const fr = createFeatureRequest(db, { title: 'FR', description: 'desc' });

      const res = await supertest(app).get(`/api/feature-requests/${fr.id}/ready`);

      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
      expect(res.body.unresolved_blockers).toHaveLength(0);
    });

    it('should return ready=false when blockers are unresolved', async () => {
      // Verifies: FR-dependency-ready-check
      const fr1 = createFeatureRequest(db, { title: 'FR 1', description: 'desc' });
      const fr2 = createFeatureRequest(db, { title: 'FR 2', description: 'desc' });

      await supertest(app)
        .post(`/api/feature-requests/${fr1.id}/dependencies`)
        .send({ action: 'add', blocker_id: fr2.id });

      const res = await supertest(app).get(`/api/feature-requests/${fr1.id}/ready`);

      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(false);
    });
  });

  // --- PATCH passthrough ---
  // Verifies: FR-dependency-linking

  describe('PATCH blocked_by passthrough', () => {
    it('should set blocked_by via PATCH /api/bugs/:id', async () => {
      // Verifies: FR-dependency-linking
      const bug1 = createBug(db, { title: 'Bug 1', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Bug 2', description: 'desc', severity: 'medium' });

      const res = await supertest(app)
        .patch(`/api/bugs/${bug1.id}`)
        .send({ blocked_by: [bug2.id] });

      expect(res.status).toBe(200);
      expect(res.body.blocked_by).toHaveLength(1);
      expect(res.body.blocked_by[0].item_id).toBe(bug2.id);
    });

    it('should set blocked_by via PATCH /api/feature-requests/:id', async () => {
      // Verifies: FR-dependency-linking
      const fr1 = createFeatureRequest(db, { title: 'FR 1', description: 'desc' });
      const fr2 = createFeatureRequest(db, { title: 'FR 2', description: 'desc' });

      const res = await supertest(app)
        .patch(`/api/feature-requests/${fr1.id}`)
        .send({ blocked_by: [fr2.id] });

      expect(res.status).toBe(200);
      expect(res.body.blocked_by).toHaveLength(1);
      expect(res.body.blocked_by[0].item_id).toBe(fr2.id);
    });
  });

  // --- GET /api/search ---
  // Verifies: FR-dependency-linking

  describe('GET /api/search', () => {
    it('should return matching bugs and feature requests by title', async () => {
      // Verifies: FR-dependency-linking
      createBug(db, { title: 'Login timeout bug', description: 'desc', severity: 'high' });
      createFeatureRequest(db, { title: 'Login page redesign', description: 'desc' });
      createBug(db, { title: 'Unrelated issue', description: 'desc', severity: 'low' });

      const res = await supertest(app).get('/api/search?q=login');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return matching items by ID', async () => {
      // Verifies: FR-dependency-linking
      const bug = createBug(db, { title: 'Some bug', description: 'desc', severity: 'high' });

      const res = await supertest(app).get(`/api/search?q=${bug.id}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(bug.id);
    });

    it('should return recent items for empty query', async () => {
      // Verifies: FR-dependency-linking
      createBug(db, { title: 'Bug', description: 'desc', severity: 'high' });
      createFeatureRequest(db, { title: 'FR', description: 'desc' });

      const res = await supertest(app).get('/api/search?q=');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should limit results to 20', async () => {
      // Verifies: FR-dependency-linking
      for (let i = 0; i < 25; i++) {
        createBug(db, { title: `Test bug ${i}`, description: 'desc', severity: 'low' });
      }

      const res = await supertest(app).get('/api/search?q=test');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(20);
    });
  });

  // --- Dispatch gating & cascade ---
  // Verifies: FR-dependency-dispatch-gating

  describe('Dispatch gating', () => {
    it('should set bug to pending_dependencies when trying to move to in_development with unresolved blockers', async () => {
      // Verifies: FR-dependency-dispatch-gating
      const bug1 = createBug(db, { title: 'Bug 1', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Blocker', description: 'desc', severity: 'medium' });

      // Set dependency
      await supertest(app)
        .post(`/api/bugs/${bug1.id}/dependencies`)
        .send({ action: 'add', blocker_id: bug2.id });

      // Try to move to in_development
      const res = await supertest(app)
        .patch(`/api/bugs/${bug1.id}`)
        .send({ status: 'in_development' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending_dependencies');
    });

    it('should auto-dispatch pending_dependencies items when blocker resolves', async () => {
      // Verifies: FR-dependency-dispatch-gating
      const bug1 = createBug(db, { title: 'Blocked bug', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Blocker bug', description: 'desc', severity: 'medium' });

      // Set dependency and trigger gating
      await supertest(app)
        .post(`/api/bugs/${bug1.id}/dependencies`)
        .send({ action: 'add', blocker_id: bug2.id });

      await supertest(app)
        .patch(`/api/bugs/${bug1.id}`)
        .send({ status: 'in_development' });

      // Verify bug1 is pending_dependencies
      const pendingRes = await supertest(app).get(`/api/bugs/${bug1.id}`);
      expect(pendingRes.body.status).toBe('pending_dependencies');

      // Resolve the blocker
      const resolveRes = await supertest(app)
        .patch(`/api/bugs/${bug2.id}`)
        .send({ status: 'resolved' });
      expect(resolveRes.status).toBe(200);

      // bug1 should now be auto-dispatched to approved
      const afterRes = await supertest(app).get(`/api/bugs/${bug1.id}`);
      expect(afterRes.body.status).toBe('approved');
    });
  });
});
