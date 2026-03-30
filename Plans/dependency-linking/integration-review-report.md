# Integration Review Report: Dependency Linking in UI/API with Orchestrator Dispatch Gating

**Reviewer**: integration (TheATeam)
**Date**: 2026-03-30
**RISK_LEVEL**: high

---

## Executive Summary

The dependency-linking feature is **substantially complete and functional**. All core backend services, routes, database schema, frontend components, and dispatch gating logic are implemented. Backend tests pass (508/508). Frontend has 15 test failures, all **pre-existing** (not introduced by this feature).

---

## Verification Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Dependencies junction table with constraints/indexes | PASS | `schema.ts:210-229` — UNIQUE constraint, CHECK constraints, both indexes |
| Cycle detection (BFS) | PASS | `dependencyService.ts:160-205` — Correct BFS traversal |
| Self-reference prevention | PASS | `dependencyService.ts:30-31` — Checked in addDependency and setDependencies |
| PATCH accepts `blocked_by` array | PASS | Both `bugService.ts:280-282` and `featureRequestService.ts:319-321` |
| POST dependency endpoints (add/remove) | PASS | `bugs.ts:214-260`, `featureRequests.ts` mirror |
| GET hydrates `blocked_by`, `blocks`, `has_unresolved_blockers` | PASS | `mapBugRow()` at `bugService.ts:63-65`, `mapFRRow()` in featureRequestService |
| Ready endpoint returns correct status | PASS | `bugs.ts:262-282`, `featureRequests.ts` mirror |
| Dispatch gating: approved/in_development → pending_dependencies when blocked | PASS | `bugService.ts:262-268`, `featureRequestService.ts:289-295`, also in `approveFeatureRequest:369-373` |
| Cascade: completed/resolved/closed → auto-dispatch pending items | PASS | `bugService.ts:292-295`, `featureRequestService.ts:332-334` → `onItemCompleted()` |
| Detail views show DependencySection | PASS | Both `BugDetail.tsx` and `FeatureRequestDetail.tsx` render DependencySection |
| List views show BlockedBadge | PASS | Both `BugList.tsx` and `FeatureRequestList.tsx` render BlockedBadge |
| DependencyPicker modal | PASS | `DependencyPicker.tsx` with search, selection, cycle guard, save |
| Structured logging | PASS | All services and routes use `logger.info()` with structured data |
| Prometheus metrics | PASS | `metrics.ts` — dependencyOperations, dispatchGatingEvents, dependencyCheckDuration, cycleDetectionEvents |
| Traceability comments | PASS | All new code has `// Verifies: FR-dependency-*` comments |
| Search endpoint for picker | PASS | `routes/search.ts` mounted at `/api/search`, registered in `index.ts:67` |
| `pending_dependencies` in status transitions | PASS | `featureRequestService.ts:44` allows transition to `approved`, `duplicate`, `deprecated` |

---

## Test Results

### Backend: 508/508 PASS
All 15 test files pass including:
- `dependencies.test.ts` — Dependency CRUD, cycle detection, readiness, cascade, bulk set
- `bugs.test.ts` — Dependency endpoints, dispatch gating (lines 601-670)
- `featureRequests.test.ts` — Dependency endpoints, dispatch gating (lines 876-1029)

### Frontend: 188/203 PASS (15 failures — ALL PRE-EXISTING)
Pre-existing failures unrelated to this feature:
- `OrchestratorCycleCard.test.tsx` — Missing component file (import resolution error)
- `OrchestratorCycles.test.tsx` — Missing component file (import resolution error)
- `BugReports.test.tsx` (1) — Create bug argument mismatch (target_repo field)
- `FeatureRequests.test.tsx` (2) — Missing `repos` mock export
- `ImageUpload.test.tsx` (4) — Missing `repos` mock export, argument mismatches
- `Learnings.test.tsx` (2) — UI element text mismatch ("Filter" button not found)
- `Traceability.test.tsx` (4) — Missing `repos` mock export

**Conclusion**: Zero new test failures introduced by this feature.

---

## Findings

### MEDIUM — Missing `blocked_by` in shared API input types

**Location**: `portal/Shared/api.ts:32-38` (`UpdateFeatureRequestInput`), `portal/Shared/api.ts:59-67` (`UpdateBugInput`)

**Issue**: The shared API input types `UpdateBugInput` and `UpdateFeatureRequestInput` in `api.ts` do not include the `blocked_by?: string[]` field, even though the backend service types do include it. The frontend DependencyPicker works around this with `as any` casts (`DependencyPicker.tsx:291,293`).

