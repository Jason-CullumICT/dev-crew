# Integration Report: Dependency Linking in UI/API with Orchestrator Dispatch Gating

**Role:** integration
**Team:** TheATeam
**Date:** 2026-03-30
**RISK_LEVEL: high**

---

## Executive Summary

The dependency linking feature has been implemented across the full stack (shared types, backend API, frontend UI) and passes all 52 backend unit/integration tests with zero TypeScript compilation errors. The implementation closely follows the dispatch plan. Several findings are documented below ranging from INFO to MEDIUM severity.

---

## Test Results

### Backend Tests
- **52 tests passed, 0 failed**
- Test file: `portal/Backend/src/__tests__/dependencies.test.ts`
- Coverage areas:
  - DependencyService CRUD (add, remove, bulk set)
  - Circular dependency detection (direct + transitive)
  - Readiness checks
  - Dispatch gating (status → pending_dependencies when blockers exist)
  - Auto-dispatch cascade on blocker completion
  - API endpoint integration tests (all routes)
  - Seed data verification

### TypeScript Compilation
- `tsc --noEmit`: **passed with no errors**

### Traceability Enforcer
- `tools/traceability-enforcer.py`: **not available** (file does not exist in repository)

---

## Specification Compliance

### Shared Types (`portal/Shared/types.ts`) — PASS
- [x] `BugStatus` includes `pending_dependencies`
- [x] `FeatureRequestStatus` includes `pending_dependencies`
- [x] `DependencyLink` interface with `item_type`, `item_id`, `title`, `status`
- [x] `DependencyItemType` type alias
- [x] `AddDependencyRequest` and `RemoveDependencyRequest` types
- [x] `ReadyResponse` interface
- [x] `RESOLVED_STATUSES` constant (`completed`, `resolved`, `closed`)
- [x] `DISPATCH_TRIGGER_STATUSES` constant (`approved`, `in_development`)
- [x] `parseItemId()` helper function
- [x] `Bug` and `FeatureRequest` include `blocked_by`, `blocks`, `has_unresolved_blockers`

### Database Schema (`portal/Backend/src/database/schema.ts`) — PASS
- [x] `dependencies` junction table with correct columns
- [x] `UNIQUE` constraint on `(blocked_item_type, blocked_item_id, blocker_item_type, blocker_item_id)`
- [x] Indexes for `blocked` and `blocker` lookups
- [x] `pending_dependencies` in both bugs and feature_requests CHECK constraints

### Dependency Service (`portal/Backend/src/services/dependencyService.ts`) — PASS
- [x] `addDependency` with self-ref check + cycle detection + existence validation
- [x] `removeDependency` (idempotent)
- [x] `getBlockedBy` / `getBlocks` with resolved titles and statuses
- [x] `hasUnresolvedBlockers`
- [x] `isReady` returning `ReadyResponse`
- [x] `detectCycle` via BFS
- [x] `onItemCompleted` cascade dispatch
- [x] `setDependencies` bulk set with transaction + cycle detection per entry

### Bug Routes (`portal/Backend/src/routes/bugs.ts`) — PASS
- [x] `GET /api/bugs` with `has_unresolved_blockers` and search support
- [x] `GET /api/bugs/:id` with `blocked_by` and `blocks`
- [x] `PATCH /api/bugs/:id` accepts `blocked_by` array + dispatch gating
- [x] `POST /api/bugs/:id/dependencies` (add/remove)
- [x] `GET /api/bugs/:id/ready`

### Feature Request Routes (`portal/Backend/src/routes/featureRequests.ts`) — PASS
- [x] Same endpoint set as bugs, adapted for feature requests

### Bug/FR Services — PASS
- [x] `updateBug` / `updateFeatureRequest` dispatch gating on status transition
- [x] Cascade `onItemCompleted` on completion
- [x] `enrichBug` / `enrichFeatureRequest` adds dependency fields to all responses

### API Client (`portal/Shared/api.ts`) — PASS
- [x] `addDependency`, `removeDependency`, `setDependencies`, `checkReady`
- [x] `searchItems` for dependency picker
- [x] Proper URL encoding with `encodeURIComponent`

### Frontend Components — PASS
- [x] `BlockedBadge` — Red "Blocked" / Amber "Pending Dependencies"
- [x] `DependencySection` — Blocked By / Blocks with chips, edit button, pending warning
- [x] `DependencyPicker` — Modal with debounced search, circular dependency guard, save/cancel
- [x] `BugDetail` + `BugList` — Integrates `DependencySection` and `BlockedBadge`
- [x] `FeatureRequestDetail` + `FeatureRequestList` — Same integrations

### Seed Data (`portal/Backend/src/app.ts#seedDependencies`) — PASS
- [x] BUG-0010 blocked_by BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007
- [x] FR-0004 blocked_by FR-0003
- [x] FR-0005 blocked_by FR-0002
- [x] FR-0007 blocked_by FR-0003

---

## Findings

### MEDIUM-001: SQL Table Name Interpolation in Services
**Severity:** MEDIUM
**Location:** `portal/Backend/src/services/dependencyService.ts:232,311,319`; `portal/Backend/src/services/bugService.ts`; `portal/Backend/src/services/featureRequestService.ts`
**Description:** The `table` variable is derived from `DependencyItemType` ('bug' | 'feature_request') and used in template literal SQL queries (e.g., `` `UPDATE ${table} SET ...` ``). While the type system restricts this to two known values and user input is validated through `parseItemId()`, direct string interpolation into SQL is a code smell that could become a vulnerability if the type is later widened without careful review.
**Risk:** Low in practice (TypeScript type narrowing prevents injection), but violates defense-in-depth.
**Recommendation:** Consider using a map lookup (`const TABLE_MAP = { bug: 'bugs', feature_request: 'feature_requests' }`) to statically resolve table names rather than deriving them at the point of query construction.

