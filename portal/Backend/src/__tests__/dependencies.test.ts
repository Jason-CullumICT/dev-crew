// Verifies: FR-dependency-linking — Backend integration tests for dependency linking and dispatch gating
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema';
import { DependencyService, DependencyError } from '../services/dependencyService';
import { BugService } from '../services/bugService';
import { FeatureRequestService } from '../services/featureRequestService';
import { createApp, seedDependencies } from '../app';
import express from 'express';
import request from 'supertest';

// Verifies: FR-dependency-linking — Test helpers
function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initializeSchema(db);
  return db;
}

function insertBug(db: Database.Database, id: string, title: string, status = 'new'): void {
  db.prepare('INSERT INTO bugs (id, title, status) VALUES (?, ?, ?)').run(id, title, status);
}

function insertFR(db: Database.Database, id: string, title: string, status = 'submitted'): void {
  db.prepare('INSERT INTO feature_requests (id, title, status) VALUES (?, ?, ?)').run(id, title, status);
}

// Verifies: FR-dependency-linking — DependencyService unit tests
describe('DependencyService', () => {
  let db: Database.Database;
  let depService: DependencyService;

  beforeEach(() => {
    db = createTestDb();
    depService = new DependencyService(db);
    insertBug(db, 'BUG-0001', 'Bug One');
    insertBug(db, 'BUG-0002', 'Bug Two');
    insertBug(db, 'BUG-0003', 'Bug Three', 'resolved');
    insertFR(db, 'FR-0001', 'Feature One');
    insertFR(db, 'FR-0002', 'Feature Two', 'completed');
  });

  afterEach(() => {
    db.close();
  });

  // Verifies: FR-dependency-linking — Basic CRUD
  describe('addDependency / removeDependency', () => {
    it('should add a dependency link', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      const blockers = depService.getBlockedBy('bug', 'BUG-0001');
      expect(blockers).toHaveLength(1);
      expect(blockers[0].item_id).toBe('BUG-0002');
    });

    it('should add cross-type dependency (bug blocked by FR)', () => {
      depService.addDependency('bug', 'BUG-0001', 'feature_request', 'FR-0001');
      const blockers = depService.getBlockedBy('bug', 'BUG-0001');
      expect(blockers).toHaveLength(1);
      expect(blockers[0].item_type).toBe('feature_request');
      expect(blockers[0].item_id).toBe('FR-0001');
    });

    it('should be idempotent on add (INSERT OR IGNORE)', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      const blockers = depService.getBlockedBy('bug', 'BUG-0001');
      expect(blockers).toHaveLength(1);
    });

    it('should remove a dependency link', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      depService.removeDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      const blockers = depService.getBlockedBy('bug', 'BUG-0001');
      expect(blockers).toHaveLength(0);
    });

    it('should be idempotent on remove (no error if not found)', () => {
      expect(() => {
        depService.removeDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      }).not.toThrow();
    });

    // Verifies: FR-dependency-linking — Self-referential rejection
    it('should reject self-referential dependency', () => {
      expect(() => {
        depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0001');
      }).toThrow(DependencyError);
    });

    it('should reject dependency on non-existent item', () => {
      expect(() => {
        depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-9999');
      }).toThrow(DependencyError);
    });
  });

  // Verifies: FR-dependency-linking — Query methods
  describe('getBlockedBy / getBlocks', () => {
    it('should return resolved DependencyLink with title and status', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0003');
      const blockers = depService.getBlockedBy('bug', 'BUG-0001');
      expect(blockers[0]).toEqual({
        item_type: 'bug',
        item_id: 'BUG-0003',
        title: 'Bug Three',
        status: 'resolved',
      });
    });

    it('should return blocks (reverse lookup)', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      const blocks = depService.getBlocks('bug', 'BUG-0002');
      expect(blocks).toHaveLength(1);
      expect(blocks[0].item_id).toBe('BUG-0001');
    });
  });

  // Verifies: FR-dependency-ready-check — Readiness checks
  describe('hasUnresolvedBlockers / isReady', () => {
    it('should return false when no blockers', () => {
      expect(depService.hasUnresolvedBlockers('bug', 'BUG-0001')).toBe(false);
    });

    it('should return true when unresolved blockers exist', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002'); // BUG-0002 is "new"
      expect(depService.hasUnresolvedBlockers('bug', 'BUG-0001')).toBe(true);
    });

    it('should return false when all blockers are resolved', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0003'); // BUG-0003 is "resolved"
      expect(depService.hasUnresolvedBlockers('bug', 'BUG-0001')).toBe(false);
    });

    it('isReady should return ready:true with empty unresolved_blockers when all resolved', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0003');
      const result = depService.isReady('bug', 'BUG-0001');
      expect(result.ready).toBe(true);
      expect(result.unresolved_blockers).toHaveLength(0);
    });

    it('isReady should return ready:false with unresolved_blockers list', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      const result = depService.isReady('bug', 'BUG-0001');
      expect(result.ready).toBe(false);
      expect(result.unresolved_blockers).toHaveLength(1);
      expect(result.unresolved_blockers[0].item_id).toBe('BUG-0002');
    });
  });

  // Verifies: FR-dependency-cycle-detection — Circular dependency detection
  describe('detectCycle', () => {
    it('should detect direct cycle (A->B, B->A)', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      expect(() => {
        depService.addDependency('bug', 'BUG-0002', 'bug', 'BUG-0001');
      }).toThrow(/circular dependency/i);
    });

    it('should detect transitive cycle (A->B->C, C->A)', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      depService.addDependency('bug', 'BUG-0002', 'bug', 'BUG-0003');
      expect(() => {
        depService.addDependency('bug', 'BUG-0003', 'bug', 'BUG-0001');
      }).toThrow(/circular dependency/i);
    });

    it('should allow non-cyclic graph', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0003');
      depService.addDependency('bug', 'BUG-0002', 'bug', 'BUG-0003');
      // Both depend on BUG-0003 but no cycle
      expect(depService.getBlockedBy('bug', 'BUG-0001')).toHaveLength(1);
      expect(depService.getBlockedBy('bug', 'BUG-0002')).toHaveLength(1);
    });
  });

  // Verifies: FR-dependency-linking — Bulk set
  describe('setDependencies', () => {
    it('should bulk set dependencies replacing existing', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      depService.setDependencies('bug', 'BUG-0001', ['BUG-0003']);
      const blockers = depService.getBlockedBy('bug', 'BUG-0001');
      expect(blockers).toHaveLength(1);
      expect(blockers[0].item_id).toBe('BUG-0003');
    });

    it('should clear all dependencies with empty array', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      depService.setDependencies('bug', 'BUG-0001', []);
      expect(depService.getBlockedBy('bug', 'BUG-0001')).toHaveLength(0);
    });

    it('should reject invalid blocker ID format', () => {
      expect(() => {
        depService.setDependencies('bug', 'BUG-0001', ['INVALID-001']);
      }).toThrow(/Invalid blocker ID format/);
    });

    it('should support cross-type bulk set', () => {
      depService.setDependencies('bug', 'BUG-0001', ['BUG-0002', 'FR-0001']);
      const blockers = depService.getBlockedBy('bug', 'BUG-0001');
      expect(blockers).toHaveLength(2);
    });
  });

  // Verifies: FR-dependency-dispatch-gating — Auto-dispatch cascade
  describe('onItemCompleted', () => {
    it('should auto-dispatch pending_dependencies items when all blockers resolve', () => {
      // BUG-0001 blocked by BUG-0002 (unresolved)
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      // Set BUG-0001 to pending_dependencies
      db.prepare('UPDATE bugs SET status = ? WHERE id = ?').run('pending_dependencies', 'BUG-0001');

      // Complete BUG-0002
      db.prepare('UPDATE bugs SET status = ? WHERE id = ?').run('resolved', 'BUG-0002');
      const dispatched = depService.onItemCompleted('bug', 'BUG-0002');

      expect(dispatched).toContain('BUG-0001');
      const row = db.prepare('SELECT status FROM bugs WHERE id = ?').get('BUG-0001') as { status: string };
      expect(row.status).toBe('approved');
    });

    it('should not auto-dispatch if other blockers remain unresolved', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      depService.addDependency('bug', 'BUG-0001', 'feature_request', 'FR-0001');
      db.prepare('UPDATE bugs SET status = ? WHERE id = ?').run('pending_dependencies', 'BUG-0001');

      // Complete only BUG-0002 but FR-0001 is still 'submitted'
      db.prepare('UPDATE bugs SET status = ? WHERE id = ?').run('resolved', 'BUG-0002');
      const dispatched = depService.onItemCompleted('bug', 'BUG-0002');

      expect(dispatched).not.toContain('BUG-0001');
      const row = db.prepare('SELECT status FROM bugs WHERE id = ?').get('BUG-0001') as { status: string };
      expect(row.status).toBe('pending_dependencies');
    });

    it('should not affect items not in pending_dependencies status', () => {
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
      // BUG-0001 stays in 'new' status
      db.prepare('UPDATE bugs SET status = ? WHERE id = ?').run('resolved', 'BUG-0002');
      const dispatched = depService.onItemCompleted('bug', 'BUG-0002');
      expect(dispatched).toHaveLength(0);
    });
  });
});

