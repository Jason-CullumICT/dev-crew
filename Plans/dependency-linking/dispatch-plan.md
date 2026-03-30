# Dispatch Plan: Dependency Linking in UI/API with Orchestrator Dispatch Gating

**Task:** Add `blocked_by` / `blocks` dependency linking to bugs and feature requests, with UI for viewing/editing dependencies, and orchestrator dispatch gating that holds items with unresolved blockers.

**Scope tag:** `full-stack`
**Confidence:** high
**Risk:** high — schema migration, new junction table, new endpoints, new UI components, orchestrator integration, >20 files

RISK_LEVEL: high

---

## Analysis

### Current State
The portal has no dependency system. Dependencies between bugs and feature requests are currently tracked only in description text. There is no programmatic way to express, query, or enforce blocking relationships. The orchestrator dispatches approved items without checking prerequisites.

### Data Model

#### New Junction Table: `dependencies`
```sql
CREATE TABLE dependencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  blocked_item_type TEXT NOT NULL CHECK(blocked_item_type IN ('bug', 'feature_request')),
  blocked_item_id TEXT NOT NULL,          -- e.g. "BUG-0010" or "FR-0001"
  blocker_item_type TEXT NOT NULL CHECK(blocker_item_type IN ('bug', 'feature_request')),
  blocker_item_id TEXT NOT NULL,          -- e.g. "BUG-0003" or "FR-0003"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(blocked_item_type, blocked_item_id, blocker_item_type, blocker_item_id)
);
```

This is a generic junction table that supports cross-type dependencies (bug→bug, bug→FR, FR→bug, FR→FR).

#### Type Changes
- Add to `Bug` and `FeatureRequest` types: `blocked_by: string[]` and `blocks: string[]`
- Add `pending_dependencies` to the status enum for both types
- Add `DependencyLink` type: `{ item_type: 'bug' | 'feature_request', item_id: string, title: string, status: string }`

### API Design

#### Modified Endpoints
- `GET /api/bugs/:id` — response includes `blocked_by` and `blocks` arrays (resolved with title + status)
- `GET /api/feature-requests/:id` — same
- `GET /api/bugs` — response items include `has_unresolved_blockers: boolean`
- `GET /api/feature-requests` — same
- `PATCH /api/bugs/:id` — accepts optional `blocked_by: string[]` to set full dependency list
- `PATCH /api/feature-requests/:id` — same

#### New Endpoints
- `POST /api/bugs/:id/dependencies` — body: `{ action: 'add' | 'remove', blocker_id: string }` — add/remove single dependency
- `POST /api/feature-requests/:id/dependencies` — same
- `GET /api/feature-requests/:id/ready` — returns `{ ready: boolean, unresolved_blockers: DependencyLink[] }`
- `GET /api/bugs/:id/ready` — same (for consistency)

#### Dispatch Gating Logic
On status transition to `approved` / `in_development`:
1. Query all `blocked_by` items for the transitioning item
2. Check if all blockers have status in `['completed', 'resolved', 'closed']`
3. If any unresolved: set status to `pending_dependencies`, return blocker list
4. If all resolved: proceed with orchestrator dispatch

On status transition to `completed` / `resolved` / `closed`:
1. Query all items where this item is a blocker (`blocks` relationship)
2. For each item with status `pending_dependencies`:
   - Re-check ALL of that item's blockers
   - If all now resolved: auto-dispatch to orchestrator and update status to `approved` / `in_development`

### UI Design

#### Detail View — Dependencies Section
Located below description, above activity/comments:
- **Blocked By** section: list of linked items as clickable chips showing `[BUG-0003] Title — Status Badge`
- **Blocks** section: list of items this blocks, same chip format
- Edit button opens dependency picker modal

#### Dependency Picker Modal
- Search input with typeahead across bugs and feature requests
- Results show ID, title, type badge (Bug/FR), status
- Selected items shown as removable chips
- Prevents circular dependencies (if A blocks B, B cannot block A)

#### List View — Blocked Badge
- Items with `has_unresolved_blockers: true` show a "Blocked" badge in red
- Items with `pending_dependencies` status show "Pending Dependencies" status badge in amber

