# Audit Report: Dependency Linking in UI/API with Orchestrator Dispatch Gating

**Auditor:** TheInspector
**Date:** 2026-03-30
**Team:** TheATeam
**Feature:** Dependency linking in UI/API with orchestrator dispatch gating

---

## Executive Summary

The implementation is **complete and functional** across all layers (shared types, backend services/routes/metrics, frontend components/API client, dispatch gating with cascade). Backend tests pass fully (536/536). Frontend has 21 pre-existing failures (all from missing `repos` mock and unrelated component issues) with **zero new failures** introduced by this feature. Two **MEDIUM** findings and three **LOW** findings were identified. No CRITICAL issues.

**Verdict:** PASS WITH RECOMMENDATIONS (2 medium, 3 low)

---

## Spec Compliance Matrix

| Req ID | Requirement | Status | Notes |
|--------|-------------|--------|-------|
| FR-dependency-types | Shared types (`blocked_by`, `blocks`, `has_unresolved_blockers`), `pending_dependencies` status, `RESOLVED_STATUSES`, `DISPATCH_TRIGGER_STATUSES` constants | PASS | `Shared/types.ts` lines 7-74 — all types, enums, constants, and `parseItemId` helper present |
| FR-dependency-schema | `dependencies` junction table with UNIQUE constraint, CHECK constraints, two indexes | PASS | `schema.ts:209-229` — correct schema with `idx_dependencies_blocked` and `idx_dependencies_blocker` |
| FR-dependency-service | DependencyService: add/remove, BFS cycle detection, readiness, cascade dispatch, bulk-set | PASS | `dependencyService.ts` — 9 methods, custom `DependencyError` class, transaction support in `setDependencies` |
| FR-dependency-routes | POST dependencies, GET ready, PATCH `blocked_by`, GET hydration for both bugs and FRs | PASS | `bugs.ts:215-282`, `featureRequests.ts:295-363` — all endpoints present with validation |
| FR-dependency-detail-ui | DependencySection with blocked-by chips, blocks chips, pending warning, edit button | PASS | `DependencySection.tsx` renders in both `BugDetail.tsx:225-240` and `FeatureRequestDetail.tsx:277-292` |
| FR-dependency-list-ui | BlockedBadge on BugList and FeatureRequestList | PASS | `BlockedBadge.tsx` renders in `BugList.tsx:92` and `FeatureRequestList.tsx:79` |
| FR-dependency-picker | DependencyPicker modal: search, select, client-side cycle guard, save | PASS | `DependencyPicker.tsx` with 300ms debounced search, cycle guard, save via PATCH |
| FR-dependency-dispatch-gating | Dispatch gating: check blockers on status transition, set `pending_dependencies`, cascade on completion | PASS | `bugService.ts:262-295`, `featureRequestService.ts:289-376` — gating in update + approve, cascade via `onItemCompleted()` |

---

## Findings

### MEDIUM-001: Missing `blocked_by` in shared API input types (T-000)

**Files:** `portal/Shared/api.ts` lines 32-38, 59-67

**Problem:** `UpdateFeatureRequestInput` and `UpdateBugInput` do not include `blocked_by?: string[]`. The backend services accept this field, and the frontend DependencyPicker works around it with `as any` casts at lines 291 and 293 of `DependencyPicker.tsx`.

**Impact:** Type safety gap. TypeScript consumers of these shared types don't know `blocked_by` is a valid PATCH field. No runtime impact since Express doesn't enforce input types.

**Fix:** Add `blocked_by?: string[];` to both `UpdateFeatureRequestInput` and `UpdateBugInput` in `portal/Shared/api.ts`, then remove the `as any` casts in `DependencyPicker.tsx`.

---

### MEDIUM-002: Incorrect FR references in frontend components (T-001)

**Files:** `DependencyPicker.tsx`, `DependencySection.tsx`, `BlockedBadge.tsx`, `DependencyPicker.test.tsx`