**Impact**: Type safety gap between frontend API client and backend. No runtime impact since `as any` bypasses checking, but defeats TypeScript's compile-time validation.

**Recommendation**: Add `blocked_by?: string[];` to both `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts` and remove the `as any` casts in DependencyPicker.

---

### LOW — POST create endpoints don't pass `blocked_by`

**Location**: `portal/Backend/src/routes/bugs.ts:48`, `portal/Backend/src/routes/featureRequests.ts:52`

**Issue**: The POST create route handlers destructure the request body but don't extract or pass `blocked_by` to the create service functions, even though the service functions support it (`createBug` at `bugService.ts:160-163`, `createFeatureRequest` at `featureRequestService.ts:236-239`).

**Impact**: Cannot set dependencies at creation time via POST. Users must create first, then PATCH or use the POST dependencies endpoint. This is a minor gap since the dispatch plan's API contract only specifies `blocked_by` on PATCH, not POST.

**Recommendation**: Consider adding `blocked_by` extraction to POST routes if this is a desired flow.

---

### LOW — Unused individual dependency API methods in frontend client

**Location**: `portal/Frontend/src/api/client.ts` — `bugs.addDependency()`, `bugs.removeDependency()`, `featureRequests.addDependency()`, `featureRequests.removeDependency()`

**Issue**: These methods exist but the UI exclusively uses the PATCH-based bulk approach via `update()` with `{ blocked_by: [...] }`. The individual add/remove methods are not called anywhere in the frontend.

**Impact**: Dead code. No runtime issue.

**Recommendation**: Either remove these methods or document them for future use. Low priority.

---

### INFO — Performance consideration on list endpoints

**Location**: `bugService.ts:38-67` (`mapBugRow`), equivalent in featureRequestService

**Issue**: Every call to `mapBugRow()` makes 3 additional DB queries (getBlockedBy, getBlocks, hasUnresolvedBlockers) per item. On list endpoints returning N items, this results in 3N additional queries.

**Impact**: Acceptable for current scale. Could become a bottleneck with large datasets.

**Recommendation**: Consider a batch query approach if list performance degrades. No action needed now.

---

### INFO — Dispatch plan compliance

All dispatch plan requirements are met:
- **backend-coder-1 scope**: Types, schema, DependencyService — all implemented correctly
- **backend-coder-2 scope**: Routes, dispatch gating, cascade — all implemented correctly
- **frontend-coder-1 scope**: DependencySection, DependencyPicker, BlockedBadge, detail/list integration — all implemented correctly
- **API contract**: All new and modified endpoints match the contract specification

---

## E2E Tests

Written:
1. `dependency-linking.spec.ts` (pre-existing, 11 tests) — Core dependency CRUD, UI sections, picker modal, cycle detection, cross-type deps, search, readiness
2. `dependency-dispatch-gating.spec.ts` (new, 10 tests) — Dispatch gating, pending_dependencies status, PATCH blocked_by, dependency removal, self-reference rejection, FR dependency endpoints, console error checks

---

## Security Review

| Check | Status | Notes |
|-------|--------|-------|
| SQL injection | PASS | All queries use parameterized statements |
| Input validation | PASS | `parseItemId` validates format, `AppError(400)` for invalid inputs |
| Authorization | N/A | No auth layer in portal (consistent with existing endpoints) |
| Error leakage | PASS | `DependencyError` returns safe messages, no stack traces |
| Denial of service | LOW RISK | BFS cycle detection is bounded by graph size; no limit on dependency count per item |

---

## Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| No direct DB calls from routes | PASS | Routes delegate to services |
| Shared types are single source | PASS | Types defined in `Shared/types.ts` |
| FR needs test with traceability | PASS | All test files have `// Verifies:` comments |
| No hardcoded secrets | PASS | No secrets involved |
| List endpoints return `{data: T[]}` | PASS | Search endpoint returns `{ data: [...] }` |
| New routes have observability | PASS | Structured logging + metrics + tracing spans |
| Business logic has no framework imports | PASS | DependencyService is pure logic |

---

## Verdict

**APPROVED with minor recommendations**

The feature is well-implemented, thoroughly tested, and compliant with the architecture rules. The three findings (MEDIUM + 2 LOW) are non-blocking quality improvements. Zero new test failures. All dispatch plan requirements are met.
