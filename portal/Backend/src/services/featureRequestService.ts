// Verifies: FR-dependency-linking — Feature request service with dependency-aware status transitions
import Database from 'better-sqlite3';
import type { FeatureRequest, FeatureRequestStatus, DependencyItemType } from '../../../Shared/types';
import { RESOLVED_STATUSES, DISPATCH_TRIGGER_STATUSES } from '../../../Shared/types';
import { DependencyService } from './dependencyService';
import { logger } from '../logger';
import { dispatchGatingEvents } from '../metrics';

// Verifies: FR-dependency-linking
export class FeatureRequestService {
  private depService: DependencyService;

  constructor(private db: Database.Database) {
    this.depService = new DependencyService(db);
  }

  // Verifies: FR-dependency-linking — List all feature requests with unresolved blocker flag
  listFeatureRequests(query?: string): FeatureRequest[] {
    let rows: Array<Record<string, unknown>>;
    if (query) {
      rows = this.db.prepare(
        `SELECT * FROM feature_requests WHERE title LIKE ? OR id LIKE ? ORDER BY created_at DESC`,
      ).all(`%${query}%`, `%${query}%`) as Array<Record<string, unknown>>;
    } else {
      rows = this.db.prepare(`SELECT * FROM feature_requests ORDER BY created_at DESC`).all() as Array<Record<string, unknown>>;
    }

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
  updateFeatureRequest(
    id: string,
    data: { title?: string; description?: string; status?: FeatureRequestStatus; priority?: string; blocked_by?: string[] },
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

    // Verifies: FR-dependency-dispatch-gating — Dispatch gating check
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
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(data.title ?? null, data.description ?? null, newStatus, data.priority ?? null, id);

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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.title ?? null, data.description ?? null, newStatus, data.priority ?? null, id);

    logger.info({ featureRequestId: id, newStatus }, 'Feature request updated');
    return this.getFeatureRequestById(id)!;
  }

  // --- Private helpers ---

  private enrichFeatureRequest(row: Record<string, unknown>): FeatureRequest {
    const id = row.id as string;
    const blocked_by = this.depService.getBlockedBy('feature_request', id);
    const blocks = this.depService.getBlocks('feature_request', id);
    const has_unresolved_blockers = this.depService.hasUnresolvedBlockers('feature_request', id);

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
    };
  }
}
