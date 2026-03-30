// Verifies: FR-dependency-linking — Shared dependency service for CRUD, cycle detection, readiness, cascade dispatch
import Database from 'better-sqlite3';
import {
  DependencyLink,
  DependencyItemType,
  ReadyResponse,
  RESOLVED_STATUSES,
  parseItemId,
} from '../../../Shared/types';
import { logger } from '../logger';
import {
  dependencyOperations,
  dispatchGatingEvents,
  dependencyCheckDuration,
  cycleDetectionEvents,
} from '../metrics';

// Verifies: FR-dependency-linking — Dependency service class
export class DependencyService {
  constructor(private db: Database.Database) {}

  // Verifies: FR-dependency-linking — Add a single dependency link
  addDependency(
    blockedType: DependencyItemType,
    blockedId: string,
    blockerType: DependencyItemType,
    blockerId: string,
  ): void {
    // Self-referential check
    if (blockedType === blockerType && blockedId === blockerId) {
      throw new DependencyError('An item cannot depend on itself', 409);
    }

    // Verify both items exist
    this.verifyItemExists(blockedType, blockedId);
    this.verifyItemExists(blockerType, blockerId);

    // Cycle detection
    // Verifies: FR-dependency-cycle-detection
    if (this.detectCycle(blockedType, blockedId, blockerType, blockerId)) {
      cycleDetectionEvents.inc({ result: 'cycle_detected' });
      throw new DependencyError(
        `Adding this dependency would create a circular dependency`,
        409,
      );
    }
    cycleDetectionEvents.inc({ result: 'clean' });

    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO dependencies (blocked_item_type, blocked_item_id, blocker_item_type, blocker_item_id)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(blockedType, blockedId, blockerType, blockerId);

    dependencyOperations.inc({ operation: 'add', item_type: blockedType });
    logger.info({ blockedType, blockedId, blockerType, blockerId }, 'Dependency added');
  }

  // Verifies: FR-dependency-linking — Remove a single dependency link
  removeDependency(
    blockedType: DependencyItemType,
    blockedId: string,
    blockerType: DependencyItemType,
    blockerId: string,
  ): void {
    const stmt = this.db.prepare(`
      DELETE FROM dependencies
      WHERE blocked_item_type = ? AND blocked_item_id = ?
        AND blocker_item_type = ? AND blocker_item_id = ?
    `);
    stmt.run(blockedType, blockedId, blockerType, blockerId);

    dependencyOperations.inc({ operation: 'remove', item_type: blockedType });
    logger.info({ blockedType, blockedId, blockerType, blockerId }, 'Dependency removed');
  }

  // Verifies: FR-dependency-linking — Get all items that block the given item
  getBlockedBy(itemType: DependencyItemType, itemId: string): DependencyLink[] {
    const rows = this.db.prepare(`
      SELECT d.blocker_item_type, d.blocker_item_id,
        CASE d.blocker_item_type
          WHEN 'bug' THEN b.title
          WHEN 'feature_request' THEN fr.title
        END as title,
        CASE d.blocker_item_type
          WHEN 'bug' THEN b.status
          WHEN 'feature_request' THEN fr.status
        END as status
      FROM dependencies d
      LEFT JOIN bugs b ON d.blocker_item_type = 'bug' AND d.blocker_item_id = b.id
      LEFT JOIN feature_requests fr ON d.blocker_item_type = 'feature_request' AND d.blocker_item_id = fr.id
      WHERE d.blocked_item_type = ? AND d.blocked_item_id = ?
    `).all(itemType, itemId) as Array<{
      blocker_item_type: DependencyItemType;
      blocker_item_id: string;
      title: string | null;
      status: string | null;
    }>;

    return rows.map((r) => ({
      item_type: r.blocker_item_type,
      item_id: r.blocker_item_id,
      title: r.title ?? 'Unknown',
      status: r.status ?? 'unknown',
    }));
  }

