// Verifies: FR-dependency-linking — Database schema definitions
import Database from 'better-sqlite3';
import { logger } from '../logger';

export function initializeSchema(db: Database.Database): void {
  logger.info('Initializing database schema');

  db.exec(`
    -- Bugs table
    -- Verifies: FR-0008 — Added duplicate_of and deprecation_reason columns, updated CHECK constraint
    CREATE TABLE IF NOT EXISTS bugs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new'
        CHECK(status IN ('new', 'triaged', 'approved', 'in_development', 'pending_dependencies', 'resolved', 'closed', 'duplicate', 'deprecated')),
      severity TEXT NOT NULL DEFAULT 'medium'
        CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      duplicate_of TEXT DEFAULT NULL,
      deprecation_reason TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Feature requests table
    -- Verifies: FR-0008 — Added duplicate_of and deprecation_reason columns, updated CHECK constraint
    CREATE TABLE IF NOT EXISTS feature_requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'submitted'
        CHECK(status IN ('submitted', 'under_review', 'approved', 'in_development', 'pending_dependencies', 'completed', 'closed', 'duplicate', 'deprecated')),
      priority TEXT NOT NULL DEFAULT 'medium'
        CHECK(priority IN ('low', 'medium', 'high')),
      duplicate_of TEXT DEFAULT NULL,
      deprecation_reason TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Verifies: FR-dependency-linking — Dependencies junction table
    CREATE TABLE IF NOT EXISTS dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocked_item_type TEXT NOT NULL CHECK(blocked_item_type IN ('bug', 'feature_request')),
      blocked_item_id TEXT NOT NULL,
      blocker_item_type TEXT NOT NULL CHECK(blocker_item_type IN ('bug', 'feature_request')),
      blocker_item_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(blocked_item_type, blocked_item_id, blocker_item_type, blocker_item_id)
    );

    -- Index for efficient lookup of what blocks an item
    CREATE INDEX IF NOT EXISTS idx_dependencies_blocked
      ON dependencies(blocked_item_type, blocked_item_id);

    -- Index for efficient lookup of what an item blocks
    CREATE INDEX IF NOT EXISTS idx_dependencies_blocker
      ON dependencies(blocker_item_type, blocker_item_id);
  `);

  // Verifies: FR-0008 — Seed known duplicate: FR-0008 is a duplicate of FR-0009
  seedKnownDuplicates(db);

  logger.info('Database schema initialized successfully');
}

// Verifies: FR-0008 — Mark FR-0008 as duplicate of FR-0009 if both exist and FR-0008 is not already marked
function seedKnownDuplicates(db: Database.Database): void {
  const fr0008 = db.prepare(`SELECT id, status FROM feature_requests WHERE id = 'FR-0008'`).get() as { id: string; status: string } | undefined;
  const fr0009 = db.prepare(`SELECT id FROM feature_requests WHERE id = 'FR-0009'`).get() as { id: string } | undefined;

  if (fr0008 && fr0009 && fr0008.status !== 'duplicate') {
    db.prepare(`UPDATE feature_requests SET status = 'duplicate', duplicate_of = 'FR-0009', updated_at = CURRENT_TIMESTAMP WHERE id = 'FR-0008'`).run();
    logger.info('Seeded known duplicate: FR-0008 → FR-0009');
  }
}
