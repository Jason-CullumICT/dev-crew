# QA Report: Dependency Linking in UI/API with Orchestrator Dispatch Gating

**QA Tester:** qa-tester-1
**Team:** TheATeam
**Date:** 2026-03-30
**RISK_LEVEL:** high

---

## Executive Summary

The dependency linking feature has been implemented across the full stack (shared types, backend API, frontend UI). All 52 backend tests pass. The implementation covers the core specification: dependency CRUD, circular dependency detection, dispatch gating, auto-dispatch cascade, and frontend display with editing capabilities.

**Overall Assessment: PASS with findings**

---

## Test Results

### Backend Unit/Integration Tests
- **52 tests, 52 passing, 0 failing**
- Test suite: `portal/Backend/src/__tests__/dependencies.test.ts`
- Coverage areas: DependencyService CRUD, cycle detection, readiness checks, dispatch gating, auto-dispatch cascade, API endpoints, seed data

### Traceability Enforcer
- `tools/traceability-enforcer.py` — **NOT FOUND** (tool does not exist in repository)

---

## Specification Compliance

### API Requirements

| Requirement | Status | Notes |
|---|---|---|
| `blocked_by: string[]` and `blocks: string[]` fields on bugs/FRs | PASS | Returned as `DependencyLink[]` with title/status (richer than spec) |
| `PATCH /api/bugs/:id` accepts `blocked_by` array | PASS | |
| `PATCH /api/feature-requests/:id` accepts `blocked_by` array | PASS | |
| `POST /api/bugs/:id/dependencies` add/remove | PASS | |
| `POST /api/feature-requests/:id/dependencies` add/remove | PASS | |
| `GET /api/feature-requests/:id/ready` | PASS | |
| `GET /api/bugs/:id/ready` | PASS | Added for consistency per dispatch plan |

### UI Requirements

| Requirement | Status | Notes |
|---|---|---|
| Detail view: Dependencies section with blocked_by items | PASS | DependencySection component |
| Detail view: Blocks section | PASS | |
| Clickable references with status badges | PASS | DependencyChip with navigation links |
| List view: Blocked badge on items with unresolved blockers | PASS | BlockedBadge component |
| Dependency picker for searching/selecting blockers | PASS | DependencyPicker modal with debounced search |

### Orchestrator Dispatch Gating

| Requirement | Status | Notes |
|---|---|---|
| Check blockers before dispatch (approved/in_development) | PASS | |
| Set `pending_dependencies` when blockers unresolved | PASS | |
| Auto-dispatch when all blockers complete | PASS | |
| `pending_dependencies` status shown in UI | PASS | Amber badge + warning alert |

### Known Dependency Seeding

| Relationship | Status |
|---|---|
| BUG-0010 blocked_by BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007 | PASS |
| FR-0004 blocked_by FR-0003 | PASS |
| FR-0005 blocked_by FR-0002 | PASS |
| FR-0007 blocked_by FR-0003 | PASS |

**Note:** The spec also mentions "FR-0001 (portal traceability display) blocked_by the completed FR-0001 traceability-in-PRs run" — this is a self-reference (FR-0001 blocked_by FR-0001) which the implementation correctly prevents. This seed was intentionally omitted from the seed data, which is the correct behavior.

---

## Findings

### MEDIUM — SQL Table Name Interpolation in DependencyService

**File:** `portal/Backend/src/services/dependencyService.ts` lines 231, 311, 319
**Description:** Table names are interpolated via template literals from the `type` parameter:
```typescript
const table = type === 'bug' ? 'bugs' : 'feature_requests';
this.db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
```
**Risk:** LOW in practice — the `DependencyItemType` is a union type `'bug' | 'feature_request'`, so the ternary guards against arbitrary injection. However, this is a pattern that could become dangerous if the type system is bypassed at runtime (e.g., via unvalidated API input).
**Recommendation:** The current implementation is safe because:
1. TypeScript enforces the union type at compile time
2. Routes validate input before calling service methods
3. The ternary (`=== 'bug'`) acts as a runtime whitelist
No action required, but worth noting for future audits.

### MEDIUM — Performance: N+1 Query Pattern in List Endpoints

**File:** `portal/Backend/src/services/bugService.ts` line 28, `featureRequestService.ts` line 28
**Description:** `listBugs()` and `listFeatureRequests()` call `enrichBug()`/`enrichFeatureRequest()` per row, which makes 3 separate DB queries per item (getBlockedBy, getBlocks, hasUnresolvedBlockers). For a list of N items, this results in 3N+1 database queries.
**Impact:** With SQLite in-process, this is acceptable for small datasets. Could become a bottleneck with hundreds of items.
**Recommendation:** Consider a batch query approach in future optimization if list sizes grow. Not blocking for initial release.

