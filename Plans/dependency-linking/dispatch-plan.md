# Dispatch Plan: Dependency Linking in UI/API with Orchestrator Dispatch Gating

RISK_LEVEL: high

> Schema migration (new junction table), 10+ files across backend/frontend/shared, new endpoints, new status type, cascade logic

## Task Summary

Implement cross-entity dependency linking for bugs and feature requests with:
- Backend: dependency CRUD, cycle detection, readiness checks, cascade auto-dispatch
- Frontend: dependency section on detail views, blocked badge on lists, dependency picker modal
- Orchestrator gating: block dispatch when unresolved blockers exist, auto-dispatch when blockers clear

## Requirements (FR IDs)

| FR ID | Description | Weight |
|-------|-------------|--------|
| FR-dependency-types | Add `blocked_by`/`blocks`/`has_unresolved_blockers` to shared types, `pending_dependencies` status | S |
| FR-dependency-schema | Create `dependencies` junction table with indexes | S |
| FR-dependency-service | DependencyService: add/remove/bulk-set, cycle detection (BFS), readiness check, cascade dispatch | XL |
| FR-dependency-routes | Dependency endpoints on bugs + feature-requests routes, PATCH accepts `blocked_by`, GET /:id/ready | L |
| FR-dependency-detail-ui | DependencySection component: blocked-by chips, blocks chips, pending warning, edit button | L |
| FR-dependency-list-ui | BlockedBadge component on BugList and FeatureRequestList | S |
| FR-dependency-picker | DependencyPicker modal: search, select, client-side cycle guard, save | L |
| FR-dependency-dispatch-gating | Dispatch gating: check blockers on status transition, set pending_dependencies, cascade on completion | L |

## Scoping / Bin-Packing Plan

### Backend Layer
| FR ID | Weight | Points |
|-------|--------|--------|
| FR-dependency-types (shared) | S | 1 |
| FR-dependency-schema | S | 1 |
| FR-dependency-service | XL | 8 |
| FR-dependency-routes | L | 4 |
| FR-dependency-dispatch-gating | L | 4 |
| **Total** | | **18** |

### Frontend Layer
| FR ID | Weight | Points |
|-------|--------|--------|
| FR-dependency-detail-ui | L | 4 |
| FR-dependency-list-ui | S | 1 |
| FR-dependency-picker | L | 4 |
| **Total** | | **9** |

### Scaling Decision
- Backend: 18 points → 3 coders (XL gets own coder, remaining L+S split across 2)
- Frontend: 9 points → 2 coders (one for detail/list views, one for picker)

However, these changes are tightly coupled (dependency service is used by routes, routes used by frontend). To avoid merge conflicts and integration issues:
- Backend: 2 coders (one for service+schema, one for routes+gating)
- Frontend: 1 coder (all UI components are interdependent)

---

## Dispatch Instructions

### backend-coder-1

**Assignment**: Shared types, database schema, DependencyService