// Verifies: FR-dependency-dispatch-gating — Service-level dispatch gating tests
describe('BugService dispatch gating', () => {
  let db: Database.Database;
  let bugService: BugService;

  beforeEach(() => {
    db = createTestDb();
    bugService = new BugService(db);
    insertBug(db, 'BUG-0001', 'Bug One');
    insertBug(db, 'BUG-0002', 'Bug Two');
    insertFR(db, 'FR-0001', 'Feature One');
  });

  afterEach(() => {
    db.close();
  });

  it('should set status to pending_dependencies when approving with unresolved blockers', () => {
    const depService = new DependencyService(db);
    depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');

    const result = bugService.updateBug('BUG-0001', { status: 'approved' });
    expect(result.status).toBe('pending_dependencies');
  });

  it('should allow approval when no blockers exist', () => {
    const result = bugService.updateBug('BUG-0001', { status: 'approved' });
    expect(result.status).toBe('approved');
  });

  it('should allow approval when all blockers are resolved', () => {
    const depService = new DependencyService(db);
    insertBug(db, 'BUG-0003', 'Bug Three', 'resolved');
    depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0003');

    const result = bugService.updateBug('BUG-0001', { status: 'approved' });
    expect(result.status).toBe('approved');
  });

  it('should trigger auto-dispatch cascade on completion', () => {
    const depService = new DependencyService(db);
    depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');
    db.prepare('UPDATE bugs SET status = ? WHERE id = ?').run('pending_dependencies', 'BUG-0001');

    bugService.updateBug('BUG-0002', { status: 'resolved' });

    const bug = bugService.getBugById('BUG-0001');
    expect(bug!.status).toBe('approved');
  });
});

