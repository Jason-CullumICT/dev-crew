# Requirements: Dependency Tracking Between Bugs and Feature Requests

**Feature:** Dependency tracking between bugs and feature requests in the orchestrator — allow a work item to declare it `depends_on` another item, blocking submission until dependencies are complete.

**Reviewer verdict:** APPROVED (remaining gaps only — core feature is ~90% implemented)

---

## Implementation Status

The following are **already fully implemented** in `portal/` and require no new work:

| Component | Status | Notes |
|-----------|--------|-------|
| `portal/Shared/types.ts` — DependencyLink, AddDependencyRequest, ReadyResponse, `pending_dependencies` status, `blocked_by`/`blocks`/`has_unresolved_blockers` fields | ✅ Done | Verifies: FR-dependency-linking |
| `portal/Backend/src/database/schema.ts` — `dependencies` junction table, indexes | ✅ Done | Verifies: FR-dependency-linking |
| `portal/Backend/src/services/dependencyService.ts` — CRUD, cycle detection, readiness check, cascade dispatch | ✅ Done | Verifies: FR-dependency-linking, FR-dependency-ready-check, FR-dependency-dispatch-gating |
| Bug & FR routes — POST /dependencies, GET /ready, dispatch gating on PATCH | ✅ Done | Verifies: FR-dependency-linking |
| Bug & FR services — dispatch gating on status transition, cascade on completion | ✅ Done | Verifies: FR-dependency-dispatch-gating |
| Cycle service — naturally excludes `pending_dependencies` items | ✅ Done | Selection query only picks `triaged`/`approved` |
| Frontend API client — addDependency, removeDependency, checkReady | ✅ Done | portal/Frontend/src/api/client.ts |
| Frontend components — BlockedBadge, DependencySection, DependencyPicker | ✅ Done | portal/Frontend/src/components/shared/ |
| BugDetail, FeatureRequestDetail — DependencySection integrated | ✅ Done | |
| BugList, FeatureRequestList — BlockedBadge integrated | ✅ Done | |
| Prometheus metrics — dependencyOperations, dispatchGatingEvents, checkDuration, cycleDetection | ✅ Done | portal/Backend/src/metrics.ts |
| Backend tests — dependencies.test.ts (401 lines) | ✅ Done | CRUD, cycle detection, gating, cascade |
| Frontend tests — DependencyPicker.test.tsx (321 lines) | ✅ Done | Modal, search, save, circular guard |

---

## Functional Requirements (Remaining Gaps)

| ID | Description | Layer | Weight | Acceptance Criteria |
|----|-------------|-------|--------|---------------------|
| FR-096 | Seed known dependency relationships into the database during `runMigrations()` in `portal/Backend/src/database/schema.ts`. Relationships: BUG-0010 blocked_by BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003. Seeding must be idempotent (use INSERT OR IGNORE). | [backend] | S | After `runMigrations()` on a fresh DB, querying `GET /api/bugs/BUG-0010` returns `blocked_by` array with 5 entries; `GET /api/feature-requests/FR-0004` returns `blocked_by: [{item_id: "FR-0003", ...}]`; re-running migrations does not duplicate or error |
| FR-097 | Add `blocked_by?: string[]` to `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts`. These string arrays contain item IDs (e.g., `["BUG-0003", "FR-0001"]`) that match the `blocked_by` field accepted by PATCH `/api/bugs/:id` and PATCH `/api/feature-requests/:id`. | [fullstack] | S | TypeScript compiles without error; PATCH payload with `blocked_by: ["BUG-0003"]` is correctly typed in both backend route handler and frontend API client |
| FR-098 | Write a `DependencySection.test.tsx` test file in `portal/Frontend/tests/` covering: renders "Blocked By" and "Blocks" chip lists; each chip shows item ID, title, status badge; clicking a chip navigates to the correct detail route; when `editable=true`, "Edit Dependencies" button is visible and opens DependencyPicker; when `editable=false`, button is hidden; when status is `pending_dependencies`, unresolved blockers are highlighted; empty arrays render gracefully with no chips or a fallback message. All tests carry `// Verifies: FR-098`. | [frontend] | M | Test file passes; all 7+ test cases green; mocked API/router calls verified |
| FR-099 | Extend `portal/Frontend/tests/BugReports.test.tsx` and `portal/Frontend/tests/FeatureRequests.test.tsx` with dependency-related cases: (a) a list item with `has_unresolved_blockers: true` renders the red "Blocked" badge from `BlockedBadge`; (b) a list item with `status: 'pending_dependencies'` renders the amber "Pending Dependencies" badge. Add the required mock fields to fixture data. All new tests carry `// Verifies: FR-099`. | [frontend] | S | 2+ new test cases added per file (4 total); all pass; no regressions in existing tests |

