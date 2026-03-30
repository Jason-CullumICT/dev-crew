// Verifies: FR-dependency-linking — Bug service with dependency-aware status transitions
// Verifies: FR-0008 — Extended with duplicate/deprecated status support
import Database from 'better-sqlite3';
import type { Bug, BugStatus, DependencyItemType } from '../../Shared/types';
import { RESOLVED_STATUSES, DISPATCH_TRIGGER_STATUSES, HIDDEN_STATUSES } from '../../Shared/types';
import { DependencyService, DependencyError } from './dependencyService';
import { logger } from '../logger';
import { dispatchGatingEvents, duplicateDeprecatedOperations } from '../metrics';

// Verifies: FR-dependency-linking
export class BugService {
  private depService: DependencyService;

  constructor(private db: Database.Database) {
    this.depService = new DependencyService(db);
  }

  // Verifies: FR-dependency-linking — List all bugs with unresolved blocker flag
  // Verifies: FR-0008 — Supports include_hidden option to filter duplicate/deprecated items
  listBugs(query?: string, options?: { include_hidden?: boolean }): Bug[] {
    const includeHidden = options?.include_hidden ?? false;
    let sql: string;
    const params: string[] = [];

    if (query && !includeHidden) {
      sql = `SELECT * FROM bugs WHERE (title LIKE ? OR id LIKE ?) AND status NOT IN ('duplicate', 'deprecated') ORDER BY created_at DESC`;
      params.push(`%${query}%`, `%${query}%`);
    } else if (query) {
      sql = `SELECT * FROM bugs WHERE title LIKE ? OR id LIKE ? ORDER BY created_at DESC`;
      params.push(`%${query}%`, `%${query}%`);
    } else if (!includeHidden) {
      sql = `SELECT * FROM bugs WHERE status NOT IN ('duplicate', 'deprecated') ORDER BY created_at DESC`;
    } else {
      sql = `SELECT * FROM bugs ORDER BY created_at DESC`;
    }

    const rows = this.db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
    return rows.map((row) => this.enrichBug(row));
  }

