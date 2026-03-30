// Verifies: FR-dependency-linking — Feature request service with dependency-aware status transitions
// Verifies: FR-0008 — Extended with duplicate/deprecated status support
import Database from 'better-sqlite3';
import type { FeatureRequest, FeatureRequestStatus, DependencyItemType } from '../../Shared/types';
import { RESOLVED_STATUSES, DISPATCH_TRIGGER_STATUSES, HIDDEN_STATUSES } from '../../Shared/types';
import { DependencyService, DependencyError } from './dependencyService';
import { logger } from '../logger';
import { dispatchGatingEvents, duplicateDeprecatedOperations } from '../metrics';

// Verifies: FR-dependency-linking
export class FeatureRequestService {
  private depService: DependencyService;

  constructor(private db: Database.Database) {
    this.depService = new DependencyService(db);
  }

  // Verifies: FR-dependency-linking — List all feature requests with unresolved blocker flag
  // Verifies: FR-0008 — Supports include_hidden option to filter duplicate/deprecated items
  listFeatureRequests(query?: string, options?: { include_hidden?: boolean }): FeatureRequest[] {
    const includeHidden = options?.include_hidden ?? false;
    let sql: string;
    const params: string[] = [];

    if (query && !includeHidden) {
      sql = `SELECT * FROM feature_requests WHERE (title LIKE ? OR id LIKE ?) AND status NOT IN ('duplicate', 'deprecated') ORDER BY created_at DESC`;
      params.push(`%${query}%`, `%${query}%`);
    } else if (query) {
      sql = `SELECT * FROM feature_requests WHERE title LIKE ? OR id LIKE ? ORDER BY created_at DESC`;
      params.push(`%${query}%`, `%${query}%`);
    } else if (!includeHidden) {
      sql = `SELECT * FROM feature_requests WHERE status NOT IN ('duplicate', 'deprecated') ORDER BY created_at DESC`;
    } else {
      sql = `SELECT * FROM feature_requests ORDER BY created_at DESC`;
    }

    const rows = this.db.prepare(sql).all(...params) as Array<Record<string, unknown>>;
    return rows.map((row) => this.enrichFeatureRequest(row));
  }

  // Verifies: FR-dependency-linking — Get a single feature request by ID
  getFeatureRequestById(id: string): FeatureRequest | null {
    const row = this.db.prepare(`SELECT * FROM feature_requests WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.enrichFeatureRequest(row);
  }

  // Verifies: FR-dependency-linking — Create a new feature request
  createFeatureRequest(data: { id: string; title: string; description?: string; priority?: string }): FeatureRequest {
    this.db.prepare(`
      INSERT INTO feature_requests (id, title, description, priority)
      VALUES (?, ?, ?, ?)
    `).run(data.id, data.title, data.description ?? '', data.priority ?? 'medium');

    logger.info({ featureRequestId: data.id }, 'Feature request created');
    return this.getFeatureRequestById(data.id)!;
  }

  // Verifies: FR-dependency-dispatch-gating — Update feature request with dispatch gating
  // Verifies: FR-0008 — Handles duplicate/deprecated status transitions with validation
  updateFeatureRequest(
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: FeatureRequestStatus;
      priority?: string;
      blocked_by?: string[];
      duplicate_of?: string;
      deprecation_reason?: string;
    },
  ): FeatureRequest {
    const existing = this.db.prepare(`SELECT * FROM feature_requests WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      throw new Error(`Feature request not found: ${id}`);
    }

    // Handle blocked_by bulk set if provided
    if (data.blocked_by !== undefined) {
      this.depService.setDependencies('feature_request', id, data.blocked_by);
    }

    let newStatus = data.status ?? (existing.status as FeatureRequestStatus);
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
      duplicateDeprecatedOperations.inc({ operation: 'mark_duplicate', item_type: 'feature_request' });
      logger.info({ featureRequestId: id, duplicateOf: data.duplicate_of }, 'Feature request marked as duplicate');
    } else if (data.status === 'deprecated') {
      // Verifies: FR-0008 — Handle deprecated status transition
      duplicateOf = null;
      deprecationReason = data.deprecation_reason ?? null;
      duplicateDeprecatedOperations.inc({ operation: 'mark_deprecated', item_type: 'feature_request' });
      logger.info({ featureRequestId: id, reason: deprecationReason }, 'Feature request marked as deprecated');
    } else if (data.status && HIDDEN_STATUSES.includes(existing.status as string) && !HIDDEN_STATUSES.includes(data.status)) {
      // Verifies: FR-0008 — Restoring from duplicate/deprecated clears fields
      duplicateOf = null;
      deprecationReason = null;
      duplicateDeprecatedOperations.inc({ operation: 'restore', item_type: 'feature_request' });
      logger.info({ featureRequestId: id, newStatus: data.status }, 'Feature request restored from hidden status');
    }

    // Verifies: FR-dependency-dispatch-gating — Dispatch gating check (skip for duplicate/deprecated)
    if (data.status && DISPATCH_TRIGGER_STATUSES.includes(data.status)) {
      const readiness = this.depService.isReady('feature_request', id);
      if (!readiness.ready) {
        newStatus = 'pending_dependencies';
        dispatchGatingEvents.inc({ result: 'gated' });
        logger.info(
          { featureRequestId: id, unresolvedCount: readiness.unresolved_blockers.length },
          'Feature request dispatch gated due to unresolved dependencies',
        );
      } else {
        dispatchGatingEvents.inc({ result: 'dispatched' });
        logger.info({ featureRequestId: id }, 'Feature request dispatch approved — all dependencies resolved');
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
        UPDATE feature_requests SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          status = ?,
          priority = COALESCE(?, priority),
          duplicate_of = ?,
          deprecation_reason = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(data.title ?? null, data.description ?? null, newStatus, data.priority ?? null, duplicateOf, deprecationReason, id);

      const autoDispatched = this.depService.onItemCompleted('feature_request', id);
      if (autoDispatched.length > 0) {
        logger.info({ featureRequestId: id, autoDispatched }, 'Feature request completion triggered auto-dispatch');
      }

      return this.getFeatureRequestById(id)!;
    }

    this.db.prepare(`
      UPDATE feature_requests SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = ?,
        priority = COALESCE(?, priority),
        duplicate_of = ?,
        deprecation_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.title ?? null, data.description ?? null, newStatus, data.priority ?? null, duplicateOf, deprecationReason, id);

    logger.info({ featureRequestId: id, newStatus }, 'Feature request updated');
    return this.getFeatureRequestById(id)!;
  }

  // --- Private helpers ---

  // Verifies: FR-0008 — Enrichment includes duplicate_of, deprecation_reason, and computed duplicated_by
  private enrichFeatureRequest(row: Record<string, unknown>): FeatureRequest {
    const id = row.id as string;
    const blocked_by = this.depService.getBlockedBy('feature_request', id);
    const blocks = this.depService.getBlocks('feature_request', id);
    const has_unresolved_blockers = this.depService.hasUnresolvedBlockers('feature_request', id);

    // Verifies: FR-0008 — Compute duplicated_by: all items that have duplicate_of pointing to this FR
    const duplicatedByRows = this.db.prepare(
      `SELECT id FROM bugs WHERE duplicate_of = ? UNION ALL SELECT id FROM feature_requests WHERE duplicate_of = ?`,
    ).all(id, id) as Array<{ id: string }>;

    return {
      id,
      title: row.title as string,
      description: row.description as string,
      status: row.status as FeatureRequestStatus,
      priority: row.priority as FeatureRequest['priority'],
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
