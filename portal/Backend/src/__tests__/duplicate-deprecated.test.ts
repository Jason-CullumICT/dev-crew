// Verifies: FR-0008 — Integration tests for duplicate/deprecated status feature
import Database from 'better-sqlite3';
import { initializeSchema } from '../database/schema';
import { BugService } from '../services/bugService';
import { FeatureRequestService } from '../services/featureRequestService';
import { DependencyError } from '../services/dependencyService';

function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initializeSchema(db);
  return db;
}

function seedTestData(db: Database.Database) {
  db.prepare(`INSERT INTO bugs (id, title, description, severity) VALUES (?, ?, ?, ?)`).run('BUG-0001', 'Test bug 1', 'desc', 'medium');
  db.prepare(`INSERT INTO bugs (id, title, description, severity) VALUES (?, ?, ?, ?)`).run('BUG-0002', 'Test bug 2', 'desc', 'high');
  db.prepare(`INSERT INTO bugs (id, title, description, severity) VALUES (?, ?, ?, ?)`).run('BUG-0003', 'Test bug 3', 'desc', 'low');
  db.prepare(`INSERT INTO feature_requests (id, title, description, priority) VALUES (?, ?, ?, ?)`).run('FR-0001', 'Test FR 1', 'desc', 'medium');
  db.prepare(`INSERT INTO feature_requests (id, title, description, priority) VALUES (?, ?, ?, ?)`).run('FR-0002', 'Test FR 2', 'desc', 'high');
  db.prepare(`INSERT INTO feature_requests (id, title, description, priority) VALUES (?, ?, ?, ?)`).run('FR-0003', 'Test FR 3', 'desc', 'low');
}

