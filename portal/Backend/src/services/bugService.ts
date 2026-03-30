// Verifies: FR-013
// Bug Report service — all business logic; no framework imports.

import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import type { BugReport, BugSeverity, BugStatus, WorkItemType, DependencyLink } from '../../../Shared/types';
import { RESOLVED_STATUSES, HIDDEN_STATUSES, DISPATCH_TRIGGER_STATUSES } from '../../../Shared/types';
import { DependencyService } from './dependencyService';
import { AppError } from '../middleware/errorHandler';

// --- Valid enum values (DD-8) ---
export const VALID_SEVERITIES: BugSeverity[] = ['low', 'medium', 'high', 'critical'];
// Verifies: FR-DUP-01
export const VALID_BUG_STATUSES: BugStatus[] = ['reported', 'triaged', 'in_development', 'resolved', 'closed', 'pending_dependencies', 'duplicate', 'deprecated'];

// --- Input length limits (DD-11, Security M-04) ---
export const TITLE_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 10000;

// --- DB row mapping ---
interface BugRow {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  source_system: string;
  related_work_item_id: string | null;
  related_work_item_type: string | null;
  related_cycle_id: string | null;
  target_repo: string | null;
  duplicate_of: string | null;         // Verifies: FR-DUP-02
  deprecation_reason: string | null;   // Verifies: FR-DUP-02
  created_at: string;
  updated_at: string;
}

function mapBugRow(db: Database.Database, row: BugRow): BugReport {
  const depService = new DependencyService(db);
  const id = row.id;

  // Verifies: FR-DUP-03 — Compute duplicated_by from DB
  const duplicatedByRows = db.prepare(
    `SELECT id FROM bugs WHERE duplicate_of = ?`
  ).all(id) as Array<{ id: string }>;

  return {
    id,
    title: row.title,
    description: row.description,
    severity: row.severity as BugSeverity,
    status: row.status as BugStatus,
    source_system: row.source_system,
    related_work_item_id: row.related_work_item_id || null,       // FR-054
    related_work_item_type: (row.related_work_item_type as WorkItemType) || null, // FR-054
    related_cycle_id: row.related_cycle_id || null,                // FR-054
    target_repo: row.target_repo || null,
    duplicate_of: row.duplicate_of || null,                        // Verifies: FR-DUP-02
    deprecation_reason: row.deprecation_reason || null,            // Verifies: FR-DUP-02
    duplicated_by: duplicatedByRows.map(r => r.id),                // Verifies: FR-DUP-03
    created_at: row.created_at,
    updated_at: row.updated_at,
    blocked_by: depService.getBlockedBy('bug', id),
    blocks: depService.getBlocks('bug', id),
    has_unresolved_blockers: depService.hasUnresolvedBlockers('bug', id),
  };
}

// --- ID generation ---
function generateBugId(db: Database.Database): string {
  const row = db.prepare(`SELECT id FROM bugs ORDER BY id DESC LIMIT 1`).get() as { id: string } | undefined;
  let next = 1;
  if (row) {
    const match = row.id.match(/(\d+)$/);
    if (match) next = parseInt(match[1], 10) + 1;
  }
  return `BUG-${String(next).padStart(4, '0')}`;
}

// --- Service methods ---

export interface ListBugsOptions {
  status?: string;
  severity?: string;
  include_hidden?: boolean;  // Verifies: FR-DUP-05
}

// Verifies: FR-DUP-05
export function listBugs(db: Database.Database, opts: ListBugsOptions = {}): BugReport[] {
  let query = `SELECT * FROM bugs WHERE 1=1`;
  const params: string[] = [];

  // Verifies: FR-DUP-05 — Exclude hidden statuses by default
  if (!opts.include_hidden) {
    query += ` AND status NOT IN (${HIDDEN_STATUSES.map(() => '?').join(', ')})`;
    params.push(...HIDDEN_STATUSES as unknown as string[]);
  }

  if (opts.status) {
    query += ` AND status = ?`;
    params.push(opts.status);
  }
  if (opts.severity) {
    query += ` AND severity = ?`;
    params.push(opts.severity);
  }

  query += ` ORDER BY created_at DESC`;
  const rows = db.prepare(query).all(...params) as BugRow[];
  return rows.map(row => mapBugRow(db, row));
}

export interface CreateBugInput {
  title: string;
  description: string;
  severity: string;
  source_system?: string;
  related_work_item_id?: string;             // FR-054
  related_work_item_type?: string;           // FR-054
  related_cycle_id?: string;                 // FR-054
  target_repo?: string;
  blocked_by?: string[];                      // Verifies: FR-dependency-linking
}