### Known Dependency Seeding
After schema migration, seed these relationships:
- BUG-0010 blocked_by: BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007
- FR-0004 blocked_by: FR-0003
- FR-0005 blocked_by: FR-0002
- FR-0007 blocked_by: FR-0003

### Circular Dependency Prevention
When adding a dependency link (A blocked_by B), check that B is not transitively blocked by A. Use a BFS/DFS traversal on the dependency graph to detect cycles. Reject with 409 Conflict if circular.

---

## Files to Create / Modify

### Shared Types (1 file)
- `portal/Shared/types.ts` — add `blocked_by`, `blocks`, `has_unresolved_blockers` fields; add `pending_dependencies` status; add `DependencyLink` type

### Backend (6 files)
- `portal/Backend/src/database/schema.ts` — add `dependencies` junction table creation
- `portal/Backend/src/database/seed.ts` — add known dependency seeding
- `portal/Backend/src/routes/bugs.ts` — add dependency endpoints, modify PATCH for blocked_by, add dispatch gating
- `portal/Backend/src/routes/featureRequests.ts` — same
- `portal/Backend/src/services/bugService.ts` — add dependency resolution, blocker check, auto-dispatch logic
- `portal/Backend/src/services/featureRequestService.ts` — same
- `portal/Backend/src/services/dependencyService.ts` — **new** shared service for dependency CRUD, cycle detection, readiness checks, and cascade dispatch

### Frontend (6 files)
- `portal/Shared/api.ts` — add dependency API call types and functions
- `portal/Frontend/src/components/shared/DependencyPicker.tsx` — **new** reusable dependency picker modal component
- `portal/Frontend/src/components/shared/DependencySection.tsx` — **new** reusable blocked_by/blocks display component
- `portal/Frontend/src/components/shared/BlockedBadge.tsx` — **new** badge component for list views
- `portal/Frontend/src/components/bugs/BugDetail.tsx` — integrate DependencySection
- `portal/Frontend/src/components/bugs/BugList.tsx` — integrate BlockedBadge
- `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` — integrate DependencySection
- `portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx` — integrate BlockedBadge

---

## Verification Criteria

### Backend
- Dependencies junction table exists with correct schema and constraints
- PATCH endpoints accept and persist `blocked_by` arrays
- POST dependency endpoints add/remove individual links
- GET endpoints return resolved `blocked_by` and `blocks` with title and status
- `/ready` endpoint correctly reports readiness
- Circular dependency detection rejects cycles with 409
- Dispatch gating: transitioning to approved with unresolved blockers → `pending_dependencies`
- Auto-dispatch: completing a blocker triggers re-evaluation and dispatch of unblocked items
- Known dependencies are seeded correctly
- All existing tests continue to pass

### Frontend
- Detail views show Blocked By and Blocks sections with clickable item references
- Status badges display correctly for each linked item
- Dependency picker allows search, add, remove with circular dependency prevention
- List views show Blocked badge on items with unresolved blockers
- `pending_dependencies` status renders correctly with amber styling

---

## Dispatch Instructions

### backend-coder-1

**Task:** Implement the dependency data model, shared dependency service, and all backend API endpoints for dependency linking and dispatch gating.

**Instructions:**

1. **Shared Types** (`portal/Shared/types.ts`):
   - Add `pending_dependencies` to both `BugStatus` and `FeatureRequestStatus` enums/unions
   - Add to `Bug` and `FeatureRequest` interfaces:
     ```typescript
     blocked_by: DependencyLink[];
     blocks: DependencyLink[];
     has_unresolved_blockers: boolean;
     ```
   - Add new type:
     ```typescript
     interface DependencyLink {
       item_type: 'bug' | 'feature_request';
       item_id: string;
       title: string;
       status: string;
     }
     ```
   - Add `AddDependencyRequest` and `RemoveDependencyRequest` types

2. **Database Schema** (`portal/Backend/src/database/schema.ts`):
   - Add `dependencies` table creation with columns: `id`, `blocked_item_type`, `blocked_item_id`, `blocker_item_type`, `blocker_item_id`, `created_at`
   - Add unique constraint on `(blocked_item_type, blocked_item_id, blocker_item_type, blocker_item_id)`

