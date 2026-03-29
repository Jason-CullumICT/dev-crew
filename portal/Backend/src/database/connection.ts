// Verifies: FR-dependency-linking — Database connection management
import Database from 'better-sqlite3';
import { initializeSchema } from './schema';
import { logger } from '../logger';

let db: Database.Database | null = null;

export function getDatabase(dbPath: string = ':memory:'): Database.Database {
  if (!db) {
    logger.info({ dbPath }, 'Opening database connection');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// For testing: create a fresh in-memory database
export function createTestDatabase(): Database.Database {
  const testDb = new Database(':memory:');
  testDb.pragma('journal_mode = WAL');
  testDb.pragma('foreign_keys = ON');
  initializeSchema(testDb);
  return testDb;
}