export function createBug(db: Database.Database, input: CreateBugInput): BugReport {
  const { title, description } = input;
  const severity = input.severity as BugSeverity;
  const source_system = input.source_system || 'manual';

  // Validate input lengths (DD-11, Security M-04)
  if (title.length > TITLE_MAX_LENGTH) {
    throw new AppError(400, `title must be at most ${TITLE_MAX_LENGTH} characters`);
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    throw new AppError(400, `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`);
  }

  if (!VALID_SEVERITIES.includes(severity)) {
    throw new AppError(400, `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}`);
  }

  const id = generateBugId(db);
  const now = new Date().toISOString();

  // Handle dependencies if provided
  const depService = new DependencyService(db);
  if (input.blocked_by && input.blocked_by.length > 0) {
    depService.setDependencies('bug', id, input.blocked_by);
  }

  // FR-054: Accept and persist related work item fields (DD-18: all nullable)
  db.prepare(`
    INSERT INTO bugs (id, title, description, severity, status, source_system, related_work_item_id, related_work_item_type, related_cycle_id, target_repo, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'reported', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, title, description, severity, source_system,
    input.related_work_item_id || null,
    input.related_work_item_type || null,
    input.related_cycle_id || null,
    input.target_repo || null,
    now, now
  );

  return getBugById(db, id)!;
}

export function getBugById(db: Database.Database, id: string): BugReport | null {
  const row = db.prepare(`SELECT * FROM bugs WHERE id = ?`).get(id) as BugRow | undefined;
  if (!row) return null;
  return mapBugRow(db, row);
}

export interface UpdateBugInput {
  title?: string;
  description?: string;
  severity?: string;
  status?: string;
  source_system?: string;
  duplicate_of?: string;                      // Verifies: FR-DUP-04
  deprecation_reason?: string;                // Verifies: FR-DUP-04
  blocked_by?: string[];                      // Verifies: FR-dependency-linking
}

export function updateBug(db: Database.Database, id: string, input: UpdateBugInput): BugReport {
  const bug = getBugById(db, id);
  if (!bug) throw new AppError(404, `Bug ${id} not found`);

  const depService = new DependencyService(db);
  const updates: string[] = [];
  const params: unknown[] = [];

  if (input.title !== undefined) {
    if (input.title.length > TITLE_MAX_LENGTH) {
      throw new AppError(400, `title must be at most ${TITLE_MAX_LENGTH} characters`);
    }
    updates.push(`title = ?`);
    params.push(input.title);
  }

  if (input.description !== undefined) {
    if (input.description.length > DESCRIPTION_MAX_LENGTH) {
      throw new AppError(400, `description must be at most ${DESCRIPTION_MAX_LENGTH} characters`);
    }
    updates.push(`description = ?`);
    params.push(input.description);
  }

  if (input.severity !== undefined) {
    const severity = input.severity as BugSeverity;
    if (!VALID_SEVERITIES.includes(severity)) {
      throw new AppError(400, `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}`);
    }
    updates.push(`severity = ?`);
    params.push(severity);
  }

  let newStatus = input.status as BugStatus | undefined;
  if (input.status !== undefined) {
    if (!VALID_BUG_STATUSES.includes(newStatus!)) {
      throw new AppError(400, `Invalid status. Must be one of: ${VALID_BUG_STATUSES.join(', ')}`);
    }

    // Verifies: FR-DUP-04 — Block transitions OUT of duplicate/deprecated (terminal statuses)
    if ((bug.status === 'duplicate' || bug.status === 'deprecated') && newStatus !== bug.status) {
      throw new AppError(400, `Cannot transition from '${bug.status}' to '${newStatus}'. Duplicate/deprecated are terminal statuses`);
    }

    // Verifies: FR-DUP-04 — Validate duplicate_of when setting status to duplicate
    if (newStatus === 'duplicate') {
      if (!input.duplicate_of) {
        throw new AppError(400, `duplicate_of is required when status is 'duplicate'`);
      }
      if (input.duplicate_of === id) {
        throw new AppError(400, `An item cannot be a duplicate of itself`);
      }
      // Verifies: FR-DUP-07 — Validate reference exists
      const canonical = db.prepare(`SELECT id FROM bugs WHERE id = ?`).get(input.duplicate_of);
      if (!canonical) {
        throw new AppError(400, `duplicate_of references non-existent bug: ${input.duplicate_of}`);
      }
      updates.push(`duplicate_of = ?`);
      params.push(input.duplicate_of);
      // Clear deprecation_reason when marking as duplicate
      updates.push(`deprecation_reason = ?`);
      params.push(null);
    } else if (newStatus === 'deprecated') {
      // Verifies: FR-DUP-04 — Accept optional deprecation_reason
      updates.push(`deprecation_reason = ?`);
      params.push(input.deprecation_reason || null);
      // Clear duplicate_of when marking as deprecated
      updates.push(`duplicate_of = ?`);
      params.push(null);
    } else {
      // Transitioning to a non-duplicate/deprecated status: clear both fields
      updates.push(`duplicate_of = ?`);
      params.push(null);
      updates.push(`deprecation_reason = ?`);
      params.push(null);
    }

    // Verifies: FR-dependency-dispatch-gating — Dispatch gating check
    if (DISPATCH_TRIGGER_STATUSES.includes(newStatus!)) {
      const readiness = depService.isReady('bug', id);
      if (!readiness.ready) {
        newStatus = 'pending_dependencies';
      }
    }

    updates.push(`status = ?`);
    params.push(newStatus);
  }

  if (input.source_system !== undefined) {
    updates.push(`source_system = ?`);
    params.push(input.source_system);
  }

  // Handle dependencies bulk set
  if (input.blocked_by !== undefined) {
    depService.setDependencies('bug', id, input.blocked_by);
  }

  if (updates.length > 0) {
    updates.push(`updated_at = ?`);
    params.push(new Date().toISOString());
    params.push(id);

    db.prepare(`UPDATE bugs SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  // Verifies: FR-dependency-dispatch-gating, FR-DUP-13 — Cascade on completion
  if (newStatus && RESOLVED_STATUSES.includes(newStatus) && !RESOLVED_STATUSES.includes(bug.status)) {
    depService.onItemCompleted('bug', id);
  }

  return getBugById(db, id)!;
}

export function deleteBug(db: Database.Database, id: string): void {
  const bug = getBugById(db, id);
  if (!bug) throw new AppError(404, `Bug ${id} not found`);

  db.prepare(`DELETE FROM bugs WHERE id = ?`).run(id);
}