---

## Scoping Plan

```
Backend:  FR-096 [S=1] + FR-097 [S=1] = 2 pts  →  1 backend coder
Frontend: FR-098 [M=2] + FR-099 [S=1] = 3 pts  →  1 frontend coder
Total:    5 pts  across  2 coders
```

---

## Assignment

### Backend Coder 1 — FR-096 [S], FR-097 [S] (2 pts)

**Task:** Seed known dependency data; add `blocked_by` fields to shared API types.

**Work items:**

1. **`portal/Backend/src/database/schema.ts`** — In `runMigrations()`, after the `dependencies` table creation, insert the known seed rows using `INSERT OR IGNORE INTO dependencies`. Seed:
   - BUG-0010 blocked_by BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007
   - FR-0004 blocked_by FR-0003
   - FR-0005 blocked_by FR-0002
   - FR-0007 blocked_by FR-0003

   Each row: `(blocked_item_type, blocked_item_id, blocker_item_type, blocker_item_id)`.
   Use `INSERT OR IGNORE` for idempotency.

2. **`portal/Shared/api.ts`** — Add `blocked_by?: string[]` to both `UpdateBugInput` (after `source_system?: string`) and `UpdateFeatureRequestInput` (after `priority?: string`). Add comment `// Verifies: FR-097`.

**Files to modify:**
- `portal/Backend/src/database/schema.ts`
- `portal/Shared/api.ts`

**Tests:** No new test file needed — the existing `portal/Backend/tests/dependencies.test.ts` already tests idempotency and seeded data. Confirm existing tests still pass after schema change. Add `// Verifies: FR-096` comment above the seed INSERT block.

---

### Frontend Coder 1 — FR-098 [M], FR-099 [S] (3 pts)

**Task:** Write DependencySection component tests; extend list-view tests with dependency badge coverage.

**Work items:**

1. **`portal/Frontend/tests/DependencySection.test.tsx`** (new file) — Test the `DependencySection` component. Mock `portal/Frontend/src/api/client.ts`. Test cases:
   - Renders "Blocked By" section with chip per entry in `blockedBy` prop
   - Renders "Blocks" section with chip per entry in `blocks` prop
   - Each chip shows `[ITEM-ID] Title — status badge`
   - Clicking a chip triggers navigation (use `MemoryRouter`)
   - `editable=true` shows "Edit Dependencies" button
   - `editable=false` hides edit button
   - Empty `blockedBy` and `blocks` arrays render without crash (no chips shown)
   - When `pendingDependencies` prop/context indicates unresolved state, unresolved blockers are visually highlighted (check for highlight class or aria-label)

2. **`portal/Frontend/tests/BugReports.test.tsx`** — In the existing `describe('BugReportsPage')`, add a mock bug with `has_unresolved_blockers: true` to the fixture list. Add test: "shows Blocked badge for bugs with unresolved blockers". Also add a mock bug with `status: 'pending_dependencies'` and test that the amber badge renders.

3. **`portal/Frontend/tests/FeatureRequests.test.tsx`** — Same additions as BugReports.test.tsx, adapted for FeatureRequest fixtures.

**All test comments:** Each new test block must include `// Verifies: FR-098` or `// Verifies: FR-099` as applicable.

**Files to create/modify:**
- `portal/Frontend/tests/DependencySection.test.tsx` (new)
- `portal/Frontend/tests/BugReports.test.tsx` (extend)
- `portal/Frontend/tests/FeatureRequests.test.tsx` (extend)

**Prerequisite:** No dependency on backend coder for these test changes. Frontend components are already implemented.

---

## Architecture Compliance Notes

- **No direct DB calls from routes** — ✅ already enforced; dependency data flows through `DependencyService`
- **Shared types in portal/Shared/** — ✅ types.ts is canonical; api.ts update (FR-097) is additive
- **List endpoints return `{data: T[]}`** — ✅ already enforced
- **No `console.log`** — ✅ uses structured logger
- **Cycle service dispatch gating** — ✅ `pending_dependencies` items are naturally excluded from cycle creation because cycle service selects only `triaged` bugs and `approved` FRs

## Traceability Notes

- Code in `portal/` is NOT scanned by `tools/traceability-enforcer.py` (enforcer only checks `Source/` and `E2E/`).
- All new code must still include `// Verifies: FR-XXX` comments per project convention.
- Existing dependency code uses informal IDs (`FR-dependency-linking`, `FR-dependency-ready-check`, `FR-dependency-dispatch-gating`) — these remain as-is in the existing implementation.
