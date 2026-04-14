// Verifies: FR-dependency-service, FR-dependency-dispatch-gating, FR-dependency-backend-tests

import {
  addDependency,
  removeDependency,
  setDependencies,
  computeHasUnresolvedBlockers,
  isReady,
  detectCycle,
  onItemResolved,
} from '../../src/services/dependency';
import * as store from '../../src/store/workItemStore';
import {
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemStatus,
} from '@shared/types/workflow';

function createItem(overrides: Record<string, unknown> = {}) {
  return store.createWorkItem({
    title: 'Test item',
    description: 'Test description',
    type: WorkItemType.Feature,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    ...overrides,
  } as Parameters<typeof store.createWorkItem>[0]);
}

describe('DependencyService', () => {
  beforeEach(() => {
    store.resetStore();
  });

  // ─── addDependency ───────────────────────────────────────────────────────────

  describe('addDependency', () => {
    // Verifies: FR-dependency-backend-tests — add link
    it('adds a dependency link between two items', () => {
      const blocker = createItem();
      const blocked = createItem();

      const link = addDependency(blocked.id, blocker.id);

      expect(link.blockedItemId).toBe(blocked.id);
      expect(link.blockerItemId).toBe(blocker.id);
      expect(link.blockedItemDocId).toBe(blocked.docId);
      expect(link.blockerItemDocId).toBe(blocker.docId);
      expect(link.createdAt).toBeDefined();

      const updatedBlocked = store.findById(blocked.id)!;
      expect(updatedBlocked.blockedBy).toHaveLength(1);
      expect(updatedBlocked.hasUnresolvedBlockers).toBe(true);

      const updatedBlocker = store.findById(blocker.id)!;
      expect(updatedBlocker.blocks).toHaveLength(1);
    });

    // Verifies: FR-dependency-backend-tests — self-ref rejection
    it('rejects self-references', () => {
      const item = createItem();
      expect(() => addDependency(item.id, item.id)).toThrow(/self/i);
    });

    // Verifies: FR-dependency-backend-tests — 404 on unknown item
    it('throws when blocked item not found', () => {
      const blocker = createItem();
      expect(() => addDependency('non-existent', blocker.id)).toThrow(/not found/i);
    });

    it('throws when blocker item not found', () => {
      const blocked = createItem();
      expect(() => addDependency(blocked.id, 'non-existent')).toThrow(/not found/i);
    });

    // Verifies: FR-dependency-backend-tests — circular rejection (409)
    it('rejects direct circular dependencies', () => {
      const itemA = createItem();
      const itemB = createItem();

      addDependency(itemA.id, itemB.id); // A blocked by B

      // B blocked by A would create a cycle
      expect(() => addDependency(itemB.id, itemA.id)).toThrow(/cycle|circular/i);
    });

    it('rejects transitive circular dependencies', () => {
      const itemA = createItem();
      const itemB = createItem();
      const itemC = createItem();

      addDependency(itemA.id, itemB.id); // A blocked by B
      addDependency(itemB.id, itemC.id); // B blocked by C

      // C blocked by A would create a cycle A→B→C→A
      expect(() => addDependency(itemC.id, itemA.id)).toThrow(/cycle|circular/i);
    });

    it('is idempotent on duplicate link', () => {
      const blocker = createItem();
      const blocked = createItem();

      addDependency(blocked.id, blocker.id);
      addDependency(blocked.id, blocker.id); // duplicate — should not throw

      const item = store.findById(blocked.id)!;
      expect(item.blockedBy).toHaveLength(1); // no duplicate entry
    });
  });

  // ─── removeDependency ────────────────────────────────────────────────────────

  describe('removeDependency', () => {
    // Verifies: FR-dependency-backend-tests — remove link
    it('removes an existing dependency link', () => {
      const blocker = createItem();
      const blocked = createItem();

      addDependency(blocked.id, blocker.id);
      removeDependency(blocked.id, blocker.id);

      const updatedBlocked = store.findById(blocked.id)!;
      expect(updatedBlocked.blockedBy).toHaveLength(0);
      expect(updatedBlocked.hasUnresolvedBlockers).toBe(false);

      const updatedBlocker = store.findById(blocker.id)!;
      expect(updatedBlocker.blocks).toHaveLength(0);
    });

    it('does not throw when link does not exist', () => {
      const blocker = createItem();
      const blocked = createItem();
      expect(() => removeDependency(blocked.id, blocker.id)).not.toThrow();
    });

    it('throws when blocked item not found', () => {
      const blocker = createItem();
      expect(() => removeDependency('non-existent', blocker.id)).toThrow(/not found/i);
    });
  });

  // ─── setDependencies (bulk replace) ─────────────────────────────────────────

  describe('setDependencies', () => {
    // Verifies: FR-dependency-backend-tests — bulk PATCH
    it('replaces all dependencies atomically', () => {
      const blockerA = createItem();
      const blockerB = createItem();
      const blockerC = createItem();
      const blocked = createItem();

      addDependency(blocked.id, blockerA.id);
      addDependency(blocked.id, blockerB.id);

      // Replace with just C
      setDependencies(blocked.id, [blockerC.id]);

      const item = store.findById(blocked.id)!;
      expect(item.blockedBy).toHaveLength(1);
      expect(item.blockedBy![0].blockerItemId).toBe(blockerC.id);

      // A and B should no longer have blocks on this item
      expect(store.findById(blockerA.id)!.blocks).toHaveLength(0);
      expect(store.findById(blockerB.id)!.blocks).toHaveLength(0);
      expect(store.findById(blockerC.id)!.blocks).toHaveLength(1);
    });

    it('clears all dependencies when passed empty array', () => {
      const blocker = createItem();
      const blocked = createItem();
      addDependency(blocked.id, blocker.id);

      setDependencies(blocked.id, []);

      const item = store.findById(blocked.id)!;
      expect(item.blockedBy).toHaveLength(0);
      expect(item.hasUnresolvedBlockers).toBe(false);
    });

    it('throws when item not found', () => {
      expect(() => setDependencies('non-existent', [])).toThrow(/not found/i);
    });
  });

  // ─── computeHasUnresolvedBlockers ────────────────────────────────────────────

  describe('computeHasUnresolvedBlockers', () => {
    // Verifies: FR-dependency-dispatch-gating
    it('returns true when blocker is unresolved', () => {
      const blocker = createItem(); // default status = backlog (unresolved)
      const blocked = createItem();
      addDependency(blocked.id, blocker.id);

      expect(computeHasUnresolvedBlockers(blocked.id)).toBe(true);
    });

    it('returns false when all blockers are resolved (completed)', () => {
      const blocker = createItem();
      const blocked = createItem();
      addDependency(blocked.id, blocker.id);

      store.updateWorkItem(blocker.id, { status: WorkItemStatus.Completed });

      expect(computeHasUnresolvedBlockers(blocked.id)).toBe(false);
    });

    it('returns false when blocker is rejected (resolved)', () => {
      const blocker = createItem();
      const blocked = createItem();
      addDependency(blocked.id, blocker.id);

      store.updateWorkItem(blocker.id, { status: WorkItemStatus.Rejected });

      expect(computeHasUnresolvedBlockers(blocked.id)).toBe(false);
    });

    it('returns false when blocker has failed (resolved)', () => {
      const blocker = createItem();
      const blocked = createItem();
      addDependency(blocked.id, blocker.id);

      store.updateWorkItem(blocker.id, { status: WorkItemStatus.Failed });

      expect(computeHasUnresolvedBlockers(blocked.id)).toBe(false);
    });

    it('returns false when no blockers', () => {
      const item = createItem();
      expect(computeHasUnresolvedBlockers(item.id)).toBe(false);
    });

    it('returns true if any blocker is unresolved (mixed)', () => {
      const blocker1 = createItem();
      const blocker2 = createItem();
      const blocked = createItem();

      addDependency(blocked.id, blocker1.id);
      addDependency(blocked.id, blocker2.id);

      store.updateWorkItem(blocker1.id, { status: WorkItemStatus.Completed });
      // blocker2 still in backlog

      expect(computeHasUnresolvedBlockers(blocked.id)).toBe(true);
    });
  });

  // ─── isReady ─────────────────────────────────────────────────────────────────

  describe('isReady', () => {
    // Verifies: FR-dependency-backend-tests — readiness check
    it('returns ready=true when no blockers', () => {
      const item = createItem();
      const result = isReady(item.id);
      expect(result.ready).toBe(true);
      expect(result.unresolvedBlockers).toBeUndefined();
    });

    it('returns ready=false with unresolved blockers listed', () => {
      const blocker = createItem();
      const blocked = createItem();
      addDependency(blocked.id, blocker.id);

      const result = isReady(blocked.id);
      expect(result.ready).toBe(false);
      expect(result.unresolvedBlockers).toHaveLength(1);
      expect(result.unresolvedBlockers![0].blockerItemId).toBe(blocker.id);
    });

    it('returns ready=true when all blockers are completed', () => {
      const blocker = createItem();
      const blocked = createItem();
      addDependency(blocked.id, blocker.id);
      store.updateWorkItem(blocker.id, { status: WorkItemStatus.Completed });

      const result = isReady(blocked.id);
      expect(result.ready).toBe(true);
    });

    it('throws for non-existent item', () => {
      expect(() => isReady('non-existent')).toThrow(/not found/i);
    });
  });

  // ─── detectCycle ─────────────────────────────────────────────────────────────

  describe('detectCycle', () => {
    // Verifies: FR-dependency-backend-tests — circular rejection
    it('returns true for direct cycle potential', () => {
      const itemA = createItem();
      const itemB = createItem();
      addDependency(itemA.id, itemB.id); // A blocked by B (B blocks A)

      // Would adding B blocked by A create a cycle?
      expect(detectCycle(itemB.id, itemA.id)).toBe(true);
    });

    it('returns true for transitive cycle potential', () => {
      const itemA = createItem();
      const itemB = createItem();
      const itemC = createItem();

      addDependency(itemA.id, itemB.id); // B blocks A
      addDependency(itemB.id, itemC.id); // C blocks B

      // Adding A blocks C would create cycle: C→B→A→C
      expect(detectCycle(itemC.id, itemA.id)).toBe(true);
    });

    it('returns false for non-cyclic additions', () => {
      const itemA = createItem();
      const itemB = createItem();
      addDependency(itemA.id, itemB.id); // B blocks A

      // C blocked by A is fine (A→B chain, no loop back to C)
      const itemC = createItem();
      expect(detectCycle(itemC.id, itemA.id)).toBe(false);
    });

    it('returns false when no existing edges', () => {
      const itemA = createItem();
      const itemB = createItem();
      expect(detectCycle(itemA.id, itemB.id)).toBe(false);
    });
  });

  // ─── onItemResolved (cascade auto-dispatch) ──────────────────────────────────

  describe('onItemResolved', () => {
    // Verifies: FR-dependency-backend-tests — cascade auto-dispatch
    it('auto-dispatches approved items when their only blocker resolves', () => {
      const blocker = createItem({ type: WorkItemType.Bug });
      const blocked = createItem({ type: WorkItemType.Feature });

      addDependency(blocked.id, blocker.id);
      store.updateWorkItem(blocked.id, { status: WorkItemStatus.Approved });
      store.updateWorkItem(blocker.id, { status: WorkItemStatus.Completed });

      const dispatched = onItemResolved(blocker.id);

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].id).toBe(blocked.id);
      expect(dispatched[0].status).toBe(WorkItemStatus.InProgress);
      expect(dispatched[0].assignedTeam).toBeDefined();
    });

    it('does not auto-dispatch if item still has other unresolved blockers', () => {
      const blocker1 = createItem();
      const blocker2 = createItem();
      const blocked = createItem();

      addDependency(blocked.id, blocker1.id);
      addDependency(blocked.id, blocker2.id);
      store.updateWorkItem(blocked.id, { status: WorkItemStatus.Approved });
      store.updateWorkItem(blocker1.id, { status: WorkItemStatus.Completed });
      // blocker2 still unresolved

      const dispatched = onItemResolved(blocker1.id);
      expect(dispatched).toHaveLength(0);

      // Blocked item should remain approved
      expect(store.findById(blocked.id)!.status).toBe(WorkItemStatus.Approved);
    });

    it('returns empty array when item has no dependents', () => {
      const item = createItem();
      store.updateWorkItem(item.id, { status: WorkItemStatus.Completed });

      const dispatched = onItemResolved(item.id);
      expect(dispatched).toHaveLength(0);
    });

    it('does not auto-dispatch non-approved items (e.g. backlog)', () => {
      const blocker = createItem();
      const blocked = createItem(); // still in backlog status

      addDependency(blocked.id, blocker.id);
      store.updateWorkItem(blocker.id, { status: WorkItemStatus.Completed });

      const dispatched = onItemResolved(blocker.id);
      expect(dispatched).toHaveLength(0);
      expect(store.findById(blocked.id)!.status).toBe(WorkItemStatus.Backlog);
    });

    it('cascades to multiple dependents at once', () => {
      const blocker = createItem();
      const blockedA = createItem({ type: WorkItemType.Feature });
      const blockedB = createItem({ type: WorkItemType.Bug });

      addDependency(blockedA.id, blocker.id);
      addDependency(blockedB.id, blocker.id);
      store.updateWorkItem(blockedA.id, { status: WorkItemStatus.Approved });
      store.updateWorkItem(blockedB.id, { status: WorkItemStatus.Approved });
      store.updateWorkItem(blocker.id, { status: WorkItemStatus.Completed });

      const dispatched = onItemResolved(blocker.id);
      expect(dispatched).toHaveLength(2);
    });
  });

  // ─── cross-type dependencies ─────────────────────────────────────────────────

  describe('cross-type dependencies', () => {
    // Verifies: FR-dependency-backend-tests — cross-type deps
    it('supports dependencies between different item types (bug blocks feature)', () => {
      const bug = createItem({ type: WorkItemType.Bug });
      const feature = createItem({ type: WorkItemType.Feature });

      expect(() => addDependency(feature.id, bug.id)).not.toThrow();

      const updatedFeature = store.findById(feature.id)!;
      expect(updatedFeature.blockedBy).toHaveLength(1);
      expect(updatedFeature.blockedBy![0].blockerItemId).toBe(bug.id);
    });

    it('supports feature blocking bug', () => {
      const feature = createItem({ type: WorkItemType.Feature });
      const bug = createItem({ type: WorkItemType.Bug });

      expect(() => addDependency(bug.id, feature.id)).not.toThrow();
    });
  });
});
