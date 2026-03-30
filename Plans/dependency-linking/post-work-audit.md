# Post-Work Audit: Dependency Linking in UI/API with Orchestrator Dispatch Gating

**Auditor**: TheInspector
**Date**: 2026-03-30
**Scope**: Independent audit of TheATeam's implementation (commit `eacbfb53`)
**RISK_LEVEL**: high

---

## Executive Summary

The dependency linking feature is **substantially complete** across all layers (shared types, backend services/routes, frontend components). Architecture rules, observability, and test traceability are well-followed. However, this audit found **1 CRITICAL bug**, **2 HIGH issues**, and **2 MEDIUM issues** that the existing integration review and traceability reports either missed or misreported.

The existing reports contain a **false PASS** on the shared API types check (claiming `blocked_by` exists in `api.ts` Update interfaces when it does not).

---

## Critical Findings

### C-001: CRITICAL — Auto-dispatch sets invalid status for bugs

**File**: `portal/Backend/src/services/dependencyService.ts:230-233`

**Issue**: `onItemCompleted()` hardcodes `status = 'approved'` for all auto-dispatched items:
```typescript
this.db.prepare(`UPDATE ${table} SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
  .run(item.blocked_item_id);
```

But bugs have status enum: `['reported', 'triaged', 'in_development', 'resolved', 'closed', 'pending_dependencies', 'duplicate', 'deprecated']` — there is **no `'approved'` status for bugs**. This directly corrupts bug records by setting them to an invalid status that won't pass `VALID_BUG_STATUSES` validation on subsequent updates.

For feature requests, `pending_dependencies → approved` is valid per `STATUS_TRANSITIONS`. For bugs, it produces a state machine violation.

**Impact**: HIGH — Any bug in `pending_dependencies` that gets auto-dispatched will have its status corrupted. Subsequent PATCH calls on that bug will fail validation.

**Fix**: Use item-type-aware target status. Bugs should transition to `'in_development'` (or whichever status was originally intended before being gated). Consider storing the original target status when moving to `pending_dependencies`.

---

### H-001: HIGH — Shared API types missing `blocked_by` field

**Files**: `portal/Shared/api.ts:32-38` (UpdateFeatureRequestInput), `portal/Shared/api.ts:59-67` (UpdateBugInput)

**Issue**: Neither `UpdateFeatureRequestInput` nor `UpdateBugInput` includes a `blocked_by` field. The frontend `DependencyPicker.tsx:291-293` works around this with `as any` casts:
```typescript
await bugs.update(itemId, { blocked_by: blockerIds } as any);
```

**Note**: The integration review report at line 38 claims "Shared API types include blocked_by — PASS" referencing `api.ts:38` and `api.ts:68`. **This is a false PASS** — those lines contain `deprecation_reason`, not `blocked_by`.

The backend service interfaces (`bugService.ts:182`, `featureRequestService.ts:257`) correctly include `blocked_by`, so the backend accepts the field. The type gap is only in the shared API contract used by the frontend.

**Impact**: MEDIUM — Works at runtime due to `as any`, but violates the "shared types are single source of truth" architecture rule and bypasses TypeScript safety.

**Fix**: Add `blocked_by?: string[];` to both `UpdateFeatureRequestInput` and `UpdateBugInput` in `portal/Shared/api.ts`. Remove `as any` casts from `DependencyPicker.tsx`.

---

### H-002: HIGH — PATCH routes drop `duplicate_of` and `deprecation_reason`

**Files**: `portal/Backend/src/routes/bugs.ts:115`, `portal/Backend/src/routes/featureRequests.ts:106`

**Issue**: The PATCH handlers destructure `req.body` but omit `duplicate_of` and `deprecation_reason`:

```typescript
// bugs.ts:115
const { title, description, severity, status, source_system, blocked_by } = req.body;

