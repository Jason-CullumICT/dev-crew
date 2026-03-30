# QA Report: Dependency Linking in UI/API with Orchestrator Dispatch Gating

**Role:** traceability-in-prs (QA)
**Team:** TheATeam
**Date:** 2026-03-30
**RISK_LEVEL: high**

---

## Summary

The dependency linking feature has been implemented across the full stack: shared types, backend (schema, services, routes, tests), and frontend (shared components, integration into list/detail views). All 52 backend tests pass. TypeScript compiles cleanly with no errors.

---

## Test Results

### Backend Tests
- **52 tests passing**, 1 test suite
- Coverage areas: DependencyService CRUD, cycle detection, readiness checks, dispatch gating, auto-dispatch cascade, API endpoints (GET/PATCH/POST for bugs and feature requests), seed data
- No failures

### TypeScript Compilation
- `npx tsc --noEmit` passes with zero errors

### Traceability Enforcer
- `tools/traceability-enforcer.py` not found in the workspace — skipped

---

## Specification Compliance

### API — Fully Implemented
| Requirement | Status | Location |
|---|---|---|
| `blocked_by: string[]` and `blocks: string[]` fields | PASS | `portal/Shared/types.ts:75-77` (DependencyLink arrays on Bug/FeatureRequest) |
| `PATCH /api/bugs/:id` accepts `blocked_by` array | PASS | `portal/Backend/src/routes/bugs.ts:44-61` |
| `PATCH /api/feature-requests/:id` accepts `blocked_by` array | PASS | `portal/Backend/src/routes/featureRequests.ts:44-61` |
| `POST /api/bugs/:id/dependencies` for add/remove | PASS | `portal/Backend/src/routes/bugs.ts:64-97` |
| `POST /api/feature-requests/:id/dependencies` for add/remove | PASS | `portal/Backend/src/routes/featureRequests.ts:64-97` |
| `GET /api/feature-requests/:id/ready` readiness check | PASS | `portal/Backend/src/routes/featureRequests.ts:99-116` |
| `GET /api/bugs/:id/ready` readiness check (bonus, for consistency) | PASS | `portal/Backend/src/routes/bugs.ts:100-114` |

### UI — Fully Implemented
| Requirement | Status | Location |
|---|---|---|
| Detail view: Dependencies section with clickable references + status badge | PASS | `portal/Frontend/src/components/shared/DependencySection.tsx` |
| Detail view: Blocks section | PASS | `DependencySection.tsx:197-209` |
| List view: blocked badge on items with unresolved blockers | PASS | `portal/Frontend/src/components/shared/BlockedBadge.tsx` + integration in BugList/FeatureRequestList |
| Dependency picker for searching/selecting blocker items | PASS | `portal/Frontend/src/components/shared/DependencyPicker.tsx` |

### Orchestrator Dispatch Gating — Fully Implemented
| Requirement | Status | Location |
|---|---|---|
| Check `blocked_by` before dispatch on approval | PASS | `portal/Backend/src/services/bugService.ts:67-79`, `featureRequestService.ts:67-79` |
| Set `pending_dependencies` if blockers unresolved | PASS | `bugService.ts:70-71`, `featureRequestService.ts:70-71` |
| Auto-dispatch when blocker completes | PASS | `dependencyService.ts:208-246` |
| UI shows `pending_dependencies` status clearly | PASS | `BlockedBadge.tsx:41-51`, `DependencySection.tsx:162-168` |

### Known Dependencies Seeding — Fully Implemented
| Dependency | Status |
|---|---|
| BUG-0010 blocked_by BUG-0003, BUG-0004, BUG-0005, BUG-0006, BUG-0007 | PASS |
| FR-0004 blocked_by FR-0003 | PASS |
| FR-0005 blocked_by FR-0002 | PASS |
| FR-0007 blocked_by FR-0003 | PASS |

**Note:** The spec mentions "FR-0001 (portal traceability display) blocked_by the completed FR-0001 traceability-in-PRs run" which is a self-reference and is correctly NOT seeded (would be rejected by self-referential check).

---

## Findings

### MEDIUM — SQL Injection via Table Name Interpolation