**Problem:** All frontend shared components use `// Verifies: FR-0001` instead of the correct FR IDs:
- `DependencyPicker.tsx` (6 occurrences) → should be `FR-dependency-picker`
- `DependencySection.tsx` (5 occurrences) → should be `FR-dependency-detail-ui`
- `BlockedBadge.tsx` (2 occurrences) → should be `FR-dependency-list-ui`

`FR-0001` is an existing feature request in the portal backlog (portal traceability display), **not** the dependency-linking feature. Backend traceability is correct throughout — this is a frontend-only issue.

**Impact:** Incorrect traceability links. Automated traceability audits will map these components to the wrong feature.

**Fix:** Replace `FR-0001` with the correct FR IDs in all affected frontend files.

---

### LOW-001: No deletion cascade for dependencies (T-003)

**Files:** `bugService.ts`, `featureRequestService.ts`

**Problem:** When a bug or feature request is deleted, corresponding rows in the `dependencies` table are not cleaned up. This creates orphaned dependency rows that will show "Unknown" title / "unknown" status in the UI for items that still reference the deleted entity.

**Recommendation:** Add `DELETE FROM dependencies WHERE (blocked_item_type = ? AND blocked_item_id = ?) OR (blocker_item_type = ? AND blocker_item_id = ?)` to both delete functions.

---

### LOW-002: Search endpoint loads all records into memory (T-004)

**File:** `portal/Backend/src/routes/search.ts`

**Problem:** `listBugs(db)` and `listFeatureRequests(db)` load all records then filter client-side. Each record hydrates dependencies (3 queries per item), creating an N+1 query pattern.

**Impact:** Acceptable for current portal scale. Could degrade with large datasets.

---

### LOW-003: DependencyService instantiated per-row in list operations (T-005)

**Files:** `bugService.ts:38-39`, `featureRequestService.ts:109-110`

**Problem:** `mapBugRow()` and `mapFRRow()` create a new `DependencyService(db)` instance per row during list operations. The object is lightweight (just stores db reference), but the 3 DB queries per row remain a performance concern for large lists.

---

## Architecture Compliance

| Rule | Status | Notes |
|------|--------|-------|
| No direct DB calls from route handlers | PASS | All routes delegate to DependencyService and Bug/FR services |
| Service layer separation | PASS | DependencyService encapsulates all dependency business logic |
| Shared types as single source of truth | PASS | `DependencyLink`, `ReadyResponse`, status enums, constants all in `Shared/types.ts` |
| Schema changes require migration | PASS | Junction table via `CREATE TABLE IF NOT EXISTS` in `schema.ts` |
| Every FR needs a test with traceability | PARTIAL | Backend: correct. Frontend: uses wrong FR references (see MEDIUM-002) |
| API response patterns | PASS | Search returns `{data: [...]}`, ready returns object directly, errors return `{error: "..."}` |
| No hardcoded secrets | PASS | No secrets in code |
| Observability (structured logging + metrics) | PASS | Pino structured logging throughout; 4 new Prometheus metrics in `metrics.ts` |
| Business logic has no framework imports | PASS | DependencyService is pure, no Express imports |

---

## Test Coverage Assessment

### Backend Tests (536/536 passing)

| File | Dependency Tests | Coverage |
|------|-----------------|----------|
| `dependencies.test.ts` | 24 tests | Dependency CRUD, cycle detection, readiness, cascade, bulk set, search |
| `dependency-seed.test.ts` | 8 tests | Seed idempotency, dispatch gating integration, cascade auto-dispatch |
| `bugs.test.ts` | 9 tests | Dependency hydration, create with deps, dispatch gating, cascade |
| `featureRequests.test.ts` | 10 tests | Dependency hydration, create with deps, dispatch gating, cascade |
| **Total** | **51 tests** | |

**Traceability:** 100% — all backend tests use correct FR IDs (`FR-dependency-linking`, `FR-dependency-dispatch-gating`, `FR-dependency-ready-check`, `FR-dependency-cycle-detection`)

