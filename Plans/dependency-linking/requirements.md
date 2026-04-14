# Requirements: Dependency Tracking Between Bugs and Feature Requests

**Feature:** Allow a work item (bug or feature request) to declare it `depends_on` (is `blocked_by`) another item, with the orchestrator blocking dispatch/submission until all declared dependencies are resolved.

**Plan file:** `Plans/dependency-linking/dispatch-plan.md`
**Spec reference:** `Specifications/dev-workflow-platform.md` (FR-070 — FR-085)
**Status:** Partially implemented — see implementation delta below

---

## Functional Requirements

| ID | Description | Layer | Weight | Acceptance Criteria |
|----|-------------|-------|--------|---------------------|
| FR-dependency-types | Add `DependencyLink`, `DependencyItemType`, `RESOLVED_STATUSES`, `DISPATCH_TRIGGER_STATUSES`, `parseItemId`, `ReadyResponse`, `DependencyActionRequest` to `portal/Shared/types.ts`; add `pending_dependencies` to `BugStatus` and `FeatureRequestStatus` | [fullstack] | M | Types compile; both backend and frontend import from portal/Shared/; `pending_dependencies` accepted in all status-handling code |
| FR-dependency-api-types | Add `blocked_by?: string[]` to `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts`; remove `as any` casts in frontend DependencyPicker.tsx | [fullstack] | S | TypeScript compiles cleanly with no `as any` for dependency fields; PATCH body type-safe end-to-end |
| FR-dependency-schema | Add `dependencies` junction table to `portal/Backend/src/database/schema.ts`: columns `id`, `blocked_item_type`, `blocked_item_id`, `blocker_item_type`, `blocker_item_id`, `created_at`; unique constraint on `(blocked_item_type, blocked_item_id, blocker_item_type, blocker_item_id)`; two indexes for fast bidirectional lookup | [backend] | S | `dependencies` table exists on startup; migration is idempotent; indexes present |
| FR-dependency-service | Implement `DependencyService` in `portal/Backend/src/services/dependencyService.ts`: `addDependency` (self-ref check, item existence, cycle detection via BFS), `removeDependency`, `getBlockedBy`, `getBlocks`, `hasUnresolvedBlockers`, `isReady`, `detectCycle`, `onItemCompleted` (cascade auto-dispatch), `setDependencies` (bulk replace with per-link cycle detection) | [backend] | L | Each method behaves correctly; BFS rejects transitive cycles; bulk replace deletes removed links atomically; cascade triggers auto-dispatch of newly-unblocked items |
| FR-dependency-dispatch-gating | Modify `bugService` and `featureRequestService`: on status transition to `approved`/`in_development`, check all blockers; if any unresolved → set status to `pending_dependencies` instead; on status transition to `resolved`/`closed`/`completed`, call `dependencyService.onItemCompleted` to cascade-unblock dependents | [backend] | M | Status transition to approved with unresolved blockers → response status is `pending_dependencies`; resolving blocker → dependent auto-advances from `pending_dependencies` to `approved` |
| FR-dependency-endpoints | Add to bugs and feature-requests routes: `POST /api/{type}/:id/dependencies` (body: `{action, blocker_id}` → add or remove single link); `GET /api/{type}/:id/ready` (returns `{ready, unresolved_blockers}`); modify `GET` list to include `has_unresolved_blockers`; modify `GET` detail to include resolved `blocked_by[]` and `blocks[]`; modify `PATCH` to accept `blocked_by?: string[]` | [backend] | M | All five operations work; readiness endpoint returns correct state; list includes blocker flag; detail includes resolved dependency arrays with title and status |
| FR-dependency-search | Implement `GET /api/search?q=` cross-entity search endpoint returning matching bugs and feature requests; used by DependencyPicker typeahead | [backend] | S | `?q=keyword` returns items from both entities matching title/description; empty query returns empty; response is `{data: [...]}` |
| FR-dependency-metrics | Add Prometheus counters/histograms to `portal/Backend/src/metrics.ts`: `dependencyOperations` (labels: operation, item_type), `dispatchGatingEvents` (labels: result), `dependencyCheckDuration` histogram, `cycleDetectionEvents` (labels: result) | [backend] | S | All four metrics visible at `GET /metrics`; labels correct |
| FR-dependency-seed | Create `portal/Backend/src/database/seed.ts`: idempotent seeding function that inserts the 4 known dependency relationships after the main seed data — BUG-0010 blocked_by BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003; called on server startup if seed items exist | [backend] | S | Running the server twice does not duplicate seed records; `GET /api/bugs/BUG-0010` returns 5 items in `blocked_by`; named FRs show correct blockers |
| FR-dependency-backend-tests | Tests in `portal/Backend/tests/dependencies.test.ts`: add/remove single link; cross-type dependency (bug→FR, FR→bug); circular dependency rejection (409); bulk set via PATCH; self-referential rejection; readiness endpoint (ready/not ready); dispatch gating (→ pending_dependencies); cascade auto-dispatch; non-existent item returns 404; seed data present after fresh DB setup | [backend] | M | All test cases pass; each carries `// Verifies: FR-dependency-*` comment |
| FR-dependency-api-client | Add to `portal/Frontend/src/api/client.ts`: `addDependency(itemType, itemId, blockerId)`, `removeDependency(itemType, itemId, blockerId)`, `setDependencies(itemType, itemId, blockerIds[])`, `checkReady(itemType, itemId)`, `searchItems(query)` | [frontend] | S | Typed functions cover all dependency API endpoints; consistent error handling; no untyped `fetch` calls |
| FR-dependency-blocked-badge | Implement `BlockedBadge` component (`portal/Frontend/src/components/shared/BlockedBadge.tsx`): red badge labelled "Blocked" when `hasUnresolvedBlockers=true`; amber badge labelled "Pending Dependencies" when `status='pending_dependencies'`; renders nothing otherwise | [frontend] | S | Badge renders correct color and text for each state; no badge for resolved/clean items |
| FR-dependency-section | Implement `DependencySection` component (`portal/Frontend/src/components/shared/DependencySection.tsx`): "Blocked By" and "Blocks" subsections; clickable chips showing `[ID] Title — Status`; status-colored badge per chip; "Edit Dependencies" button when `editable=true` opens DependencyPicker; unresolved blockers highlighted prominently when status=`pending_dependencies` | [frontend] | M | Both subsections render; chip click navigates to item detail; edit button opens picker; pending state highlights correct chips |
| FR-dependency-picker | Implement `DependencyPicker` modal (`portal/Frontend/src/components/shared/DependencyPicker.tsx`): search input with typeahead via `searchItems`; results show ID/title/type badge/status; selected items as removable chips; "Save" calls PATCH `blocked_by`; client-side guard warns on direct circular dependency (A→B when B already blocks A) | [frontend] | L | Modal opens; search returns results; selecting/removing chips updates state; save calls correct API; direct-cycle warning fires correctly |
| FR-dependency-integration | Integrate `DependencySection` into `BugDetail` and `FeatureRequestDetail` (below description); integrate `BlockedBadge` into `BugList` and `FeatureRequestList` rows | [frontend] | S | Dependency section visible on detail pages; blocked badge visible per row in list views |
| FR-dependency-frontend-tests | Test files: `portal/Frontend/tests/DependencySection.test.tsx` (renders blocked-by/blocks sections; chip shows status badge; edit opens picker; highlights unresolved); `portal/Frontend/tests/BlockedBadge.test.tsx` (red badge for blocked; amber for pending; renders nothing when clean) | [frontend] | M | Both test files pass; each test carries `// Verifies: FR-dependency-section` or `FR-dependency-blocked-badge` comment |

