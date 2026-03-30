// Verifies: FR-dependency-linking — Tests for dependency seeding and integration verification
// Validates that the seed script correctly links known backlog dependencies and that
// dispatch gating + cascade logic work end-to-end.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import supertest from 'supertest';
import { createApp } from '../src/index';
import { setDb } from '../src/database/connection';
import { runMigrations } from '../src/database/schema';
import { createBug, getBugById, updateBug } from '../src/services/bugService';
import {
  createFeatureRequest,
  getFeatureRequestById,
  updateFeatureRequest,
  voteOnFeatureRequest,
  approveFeatureRequest,
} from '../src/services/featureRequestService';
import { DependencyService } from '../src/services/dependencyService';
import { seedKnownDependencies, KNOWN_DEPENDENCIES } from '../src/database/seed-dependencies';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

describe('Dependency Seeding', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createTestDb();
    setDb(db);
  });

  afterEach(() => {
    db.close();
  });

  // Verifies: FR-dependency-linking — Seed skips gracefully when items don't exist
  it('should skip seeding when items do not exist', () => {
    const result = seedKnownDependencies(db);

    // All items should be skipped (404) since none exist
    expect(result.linked).toBe(0);
    expect(result.skipped).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });

  // Verifies: FR-dependency-linking — Seed links dependencies when items exist
  it('should seed dependencies for existing items', () => {
    // Create bugs BUG-0001 through BUG-0010 (IDs are auto-generated sequentially)
    for (let i = 0; i < 10; i++) {
      createBug(db, { title: `Bug ${i + 1}`, description: `Description ${i + 1}`, severity: 'medium' });
    }

    // Create FRs FR-0001 through FR-0007
    for (let i = 0; i < 7; i++) {
      createFeatureRequest(db, { title: `Feature ${i + 1} unique-title-${i}`, description: `Description ${i + 1}` });
    }

    const result = seedKnownDependencies(db);

    // BUG-0010 -> 5 blockers, FR-0004 -> 1, FR-0005 -> 1, FR-0007 -> 1 = 8 total
    expect(result.linked).toBe(8);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);

    // Verify BUG-0010 has 5 blockers
    const depService = new DependencyService(db);
    const bug10Blockers = depService.getBlockedBy('bug', 'BUG-0010');
    expect(bug10Blockers).toHaveLength(5);

    // Verify FR-0004 is blocked by FR-0003
    const fr4Blockers = depService.getBlockedBy('feature_request', 'FR-0004');
    expect(fr4Blockers).toHaveLength(1);
    expect(fr4Blockers[0].item_id).toBe('FR-0003');

    // Verify FR-0005 is blocked by FR-0002
    const fr5Blockers = depService.getBlockedBy('feature_request', 'FR-0005');
    expect(fr5Blockers).toHaveLength(1);
    expect(fr5Blockers[0].item_id).toBe('FR-0002');

    // Verify FR-0007 is blocked by FR-0003
    const fr7Blockers = depService.getBlockedBy('feature_request', 'FR-0007');
    expect(fr7Blockers).toHaveLength(1);
    expect(fr7Blockers[0].item_id).toBe('FR-0003');

    // Verify FR-0003 blocks FR-0004 and FR-0007
    const fr3Blocks = depService.getBlocks('feature_request', 'FR-0003');
    expect(fr3Blocks).toHaveLength(2);
    const blockedIds = fr3Blocks.map(b => b.item_id).sort();
    expect(blockedIds).toEqual(['FR-0004', 'FR-0007']);
  });

  // Verifies: FR-dependency-linking — Idempotent seeding (INSERT OR IGNORE)
  it('should be idempotent when run twice', () => {
    for (let i = 0; i < 10; i++) {
      createBug(db, { title: `Bug ${i + 1}`, description: `Desc ${i + 1}`, severity: 'low' });
    }
    for (let i = 0; i < 7; i++) {
      createFeatureRequest(db, { title: `FR unique-${i + 1} different words`, description: `Desc ${i + 1}` });
    }

    const first = seedKnownDependencies(db);
    const second = seedKnownDependencies(db);

    expect(first.linked).toBe(8);
    // Second run: addDependency uses INSERT OR IGNORE, so no errors but no new links
    expect(second.linked).toBe(8); // INSERT OR IGNORE still counts as success
    expect(second.errors).toHaveLength(0);
  });
});

