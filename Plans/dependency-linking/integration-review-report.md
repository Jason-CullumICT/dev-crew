# Integration Review Report: Dependency Linking in UI/API with Orchestrator Dispatch Gating

**Reviewer**: traceability-in-prs (TheATeam)
**Date**: 2026-03-30
**RISK_LEVEL**: high

---

## Executive Summary

The dependency-linking feature is **substantially complete and functional**. All core backend services, routes, database schema, frontend components, and dispatch gating logic are implemented. Backend tests pass (510/510). Frontend has 12 test failures, all **pre-existing** (not introduced by this feature). The feature branch fixed 3 pre-existing frontend failures.

---

## Verification Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Dependencies junction table with constraints/indexes | PASS | `schema.ts:209-229` — UNIQUE constraint, CHECK constraints, both indexes |
| Cycle detection (BFS) | PASS | `dependencyService.ts:160-205` — Correct BFS traversal |
| Self-reference prevention | PASS | `dependencyService.ts:30-32` — Checked in addDependency and setDependencies |
| PATCH accepts `blocked_by` array | PASS | Both `bugService.ts:280-282` and `featureRequestService.ts:319-321` |
| POST dependency endpoints (add/remove) | PASS | `bugs.ts:217-263`, `featureRequests.ts:296-342` |
| GET hydrates `blocked_by`, `blocks`, `has_unresolved_blockers` | PASS | `mapBugRow()` at `bugService.ts:63-66`, `mapFRRow()` in featureRequestService |
| Ready endpoint returns correct status | PASS | `bugs.ts:265-285`, `featureRequests.ts:344-364` |
| Dispatch gating: approved/in_development -> pending_dependencies when blocked | PASS | `bugService.ts:262-268`, `featureRequestService.ts:289-295`, also in `approveFeatureRequest:369-375` |
| Cascade: completed/resolved/closed -> auto-dispatch pending items | PASS | `bugService.ts:292-295`, `featureRequestService.ts:331-334` via `onItemCompleted()` |
| Detail views show DependencySection | PASS | Both `BugDetail.tsx` and `FeatureRequestDetail.tsx` render DependencySection |
| List views show BlockedBadge | PASS | Both `BugList.tsx` and `FeatureRequestList.tsx` render BlockedBadge |
| DependencyPicker modal | PASS | `DependencyPicker.tsx` with search, selection, cycle guard, save |
| Structured logging | PASS | All services and routes use `logger.info()` with structured data |
| Prometheus metrics | PASS | `metrics.ts` — dependencyOperations, dispatchGatingEvents, dependencyCheckDuration, cycleDetectionEvents |
| Traceability comments | PASS | All new code has `// Verifies: FR-dependency-*` comments |
| Search endpoint for picker | PASS | `routes/search.ts` mounted at `/api/search`, registered in `index.ts:67` |
| `pending_dependencies` in status transitions | PASS | `featureRequestService.ts:44` allows transition to `approved`, `duplicate`, `deprecated` |
| Deletion cascade for dependencies | PASS | `bugService.ts:305`, `featureRequestService.ts:344` clean up orphaned rows |
| POST create endpoints support blocked_by | PASS | `bugs.ts:49,66-76`, `featureRequests.ts:53,66` extract and pass blocked_by |
| Shared API types include blocked_by | PASS | `api.ts:38` (UpdateFeatureRequestInput), `api.ts:68` (UpdateBugInput) |

---

## Test Results

### Backend: 510/510 PASS
All 15 test files pass including:
- `dependencies.test.ts` — Dependency CRUD, cycle detection, readiness, cascade, bulk set, deletion cascade
- Integration tests for bug/FR services with dispatch gating

### Frontend: 207/219 PASS (12 failures — ALL PRE-EXISTING)
Pre-existing failures unrelated to this feature:
- `OrchestratorCycleCard.test.tsx` — Missing component file (import resolution error)
- `OrchestratorCycles.test.tsx` — Missing component file (import resolution error)
- `ImageUpload.test.tsx` (6) — Missing `repos` mock export, argument mismatches
- `Learnings.test.tsx` (2) — UI element text mismatch ("Filter" button not found)
- `Traceability.test.tsx` (4) — Missing `repos` mock export

**Feature branch fixed 3 pre-existing failures**: BugReports create, FeatureRequests create form + create.

**Conclusion**: Zero new test failures introduced by this feature.

---

## Findings

### LOW — Logger import inconsistency

**Location**: `portal/Backend/src/services/dependencyService.ts:10`

**Issue**: DependencyService imports `{ logger } from '../logger'` (named export from `src/logger.ts`) while routes and other services use `import logger from '../lib/logger'` (default export from `src/lib/logger.ts`). Both are valid pino loggers.

**Impact**: No runtime issue. Could diverge if one logger module is updated without the other.

**Recommendation**: Standardize on `../lib/logger` for consistency with the rest of the codebase.

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

Written to `Source/E2E/tests/cycle-run-1774898758617-158a8ab6/`:

1. `dependency-linking.spec.ts` (7 tests) — Bug/FR list pages, dependency section on detail views, picker modal, add/display deps, cross-type dependencies
2. `dependency-dispatch-gating.spec.ts` (9 tests) — Readiness endpoints, dispatch gating, auto-dispatch cascade, cycle prevention, self-reference rejection, PATCH bulk set, search, navigation

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

The feature is well-implemented, thoroughly tested, and compliant with the architecture rules. Two LOW findings and two INFO observations. Zero new test failures (3 pre-existing failures fixed). All dispatch plan requirements are met.