**Files to create/modify**:
- `portal/Shared/types.ts` — Add `DependencyLink`, `DependencyItemType`, `ReadyResponse`, `AddDependencyRequest`, `RemoveDependencyRequest`, `DependencyActionRequest` types. Add `pending_dependencies` to `FeatureRequestStatus` and `BugStatus`. Add `blocked_by`, `blocks`, `has_unresolved_blockers` to `FeatureRequest` and `BugReport`. Add `RESOLVED_STATUSES`, `DISPATCH_TRIGGER_STATUSES` constants. Add `parseItemId` helper.
- `portal/Shared/api.ts` — No new input types needed (dependencies use existing PATCH inputs with `blocked_by` array)
- `portal/Backend/src/database/schema.ts` — Add `dependencies` junction table with columns: `id INTEGER PRIMARY KEY AUTOINCREMENT`, `blocked_item_type TEXT NOT NULL CHECK(IN('bug','feature_request'))`, `blocked_item_id TEXT NOT NULL`, `blocker_item_type TEXT NOT NULL CHECK(IN('bug','feature_request'))`, `blocker_item_id TEXT NOT NULL`, `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, `UNIQUE(blocked_item_type, blocked_item_id, blocker_item_type, blocker_item_id)`. Add indexes on `(blocked_item_type, blocked_item_id)` and `(blocker_item_type, blocker_item_id)`.
- `portal/Backend/src/services/dependencyService.ts` — New file. `DependencyService` class with methods: `addDependency()`, `removeDependency()`, `getBlockedBy()`, `getBlocks()`, `hasUnresolvedBlockers()`, `isReady()` (returns `ReadyResponse`), `detectCycle()` (BFS), `onItemCompleted()` (cascade auto-dispatch), `setDependencies()` (bulk replace). Custom `DependencyError` class.
- `portal/Backend/src/metrics.ts` — Add Prometheus counters: `dependencyOperations`, `dispatchGatingEvents`, `dependencyCheckDuration`, `cycleDetectionEvents`

**Key implementation details**:
- Cycle detection uses BFS: from blocker, follow blocked_by edges; if we reach the blocked item, it's a cycle
- `onItemCompleted()`: find all items blocked by this item, check if any are `pending_dependencies`, re-check all their blockers, if all resolved set status to `approved`
- `setDependencies()`: transaction — delete all existing deps for item, insert new ones with per-insert cycle detection
- All methods use structured logging via project logger

**Tests**:
- `portal/Backend/tests/dependencies.test.ts` — Unit tests for DependencyService: add/remove, cycle detection, readiness, cascade dispatch, bulk set, self-reference rejection, item-not-found errors

### backend-coder-2

**Assignment**: Route handlers for dependency endpoints and dispatch gating logic

**Files to modify**:
- `portal/Backend/src/routes/bugs.ts` — Add endpoints:
  - `POST /api/bugs/:id/dependencies` — accepts `{ action: 'add'|'remove', blocker_id: string }`, validates with `parseItemId`, calls DependencyService
  - `GET /api/bugs/:id/ready` — returns `ReadyResponse` from DependencyService
  - Modify `PATCH /api/bugs/:id` — accept `blocked_by: string[]` in body, call `dependencyService.setDependencies()`
  - Modify `GET /api/bugs/:id` — hydrate `blocked_by`, `blocks`, `has_unresolved_blockers` from DependencyService
  - Modify `GET /api/bugs` (list) — hydrate `has_unresolved_blockers` for each bug
  - Add dispatch gating: when status transitions to `approved`/`in_development`, check `hasUnresolvedBlockers()` — if true, set status to `pending_dependencies` instead
  - On status transition to `resolved`/`closed`/`completed`, call `onItemCompleted()` for cascade
- `portal/Backend/src/routes/featureRequests.ts` — Mirror all the same changes as bugs:
  - `POST /api/feature-requests/:id/dependencies`
  - `GET /api/feature-requests/:id/ready`
  - PATCH accepts `blocked_by`
  - GET hydrates dependency fields
  - Dispatch gating on status transitions
  - Cascade on completion
- `portal/Backend/src/services/bugService.ts` — Extend `updateBug()` to handle dispatch gating status transitions
- `portal/Backend/src/services/featureRequestService.ts` — Extend `updateFeatureRequest()` to handle dispatch gating

**Key implementation details**:
- Dispatch gating check: when `DISPATCH_TRIGGER_STATUSES` includes the new status AND `hasUnresolvedBlockers()` is true → override status to `pending_dependencies`
- Cascade check: when `RESOLVED_STATUSES` includes the new status → call `onItemCompleted()` and log auto-dispatched items
- Dependency endpoints use `DependencyService` from `backend-coder-1`'s work
- All endpoints wrapped in `withSpan()` for tracing
- All endpoints use structured logging

**Tests**:
- `portal/Backend/tests/bugs.test.ts` — Add tests for dependency endpoints, dispatch gating, cascade
- `portal/Backend/tests/featureRequests.test.ts` — Add tests for dependency endpoints, dispatch gating, cascade

### frontend-coder-1

**Assignment**: All frontend dependency UI components

**Files to create/modify**:
- `portal/Frontend/src/components/shared/DependencySection.tsx` — New component for detail views. Shows "Blocked By" section with clickable chips (item ID, title, status badge with resolved checkmark). Shows "Blocks" section. Shows pending_dependencies warning banner. "Edit Dependencies" button opens picker. Props: `blockedBy`, `blocks`, `itemType`, `itemId`, `editable`, `status`, `onDependenciesChanged`.
- `portal/Frontend/src/components/shared/DependencyPicker.tsx` — Modal component. Search input with debounced search via `general.searchItems()`. Selected items as removable chips. Search results list with type badge (Bug/FR), status. Client-side circular dependency guard. Save button calls PATCH with `blocked_by` array. Props: `itemType`, `itemId`, `currentBlockedBy`, `onClose`, `onSave`.
- `portal/Frontend/src/components/shared/BlockedBadge.tsx` — Inline badge component for list views. Red "Blocked" when `has_unresolved_blockers` is true. Amber "Pending Dependencies" when status is `pending_dependencies`. Returns null otherwise.
- `portal/Frontend/src/components/bugs/BugDetail.tsx` — Import and render `DependencySection` in detail view, passing `bug.blocked_by`, `bug.blocks`, `bug.has_unresolved_blockers`. Wire `onDependenciesChanged` to refetch bug.
- `portal/Frontend/src/components/bugs/BugList.tsx` — Import and render `BlockedBadge` for each bug in the list.
- `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` — Same as BugDetail but for feature requests.
- `portal/Frontend/src/components/feature-requests/FeatureRequestList.tsx` — Same as BugList but for feature requests.
- `portal/Frontend/src/api/client.ts` — Add `general.searchItems(query)` method that calls `GET /api/search?q=...` and returns mixed array of bugs and feature requests. Ensure `bugs.update()` and `featureRequests.update()` can pass `blocked_by` in the body.

**Key implementation details**:
- DependencySection uses inline styles (consistent with existing portal components)
- DependencyPicker uses 300ms debounce on search
- Client-side cycle guard: check if candidate's `blocks` array contains current item
- Save triggers PATCH with `blocked_by: string[]` (IDs only)
- All components have `data-testid` attributes for E2E testing
- Use `useCallback` for event handlers to prevent unnecessary re-renders

**Tests**:
- `portal/Frontend/tests/DependencyPicker.test.tsx` — Modal rendering, search, selection, removal, save, cycle guard, error display
- `portal/Frontend/tests/ImageComponents.test.tsx` — (existing, update if BlockedBadge affects)
- Test DependencySection rendering with various blocker states

---

## API Contract

### New Endpoints

```
POST /api/bugs/:id/dependencies
  Body: { action: 'add' | 'remove', blocker_id: string }
  Response: 200 { blocked_by: DependencyLink[], blocks: DependencyLink[] }
  Errors: 400 (invalid ID format), 404 (item not found), 409 (circular dependency / self-reference)