describe('Dispatch Gating Integration', () => {
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

  // Verifies: FR-dependency-dispatch-gating — FR dispatch gating via status transition
  it('should gate FR dispatch when moving to approved with unresolved blockers', async () => {
    const fr1 = createFeatureRequest(db, { title: 'Blocked FR unique-gating', description: 'desc' });
    const fr2 = createFeatureRequest(db, { title: 'Blocker FR unique-blocker', description: 'desc' });

    // Add dependency: fr1 blocked by fr2
    await supertest(app)
      .post(`/api/feature-requests/${fr1.id}/dependencies`)
      .send({ action: 'add', blocker_id: fr2.id });

    // Move fr1 through voting -> approved (should be gated)
    // random() < approveThreshold forces all agents to vote approve
    voteOnFeatureRequest(db, fr1.id, { random: () => 0.01 });
    const approved = approveFeatureRequest(db, fr1.id);

    expect(approved.status).toBe('pending_dependencies');
  });

  // Verifies: FR-dependency-dispatch-gating — Cascade auto-dispatch on blocker completion
  it('should auto-dispatch FR when blocker completes', async () => {
    const fr1 = createFeatureRequest(db, { title: 'Gated FR unique-cascade-1', description: 'desc' });
    const fr2 = createFeatureRequest(db, { title: 'Blocker FR unique-cascade-2', description: 'desc' });

    // fr1 blocked by fr2
    await supertest(app)
      .post(`/api/feature-requests/${fr1.id}/dependencies`)
      .send({ action: 'add', blocker_id: fr2.id });

    // Move fr1 through voting -> approved (gated to pending_dependencies)
    voteOnFeatureRequest(db, fr1.id, { random: () => 0.01 });
    approveFeatureRequest(db, fr1.id);
    expect(getFeatureRequestById(db, fr1.id)!.status).toBe('pending_dependencies');

    // Move fr2 to completed: potential -> voting -> approved -> in_development -> completed
    voteOnFeatureRequest(db, fr2.id, { random: () => 0.01 });
    approveFeatureRequest(db, fr2.id);
    updateFeatureRequest(db, fr2.id, { status: 'in_development' });
    updateFeatureRequest(db, fr2.id, { status: 'completed' });

    // fr1 should be auto-dispatched to approved
    const fr1After = getFeatureRequestById(db, fr1.id)!;
    expect(fr1After.status).toBe('approved');
  });

  // Verifies: FR-dependency-dispatch-gating — Cross-type cascade (bug completes, unblocks FR)
  it('should auto-dispatch FR when blocking bug is resolved', async () => {
    const fr = createFeatureRequest(db, { title: 'FR blocked by bug unique-cross', description: 'desc' });
    const bug = createBug(db, { title: 'Blocking bug unique-cross', description: 'desc', severity: 'high' });

    // fr blocked by bug
    await supertest(app)
      .post(`/api/feature-requests/${fr.id}/dependencies`)
      .send({ action: 'add', blocker_id: bug.id });

    // Gate the FR
    voteOnFeatureRequest(db, fr.id, { random: () => 0.01 });
    approveFeatureRequest(db, fr.id);
    expect(getFeatureRequestById(db, fr.id)!.status).toBe('pending_dependencies');

    // Resolve the blocking bug
    updateBug(db, bug.id, { status: 'resolved' });

    // FR should be auto-dispatched
    const frAfter = getFeatureRequestById(db, fr.id)!;
    expect(frAfter.status).toBe('approved');
  });

  // Verifies: FR-dependency-dispatch-gating — Multiple blockers: only unblocks when ALL resolved
  it('should only auto-dispatch when all blockers are resolved', async () => {
    const fr = createFeatureRequest(db, { title: 'Multi-blocked FR unique-multi', description: 'desc' });
    const bug1 = createBug(db, { title: 'Blocker 1 unique-multi', description: 'desc', severity: 'high' });
    const bug2 = createBug(db, { title: 'Blocker 2 unique-multi', description: 'desc', severity: 'medium' });

    // fr blocked by bug1 and bug2
    await supertest(app)
      .post(`/api/feature-requests/${fr.id}/dependencies`)
      .send({ action: 'add', blocker_id: bug1.id });
    await supertest(app)
      .post(`/api/feature-requests/${fr.id}/dependencies`)
      .send({ action: 'add', blocker_id: bug2.id });

    // Gate the FR
    voteOnFeatureRequest(db, fr.id, { random: () => 0.01 });
    approveFeatureRequest(db, fr.id);
    expect(getFeatureRequestById(db, fr.id)!.status).toBe('pending_dependencies');

    // Resolve only bug1 — fr should still be pending
    updateBug(db, bug1.id, { status: 'resolved' });
    expect(getFeatureRequestById(db, fr.id)!.status).toBe('pending_dependencies');

    // Resolve bug2 — fr should now be auto-dispatched
    updateBug(db, bug2.id, { status: 'closed' });
    expect(getFeatureRequestById(db, fr.id)!.status).toBe('approved');
  });

  // Verifies: FR-dependency-linking — has_unresolved_blockers flag in list endpoints
  it('should include has_unresolved_blockers in list responses', async () => {
    const bug1 = createBug(db, { title: 'Blocked bug for list unique-list', description: 'desc', severity: 'high' });
    const bug2 = createBug(db, { title: 'Blocker bug for list unique-list', description: 'desc', severity: 'medium' });

    await supertest(app)
      .post(`/api/bugs/${bug1.id}/dependencies`)
      .send({ action: 'add', blocker_id: bug2.id });

    const res = await supertest(app).get('/api/bugs');
    expect(res.status).toBe(200);

    const blockedBug = res.body.data.find((b: any) => b.id === bug1.id);
    const blockerBug = res.body.data.find((b: any) => b.id === bug2.id);

    expect(blockedBug.has_unresolved_blockers).toBe(true);
    expect(blockerBug.has_unresolved_blockers).toBe(false);
  });
});