// Verifies: FR-dependency-dispatch-gating — FeatureRequestService dispatch gating tests
describe('FeatureRequestService dispatch gating', () => {
  let db: Database.Database;
  let frService: FeatureRequestService;

  beforeEach(() => {
    db = createTestDb();
    frService = new FeatureRequestService(db);
    insertFR(db, 'FR-0001', 'Feature One');
    insertFR(db, 'FR-0002', 'Feature Two');
  });

  afterEach(() => {
    db.close();
  });

  it('should set status to pending_dependencies when approving with unresolved blockers', () => {
    const depService = new DependencyService(db);
    depService.addDependency('feature_request', 'FR-0001', 'feature_request', 'FR-0002');

    const result = frService.updateFeatureRequest('FR-0001', { status: 'approved' });
    expect(result.status).toBe('pending_dependencies');
  });

  it('should trigger auto-dispatch cascade on completion', () => {
    const depService = new DependencyService(db);
    depService.addDependency('feature_request', 'FR-0001', 'feature_request', 'FR-0002');
    db.prepare('UPDATE feature_requests SET status = ? WHERE id = ?').run('pending_dependencies', 'FR-0001');

    frService.updateFeatureRequest('FR-0002', { status: 'completed' });

    const fr = frService.getFeatureRequestById('FR-0001');
    expect(fr!.status).toBe('approved');
  });
});