POST /api/feature-requests/:id/dependencies
  Body: { action: 'add' | 'remove', blocker_id: string }
  Response: 200 { blocked_by: DependencyLink[], blocks: DependencyLink[] }
  Errors: 400 (invalid ID format), 404 (item not found), 409 (circular dependency / self-reference)

GET /api/bugs/:id/ready
  Response: 200 { ready: boolean, unresolved_blockers: DependencyLink[] }

GET /api/feature-requests/:id/ready
  Response: 200 { ready: boolean, unresolved_blockers: DependencyLink[] }
```

### Modified Endpoints

```
PATCH /api/bugs/:id
  Body (new field): blocked_by?: string[]  (array of BUG-* or FR-* IDs)
  Behavior: Replaces all dependencies for this bug. Validates all IDs exist. Cycle detection.
  Dispatch gating: If new status is approved/in_development and has unresolved blockers → status becomes pending_dependencies

PATCH /api/feature-requests/:id
  Body (new field): blocked_by?: string[]  (same as bugs)
  Dispatch gating: same as bugs

GET /api/bugs/:id
  Response (new fields): blocked_by: DependencyLink[], blocks: DependencyLink[], has_unresolved_blockers: boolean

GET /api/feature-requests/:id
  Response (new fields): blocked_by: DependencyLink[], blocks: DependencyLink[], has_unresolved_blockers: boolean

GET /api/bugs
  Response items (new field): has_unresolved_blockers: boolean

GET /api/feature-requests
  Response items (new field): has_unresolved_blockers: boolean
```

### Shared Types (DependencyLink)

```typescript
interface DependencyLink {
  item_type: 'bug' | 'feature_request';
  item_id: string;
  title: string;
  status: string;
}

interface ReadyResponse {
  ready: boolean;
  unresolved_blockers: DependencyLink[];
}
```

---

## Verification Checklist

- [ ] Dependencies junction table created with proper constraints and indexes
- [ ] Cycle detection prevents circular dependencies (BFS traversal)
- [ ] Self-reference prevention (item cannot block itself)
- [ ] PATCH endpoints accept `blocked_by` array and bulk-set dependencies
- [ ] POST dependency endpoints support add/remove individual links
- [ ] GET endpoints hydrate `blocked_by`, `blocks`, `has_unresolved_blockers`
- [ ] Ready endpoint returns correct readiness status
- [ ] Dispatch gating: approved/in_development → pending_dependencies when blocked
- [ ] Cascade: completed/resolved/closed → auto-dispatch pending_dependencies items
- [ ] Detail views show DependencySection with clickable chips and status badges
- [ ] List views show BlockedBadge for items with unresolved blockers
- [ ] DependencyPicker allows searching and selecting blockers
- [ ] All new code has structured logging and Prometheus metrics
- [ ] All new code has traceability comments (`// Verifies: FR-*`)
- [ ] All tests pass with zero new failures
