// Verifies: FR-dependency-service, FR-dependency-dispatch-gating
// Dependency tracking between work items — allows a work item to declare it
// depends_on another item, blocking dispatch until all dependencies are resolved.

import {
  DependencyLink,
  ReadinessCheckResponse,
  WorkItemStatus,
  RESOLVED_STATUSES,
  DISPATCH_TRIGGER_STATUSES,
} from '../../../Shared/types/workflow';
import * as store from '../store/workItemStore';
import { buildChangeEntry } from '../models/WorkItem';
import { assignTeam } from './router';
import logger from '../logger';
import {
  dependencyOperationsCounter,
  cycleDetectionEventsCounter,
  dispatchGatingEventsCounter,
} from '../metrics';

// ─── Cycle detection (BFS) ───────────────────────────────────────────────────

/**
 * Verifies: FR-dependency-service — BFS cycle detection
 * Returns true if adding the dependency (fromId blocked by toId) would create a cycle.
 * A cycle exists if fromId already (transitively) blocks toId via "blocks" edges.
 */
export function detectCycle(fromId: string, toId: string): boolean {
  // BFS from fromId, following "blocks" relationships
  // If we reach toId, adding fromId←toId creates a cycle
  const visited = new Set<string>();
  const queue: string[] = [fromId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === toId) {
      cycleDetectionEventsCounter.inc({ detected: 'true' });
      return true;
    }
    if (visited.has(current)) continue;
    visited.add(current);

    const item = store.findById(current);
    if (!item) continue;

    for (const link of (item.blocks ?? [])) {
      if (!visited.has(link.blockedItemId)) {
        queue.push(link.blockedItemId);
      }
    }
  }

  cycleDetectionEventsCounter.inc({ detected: 'false' });
  return false;
}

// ─── Compute blockers state ──────────────────────────────────────────────────

/**
 * Verifies: FR-dependency-dispatch-gating — compute live unresolved-blocker state
 * Returns true if the item has any blockers whose status is NOT in RESOLVED_STATUSES.
 */
export function computeHasUnresolvedBlockers(itemId: string): boolean {
  const item = store.findById(itemId);
  if (!item) return false;

  for (const link of (item.blockedBy ?? [])) {
    const blocker = store.findById(link.blockerItemId);
    if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
      return true;
    }
  }
  return false;
}

/**
 * Verifies: FR-dependency-endpoints — readiness check
 * Returns a ReadinessCheckResponse for the given item.
 * Throws if item not found.
 */
export function isReady(itemId: string): ReadinessCheckResponse {
  const item = store.findById(itemId);
  if (!item) throw new Error(`Work item ${itemId} not found`);

  const unresolvedBlockers: DependencyLink[] = [];

  for (const link of (item.blockedBy ?? [])) {
    const blocker = store.findById(link.blockerItemId);
    if (!blocker || !RESOLVED_STATUSES.includes(blocker.status)) {
      unresolvedBlockers.push(link);
    }
  }

  if (unresolvedBlockers.length === 0) {
    return { ready: true };
  }
  return { ready: false, unresolvedBlockers };
}

// ─── Mutation helpers ────────────────────────────────────────────────────────

/**
 * Verifies: FR-dependency-service — add a single dependency link
 * Throws on: self-reference, item not found, circular dependency (duplicate is idempotent).
 */
export function addDependency(blockedId: string, blockerId: string): DependencyLink {
  if (blockedId === blockerId) {
    throw new Error('A work item cannot depend on itself (self-reference)');
  }

  const blocked = store.findById(blockedId);
  if (!blocked) throw new Error(`Work item ${blockedId} not found`);

  const blocker = store.findById(blockerId);
  if (!blocker) throw new Error(`Work item ${blockerId} not found`);

  // Idempotency: return existing link if it already exists
  const existing = (blocked.blockedBy ?? []).find(
    (l) => l.blockerItemId === blockerId,
  );
  if (existing) {
    logger.debug({ msg: 'Dependency already exists (idempotent)', blockedId, blockerId });
    return existing;
  }

  // BFS cycle detection
  if (detectCycle(blockedId, blockerId)) {
    throw new Error(
      `Adding this dependency would create a circular dependency chain (cycle detected)`,
    );
  }

  const link: DependencyLink = {
    blockedItemId: blockedId,
    blockedItemDocId: blocked.docId,
    blockerItemId: blockerId,
    blockerItemDocId: blocker.docId,
    createdAt: new Date().toISOString(),
  };

  // Update blocked item: push link, recompute flag
  const blockedBy = [...(blocked.blockedBy ?? []), link];
  const hasUnresolvedBlockers = blockedBy.some((l) => {
    const b = store.findById(l.blockerItemId);
    return !b || !RESOLVED_STATUSES.includes(b.status);
  });

  store.updateWorkItem(blockedId, {
    blockedBy,
    hasUnresolvedBlockers,
    changeHistory: [
      ...blocked.changeHistory,
      buildChangeEntry('blockedBy', null, blockerId, 'system', `Added dependency on ${blocker.docId}`),
    ],
  });

  // Update blocker item: push reverse link
  const blocks = [...(blocker.blocks ?? []), link];
  store.updateWorkItem(blockerId, { blocks });

  dependencyOperationsCounter.inc({ action: 'add' });
  logger.info({ msg: 'Dependency added', blockedId, blockerId, blockedDocId: blocked.docId, blockerDocId: blocker.docId });

  return link;
}

