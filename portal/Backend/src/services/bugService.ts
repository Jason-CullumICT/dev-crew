// Verifies: FR-DUP-018 — Bug service layer with duplicate/deprecated logic

import { Bug, BugStatus } from '../../../Shared/types';
import { BugRow } from '../database/schema';
import { getBugsStore } from '../database/db';
import { logger } from '../middleware/logger';
import { metrics } from '../middleware/metrics';

// Verifies: FR-DUP-006 — Compute duplicated_by reverse lookup
function computeDuplicatedBy(bugId: string, store: BugRow[]): string[] {
  return store
    .filter((b) => b.duplicate_of === bugId)
    .map((b) => b.id);
}

// Verifies: FR-DUP-019 — Convert a BugRow to a Bug with computed fields
function rowToBug(row: BugRow, store: BugRow[]): Bug {
  const bug: Bug = {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as BugStatus,
    priority: row.priority as Bug['priority'],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };

  if (row.duplicate_of) {
    bug.duplicate_of = row.duplicate_of;
  }
  if (row.deprecation_reason) {
    bug.deprecation_reason = row.deprecation_reason;
  }

  const duplicatedBy = computeDuplicatedBy(row.id, store);
  if (duplicatedBy.length > 0) {
    bug.duplicated_by = duplicatedBy;
  }

  return bug;
}

// Verifies: FR-DUP-020 — List bugs with default hiding of duplicate/deprecated
export function listBugs(options: { include_hidden?: boolean } = {}): Bug[] {
  const store = getBugsStore();
  let filtered = store;

  if (!options.include_hidden) {
    // Verifies: FR-DUP-021 — Exclude duplicate and deprecated items by default
    filtered = store.filter(
      (b) => b.status !== 'duplicate' && b.status !== 'deprecated'
    );
  }

  logger.info('bugs.list', {
    include_hidden: options.include_hidden ?? false,
    total: store.length,
    returned: filtered.length,
  });
  metrics.increment('bugs_list_total', { include_hidden: String(options.include_hidden ?? false) });

  return filtered.map((row) => rowToBug(row, store));
}

// Verifies: FR-DUP-022 — Get single bug by ID (always returns regardless of status)
export function getBugById(id: string): Bug | null {
  const store = getBugsStore();
  const row = store.find((b) => b.id === id);
  if (!row) {
    return null;
  }

  logger.info('bugs.get', { id });
  metrics.increment('bugs_get_total');

  return rowToBug(row, store);
}

// Verifies: FR-DUP-023 — Validate and apply duplicate/deprecated status changes
export interface UpdateBugInput {
  status?: BugStatus;
  title?: string;
  description?: string;
  priority?: Bug['priority'];
  duplicate_of?: string;
  deprecation_reason?: string;
}

export interface UpdateBugResult {
  success: boolean;
  bug?: Bug;
  error?: string;
  statusCode?: number;
}

export function updateBug(id: string, input: UpdateBugInput): UpdateBugResult {
  const store = getBugsStore();
  const rowIndex = store.findIndex((b) => b.id === id);
  if (rowIndex === -1) {
    return { success: false, error: 'Bug not found', statusCode: 404 };
  }

  const row = store[rowIndex];

  // Verifies: FR-DUP-024 — Validate duplicate status
  if (input.status === 'duplicate') {
    if (!input.duplicate_of) {
      logger.warn('bugs.update.duplicate_missing_target', { id });
      return {
        success: false,
        error: 'duplicate_of is required when status is duplicate',
        statusCode: 400,
      };
    }

    // Verifies: FR-DUP-025 — Cannot duplicate to self
    if (input.duplicate_of === id) {
      logger.warn('bugs.update.duplicate_self_reference', { id });
      return {
        success: false,
        error: 'Cannot mark an item as a duplicate of itself',
        statusCode: 422,
      };
    }

    // Verifies: FR-DUP-026 — Target must exist
    const target = store.find((b) => b.id === input.duplicate_of);
    if (!target) {
      logger.warn('bugs.update.duplicate_target_not_found', { id, target: input.duplicate_of });
      return {
        success: false,
        error: `Duplicate target ${input.duplicate_of} does not exist`,
        statusCode: 404,
      };
    }

    // Verifies: FR-DUP-027 — No chains: target must not itself be a duplicate
    if (target.status === 'duplicate') {
      logger.warn('bugs.update.duplicate_chain', { id, target: input.duplicate_of });
      return {
        success: false,
        error: `Cannot mark as duplicate of ${input.duplicate_of} because it is itself a duplicate`,
        statusCode: 422,
      };
    }

    row.duplicate_of = input.duplicate_of;
    row.deprecation_reason = null; // Clear deprecation_reason when marking as duplicate
    row.status = 'duplicate';

    logger.info('bugs.update.marked_duplicate', { id, duplicate_of: input.duplicate_of });
    metrics.increment('bugs_marked_duplicate_total');
  }
  // Verifies: FR-DUP-028 — Validate deprecated status
  else if (input.status === 'deprecated') {
    row.deprecation_reason = input.deprecation_reason ?? null;
    row.duplicate_of = null; // Clear duplicate_of when marking as deprecated
    row.status = 'deprecated';

    logger.info('bugs.update.marked_deprecated', { id, reason: input.deprecation_reason });
    metrics.increment('bugs_marked_deprecated_total');
  }
  // Verifies: FR-DUP-029 — Reopen clears metadata
  else if (input.status) {
    if (row.status === 'duplicate' || row.status === 'deprecated') {
      row.duplicate_of = null;
      row.deprecation_reason = null;
      logger.info('bugs.update.restored', { id, from: row.status, to: input.status });
      metrics.increment('bugs_restored_total');
    }
    row.status = input.status;
  }

  // Apply other field updates
  if (input.title !== undefined) row.title = input.title;
  if (input.description !== undefined) row.description = input.description;
  if (input.priority !== undefined) row.priority = input.priority;

  row.updated_at = new Date().toISOString();

  return { success: true, bug: rowToBug(row, store) };
}

// Create a new bug
export function createBug(input: { id: string; title: string; description: string; priority?: Bug['priority'] }): Bug {
  const store = getBugsStore();
  const now = new Date().toISOString();
  const row: BugRow = {
    id: input.id,
    title: input.title,
    description: input.description,
    status: 'open',
    priority: input.priority ?? 'medium',
    created_at: now,
    updated_at: now,
    duplicate_of: null,
    deprecation_reason: null,
  };
  store.push(row);

  logger.info('bugs.create', { id: input.id });
  metrics.increment('bugs_created_total');

  return rowToBug(row, store);
}