  // Verifies: FR-dependency-linking — Get all items that this item blocks
  getBlocks(itemType: DependencyItemType, itemId: string): DependencyLink[] {
    const rows = this.db.prepare(`
      SELECT d.blocked_item_type, d.blocked_item_id,
        CASE d.blocked_item_type
          WHEN 'bug' THEN b.title
          WHEN 'feature_request' THEN fr.title
        END as title,
        CASE d.blocked_item_type
          WHEN 'bug' THEN b.status
          WHEN 'feature_request' THEN fr.status
        END as status
      FROM dependencies d
      LEFT JOIN bugs b ON d.blocked_item_type = 'bug' AND d.blocked_item_id = b.id
      LEFT JOIN feature_requests fr ON d.blocked_item_type = 'feature_request' AND d.blocked_item_id = fr.id
      WHERE d.blocker_item_type = ? AND d.blocker_item_id = ?
    `).all(itemType, itemId) as Array<{
      blocked_item_type: DependencyItemType;
      blocked_item_id: string;
      title: string | null;
      status: string | null;
    }>;

    return rows.map((r) => ({
      item_type: r.blocked_item_type,
      item_id: r.blocked_item_id,
      title: r.title ?? 'Unknown',
      status: r.status ?? 'unknown',
    }));
  }

  // Verifies: FR-dependency-linking — Check if item has any unresolved blockers
  hasUnresolvedBlockers(itemType: DependencyItemType, itemId: string): boolean {
    const blockers = this.getBlockedBy(itemType, itemId);
    return blockers.some((b) => !RESOLVED_STATUSES.includes(b.status));
  }

  // Verifies: FR-dependency-ready-check — Full readiness check
  isReady(itemType: DependencyItemType, itemId: string): ReadyResponse {
    const end = dependencyCheckDuration.startTimer({ check_type: 'readiness' });
    const blockers = this.getBlockedBy(itemType, itemId);
    const unresolvedBlockers = blockers.filter(
      (b) => !RESOLVED_STATUSES.includes(b.status),
    );
    end();

    return {
      ready: unresolvedBlockers.length === 0,
      unresolved_blockers: unresolvedBlockers,
    };
  }