/**
 * Verifies: FR-dependency-service — remove a single dependency link
 * Throws if either item not found. No-ops silently if link doesn't exist.
 */
export function removeDependency(blockedId: string, blockerId: string): void {
  const blocked = store.findById(blockedId);
  if (!blocked) throw new Error(`Work item ${blockedId} not found`);

  const blocker = store.findById(blockerId);
  // blocker may be soft-deleted; still clean up the reverse index if the item exists in raw store
  // For simplicity: we only require blockedId to exist
  const newBlockedBy = (blocked.blockedBy ?? []).filter(
    (l) => l.blockerItemId !== blockerId,
  );

  const hasUnresolvedBlockers = newBlockedBy.some((l) => {
    const b = store.findById(l.blockerItemId);
    return !b || !RESOLVED_STATUSES.includes(b.status);
  });

  store.updateWorkItem(blockedId, {
    blockedBy: newBlockedBy,
    hasUnresolvedBlockers,
    changeHistory: [
      ...blocked.changeHistory,
      buildChangeEntry(
        'blockedBy',
        blockerId,
        null,
        'system',
        `Removed dependency on ${blocker?.docId ?? blockerId}`,
      ),
    ],
  });

  // Clean up reverse link on blocker (best-effort — may have been deleted)
  if (blocker) {
    const newBlocks = (blocker.blocks ?? []).filter(
      (l) => l.blockedItemId !== blockedId,
    );
    store.updateWorkItem(blockerId, { blocks: newBlocks });
  }

  dependencyOperationsCounter.inc({ action: 'remove' });
  logger.info({ msg: 'Dependency removed', blockedId, blockerId });
}

/**
 * Verifies: FR-dependency-service — bulk replace (setDependencies)
 * Atomically replaces all current blockers for an item with the given list.
 * Throws if item not found or any new blocker would create a cycle.
 */
export function setDependencies(itemId: string, blockerIds: string[]): DependencyLink[] {
  const item = store.findById(itemId);
  if (!item) throw new Error(`Work item ${itemId} not found`);

  // Remove all existing
  const current = [...(item.blockedBy ?? [])];
  for (const link of current) {
    removeDependency(itemId, link.blockerItemId);
  }

  // Add new ones
  const links: DependencyLink[] = [];
  for (const blockerId of blockerIds) {
    const link = addDependency(itemId, blockerId);
    links.push(link);
  }

  dependencyOperationsCounter.inc({ action: 'set' });
  return links;
}

// ─── Cascade auto-dispatch ───────────────────────────────────────────────────

/**
 * Verifies: FR-dependency-dispatch-gating — cascade auto-dispatch
 * Called when an item reaches a DISPATCH_TRIGGER_STATUS (Completed or Rejected).
 * For each item this item blocks, if the dependent is now unblocked and in
 * Approved status, auto-dispatch it to the appropriate team.
 *
 * Returns the list of auto-dispatched items.
 */
export function onItemResolved(resolvedItemId: string): import('../../../Shared/types/workflow').WorkItem[] {
  const resolvedItem = store.findById(resolvedItemId);
  if (!resolvedItem) {
    logger.warn({ msg: 'onItemResolved called with unknown item', resolvedItemId });
    return [];
  }

  if (!DISPATCH_TRIGGER_STATUSES.includes(resolvedItem.status)) {
    logger.debug({
      msg: 'onItemResolved: item not in a dispatch-trigger status, skipping cascade',
      resolvedItemId,
      status: resolvedItem.status,
    });
    return [];
  }

  const dispatched: import('../../../Shared/types/workflow').WorkItem[] = [];

  for (const link of (resolvedItem.blocks ?? [])) {
    const dependent = store.findById(link.blockedItemId);
    if (!dependent) continue;

    // Only auto-dispatch items that are Approved and now fully unblocked
    if (dependent.status !== WorkItemStatus.Approved) continue;
    if (computeHasUnresolvedBlockers(dependent.id)) continue;

    // Auto-dispatch
    const team = assignTeam(dependent);
    const statusEntry = buildChangeEntry(
      'status',
      dependent.status,
      WorkItemStatus.InProgress,
      'cascade-dispatcher',
      `Auto-dispatched after blocker ${resolvedItem.docId} resolved`,
    );
    const teamEntry = buildChangeEntry(
      'assignedTeam',
      dependent.assignedTeam,
      team,
      'cascade-dispatcher',
      `Auto-assigned to ${team}`,
    );

    const updated = store.updateWorkItem(dependent.id, {
      status: WorkItemStatus.InProgress,
      assignedTeam: team,
      hasUnresolvedBlockers: false,
      changeHistory: [...dependent.changeHistory, statusEntry, teamEntry],
    });

    if (updated) {
      dispatched.push(updated);
      dispatchGatingEventsCounter.inc({ event: 'cascade_dispatched' });
      logger.info({
        msg: 'Cascade auto-dispatch: dependent dispatched after blocker resolved',
        dependentId: dependent.id,
        dependentDocId: dependent.docId,
        resolvedBlockerId: resolvedItemId,
        team,
      });
    }
  }

  return dispatched;
}