3. **Dependency Service** (`portal/Backend/src/services/dependencyService.ts`) — **new file**:
   - `addDependency(blockedType, blockedId, blockerType, blockerId)` — insert link, with cycle detection
   - `removeDependency(blockedType, blockedId, blockerType, blockerId)` — delete link
   - `getBlockedBy(itemType, itemId)` — return resolved DependencyLink[] with titles and statuses
   - `getBlocks(itemType, itemId)` — return resolved DependencyLink[] of items this blocks
   - `hasUnresolvedBlockers(itemType, itemId)` — boolean check
   - `isReady(itemType, itemId)` — return `{ ready, unresolved_blockers }`
   - `detectCycle(blockedType, blockedId, blockerType, blockerId)` — BFS/DFS to check for circular deps
   - `onItemCompleted(itemType, itemId)` — check all items blocked by this one; for any in `pending_dependencies`, re-check all their blockers; if all resolved, trigger dispatch
   - `setDependencies(itemType, itemId, blockerIds: string[])` — bulk set (delete existing + insert new), with cycle detection for each

4. **Bug Routes** (`portal/Backend/src/routes/bugs.ts`):
   - Modify `GET /api/bugs` to include `has_unresolved_blockers` per item
   - Modify `GET /api/bugs/:id` to include `blocked_by` and `blocks` resolved arrays
   - Modify `PATCH /api/bugs/:id` to accept optional `blocked_by: string[]` and call `dependencyService.setDependencies`
   - Modify status transition logic: when moving to approved/in_development, call dispatch gating check
   - Add `POST /api/bugs/:id/dependencies` — body `{ action, blocker_id }` → add or remove
   - Add `GET /api/bugs/:id/ready` → return readiness check

5. **Feature Request Routes** (`portal/Backend/src/routes/featureRequests.ts`):
   - Same changes as bug routes, adapted for feature requests

6. **Service Integration** (`portal/Backend/src/services/bugService.ts` and `featureRequestService.ts`):
   - On status change to completed/resolved/closed, call `dependencyService.onItemCompleted()`
   - On status change to approved/in_development, call dispatch gating check; if unresolved blockers exist, set status to `pending_dependencies` instead

7. **Seed Data** (`portal/Backend/src/database/seed.ts`):
   - After existing seed logic, insert the known dependency links:
     - BUG-0010 blocked_by BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007
     - FR-0004 blocked_by FR-0003
     - FR-0005 blocked_by FR-0002
     - FR-0007 blocked_by FR-0003

8. **Tests**: Write tests for:
   - Dependency CRUD (add, remove, bulk set)
   - Circular dependency detection and rejection
   - Readiness check logic
   - Dispatch gating (status → pending_dependencies when blockers exist)
   - Auto-dispatch cascade when blocker completes

**Files:**
- `portal/Shared/types.ts`
- `portal/Backend/src/database/schema.ts`
- `portal/Backend/src/database/seed.ts`
- `portal/Backend/src/services/dependencyService.ts` (new)
- `portal/Backend/src/routes/bugs.ts`
- `portal/Backend/src/routes/featureRequests.ts`
- `portal/Backend/src/services/bugService.ts`
- `portal/Backend/src/services/featureRequestService.ts`

**Scope tag:** `backend`
**Confidence:** high

---

### frontend-coder-1

**Task:** Implement all frontend UI components for dependency display, editing, and status badges.

**Prerequisites:** Depends on backend-coder-1 completing the shared types in `portal/Shared/types.ts` and API endpoints being defined. Start with shared components, then integrate into existing views.

**Instructions:**

1. **API Client** (`portal/Shared/api.ts`):
   - Add functions:
     ```typescript
     addDependency(itemType: string, itemId: string, blockerId: string): Promise<void>
     removeDependency(itemType: string, itemId: string, blockerId: string): Promise<void>
     setDependencies(itemType: string, itemId: string, blockerIds: string[]): Promise<void>
     checkReady(itemType: string, itemId: string): Promise<{ ready: boolean, unresolved_blockers: DependencyLink[] }>
     ```