### Frontend Tests (244/265 passing — 21 pre-existing failures, 0 new)

| File | Dependency Tests | Coverage |
|------|-----------------|----------|
| `DependencyPicker.test.tsx` | 14 tests | Modal rendering, search, selection, removal, save, cycle guard, error handling |
| **Total** | **14 tests** | |

**Traceability:** All 14 tests have comments, but incorrectly reference `FR-0001` (see MEDIUM-002)

### Pre-existing Frontend Failures (21 tests — NOT caused by this feature)

| File | Failures | Root Cause |
|------|----------|------------|
| `OrchestratorCycles.test.tsx` | 12 | Missing component file / import resolution |
| `ImageUpload.test.tsx` | 4 | Missing `repos` mock export |
| `Learnings.test.tsx` | 2 | UI element text mismatch |
| `OrchestratorCycleCard.test.tsx` | 1 | Missing component file |
| `BugReports.test.tsx` | 1 | Create bug argument mismatch (target_repo) |
| `FeatureRequests.test.tsx` | 1 | Missing `repos` mock export |

### Test Gaps

- No dedicated frontend test for `DependencySection` component rendering (covered indirectly via DependencyPicker tests)
- No dedicated frontend test for `BlockedBadge` component
- No test for dependency deletion cascade (matches LOW-001 finding)
- No test for self-referential dependency rejection via PATCH endpoint (only tested via POST dependency endpoint)

### E2E Tests Written (not executed in CI)

- Cycle 1: 10 test cases — Core CRUD, UI sections, picker, cycle detection, cross-type deps
- Cycle 2: 13 test cases — Adds search, dispatch gating, cascade auto-dispatch

---

## Security Review

| Check | Status | Notes |
|-------|--------|-------|
| SQL injection | PASS | Parameterized queries throughout; table names from constrained union types |
| Input validation | PASS | `parseItemId()` validates BUG-/FR- format; action field validated |
| Self-reference prevention | PASS | Checked in both `addDependency` and `setDependencies` |
| Cycle detection DoS | LOW RISK | BFS with visited set prevents infinite loops; bounded by item count |
| Transaction safety | PASS | `setDependencies` uses `db.transaction()` for atomicity |
| Error leakage | PASS | `DependencyError` returns safe messages, no stack traces |
| XSS | PASS | React auto-escapes; no `dangerouslySetInnerHTML` |

---

## Observability Review

| Metric | Type | Name | Labels |
|--------|------|------|--------|
| Dependency operations | Counter | `portal_dependency_operations_total` | `operation`, `item_type` |
| Dispatch gating events | Counter | `portal_dispatch_gating_events_total` | `result` (dispatched/gated/auto_dispatched) |
| Dependency check duration | Histogram | `portal_dependency_check_duration_seconds` | `check_type` (readiness/cascade) |
| Cycle detection events | Counter | `portal_cycle_detection_events_total` | `result` (clean/cycle_detected) |

All new services and routes use structured pino logging with relevant context. No `console.log` usage found.

---

## Required Actions

1. **[MEDIUM]** Add `blocked_by?: string[];` to `UpdateFeatureRequestInput` and `UpdateBugInput` in `portal/Shared/api.ts`, and remove `as any` casts in `DependencyPicker.tsx` lines 291, 293.
2. **[MEDIUM]** Update frontend traceability comments from `FR-0001` to correct `FR-dependency-*` IDs in `DependencyPicker.tsx`, `DependencySection.tsx`, `BlockedBadge.tsx`, and `DependencyPicker.test.tsx`.

## Recommended Follow-ups

3. **[LOW]** Add dependency cleanup on item deletion in bug and FR services.
4. **[LOW]** Consider SQL-level filtering in search endpoint for better performance at scale.
5. **[LOW]** Add frontend tests for `DependencySection` and `BlockedBadge` components.