  // Verifies: FR-dependency-cycle-detection — BFS cycle detection
  detectCycle(
    blockedType: DependencyItemType,
    blockedId: string,
    blockerType: DependencyItemType,
    blockerId: string,
  ): boolean {
    // Check if adding "blockedId is blocked by blockerId" creates a cycle.
    // This means: can we reach blockedId from blockerId by following blocked_by edges?
    // i.e., is blockedId transitively blocking blockerId?
    const visited = new Set<string>();
    const queue: Array<{ type: DependencyItemType; id: string }> = [
      { type: blockerType, id: blockerId },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.type}:${current.id}`;

      if (current.type === blockedType && current.id === blockedId) {
        return true; // Cycle detected
      }

      if (visited.has(key)) continue;
      visited.add(key);

      // Get what blocks the current item (i.e., follow the blocked_by edges)
      const blockers = this.db.prepare(`
        SELECT blocker_item_type, blocker_item_id
        FROM dependencies
        WHERE blocked_item_type = ? AND blocked_item_id = ?
      `).all(current.type, current.id) as Array<{
        blocker_item_type: DependencyItemType;
        blocker_item_id: string;
      }>;

      for (const b of blockers) {
        const bKey = `${b.blocker_item_type}:${b.blocker_item_id}`;
        if (!visited.has(bKey)) {
          queue.push({ type: b.blocker_item_type, id: b.blocker_item_id });
        }
      }
    }

    return false;
  }

  // Verifies: FR-dependency-dispatch-gating — Check items unblocked when a blocker completes
  onItemCompleted(itemType: DependencyItemType, itemId: string): string[] {
    const end = dependencyCheckDuration.startTimer({ check_type: 'cascade' });
    const autoDispatched: string[] = [];

    // Find all items that this item blocks
    const blockedItems = this.db.prepare(`
      SELECT blocked_item_type, blocked_item_id
      FROM dependencies
      WHERE blocker_item_type = ? AND blocker_item_id = ?
    `).all(itemType, itemId) as Array<{
      blocked_item_type: DependencyItemType;
      blocked_item_id: string;
    }>;

    for (const item of blockedItems) {
      // Check if the blocked item is in pending_dependencies status
      const status = this.getItemStatus(item.blocked_item_type, item.blocked_item_id);
      if (status !== 'pending_dependencies') continue;

      // Re-check ALL blockers for this item
      const readiness = this.isReady(item.blocked_item_type, item.blocked_item_id);
      if (readiness.ready) {
        // All blockers resolved — auto-dispatch by setting status to approved
        const table = item.blocked_item_type === 'bug' ? 'bugs' : 'feature_requests';
        this.db.prepare(`UPDATE ${table} SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(item.blocked_item_id);

        autoDispatched.push(item.blocked_item_id);
        dispatchGatingEvents.inc({ result: 'auto_dispatched' });
        logger.info(
          { itemType: item.blocked_item_type, itemId: item.blocked_item_id },
          'Auto-dispatched item after all blockers resolved',
        );
      }
    }

    end();
    return autoDispatched;
  }

  // Verifies: FR-dependency-linking — Bulk set dependencies (replace all)
  setDependencies(
    itemType: DependencyItemType,
    itemId: string,
    blockerIds: string[],
  ): void {
    // Verify the item exists
    this.verifyItemExists(itemType, itemId);

    // Parse and validate all blocker IDs
    const parsedBlockers = blockerIds.map((bid) => {
      const parsed = parseItemId(bid);
      if (!parsed) {
        throw new DependencyError(`Invalid blocker ID format: ${bid}`, 400);
      }
      return parsed;
    });

    // Check for self-references
    for (const blocker of parsedBlockers) {
      if (blocker.type === itemType && blocker.id === itemId) {
        throw new DependencyError('An item cannot depend on itself', 409);
      }
    }

    // Verify all blockers exist
    for (const blocker of parsedBlockers) {
      this.verifyItemExists(blocker.type, blocker.id);
    }

    // Use a transaction for atomicity
    const setAll = this.db.transaction(() => {
      // Delete existing dependencies
      this.db.prepare(`
        DELETE FROM dependencies WHERE blocked_item_type = ? AND blocked_item_id = ?
      `).run(itemType, itemId);

      // Insert new ones with cycle detection
      for (const blocker of parsedBlockers) {
        if (this.detectCycle(itemType, itemId, blocker.type, blocker.id)) {
          throw new DependencyError(
            `Adding dependency on ${blocker.id} would create a circular dependency`,
            409,
          );
        }

        this.db.prepare(`
          INSERT INTO dependencies (blocked_item_type, blocked_item_id, blocker_item_type, blocker_item_id)
          VALUES (?, ?, ?, ?)
        `).run(itemType, itemId, blocker.type, blocker.id);
      }
    });

    setAll();

    dependencyOperations.inc({ operation: 'bulk_set', item_type: itemType });
    logger.info({ itemType, itemId, blockerCount: blockerIds.length }, 'Dependencies bulk-set');
  }

  // --- Private helpers ---

  private verifyItemExists(type: DependencyItemType, id: string): void {
    const table = type === 'bug' ? 'bugs' : 'feature_requests';
    const row = this.db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
    if (!row) {
      throw new DependencyError(`Item not found: ${id}`, 404);
    }
  }

  private getItemStatus(type: DependencyItemType, id: string): string | null {
    const table = type === 'bug' ? 'bugs' : 'feature_requests';
    const row = this.db.prepare(`SELECT status FROM ${table} WHERE id = ?`).get(id) as
      | { status: string }
      | undefined;
    return row?.status ?? null;
  }
}

// Verifies: FR-dependency-linking — Custom error class for dependency operations
export class DependencyError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'DependencyError';
  }
}