2. **BlockedBadge Component** (`portal/Frontend/src/components/shared/BlockedBadge.tsx`) — **new**:
   - Small red badge that says "Blocked" — shown when `has_unresolved_blockers` is true
   - Amber badge that says "Pending Dependencies" — shown when status is `pending_dependencies`
   - Designed to fit inline in list view rows

3. **DependencySection Component** (`portal/Frontend/src/components/shared/DependencySection.tsx`) — **new**:
   - Props: `blockedBy: DependencyLink[]`, `blocks: DependencyLink[]`, `itemType`, `itemId`, `editable: boolean`
   - Renders two subsections: "Blocked By" and "Blocks"
   - Each dependency shown as a clickable chip: `[BUG-0003] Fix login — Resolved ✓` with status-colored badge
   - Clicking navigates to that item's detail view
   - If `editable`, shows an "Edit Dependencies" button that opens the DependencyPicker
   - If status is `pending_dependencies`, highlight the unresolved blockers prominently

4. **DependencyPicker Component** (`portal/Frontend/src/components/shared/DependencyPicker.tsx`) — **new**:
   - Modal dialog with search input
   - Typeahead search across both bugs and feature requests (call existing search/list endpoints with query filter)
   - Results show: item ID, title, type badge (Bug/FR), current status
   - Already-selected items shown as removable chips at top
   - "Save" calls `setDependencies` API
   - Client-side guard: warn if adding a dependency that would create an obvious direct cycle (A blocks B, trying to add B blocks A)

5. **BugDetail Integration** (`portal/Frontend/src/components/bugs/BugDetail.tsx`):
   - Add `<DependencySection>` below description, passing `blocked_by`, `blocks` from bug data
   - Set `editable={true}` when user has edit permissions

6. **BugList Integration** (`portal/Frontend/src/components/bugs/BugList.tsx`):
   - Add `<BlockedBadge>` to each list row, passing `has_unresolved_blockers` and `status`

7. **FeatureRequestDetail Integration** (`portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`):
   - Same as BugDetail integration

8. **FeatureRequestList Integration** (`portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx`):
   - Same as BugList integration

**Files:**
- `portal/Shared/api.ts`
- `portal/Frontend/src/components/shared/BlockedBadge.tsx` (new)
- `portal/Frontend/src/components/shared/DependencySection.tsx` (new)
- `portal/Frontend/src/components/shared/DependencyPicker.tsx` (new)
- `portal/Frontend/src/components/bugs/BugDetail.tsx`
- `portal/Frontend/src/components/bugs/BugList.tsx`
- `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`
- `portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx`

**Scope tag:** `frontend`
**Confidence:** high

---

### qa-tester-1

**Task:** Write comprehensive integration and E2E tests for the dependency linking feature.

**Prerequisites:** Depends on both backend-coder-1 and frontend-coder-1 completing their work.

**Instructions:**

1. **API Integration Tests**:
   - Test adding dependencies via POST endpoint (both add and remove actions)
   - Test bulk setting dependencies via PATCH
   - Test circular dependency rejection (expect 409)
   - Test cross-type dependencies (bug blocked_by FR and vice versa)
   - Test readiness endpoint returns correct state
   - Test dispatch gating: PATCH status to approved with unresolved blockers → status becomes `pending_dependencies`
   - Test auto-dispatch: complete a blocker → verify dependent item's status changes from `pending_dependencies`
   - Test that seeded dependencies exist after fresh database setup

2. **UI Integration Tests**:
   - Detail view renders dependency sections with correct data
   - Clicking a dependency link navigates to the correct detail page
   - Blocked badge appears in list views for items with unresolved blockers
   - Dependency picker modal opens, searches, and saves correctly
   - `pending_dependencies` status displays correctly

3. **Edge Cases**:
   - Adding a dependency to a non-existent item returns 404
   - Removing a dependency that doesn't exist is idempotent (no error)
   - Self-referential dependency (A blocked_by A) is rejected
   - Very long dependency chains resolve correctly
   - Concurrent status transitions don't cause race conditions in auto-dispatch

**Files:**
- `portal/Backend/src/__tests__/dependencies.test.ts` (new)
- `portal/Frontend/src/__tests__/dependencies.test.tsx` (new)

**Scope tag:** `qa`
**Confidence:** high