**File:** `portal/Backend/src/services/dependencyService.ts:232`, `311`, `319`

The `onItemCompleted`, `verifyItemExists`, and `getItemStatus` methods use string interpolation for table names:
```typescript
const table = item.blocked_item_type === 'bug' ? 'bugs' : 'feature_requests';
this.db.prepare(`UPDATE ${table} SET status = ...`).run(...);
```

**Assessment:** The `blocked_item_type` column has a CHECK constraint limiting it to `'bug'` or `'feature_request'`, and the ternary only produces the two hardcoded table names. **This is safe in practice** — the table name is derived from a constrained value via a ternary, not from user input directly. Severity downgraded from HIGH to MEDIUM as a defensive coding note.

### LOW — Performance: N+1 Query in List Endpoints

**File:** `portal/Backend/src/services/bugService.ts:28`, `featureRequestService.ts:28`

The `listBugs()` and `listFeatureRequests()` methods call `enrichBug()`/`enrichFeatureRequest()` per row, which performs 3 queries per item (`getBlockedBy`, `getBlocks`, `hasUnresolvedBlockers`). For a list of N items, this results in 3N+1 queries.

**Impact:** Low for current scale. Would become noticeable with >100 items. Could be optimized with a batch query approach in the future.

### LOW — Client-Side Cycle Detection is Shallow

**File:** `portal/Frontend/src/components/shared/DependencyPicker.tsx:32-38`

The `wouldCreateDirectCycle()` function only checks direct cycles (A blocks B, trying to add B blocks A). Transitive cycles are only caught server-side (409 response). This is acceptable since the server has full cycle detection via BFS, but the UX could be improved to catch transitive cycles before submission.

### INFO — Traceability Comments Present

All source files include `// Verifies:` comments linking to feature requirements (FR-0001, FR-dependency-linking, FR-dependency-dispatch-gating, FR-dependency-cycle-detection, FR-dependency-ready-check). This is consistent and thorough.

### INFO — Unused Import

**File:** `portal/Backend/src/services/bugService.ts:3`
```typescript
import type { Bug, BugStatus, DependencyItemType } from '../../../Shared/types';
```
`DependencyItemType` is imported but not used in this file. Same in `featureRequestService.ts:3`.

### INFO — Architecture Pattern

The implementation follows a clean separation of concerns:
- `DependencyService` handles all dependency CRUD, cycle detection, and cascade logic
- `BugService`/`FeatureRequestService` handle dispatch gating integration
- Routes handle HTTP concerns only (validation, error mapping)
- Frontend components are properly separated (BlockedBadge, DependencySection, DependencyPicker)

---

## Security Review

| Check | Result |
|---|---|
| SQL Injection | SAFE — Parameterized queries throughout; table names derived from constrained values |
| Input Validation | PASS — `parseItemId()` validates ID format; action field validated in routes |
| Circular Dependency Prevention | PASS — BFS cycle detection on server; 409 Conflict response |
| Self-Referential Prevention | PASS — Explicit check in `addDependency()` |
| XSS | SAFE — React handles output encoding by default |
| Error Disclosure | PASS — Internal errors logged, generic 500 returned to client |

---

## Architecture Review

| Check | Result |
|---|---|
| Schema design (junction table) | PASS — Normalized, supports cross-type deps, proper indexes |
| Transaction safety (bulk set) | PASS — Wrapped in `db.transaction()` |
| Seed data approach | PASS — Graceful failure for missing items |
| Status enum consistency | PASS — `pending_dependencies` added to both type unions and DB CHECK constraints |
| Metrics/Observability | PASS — Prometheus counters and histograms for dependency operations and dispatch gating |

---

## Verdict

**PASS** — The implementation fully meets the specification requirements. All backend tests pass (52/52). TypeScript compiles cleanly. No critical or high-severity issues found. The codebase has consistent traceability comments and follows clean architectural patterns.

Recommended follow-ups (non-blocking):
1. Optimize list endpoint N+1 queries when item count grows
2. Add transitive cycle warning to client-side picker for better UX
3. Clean up unused `DependencyItemType` imports
