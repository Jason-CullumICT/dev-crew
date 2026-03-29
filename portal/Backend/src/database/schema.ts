// Verifies: FR-dependency-linking — Database schema definitions
import Database from 'better-sqlite3';
import { logger } from '../logger';

export function initializeSchema(db: Database.Database): void {
  logger.info('Initializing database schema');

  db.exec(`
    -- Bugs table
    CREATE TABLE IF NOT EXISTS bugs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new'
        CHECK(status IN ('new', 'triaged', 'approved', 'in_development', 'pending_dependencies', 'resolved', 'closed')),
      severity TEXT NOT NULL DEFAULT 'medium'
        CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Feature requests table
    CREATE TABLE IF NOT EXISTS feature_requests (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'submitted'
        CHECK(status IN ('submitted', 'under_review', 'approved', 'in_development', 'pending_dependencies', 'completed', 'closed')),
      priority TEXT NOT NULL DEFAULT 'medium'
        CHECK(priority IN ('low', 'medium', 'high')),
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

  logger.info('Database schema initialized successfully');
}