---

## Implementation Delta (Current State)

| FR ID | Status | Notes |
|-------|--------|-------|
| FR-dependency-types | ✅ Done | portal/Shared/types.ts fully updated |
| FR-dependency-api-types | ❌ Missing | `UpdateBugInput` and `UpdateFeatureRequestInput` lack `blocked_by`; frontend uses `as any` cast |
| FR-dependency-schema | ✅ Done | dependencies table + indexes in schema.ts |
| FR-dependency-service | ✅ Done | dependencyService.ts, 335 lines, all methods present |
| FR-dependency-dispatch-gating | ✅ Done | bugService and featureRequestService integrated |
| FR-dependency-endpoints | ✅ Done | bugs.ts and featureRequests.ts both updated |
| FR-dependency-search | ✅ Done | portal/Backend/src/routes/search.ts exists |
| FR-dependency-metrics | ✅ Done | portal/Backend/src/metrics.ts has all 4 metrics |
| FR-dependency-seed | ❌ Missing | No seed.ts file exists in portal/Backend/src/database/ |
| FR-dependency-backend-tests | ✅ Done | dependencies.test.ts, 401 lines |
| FR-dependency-api-client | ✅ Done | portal/Frontend/src/api/client.ts updated |
| FR-dependency-blocked-badge | ✅ Done | BlockedBadge.tsx, 70 lines |
| FR-dependency-section | ✅ Done | DependencySection.tsx, 226 lines |
| FR-dependency-picker | ✅ Done | DependencyPicker.tsx, 432 lines |
| FR-dependency-integration | ✅ Done | All 4 integration points confirmed |
| FR-dependency-frontend-tests | ❌ Missing | DependencySection.test.tsx and BlockedBadge.test.tsx do not exist; DependencyPicker.test.tsx exists (321 lines) |

---

## Scoping Plan

**Remaining backend work:** FR-dependency-api-types [S] + FR-dependency-seed [S] = **2 pts → 1 backend coder**

**Remaining frontend work:** FR-dependency-frontend-tests [M] = **2 pts → 1 frontend coder**

### Assignment

- **Backend Coder 1:** FR-dependency-api-types [S], FR-dependency-seed [S] — 2 pts
  - Add `blocked_by?: string[]` to `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts`
  - Remove `as any` cast in `portal/Frontend/src/components/shared/DependencyPicker.tsx` (line ~291/293)
  - Create `portal/Backend/src/database/seed.ts` with idempotent dependency seeding; wire into `portal/Backend/src/index.ts` startup

- **Frontend Coder 1:** FR-dependency-frontend-tests [M] — 2 pts
  - Create `portal/Frontend/tests/DependencySection.test.tsx`: test blocked-by section renders, blocks section renders, chip click navigates, edit button opens picker, unresolved blockers highlighted when status=pending_dependencies
  - Create `portal/Frontend/tests/BlockedBadge.test.tsx`: test red badge for has_unresolved_blockers=true, amber badge for status=pending_dependencies, no badge for clean/resolved items
  - Each test must carry `// Verifies: FR-dependency-section` or `// Verifies: FR-dependency-blocked-badge` traceability comment