### MEDIUM-002: No Input Validation on PATCH Request Body
**Severity:** MEDIUM
**Location:** `portal/Backend/src/routes/bugs.ts:47`, `portal/Backend/src/routes/featureRequests.ts:47`
**Description:** The `PATCH /:id` routes pass `req.body` directly to the service layer without schema validation. While the service layer does validate `blocked_by` IDs and the database has CHECK constraints on status/severity, unexpected fields in the body are silently ignored. This could lead to confusion or maintenance issues.
**Recommendation:** Add input validation middleware (e.g., zod or joi schema) to validate PATCH request bodies at the route level.

### LOW-001: `enrichBug`/`enrichFeatureRequest` Makes N+1 Queries
**Severity:** LOW
**Location:** `portal/Backend/src/services/bugService.ts:enrichBug`, `portal/Backend/src/services/featureRequestService.ts:enrichFeatureRequest`
**Description:** When listing bugs/FRs, each item triggers 3 additional queries (`getBlockedBy`, `getBlocks`, `hasUnresolvedBlockers`). For a list of N items, this is 3N+1 queries. Acceptable for small datasets but may need optimization if the item count grows.
**Recommendation:** For future scaling, consider batch-fetching dependencies in a single query for list endpoints.

### LOW-002: DependencyPicker Circular Dependency Check is Client-Side Only (Direct)
**Severity:** LOW
**Location:** `portal/Frontend/src/components/shared/DependencyPicker.tsx:32-38`
**Description:** The `wouldCreateDirectCycle` function only checks direct cycles (A blocks B, trying to add B blocks A). Transitive cycles (A→B→C, adding C→A) are only caught server-side (409 response). The client-side check is a UX optimization, not a full guard.
**Mitigation:** The server-side BFS cycle detection is comprehensive and will reject transitive cycles. This is by design per the dispatch plan ("Client-side guard: warn if adding a dependency that would create an obvious direct cycle").

### LOW-003: `onItemCompleted` Sets Status to 'approved' Regardless of Original Target
**Severity:** LOW
**Location:** `portal/Backend/src/services/dependencyService.ts:232`
**Description:** When auto-dispatching items from `pending_dependencies`, the status is always set to `approved`. If the original transition was to `in_development`, the intended status is lost. The dispatch plan says "auto-dispatch to orchestrator and update status to `approved` / `in_development`" — but the current implementation always uses `approved`.
**Recommendation:** Consider storing the intended target status when gating, so auto-dispatch can restore it.

### INFO-001: No Frontend App Shell or Router
**Severity:** INFO
**Location:** `portal/Frontend/src/`
**Description:** No `App.tsx`, `main.tsx`, `index.html`, or router configuration exists. Components exist but there is no application shell wiring them together. Links use `<a href>` elements rather than client-side navigation. This means the frontend components are ready but not yet integrated into a running SPA.
**Impact:** E2E tests will require the frontend to be served and routed. API E2E tests can run against the backend directly.

### INFO-002: Metrics and Logging are Comprehensive
**Severity:** INFO
**Description:** Good observability coverage with Prometheus counters/histograms for dependency operations, dispatch gating events, cycle detection, and dependency check duration. Structured logging via pino is consistent throughout.

### INFO-003: Traceability Comments Present
**Severity:** INFO
**Description:** All files contain `// Verifies: FR-dependency-linking` or `// Verifies: FR-0001` comments linking code to feature requirements. This supports traceability requirements.

---

## E2E Tests Written

Test files at `Source/E2E/tests/cycle-run-1774837896408-a447c19c/`:

1. **dependency-linking-bugs.spec.ts** (10 tests)
   - Bug list page rendering and table structure
   - Blocked badge visibility
   - Bug detail navigation
   - Dependency section display
   - Edit dependencies button
   - Dependency picker modal open/close
   - Console error checks

2. **dependency-linking-feature-requests.spec.ts** (11 tests)
   - Feature request list page rendering
   - Blocked badge visibility
   - FR detail navigation
   - Dependency section display
   - Dependency picker modal
   - Known dependency chip verification (FR-0004 → FR-0003)
   - Console error checks

3. **dependency-linking-api.spec.ts** (10 tests)
   - API response structure validation
   - Dependency fields presence
   - Readiness endpoint
   - Input validation (invalid format, missing fields)
   - Search query support
   - DependencyLink field validation

4. **dependency-dispatch-gating.spec.ts** (5 tests)
   - Dispatch gating on approval with unresolved blockers
   - Approval pass-through when no blockers
   - Pending dependencies UI display
   - Readiness consistency check
   - Dependency chip click navigation

All E2E tests use **relative URLs** (no hardcoded localhost).

---

## Architecture Assessment

The implementation follows a clean layered architecture:
- **Shared types** used by both frontend and backend (no duplication)
- **Service layer** encapsulates business logic (dependency CRUD, gating, cascade)
- **Route layer** handles HTTP concerns (validation, error mapping)
- **Frontend components** are properly decomposed (shared components reused by bugs and feature requests)

The dependency junction table design correctly supports cross-type relationships (bug↔bug, bug↔FR, FR↔FR) with appropriate indexes.

---

## Conclusion

The implementation is **substantially complete** and aligned with the dispatch plan specification. All backend tests pass. The main gaps are:
1. No frontend app shell/router (INFO — components exist but no SPA wiring)
2. Body validation at the route level (MEDIUM — defense-in-depth)
3. Auto-dispatch always sets `approved` rather than restoring intended status (LOW)

**Verdict:** Ready for merge with noted findings. No CRITICAL or blocking issues found.