  // Verifies: FR-dependency-linking — Get a single bug by ID
  getBugById(id: string): Bug | null {
    const row = this.db.prepare(`SELECT * FROM bugs WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.enrichBug(row);
  }

  // Verifies: FR-dependency-linking — Create a new bug
  createBug(data: { id: string; title: string; description?: string; severity?: string }): Bug {
    this.db.prepare(`
      INSERT INTO bugs (id, title, description, severity)
      VALUES (?, ?, ?, ?)
    `).run(data.id, data.title, data.description ?? '', data.severity ?? 'medium');

    logger.info({ bugId: data.id }, 'Bug created');
    return this.getBugById(data.id)!;
  }

  // Verifies: FR-dependency-dispatch-gating — Update bug with dispatch gating
  // Verifies: FR-0008 — Handles duplicate/deprecated status transitions with validation
  updateBug(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: BugStatus;
      severity?: string;
      blocked_by?: string[];
      duplicate_of?: string;
      deprecation_reason?: string;
    },
  ): Bug {
    const existing = this.db.prepare(`SELECT * FROM bugs WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      throw new Error(`Bug not found: ${id}`);
    }

    // Handle blocked_by bulk set if provided
    if (data.blocked_by !== undefined) {
      this.depService.setDependencies('bug', id, data.blocked_by);
    }

    let newStatus = data.status ?? (existing.status as BugStatus);
    let duplicateOf: string | null = existing.duplicate_of as string | null;
    let deprecationReason: string | null = existing.deprecation_reason as string | null;

    // Verifies: FR-0008 — Validate and handle duplicate status transition
    if (data.status === 'duplicate') {
      if (!data.duplicate_of) {
        throw new DependencyError('duplicate_of is required when setting status to duplicate', 400);
      }
      if (data.duplicate_of === id) {
        throw new DependencyError('An item cannot be a duplicate of itself', 400);
      }
      // Verifies: FR-0008 — Validate canonical item exists (check both tables)
      const canonicalBug = this.db.prepare(`SELECT id, status FROM bugs WHERE id = ?`).get(data.duplicate_of) as { id: string; status: string } | undefined;
      const canonicalFr = this.db.prepare(`SELECT id, status FROM feature_requests WHERE id = ?`).get(data.duplicate_of) as { id: string; status: string } | undefined;
      const canonical = canonicalBug ?? canonicalFr;
      if (!canonical) {
        throw new DependencyError(`Canonical item not found: ${data.duplicate_of}`, 404);
      }
      // Verifies: FR-0008 — Cannot chain duplicates
      if (canonical.status === 'duplicate') {
        throw new DependencyError('Cannot mark as duplicate of another duplicate item', 400);
      }
      duplicateOf = data.duplicate_of;
      deprecationReason = null;
      duplicateDeprecatedOperations.inc({ operation: 'mark_duplicate', item_type: 'bug' });
      logger.info({ bugId: id, duplicateOf: data.duplicate_of }, 'Bug marked as duplicate');
    } else if (data.status === 'deprecated') {
      // Verifies: FR-0008 — Handle deprecated status transition
      duplicateOf = null;
      deprecationReason = data.deprecation_reason ?? null;
      duplicateDeprecatedOperations.inc({ operation: 'mark_deprecated', item_type: 'bug' });
      logger.info({ bugId: id, reason: deprecationReason }, 'Bug marked as deprecated');
    } else if (data.status && HIDDEN_STATUSES.includes(existing.status as string) && !HIDDEN_STATUSES.includes(data.status)) {
      // Verifies: FR-0008 — Restoring from duplicate/deprecated clears fields
      duplicateOf = null;
      deprecationReason = null;
      duplicateDeprecatedOperations.inc({ operation: 'restore', item_type: 'bug' });
      logger.info({ bugId: id, newStatus: data.status }, 'Bug restored from hidden status');
    }

    // Verifies: FR-dependency-dispatch-gating — Dispatch gating check (skip for duplicate/deprecated)
    if (data.status && DISPATCH_TRIGGER_STATUSES.includes(data.status)) {
      const readiness = this.depService.isReady('bug', id);
      if (!readiness.ready) {
        newStatus = 'pending_dependencies';
        dispatchGatingEvents.inc({ result: 'gated' });
        logger.info(
          { bugId: id, unresolvedCount: readiness.unresolved_blockers.length },
          'Bug dispatch gated due to unresolved dependencies',
        );
      } else {
        dispatchGatingEvents.inc({ result: 'dispatched' });
        logger.info({ bugId: id }, 'Bug dispatch approved — all dependencies resolved');
      }
    }

    // Verifies: FR-dependency-dispatch-gating — Cascade on completion
    const oldStatus = existing.status as string;
    if (
      data.status &&
      RESOLVED_STATUSES.includes(data.status) &&
      !RESOLVED_STATUSES.includes(oldStatus)
    ) {
      this.db.prepare(`
        UPDATE bugs SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          status = ?,
          severity = COALESCE(?, severity),
          duplicate_of = ?,
          deprecation_reason = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(data.title ?? null, data.description ?? null, newStatus, data.severity ?? null, duplicateOf, deprecationReason, id);

      const autoDispatched = this.depService.onItemCompleted('bug', id);
      if (autoDispatched.length > 0) {
        logger.info({ bugId: id, autoDispatched }, 'Bug completion triggered auto-dispatch');
      }

      return this.getBugById(id)!;
    }

    this.db.prepare(`
      UPDATE bugs SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = ?,
        severity = COALESCE(?, severity),
        duplicate_of = ?,
        deprecation_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.title ?? null, data.description ?? null, newStatus, data.severity ?? null, duplicateOf, deprecationReason, id);

    logger.info({ bugId: id, newStatus }, 'Bug updated');
    return this.getBugById(id)!;
  }

  // --- Private helpers ---

  // Verifies: FR-0008 — Enrichment includes duplicate_of, deprecation_reason, and computed duplicated_by
  private enrichBug(row: Record<string, unknown>): Bug {
    const id = row.id as string;
    const blocked_by = this.depService.getBlockedBy('bug', id);
    const blocks = this.depService.getBlocks('bug', id);
    const has_unresolved_blockers = this.depService.hasUnresolvedBlockers('bug', id);

    // Verifies: FR-0008 — Compute duplicated_by: all items that have duplicate_of pointing to this bug
    const duplicatedByRows = this.db.prepare(
      `SELECT id FROM bugs WHERE duplicate_of = ? UNION ALL SELECT id FROM feature_requests WHERE duplicate_of = ?`,
    ).all(id, id) as Array<{ id: string }>;

    return {
      id,
      title: row.title as string,
      description: row.description as string,
      status: row.status as BugStatus,
      severity: row.severity as Bug['severity'],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      blocked_by,
      blocks,
      has_unresolved_blockers,
      duplicate_of: (row.duplicate_of as string | null) ?? null,
      deprecation_reason: (row.deprecation_reason as string | null) ?? null,
      duplicated_by: duplicatedByRows.map((r) => r.id),
    };
  }
}
