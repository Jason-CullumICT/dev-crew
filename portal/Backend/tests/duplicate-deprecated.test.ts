// Verifies: FR-DUP-04, FR-DUP-05, FR-DUP-07, FR-DUP-03
// Tests for duplicate/deprecated tagging on bugs and feature requests.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import supertest from 'supertest';
import { createApp } from '../src/index';
import { setDb } from '../src/database/connection';
import { runMigrations } from '../src/database/schema';
import { createBug, getBugById, updateBug, listBugs } from '../src/services/bugService';
import { createFeatureRequest, getFeatureRequestById, updateFeatureRequest, listFeatureRequests } from '../src/services/featureRequestService';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

describe('Duplicate/Deprecated Tagging', () => {
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

  // --- Bug: PATCH with status=duplicate ---

  describe('PATCH /api/bugs/:id — duplicate', () => {
    it('should set duplicate status and duplicate_of field', async () => {
      // Verifies: FR-DUP-04
      const bug1 = createBug(db, { title: 'Original bug', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Duplicate bug', description: 'desc', severity: 'high' });

      const res = await supertest(app)
        .patch(`/api/bugs/${bug2.id}`)
        .send({ status: 'duplicate', duplicate_of: bug1.id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('duplicate');
      expect(res.body.duplicate_of).toBe(bug1.id);
    });

    it('should return 400 when duplicate_of is missing', async () => {
      // Verifies: FR-DUP-04
      const bug = createBug(db, { title: 'Bug', description: 'desc', severity: 'high' });

      const res = await supertest(app)
        .patch(`/api/bugs/${bug.id}`)
        .send({ status: 'duplicate' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for self-reference', async () => {
      // Verifies: FR-DUP-07
      const bug = createBug(db, { title: 'Bug', description: 'desc', severity: 'high' });

      const res = await supertest(app)
        .patch(`/api/bugs/${bug.id}`)
        .send({ status: 'duplicate', duplicate_of: bug.id });

      expect(res.status).toBe(400);
    });

    it('should return 400 for non-existent canonical bug', async () => {
      // Verifies: FR-DUP-07
      const bug = createBug(db, { title: 'Bug', description: 'desc', severity: 'high' });

      const res = await supertest(app)
        .patch(`/api/bugs/${bug.id}`)
        .send({ status: 'duplicate', duplicate_of: 'BUG-9999' });

      expect(res.status).toBe(400);
    });
  });

  // --- FR: PATCH with status=duplicate ---

  describe('PATCH /api/feature-requests/:id — duplicate', () => {
    it('should set duplicate status and duplicate_of field', async () => {
      // Verifies: FR-DUP-04
      const fr1 = createFeatureRequest(db, { title: 'Original FR', description: 'desc' });
      const fr2 = createFeatureRequest(db, { title: 'Duplicate FR', description: 'desc' });

      const res = await supertest(app)
        .patch(`/api/feature-requests/${fr2.id}`)
        .send({ status: 'duplicate', duplicate_of: fr1.id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('duplicate');
      expect(res.body.duplicate_of).toBe(fr1.id);
    });

    it('should return 400 when duplicate_of is missing', async () => {
      // Verifies: FR-DUP-04
      const fr = createFeatureRequest(db, { title: 'FR', description: 'desc' });

      const res = await supertest(app)
        .patch(`/api/feature-requests/${fr.id}`)
        .send({ status: 'duplicate' });

      expect(res.status).toBe(400);
    });

    it('should return 400 for self-reference', async () => {
      // Verifies: FR-DUP-07
      const fr = createFeatureRequest(db, { title: 'FR', description: 'desc' });

      const res = await supertest(app)
        .patch(`/api/feature-requests/${fr.id}`)
        .send({ status: 'duplicate', duplicate_of: fr.id });

      expect(res.status).toBe(400);
    });

    it('should return 400 for non-existent canonical FR', async () => {
      // Verifies: FR-DUP-07
      const fr = createFeatureRequest(db, { title: 'FR', description: 'desc' });

      const res = await supertest(app)
        .patch(`/api/feature-requests/${fr.id}`)
        .send({ status: 'duplicate', duplicate_of: 'FR-9999' });

      expect(res.status).toBe(400);
    });
  });

  // --- FR: PATCH with status=deprecated ---

  describe('PATCH /api/feature-requests/:id — deprecated', () => {
    it('should set deprecated status with reason', async () => {
      // Verifies: FR-DUP-04
      const fr = createFeatureRequest(db, { title: 'Old FR', description: 'desc' });

      const res = await supertest(app)
        .patch(`/api/feature-requests/${fr.id}`)
        .send({ status: 'deprecated', deprecation_reason: 'Superseded by newer approach' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('deprecated');
      expect(res.body.deprecation_reason).toBe('Superseded by newer approach');
    });

    it('should allow deprecated without reason', async () => {
      // Verifies: FR-DUP-04
      const fr = createFeatureRequest(db, { title: 'Old FR', description: 'desc' });

      const res = await supertest(app)
        .patch(`/api/feature-requests/${fr.id}`)
        .send({ status: 'deprecated' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('deprecated');
      expect(res.body.deprecation_reason).toBeNull();
    });
  });

  // --- Bug list: include_hidden ---

  describe('GET /api/bugs — include_hidden', () => {
    it('should exclude hidden bugs by default', async () => {
      // Verifies: FR-DUP-05
      const bug1 = createBug(db, { title: 'Active bug', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Dupe bug', description: 'desc', severity: 'high' });
      updateBug(db, bug2.id, { status: 'duplicate', duplicate_of: bug1.id });

      const res = await supertest(app).get('/api/bugs');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(bug1.id);
    });

    it('should include hidden bugs when include_hidden=true', async () => {
      // Verifies: FR-DUP-05
      const bug1 = createBug(db, { title: 'Active bug', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Dupe bug', description: 'desc', severity: 'high' });
      updateBug(db, bug2.id, { status: 'duplicate', duplicate_of: bug1.id });

      const res = await supertest(app).get('/api/bugs?include_hidden=true');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  // --- FR list: include_hidden ---

  describe('GET /api/feature-requests — include_hidden', () => {
    it('should exclude hidden FRs by default', async () => {
      // Verifies: FR-DUP-05
      const fr1 = createFeatureRequest(db, { title: 'Active FR', description: 'desc' });
      const fr2 = createFeatureRequest(db, { title: 'Dupe FR', description: 'other desc' });
      updateFeatureRequest(db, fr2.id, { status: 'duplicate', duplicate_of: fr1.id });

      const res = await supertest(app).get('/api/feature-requests');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(fr1.id);
    });

    it('should include hidden FRs when include_hidden=true', async () => {
      // Verifies: FR-DUP-05
      const fr1 = createFeatureRequest(db, { title: 'Active FR', description: 'desc' });
      const fr2 = createFeatureRequest(db, { title: 'Dupe FR', description: 'other desc' });
      updateFeatureRequest(db, fr2.id, { status: 'duplicate', duplicate_of: fr1.id });

      const res = await supertest(app).get('/api/feature-requests?include_hidden=true');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  // --- GET /:id returns hidden items ---

  describe('GET /:id — always returns full item', () => {
    it('should return a duplicate bug by ID', async () => {
      // Verifies: FR-DUP-06
      const bug1 = createBug(db, { title: 'Original', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Duplicate', description: 'desc', severity: 'high' });
      updateBug(db, bug2.id, { status: 'duplicate', duplicate_of: bug1.id });

      const res = await supertest(app).get(`/api/bugs/${bug2.id}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('duplicate');
      expect(res.body.duplicate_of).toBe(bug1.id);
    });

    it('should return a deprecated FR by ID', async () => {
      // Verifies: FR-DUP-06
      const fr = createFeatureRequest(db, { title: 'Old FR', description: 'desc' });
      updateFeatureRequest(db, fr.id, { status: 'deprecated', deprecation_reason: 'Out of scope' });

      const res = await supertest(app).get(`/api/feature-requests/${fr.id}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('deprecated');
      expect(res.body.deprecation_reason).toBe('Out of scope');
    });
  });

  // --- Canonical item shows duplicated_by ---

  describe('duplicated_by on canonical items', () => {
    it('canonical bug shows duplicated_by list', async () => {
      // Verifies: FR-DUP-03
      const bug1 = createBug(db, { title: 'Canonical', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Dupe 1', description: 'desc', severity: 'high' });
      const bug3 = createBug(db, { title: 'Dupe 2', description: 'desc', severity: 'medium' });
      updateBug(db, bug2.id, { status: 'duplicate', duplicate_of: bug1.id });
      updateBug(db, bug3.id, { status: 'duplicate', duplicate_of: bug1.id });

      const res = await supertest(app).get(`/api/bugs/${bug1.id}`);
      expect(res.status).toBe(200);
      expect(res.body.duplicated_by).toHaveLength(2);
      expect(res.body.duplicated_by).toContain(bug2.id);
      expect(res.body.duplicated_by).toContain(bug3.id);
    });

    it('canonical FR shows duplicated_by list', async () => {
      // Verifies: FR-DUP-03
      const fr1 = createFeatureRequest(db, { title: 'Canonical FR', description: 'desc' });
      const fr2 = createFeatureRequest(db, { title: 'Dupe FR', description: 'other desc' });
      updateFeatureRequest(db, fr2.id, { status: 'duplicate', duplicate_of: fr1.id });

      const res = await supertest(app).get(`/api/feature-requests/${fr1.id}`);
      expect(res.status).toBe(200);
      expect(res.body.duplicated_by).toHaveLength(1);
      expect(res.body.duplicated_by).toContain(fr2.id);
    });
  });

  // --- Terminal status enforcement ---

  describe('terminal status enforcement', () => {
    it('cannot transition out of duplicate status (bug)', async () => {
      // Verifies: FR-DUP-04
      const bug1 = createBug(db, { title: 'Original', description: 'desc', severity: 'high' });
      const bug2 = createBug(db, { title: 'Duplicate', description: 'desc', severity: 'high' });
      updateBug(db, bug2.id, { status: 'duplicate', duplicate_of: bug1.id });

      const res = await supertest(app)
        .patch(`/api/bugs/${bug2.id}`)
        .send({ status: 'reported' });

      expect(res.status).toBe(400);
    });

    it('cannot transition out of deprecated status (FR)', async () => {
      // Verifies: FR-DUP-04
      const fr = createFeatureRequest(db, { title: 'Old FR', description: 'desc' });
      updateFeatureRequest(db, fr.id, { status: 'deprecated' });

      const res = await supertest(app)
        .patch(`/api/feature-requests/${fr.id}`)
        .send({ status: 'potential' });

      expect(res.status).toBe(400);
    });
  });
});