describe('Duplicate/Deprecated Status Feature', () => {
  let db: Database.Database;
  let bugService: BugService;
  let frService: FeatureRequestService;

  beforeEach(() => {
    db = createTestDb();
    seedTestData(db);
    bugService = new BugService(db);
    frService = new FeatureRequestService(db);
  });

  afterEach(() => {
    db.close();
  });

  // --- Bug: Mark as Duplicate ---

  // Verifies: FR-0008 — PATCH with status: 'duplicate' and valid duplicate_of succeeds
  test('mark bug as duplicate with valid canonical item', () => {
    const result = bugService.updateBug('BUG-0001', {
      status: 'duplicate',
      duplicate_of: 'BUG-0002',
    });
    expect(result.status).toBe('duplicate');
    expect(result.duplicate_of).toBe('BUG-0002');
    expect(result.deprecation_reason).toBeNull();
  });

  // Verifies: FR-0008 — PATCH with status: 'duplicate' without duplicate_of returns 400
  test('mark bug as duplicate without duplicate_of throws 400', () => {
    expect(() => bugService.updateBug('BUG-0001', { status: 'duplicate' })).toThrow(DependencyError);
    try {
      bugService.updateBug('BUG-0001', { status: 'duplicate' });
    } catch (e) {
      expect((e as DependencyError).statusCode).toBe(400);
    }
  });

  // Verifies: FR-0008 — PATCH with duplicate_of pointing to self returns 400
  test('mark bug as duplicate of itself throws 400', () => {
    expect(() => bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0001' })).toThrow(DependencyError);
    try {
      bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0001' });
    } catch (e) {
      expect((e as DependencyError).statusCode).toBe(400);
    }
  });

  // Verifies: FR-0008 — PATCH with duplicate_of pointing to non-existent item returns 404
  test('mark bug as duplicate of non-existent item throws 404', () => {
    expect(() => bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-9999' })).toThrow(DependencyError);
    try {
      bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-9999' });
    } catch (e) {
      expect((e as DependencyError).statusCode).toBe(404);
    }
  });

  // Verifies: FR-0008 — PATCH with duplicate_of pointing to another duplicate returns 400
  test('mark bug as duplicate of another duplicate throws 400', () => {
    bugService.updateBug('BUG-0002', { status: 'duplicate', duplicate_of: 'BUG-0003' });
    expect(() => bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0002' })).toThrow(DependencyError);
    try {
      bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0002' });
    } catch (e) {
      expect((e as DependencyError).statusCode).toBe(400);
    }
  });

  // Verifies: FR-0008 — Cross-type duplicate (bug duplicate of FR)
  test('mark bug as duplicate of a feature request', () => {
    const result = bugService.updateBug('BUG-0001', {
      status: 'duplicate',
      duplicate_of: 'FR-0001',
    });
    expect(result.status).toBe('duplicate');
    expect(result.duplicate_of).toBe('FR-0001');
  });

  // --- Bug: Mark as Deprecated ---

  // Verifies: FR-0008 — PATCH with status: 'deprecated' with reason succeeds
  test('mark bug as deprecated with reason', () => {
    const result = bugService.updateBug('BUG-0001', {
      status: 'deprecated',
      deprecation_reason: 'No longer relevant',
    });
    expect(result.status).toBe('deprecated');
    expect(result.deprecation_reason).toBe('No longer relevant');
    expect(result.duplicate_of).toBeNull();
  });

  // Verifies: FR-0008 — PATCH with status: 'deprecated' without reason succeeds
  test('mark bug as deprecated without reason', () => {
    const result = bugService.updateBug('BUG-0001', { status: 'deprecated' });
    expect(result.status).toBe('deprecated');
    expect(result.deprecation_reason).toBeNull();
  });

  // --- Bug: Restore from hidden status ---

  // Verifies: FR-0008 — Restoring a duplicate clears duplicate_of
  test('restore bug from duplicate clears duplicate_of', () => {
    bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0002' });
    const restored = bugService.updateBug('BUG-0001', { status: 'new' });
    expect(restored.status).toBe('new');
    expect(restored.duplicate_of).toBeNull();
  });

  // Verifies: FR-0008 — Restoring a deprecated clears deprecation_reason
  test('restore bug from deprecated clears deprecation_reason', () => {
    bugService.updateBug('BUG-0001', { status: 'deprecated', deprecation_reason: 'Old' });
    const restored = bugService.updateBug('BUG-0001', { status: 'new' });
    expect(restored.status).toBe('new');
    expect(restored.deprecation_reason).toBeNull();
  });

  // --- Bug: List filtering ---

  // Verifies: FR-0008 — GET list without include_hidden excludes duplicate/deprecated items
  test('listBugs excludes hidden items by default', () => {
    bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0002' });
    bugService.updateBug('BUG-0003', { status: 'deprecated' });

    const defaultList = bugService.listBugs();
    expect(defaultList).toHaveLength(1);
    expect(defaultList[0].id).toBe('BUG-0002');
  });

  // Verifies: FR-0008 — GET list with include_hidden=true returns all items
  test('listBugs with include_hidden returns all items', () => {
    bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0002' });
    bugService.updateBug('BUG-0003', { status: 'deprecated' });

    const allList = bugService.listBugs(undefined, { include_hidden: true });
    expect(allList).toHaveLength(3);
  });

  // Verifies: FR-0008 — include_hidden combined with search query
  test('listBugs with query and include_hidden', () => {
    bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0002' });

    const withoutHidden = bugService.listBugs('Test bug 1');
    expect(withoutHidden).toHaveLength(0);

    const withHidden = bugService.listBugs('Test bug 1', { include_hidden: true });
    expect(withHidden).toHaveLength(1);
    expect(withHidden[0].id).toBe('BUG-0001');
  });

  // --- Bug: Detail always returns full item ---

  // Verifies: FR-0008 — GET detail always returns full item regardless of status
  test('getBugById returns duplicate/deprecated items', () => {
    bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0002' });
    const bug = bugService.getBugById('BUG-0001');
    expect(bug).not.toBeNull();
    expect(bug!.status).toBe('duplicate');
    expect(bug!.duplicate_of).toBe('BUG-0002');
  });

  // --- Bug: duplicated_by computation ---

  // Verifies: FR-0008 — Canonical item includes duplicated_by array
  test('canonical bug has duplicated_by listing all duplicates', () => {
    bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0003' });
    bugService.updateBug('BUG-0002', { status: 'duplicate', duplicate_of: 'BUG-0003' });

    const canonical = bugService.getBugById('BUG-0003');
    expect(canonical!.duplicated_by).toHaveLength(2);
    expect(canonical!.duplicated_by).toContain('BUG-0001');
    expect(canonical!.duplicated_by).toContain('BUG-0002');
  });

  // --- Feature Request: same core tests ---

  // Verifies: FR-0008 — FR duplicate with valid canonical
  test('mark FR as duplicate with valid canonical', () => {
    const result = frService.updateFeatureRequest('FR-0001', {
      status: 'duplicate',
      duplicate_of: 'FR-0002',
    });
    expect(result.status).toBe('duplicate');
    expect(result.duplicate_of).toBe('FR-0002');
  });

  // Verifies: FR-0008 — FR duplicate without duplicate_of
  test('mark FR as duplicate without duplicate_of throws 400', () => {
    expect(() => frService.updateFeatureRequest('FR-0001', { status: 'duplicate' })).toThrow(DependencyError);
  });

  // Verifies: FR-0008 — FR self-duplicate
  test('mark FR as duplicate of itself throws 400', () => {
    expect(() => frService.updateFeatureRequest('FR-0001', { status: 'duplicate', duplicate_of: 'FR-0001' })).toThrow(DependencyError);
  });

  // Verifies: FR-0008 — FR duplicate of non-existent
  test('mark FR as duplicate of non-existent throws 404', () => {
    expect(() => frService.updateFeatureRequest('FR-0001', { status: 'duplicate', duplicate_of: 'FR-9999' })).toThrow(DependencyError);
  });

  // Verifies: FR-0008 — FR duplicate chain prevention
  test('mark FR as duplicate of another duplicate throws 400', () => {
    frService.updateFeatureRequest('FR-0002', { status: 'duplicate', duplicate_of: 'FR-0003' });
    expect(() => frService.updateFeatureRequest('FR-0001', { status: 'duplicate', duplicate_of: 'FR-0002' })).toThrow(DependencyError);
  });

  // Verifies: FR-0008 — Cross-type: FR duplicate of bug
  test('mark FR as duplicate of a bug', () => {
    const result = frService.updateFeatureRequest('FR-0001', {
      status: 'duplicate',
      duplicate_of: 'BUG-0001',
    });
    expect(result.status).toBe('duplicate');
    expect(result.duplicate_of).toBe('BUG-0001');
  });

  // Verifies: FR-0008 — FR deprecated with reason
  test('mark FR as deprecated with reason', () => {
    const result = frService.updateFeatureRequest('FR-0001', {
      status: 'deprecated',
      deprecation_reason: 'Superseded',
    });
    expect(result.status).toBe('deprecated');
    expect(result.deprecation_reason).toBe('Superseded');
  });

  // Verifies: FR-0008 — FR deprecated without reason
  test('mark FR as deprecated without reason', () => {
    const result = frService.updateFeatureRequest('FR-0001', { status: 'deprecated' });
    expect(result.status).toBe('deprecated');
    expect(result.deprecation_reason).toBeNull();
  });

  // Verifies: FR-0008 — FR list filtering
  test('listFeatureRequests excludes hidden by default', () => {
    frService.updateFeatureRequest('FR-0001', { status: 'duplicate', duplicate_of: 'FR-0002' });
    frService.updateFeatureRequest('FR-0003', { status: 'deprecated' });

    const defaultList = frService.listFeatureRequests();
    expect(defaultList).toHaveLength(1);
    expect(defaultList[0].id).toBe('FR-0002');
  });

  // Verifies: FR-0008 — FR list with include_hidden
  test('listFeatureRequests with include_hidden returns all', () => {
    frService.updateFeatureRequest('FR-0001', { status: 'duplicate', duplicate_of: 'FR-0002' });
    frService.updateFeatureRequest('FR-0003', { status: 'deprecated' });

    const allList = frService.listFeatureRequests(undefined, { include_hidden: true });
    expect(allList).toHaveLength(3);
  });

  // Verifies: FR-0008 — FR restore from duplicate
  test('restore FR from duplicate clears duplicate_of', () => {
    frService.updateFeatureRequest('FR-0001', { status: 'duplicate', duplicate_of: 'FR-0002' });
    const restored = frService.updateFeatureRequest('FR-0001', { status: 'submitted' });
    expect(restored.status).toBe('submitted');
    expect(restored.duplicate_of).toBeNull();
  });

  // Verifies: FR-0008 — FR duplicated_by computation
  test('canonical FR has duplicated_by listing all duplicates', () => {
    frService.updateFeatureRequest('FR-0001', { status: 'duplicate', duplicate_of: 'FR-0003' });
    frService.updateFeatureRequest('FR-0002', { status: 'duplicate', duplicate_of: 'FR-0003' });

    const canonical = frService.getFeatureRequestById('FR-0003');
    expect(canonical!.duplicated_by).toHaveLength(2);
    expect(canonical!.duplicated_by).toContain('FR-0001');
    expect(canonical!.duplicated_by).toContain('FR-0002');
  });

  // Verifies: FR-0008 — Cross-type duplicated_by (bug pointing to FR as canonical)
  test('cross-type duplicated_by: bug duplicates FR', () => {
    bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'FR-0001' });

    const canonical = frService.getFeatureRequestById('FR-0001');
    expect(canonical!.duplicated_by).toContain('BUG-0001');
  });

  // Verifies: FR-0008 — Existing dependency features still work (no regression)
  test('dependency features still work alongside duplicate status', () => {
    // Bug with dependency that also gets marked as duplicate
    bugService.updateBug('BUG-0001', { status: 'duplicate', duplicate_of: 'BUG-0002' });
    const bug = bugService.getBugById('BUG-0001');
    expect(bug!.status).toBe('duplicate');
    expect(bug!.blocked_by).toBeDefined();
    expect(bug!.blocks).toBeDefined();
  });
});
