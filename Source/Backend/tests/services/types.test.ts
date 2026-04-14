// Verifies: FR-dependency-types, FR-dependency-schema, FR-dependency-api-types

import {
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  DependencyLink,
  RESOLVED_STATUSES,
  DISPATCH_TRIGGER_STATUSES,
  DependencyBlockageReason,
} from '@shared/types/workflow';
import * as store from '../../src/store/workItemStore';
import { addDependency, setDependencies } from '../../src/services/dependency';

describe('Dependency Types and Schema', () => {
  beforeEach(() => {
    store.resetStore();
  });

  // ─── FR-dependency-types ─────────────────────────────────────────────────────

  describe('FR-dependency-types: exported domain types and constants', () => {
    // Verifies: FR-dependency-types — RESOLVED_STATUSES contains completed, rejected, failed
    it('RESOLVED_STATUSES contains completed, rejected, and failed', () => {
      expect(RESOLVED_STATUSES).toContain(WorkItemStatus.Completed);
      expect(RESOLVED_STATUSES).toContain(WorkItemStatus.Rejected);
      expect(RESOLVED_STATUSES).toContain(WorkItemStatus.Failed);
    });

    // Verifies: FR-dependency-types — DISPATCH_TRIGGER_STATUSES contains completed and rejected
    it('DISPATCH_TRIGGER_STATUSES contains completed and rejected', () => {
      expect(DISPATCH_TRIGGER_STATUSES).toContain(WorkItemStatus.Completed);
      expect(DISPATCH_TRIGGER_STATUSES).toContain(WorkItemStatus.Rejected);
    });

    // Verifies: FR-dependency-types — DependencyLink interface has all required fields
    it('DependencyLink interface contains all required fields', () => {
      const link: DependencyLink = {
        blockedItemId: 'uuid-blocked',
        blockedItemDocId: 'WI-001',
        blockerItemId: 'uuid-blocker',
        blockerItemDocId: 'WI-002',
        createdAt: '2026-01-01T00:00:00Z',
      };
      expect(link.blockedItemId).toBe('uuid-blocked');
      expect(link.blockerItemId).toBe('uuid-blocker');
      expect(link.blockedItemDocId).toBe('WI-001');
      expect(link.blockerItemDocId).toBe('WI-002');
      expect(link.createdAt).toBeDefined();
    });

    // Verifies: FR-dependency-types — DependencyBlockageReason enum has expected string values
    it('DependencyBlockageReason enum values are correct', () => {
      expect(DependencyBlockageReason.UnresolvedDependency).toBe('unresolved-dependency');
      expect(DependencyBlockageReason.WaitingForBlocker).toBe('waiting-for-blocker');
    });

    // Verifies: FR-dependency-types — RESOLVED_STATUSES does not include backlog or approved
    it('RESOLVED_STATUSES does not include non-terminal statuses', () => {
      expect(RESOLVED_STATUSES).not.toContain(WorkItemStatus.Backlog);
      expect(RESOLVED_STATUSES).not.toContain(WorkItemStatus.Approved);
      expect(RESOLVED_STATUSES).not.toContain(WorkItemStatus.InProgress);
    });
  });

  // ─── FR-dependency-schema ─────────────────────────────────────────────────────

  describe('FR-dependency-schema: WorkItem store tracks dependency fields after operations', () => {
    // Verifies: FR-dependency-schema — blockedBy and blocks are populated after addDependency
    it('blockedBy and blocks arrays are populated after a dependency is added', () => {
      const blocker = store.createWorkItem({
        title: 'Schema blocker',
        description: 'Blocking item for schema test',
        type: WorkItemType.Bug,
        priority: WorkItemPriority.High,
        source: WorkItemSource.Browser,
      });
      const blocked = store.createWorkItem({
        title: 'Schema blocked',
        description: 'Blocked item for schema test',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.Medium,
        source: WorkItemSource.Browser,
      });

      addDependency(blocked.id, blocker.id);

      const updatedBlocked = store.findById(blocked.id)!;
      const updatedBlocker = store.findById(blocker.id)!;

      expect(Array.isArray(updatedBlocked.blockedBy)).toBe(true);
      expect(updatedBlocked.blockedBy).toHaveLength(1);
      expect(Array.isArray(updatedBlocker.blocks)).toBe(true);
      expect(updatedBlocker.blocks).toHaveLength(1);
    });

    // Verifies: FR-dependency-schema — hasUnresolvedBlockers is set true when blocker is active
    it('hasUnresolvedBlockers is true after adding an unresolved blocker', () => {
      const blocker = store.createWorkItem({
        title: 'Active blocker',
        description: 'Still open, so it blocks',
        type: WorkItemType.Bug,
        priority: WorkItemPriority.High,
        source: WorkItemSource.Manual,
      });
      const blocked = store.createWorkItem({
        title: 'Waiting item',
        description: 'Waiting for blocker',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.Medium,
        source: WorkItemSource.Browser,
      });

      addDependency(blocked.id, blocker.id);

      expect(store.findById(blocked.id)!.hasUnresolvedBlockers).toBe(true);
    });

    // Verifies: FR-dependency-schema — dependency link persists across store lookups
    it('dependency link data (blockerItemDocId) persists after a findById round-trip', () => {
      const blocker = store.createWorkItem({
        title: 'Round-trip blocker',
        description: 'Blocker with a known docId',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.Low,
        source: WorkItemSource.Automated,
      });
      const blocked = store.createWorkItem({
        title: 'Round-trip blocked',
        description: 'Checks that link data survives a store round-trip',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.Low,
        source: WorkItemSource.Automated,
      });

      addDependency(blocked.id, blocker.id);

      const fetched = store.findById(blocked.id)!;
      expect(fetched.blockedBy![0].blockerItemId).toBe(blocker.id);
      expect(fetched.blockedBy![0].blockerItemDocId).toBe(blocker.docId);
    });
  });

  // ─── FR-dependency-api-types ─────────────────────────────────────────────────

  describe('FR-dependency-api-types: UpdateWorkItemRequest accepts blockedBy as string[]', () => {
    // Verifies: FR-dependency-api-types — setDependencies accepts an array of valid IDs
    it('setDependencies processes a valid blockedBy array', () => {
      const blocker = store.createWorkItem({
        title: 'Blocker',
        description: 'Blocking item',
        type: WorkItemType.Bug,
        priority: WorkItemPriority.High,
        source: WorkItemSource.Manual,
      });
      const blocked = store.createWorkItem({
        title: 'Blocked',
        description: 'Blocked item',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.Low,
        source: WorkItemSource.Browser,
      });

      expect(() => setDependencies(blocked.id, [blocker.id])).not.toThrow();

      const updated = store.findById(blocked.id)!;
      expect(updated.blockedBy).toHaveLength(1);
      expect(updated.blockedBy![0].blockerItemId).toBe(blocker.id);
    });

    // Verifies: FR-dependency-api-types — setDependencies rejects unknown blocker IDs
    it('setDependencies throws when blockedBy contains a non-existent ID', () => {
      const item = store.createWorkItem({
        title: 'API types item',
        description: 'Testing API type validation',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.Low,
        source: WorkItemSource.Browser,
      });
      expect(() => setDependencies(item.id, ['non-existent-id'])).toThrow(/not found/i);
    });

    // Verifies: FR-dependency-api-types — setDependencies accepts empty array to clear blockers
    it('setDependencies accepts an empty blockedBy array (clears all)', () => {
      const blocker = store.createWorkItem({
        title: 'Blocker',
        description: 'Will be cleared',
        type: WorkItemType.Bug,
        priority: WorkItemPriority.Medium,
        source: WorkItemSource.Browser,
      });
      const blocked = store.createWorkItem({
        title: 'Blocked',
        description: 'Clearing blockers',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.Medium,
        source: WorkItemSource.Browser,
      });

      setDependencies(blocked.id, [blocker.id]);
      expect(store.findById(blocked.id)!.blockedBy).toHaveLength(1);

      setDependencies(blocked.id, []);
      expect(store.findById(blocked.id)!.blockedBy).toHaveLength(0);
    });
  });
});