// Verifies: FR-dependency-linking — API endpoint integration tests
describe('API endpoints', () => {
  let db: Database.Database;
  let app: express.Application;

  beforeEach(() => {
    db = createTestDb();
    app = createApp(db);
    insertBug(db, 'BUG-0001', 'Bug One');
    insertBug(db, 'BUG-0002', 'Bug Two');
    insertBug(db, 'BUG-0003', 'Bug Three', 'resolved');
    insertFR(db, 'FR-0001', 'Feature One');
    insertFR(db, 'FR-0002', 'Feature Two', 'completed');
  });

  afterEach(() => {
    db.close();
  });

  // Verifies: FR-dependency-linking — Bug list endpoint
  describe('GET /api/bugs', () => {
    it('should return {data: Bug[]} wrapper', async () => {
      const res = await request(app).get('/api/bugs');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(3);
    });

    it('should include has_unresolved_blockers per item', async () => {
      const depService = new DependencyService(db);
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');

      const res = await request(app).get('/api/bugs');
      const bug1 = res.body.data.find((b: any) => b.id === 'BUG-0001');
      expect(bug1.has_unresolved_blockers).toBe(true);
    });

    it('should support search query', async () => {
      const res = await request(app).get('/api/bugs?q=One');
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].id).toBe('BUG-0001');
    });
  });

  // Verifies: FR-dependency-linking — Bug detail endpoint
  describe('GET /api/bugs/:id', () => {
    it('should return bug with blocked_by and blocks arrays', async () => {
      const depService = new DependencyService(db);
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0003');

      const res = await request(app).get('/api/bugs/BUG-0001');
      expect(res.status).toBe(200);
      expect(res.body.blocked_by).toHaveLength(1);
      expect(res.body.blocked_by[0].item_id).toBe('BUG-0003');
      expect(res.body.blocked_by[0].title).toBe('Bug Three');
      expect(res.body.blocked_by[0].status).toBe('resolved');
    });

    it('should return 404 for non-existent bug', async () => {
      const res = await request(app).get('/api/bugs/BUG-9999');
      expect(res.status).toBe(404);
    });
  });

  // Verifies: FR-dependency-dispatch-gating — Bug PATCH with dispatch gating
  describe('PATCH /api/bugs/:id', () => {
    it('should accept blocked_by array and set dependencies', async () => {
      const res = await request(app)
        .patch('/api/bugs/BUG-0001')
        .send({ blocked_by: ['BUG-0002', 'BUG-0003'] });
      expect(res.status).toBe(200);
      expect(res.body.blocked_by).toHaveLength(2);
    });

    it('should gate dispatch when blockers are unresolved', async () => {
      const depService = new DependencyService(db);
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');

      const res = await request(app)
        .patch('/api/bugs/BUG-0001')
        .send({ status: 'approved' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending_dependencies');
    });

    it('should return 404 for non-existent bug', async () => {
      const res = await request(app)
        .patch('/api/bugs/BUG-9999')
        .send({ title: 'nope' });
      expect(res.status).toBe(404);
    });
  });

  // Verifies: FR-dependency-linking — POST dependency add/remove
  describe('POST /api/bugs/:id/dependencies', () => {
    it('should add a dependency', async () => {
      const res = await request(app)
        .post('/api/bugs/BUG-0001/dependencies')
        .send({ action: 'add', blocker_id: 'BUG-0002' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const getRes = await request(app).get('/api/bugs/BUG-0001');
      expect(getRes.body.blocked_by).toHaveLength(1);
    });

    it('should remove a dependency', async () => {
      const depService = new DependencyService(db);
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');

      const res = await request(app)
        .post('/api/bugs/BUG-0001/dependencies')
        .send({ action: 'remove', blocker_id: 'BUG-0002' });
      expect(res.status).toBe(200);

      const getRes = await request(app).get('/api/bugs/BUG-0001');
      expect(getRes.body.blocked_by).toHaveLength(0);
    });

    it('should reject circular dependency with 409', async () => {
      const depService = new DependencyService(db);
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');

      const res = await request(app)
        .post('/api/bugs/BUG-0002/dependencies')
        .send({ action: 'add', blocker_id: 'BUG-0001' });
      expect(res.status).toBe(409);
    });

    it('should reject invalid blocker_id format with 400', async () => {
      const res = await request(app)
        .post('/api/bugs/BUG-0001/dependencies')
        .send({ action: 'add', blocker_id: 'INVALID' });
      expect(res.status).toBe(400);
    });

    it('should reject missing fields with 400', async () => {
      const res = await request(app)
        .post('/api/bugs/BUG-0001/dependencies')
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // Verifies: FR-dependency-ready-check — Readiness endpoint
  describe('GET /api/bugs/:id/ready', () => {
    it('should return ready:true when no blockers', async () => {
      const res = await request(app).get('/api/bugs/BUG-0001/ready');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
      expect(res.body.unresolved_blockers).toHaveLength(0);
    });

    it('should return ready:false with unresolved blockers', async () => {
      const depService = new DependencyService(db);
      depService.addDependency('bug', 'BUG-0001', 'bug', 'BUG-0002');

      const res = await request(app).get('/api/bugs/BUG-0001/ready');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(false);
      expect(res.body.unresolved_blockers).toHaveLength(1);
    });

    it('should return 404 for non-existent bug', async () => {
      const res = await request(app).get('/api/bugs/BUG-9999/ready');
      expect(res.status).toBe(404);
    });
  });

  // Verifies: FR-dependency-linking — Feature request endpoints
  describe('Feature request endpoints', () => {
    it('GET /api/feature-requests should return {data: FeatureRequest[]}', async () => {
      const res = await request(app).get('/api/feature-requests');
      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('GET /api/feature-requests/:id should include dependency info', async () => {
      const depService = new DependencyService(db);
      depService.addDependency('feature_request', 'FR-0001', 'feature_request', 'FR-0002');

      const res = await request(app).get('/api/feature-requests/FR-0001');
      expect(res.status).toBe(200);
      expect(res.body.blocked_by).toHaveLength(1);
    });

    it('POST /api/feature-requests/:id/dependencies should add dependency', async () => {
      const res = await request(app)
        .post('/api/feature-requests/FR-0001/dependencies')
        .send({ action: 'add', blocker_id: 'FR-0002' });
      expect(res.status).toBe(200);
    });

    it('GET /api/feature-requests/:id/ready should check readiness', async () => {
      const res = await request(app).get('/api/feature-requests/FR-0001/ready');
      expect(res.status).toBe(200);
      expect(res.body.ready).toBe(true);
    });

    it('PATCH /api/feature-requests/:id should gate dispatch', async () => {
      const depService = new DependencyService(db);
      depService.addDependency('feature_request', 'FR-0001', 'feature_request', 'FR-0002');
      // FR-0002 is completed so this should pass
      const res = await request(app)
        .patch('/api/feature-requests/FR-0001')
        .send({ status: 'approved' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('approved');
    });
  });

  // Verifies: FR-dependency-linking — Seed data test
  describe('seedDependencies', () => {
    it('should seed known dependencies when items exist', () => {
      // Create all items needed for seeding
      insertBug(db, 'BUG-0010', 'Bug Ten');
      // BUG-0003 already exists
      insertBug(db, 'BUG-0004', 'Bug Four');
      insertBug(db, 'BUG-0005', 'Bug Five');
      insertBug(db, 'BUG-0006', 'Bug Six');
      insertBug(db, 'BUG-0007', 'Bug Seven');
      insertFR(db, 'FR-0003', 'Feature Three');
      insertFR(db, 'FR-0004', 'Feature Four');
      insertFR(db, 'FR-0005', 'Feature Five');
      insertFR(db, 'FR-0007', 'Feature Seven');

      seedDependencies(db);

      const depService = new DependencyService(db);
      const bug10Blockers = depService.getBlockedBy('bug', 'BUG-0010');
      expect(bug10Blockers).toHaveLength(5);

      const fr4Blockers = depService.getBlockedBy('feature_request', 'FR-0004');
      expect(fr4Blockers).toHaveLength(1);
      expect(fr4Blockers[0].item_id).toBe('FR-0003');

      const fr5Blockers = depService.getBlockedBy('feature_request', 'FR-0005');
      expect(fr5Blockers).toHaveLength(1);
      expect(fr5Blockers[0].item_id).toBe('FR-0002');

      const fr7Blockers = depService.getBlockedBy('feature_request', 'FR-0007');
      expect(fr7Blockers).toHaveLength(1);
      expect(fr7Blockers[0].item_id).toBe('FR-0003');
    });
  });
});
