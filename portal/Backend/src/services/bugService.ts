// Verifies: FR-dependency-linking — Bug service with dependency-aware status transitions
import Database from 'better-sqlite3';
import type { Bug, BugStatus, DependencyItemType } from '../../../Shared/types';
import { RESOLVED_STATUSES, DISPATCH_TRIGGER_STATUSES } from '../../../Shared/types';
import { DependencyService } from './dependencyService';
import { logger } from '../logger';
import { dispatchGatingEvents } from '../metrics';

// Verifies: FR-dependency-linking
export class BugService {
  private depService: DependencyService;

  constructor(private db: Database.Database) {
    this.depService = new DependencyService(db);
  }

  // Verifies: FR-dependency-linking — List all bugs with unresolved blocker flag
  listBugs(query?: string): Bug[] {
    let rows: Array<Record<string, unknown>>;
    if (query) {
      rows = this.db.prepare(
        `SELECT * FROM bugs WHERE title LIKE ? OR id LIKE ? ORDER BY created_at DESC`,
      ).all(`%${query}%`, `%${query}%`) as Array<Record<string, unknown>>;
    } else {
      rows = this.db.prepare(`SELECT * FROM bugs ORDER BY created_at DESC`).all() as Array<Record<string, unknown>>;
    }

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
  updateBug(
    id: string,
    data: { title?: string; description?: string; status?: BugStatus; severity?: string; blocked_by?: string[] },
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

    // Verifies: FR-dependency-dispatch-gating — Dispatch gating check
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
      // Status is transitioning to a resolved state — trigger cascade after update
      this.db.prepare(`
        UPDATE bugs SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          status = ?,
          severity = COALESCE(?, severity),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(data.title ?? null, data.description ?? null, newStatus, data.severity ?? null, id);

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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(data.title ?? null, data.description ?? null, newStatus, data.severity ?? null, id);

    logger.info({ bugId: id, newStatus }, 'Bug updated');
    return this.getBugById(id)!;
  }

  // --- Private helpers ---

  private enrichBug(row: Record<string, unknown>): Bug {
    const id = row.id as string;
    const blocked_by = this.depService.getBlockedBy('bug', id);
    const blocks = this.depService.getBlocks('bug', id);
    const has_unresolved_blockers = this.depService.hasUnresolvedBlockers('bug', id);

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
    };
  }
}