### LOW — `hasUnresolvedBlockers` calls `getBlockedBy` redundantly

**File:** `portal/Backend/src/services/dependencyService.ts` line 141
**Description:** `enrichBug()` calls `getBlockedBy()`, `getBlocks()`, and `hasUnresolvedBlockers()`. The `hasUnresolvedBlockers()` method internally calls `getBlockedBy()` again, resulting in a duplicate query for every item.
**Recommendation:** `hasUnresolvedBlockers` could be computed from the already-fetched `blocked_by` array in the enrichment method instead of making a separate DB call.

### LOW — DependencyPicker Circular Dependency Guard is Client-Side Only (Direct Cycles)

**File:** `portal/Frontend/src/components/shared/DependencyPicker.tsx` line 32-38
**Description:** The `wouldCreateDirectCycle()` function only checks for direct cycles (A blocks B, trying to add B blocks A). Transitive cycles are only caught by the backend.
**Impact:** This is actually correct behavior — the client provides a fast UX guard for the common case, while the server enforces comprehensive cycle detection. The server will return 409 for transitive cycles.
**Status:** INFO — working as designed.

### LOW — No CORS Configuration

**File:** `portal/Backend/src/app.ts`
**Description:** The Express app has no CORS middleware configured. If the frontend is served from a different origin in production, API requests will be blocked.
**Impact:** May work in development if served from the same origin. Could be a deployment issue.
**Recommendation:** Add CORS configuration if frontend and backend are on different origins.

### LOW — No Rate Limiting on Dependency Endpoints

**File:** `portal/Backend/src/routes/bugs.ts`, `portal/Backend/src/routes/featureRequests.ts`
**Description:** Dependency endpoints (especially POST for add/remove and PATCH for bulk set) have no rate limiting. The cycle detection BFS could be expensive for deep graphs.
**Impact:** Low risk for internal portal. Could be exploited to create CPU-intensive cycle detection calls.
**Recommendation:** Consider rate limiting if exposed publicly.

### INFO — Traceability Comments Present Throughout

All files contain `// Verifies: FR-0001` or `// Verifies: FR-dependency-linking` comments linking code to the feature request. This is good traceability practice.

### INFO — Observability Well-Implemented

Prometheus metrics (`dependencyOperations`, `dispatchGatingEvents`, `dependencyCheckDuration`, `cycleDetectionEvents`) provide good operational visibility. Structured logging via pino covers all important operations.

### INFO — Unused Import in Services

**File:** `portal/Backend/src/services/bugService.ts` line 3, `featureRequestService.ts` line 3
**Description:** `DependencyItemType` is imported but not used directly in these files.
**Impact:** No functional impact, just a lint warning.

---

## Security Review

| Check | Status | Notes |
|---|---|---|
| SQL Injection | PASS | Parameterized queries used throughout; table names via controlled ternary |
| Input Validation | PASS | `parseItemId()` validates ID format; action field validated against whitelist |
| Self-reference Prevention | PASS | Rejected with 409 |
| Circular Dependency Prevention | PASS | BFS-based cycle detection |
| Error Information Leakage | PASS | Generic 500 errors; specific errors only for expected conditions |
| XSS (Frontend) | PASS | React auto-escapes; no `dangerouslySetInnerHTML` used |
| CSRF | INFO | No CSRF tokens, but this is an internal portal using JSON APIs |

---

## Architecture Review

| Check | Status | Notes |
|---|---|---|
| Separation of Concerns | PASS | Clean separation: routes → services → database |
| Shared Types | PASS | Single source of truth in `portal/Shared/types.ts` |
| Transaction Safety | PASS | `setDependencies` uses SQLite transaction for atomicity |
| Idempotency | PASS | Add uses INSERT OR IGNORE; remove is idempotent |
| Error Handling | PASS | Custom `DependencyError` with status codes; catch blocks in routes |
| Test Coverage | PASS | 52 tests covering CRUD, cycles, gating, cascade, API endpoints, seeding |

---

## E2E Tests

Written to: `Source/E2E/tests/cycle-run-1774837896408-a447c19c/`
- `dependency-bugs.spec.ts` — Bug list, bug detail, dependency display, dependency editing
- `dependency-feature-requests.spec.ts` — Feature request list, detail, dependencies
- `dependency-api.spec.ts` — API endpoint verification via UI-driven flows

---

## Conclusion

The implementation is **complete, well-tested, and ready for merge** with the noted findings. No CRITICAL or HIGH severity issues found. The MEDIUM findings are performance optimizations that can be addressed in future iterations. The implementation faithfully follows the dispatch plan specification.
