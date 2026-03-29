// Verifies: FR-DUP-011 — Database schema definitions for bugs and feature requests

export interface BugRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  duplicate_of: string | null;       // Verifies: FR-DUP-012 — references another bug's ID
  deprecation_reason: string | null;  // Verifies: FR-DUP-013 — free-text reason for deprecation
}

export interface FeatureRequestRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  duplicate_of: string | null;       // Verifies: FR-DUP-012
  deprecation_reason: string | null;  // Verifies: FR-DUP-013
}

// SQL for creating tables (SQLite-compatible)
// Verifies: FR-DUP-014 — Schema includes duplicate_of and deprecation_reason columns
export const CREATE_BUGS_TABLE = `
  CREATE TABLE IF NOT EXISTS bugs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    duplicate_of TEXT NULL,
    deprecation_reason TEXT NULL
  )
`;

export const CREATE_FEATURE_REQUESTS_TABLE = `
  CREATE TABLE IF NOT EXISTS feature_requests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    duplicate_of TEXT NULL,
    deprecation_reason TEXT NULL
  )
`;