// featureRequests.ts:106
const { status, description, priority, blocked_by } = req.body;
```

The backend services (`bugService.ts:180-181`) accept these fields and have full validation logic for them, but the route never passes them through.

**Impact**: HIGH — Users cannot set bug/FR status to `duplicate` or `deprecated` via PATCH, since `duplicate_of` (required for duplicate status) never reaches the service. This breaks FR-DUP-04.

**Fix**: Add `duplicate_of, deprecation_reason` to the destructuring in both route handlers and pass to the service.

---

### M-001: MEDIUM — FeatureRequest UpdateInput missing duplicate/deprecation fields

**File**: `portal/Backend/src/services/featureRequestService.ts:253-258`

**Issue**: The `UpdateFeatureRequestInput` interface lacks `duplicate_of` and `deprecation_reason` fields (unlike `bugService.ts:180-181` which has them). The `updateFeatureRequest()` function also lacks the validation logic for duplicate/deprecated transitions that exists in `updateBug()`.

**Impact**: Even after fixing H-002 (route passthrough), feature requests still can't be set to `duplicate` or `deprecated` via the generic update path until this service-level gap is also fixed.

**Fix**: Add `duplicate_of?: string` and `deprecation_reason?: string` to `UpdateFeatureRequestInput`. Port the validation logic from `bugService.ts:224-260` into `updateFeatureRequest()`.

---

### M-002: MEDIUM — Frontend dependency callbacks lack error handling

**Files**: `portal/Frontend/src/components/bugs/BugDetail.tsx:236-238`, `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:271-273`

**Issue**: The `onDependenciesChanged` callback calls `.then()` without `.catch()`:
```typescript
onDependenciesChanged={() => {
  bugs.getById(bug.id).then(onUpdate)
  // No .catch() — errors silently fail
}}
```

**Impact**: If the refetch fails after a dependency save, the UI shows stale data with no error indication.

**Fix**: Add `.catch()` with user-visible error feedback.

---

## Existing Report Inaccuracies

| Report | Claim | Reality | Severity |
|--------|-------|---------|----------|
| Integration review line 38 | "Shared API types include blocked_by — PASS" at `api.ts:38,68` | `api.ts:38` is `deprecation_reason`, not `blocked_by`. Neither Update interface has `blocked_by`. | **False PASS** |
| Traceability report line 39 | Same claim — "api.ts:38 (UpdateFeatureRequestInput), api.ts:68 (UpdateBugInput)" | Same issue. | **False PASS** |
| Traceability report line 36 | Backend 510/510 tests pass | Current run shows 508/508 pass. Minor discrepancy (likely test count drift). | **Stale data** |
| Both reports | 12 pre-existing frontend failures | Current run shows 15 failures (204 pass / 219 total). | **Stale data** |
| Both reports | Auto-dispatch logic — no issues flagged | Auto-dispatch sets `'approved'` for bugs which is an invalid status. | **Missed bug** |
| Both reports | PATCH routes — no issues with field passthrough | `duplicate_of`/`deprecation_reason` are never passed from routes to services. | **Missed bug** |

---

## Verified PASS Items

These items from the existing reports were independently verified as correct:

| Item | Status | Verified |
|------|--------|----------|
| Dependencies junction table with UNIQUE + CHECK constraints, dual indexes | PASS | `schema.ts:209-229` |
| BFS cycle detection | PASS | `dependencyService.ts:160-205` |
| Self-reference prevention | PASS | `dependencyService.ts:30-32` |
| POST `/api/bugs/:id/dependencies` and `/api/feature-requests/:id/dependencies` | PASS | Proper add/remove with validation |
| GET `/:id/ready` endpoints | PASS | Correct readiness + unresolved_blockers list |
| Dispatch gating (approved/in_development → pending_dependencies when blocked) | PASS | `bugService.ts:262-268`, `featureRequestService.ts:289-295` |
| GET hydration of blocked_by/blocks/has_unresolved_blockers | PASS | Via `mapBugRow`/`mapFRRow` |
| DependencySection component (chips, status badges, pending warning, edit) | PASS | Well-implemented with accessibility |
| BlockedBadge component (list view blocked indicator) | PASS | Correct priority: pending_dependencies > blocked |
| DependencyPicker component (search, select, client-side cycle guard) | PASS | 300ms debounce, proper modal |
| Structured logging (pino, no console.log) | PASS | All files |
| Prometheus metrics (4 counters + duration histogram) | PASS | `metrics.ts` |
| OpenTelemetry tracing via `withSpan()` | PASS | Route handlers |
| Service layer pattern (no direct DB in routes) | PASS | All routes delegate to services |
| Test traceability comments (`// Verifies: FR-*`) | PASS | All new code |
| Transaction safety in bulk set | PASS | `setDependencies` uses `db.transaction()` |
| SQL injection prevention | PASS | All queries use parameterized statements |
| DELETE cascade for dependencies | PASS | `bugService.ts:305`, `featureRequestService.ts:344` |

---

## Test Results (Independent Run)

| Suite | Total | Passed | Failed | Notes |
|-------|-------|--------|--------|-------|
| Backend (vitest) | 508 | 508 | 0 | All pass |
| Frontend (vitest) | 219 | 204 | 15 | All failures are pre-existing (not caused by this feature) |

---

## Prioritized Fix List

| # | Severity | Issue | Files to Change | Effort |
|---|----------|-------|-----------------|--------|
| 1 | CRITICAL | Auto-dispatch sets invalid `'approved'` status for bugs | `dependencyService.ts:232` | Small — use item-type-aware status |
| 2 | HIGH | Add `blocked_by` to shared API Update types | `Shared/api.ts:32-38,59-67`, `DependencyPicker.tsx:291,293` (remove `as any`) | Small |
| 3 | HIGH | Pass `duplicate_of`/`deprecation_reason` through PATCH routes | `routes/bugs.ts:115-116`, `routes/featureRequests.ts:106,109` | Small |
| 4 | MEDIUM | Add duplicate/deprecation fields to FR UpdateInput + validation | `featureRequestService.ts:253-258,260+` | Medium — port logic from bugService |
| 5 | MEDIUM | Add `.catch()` to dependency callback refetches | `BugDetail.tsx:236-238`, `FeatureRequestDetail.tsx:271-273` | Small |

---

## Verdict

**CONDITIONAL PASS — fixes required before merge**

The feature demonstrates solid architecture, comprehensive test coverage, and good observability. However, the CRITICAL auto-dispatch bug (C-001) will corrupt bug records in production and must be fixed. The HIGH issues (H-001, H-002) violate architecture rules and break the duplicate/deprecated status flow. All five fixes are small-to-medium effort and should be completed before merge.
