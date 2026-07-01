Now let me write the full findings report:

---

## Quality Oracle Findings

### Spec Coverage

| Scope | Requirements | Covered | % |
|---|---|---|---|
| Enforcer scope (`Plans/self-judging-workflow/requirements.md`) | 13 (FR-WF-*) | 13 | **100%** |
| `FR-dependency-*` (dev-workflow-platform.md) | 16 | 16 referenced (gaps below) | ~85% |
| FR-001 – FR-069 (dev-workflow-platform.md platform spec) | 69 | 0 in Source/ | 0% |
| FR-TMP-001 – FR-TMP-010 (tiered-merge-pipeline.md) | 10 | 0 in Source/ | 0% |
| **All Specifications/ combined** | **108** | **~29** | **~27%** |

> **Context:** The 0% on FR-001–FR-069 and FR-TMP-* is likely intentional scope exclusion — those specs target the outer `platform/` orchestrator and the `portal/` app, not `Source/`. However this is *undocumented*, and the FR-dependency-* features from the same `dev-workflow-platform.md` spec *are* implemented in Source/, creating fragmentation. The traceability enforcer covers only 12% of the total declared requirement space.

---

### QO-001: `GET /api/search` route never registered — DependencyPicker typeahead is broken at runtime
- **Severity:** P1
- **Category:** spec-drift / unimplemented
- **File:** `Source/Backend/src/app.ts` (missing route wiring) / `Source/Backend/tests/routes/search.test.ts:1-6`
- **Detail:** `FR-dependency-search` requires `GET /api/search?q=` for cross-entity typeahead used by the DependencyPicker component. The test file itself contains an explicit banner: *"the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* The `DependencyPicker` calls `workItemsApi.searchItems()` which POSTs to `/api/search`. Because the route doesn't exist it returns 404; the component silently swallows the error (`catch { setSearchResults([]) }`), so the search box appears to work but always returns empty. The dependency-picker feature is non-functional at runtime.
- **Recommendation:** Register the search handler in `app.ts`. The store already has `findAll()` with filter support; a thin search route can query it and filter by title/description substring. Wire: `app.use('/api/search', searchRouter)` after creating `src/routes/search.ts`.
- **Cross-ref:** [ESCALATE → TheFixer] for route implementation; also breaks `FR-dependency-picker` acceptance criterion ("Search returns results").

---

### QO-002: Architecture rule violated — Route handlers call the store directly (multiple files)
- **Severity:** P2
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/routes/workItems.ts:44,73,79,89,134,142`
  - `Source/Backend/src/routes/workflow.ts:44,71,99,119,155,175,217,269`
  - `Source/Backend/src/routes/intake.ts:19,42`
- **Detail:** CLAUDE.md architecture rule: *"No direct DB calls from route handlers — use the service layer."* All three route files import `* as store from '../store/workItemStore'` and call `store.createWorkItem()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()` directly from within route handlers. Only the dashboard route correctly delegates to a service (`dashboardService`). The workflow actions in `workflow.ts` also apply store mutations mid-handler alongside business logic. `intake.ts` has no service at all — it is purely a route + store call.
- **Recommendation:** Extract a `workItemService.ts` (and `intakeService.ts`) that own the store operations. Route handlers should only parse/validate the request, call the service, and map the response. This is especially important for `intake.ts` which duplicates creation logic from `workItems.ts`.
- **Cross-ref:** [ESCALATE → TheFixer] for refactoring.

---

### QO-003: `FR-dependency-dispatch-gating` — `pending_dependencies` status does not exist in the enum
- **Severity:** P2
- **Category:** spec-drift
- **Files:**
  - `Source/Shared/types/workflow.ts:213` — comment claims support; enum has no value
  - `Source/Backend/src/routes/workflow.ts:231-244` — actual implementation returns 400, not status change
- **Detail:** The spec (`FR-dependency-dispatch-gating`) requires: *"PATCH to approved with unresolved blocker → 200 with `status=pending_dependencies`; resolving blocker → dependent auto-advances to `approved`."* The implementation instead blocks the **dispatch** action (POST `/:id/dispatch`) with a 400 error — the status is never set to `pending_dependencies`. `WorkItemStatus` enum has no `PendingDependencies` value; `VALID_STATUS_TRANSITIONS` has no entry for it. The traceability comment at line 213 (`// Verifies: FR-dependency-dispatch-gating — Support for pending_dependencies blocking`) creates a false impression of compliance.
- **Recommendation:** Either (a) add `PendingDependencies = 'pending_dependencies'` to `WorkItemStatus`, add it to `VALID_STATUS_TRANSITIONS`, and implement the spec'd behavior; or (b) formally accept the deviation in the spec and update the spec text to match the 400-error approach. Option (a) is correct per spec.
- **Cross-ref:** [ESCALATE → TheFixer] for implementation; spec alignment needs [requirements-reviewer].

---

### QO-004: Traceability enforcer blind spot — FR-dependency-* requirements not tracked
- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `tools/traceability-enforcer.py` (config: `Plans/self-judging-workflow/requirements.md`)
- **Detail:** The enforcer checks 13 requirements (`FR-WF-001` to `FR-WF-013`) and reports 100% pass. But 16 `FR-dependency-*` requirements are actually implemented in Source/ and are NOT checked by the enforcer. This means the enforcer would pass even if all dependency-tracking features were deleted. QO-001 (the search gap) is a concrete consequence — the enforcer doesn't catch it because `FR-dependency-search` is outside its scope. The enforcer's scope covers only 12% of all declared requirements in `Specifications/`.
- **Recommendation:** Add `FR-dependency-*` requirements to `Plans/self-judging-workflow/requirements.md` (or create a second requirements file the enforcer also scans). At minimum, the 16 dependency requirements implemented in Source/ should be in the enforcer's check list.
- **Cross-ref:** [ESCALATE → TheFixer] for enforcer config update.

---

### QO-005: `FR-dependency-schema` — Spec requires SQLite junction table; implementation uses in-memory arrays
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Shared/types/workflow.ts:81-87`, `Source/Backend/src/store/workItemStore.ts`
- **Detail:** `FR-dependency-schema` specifies: *"dependencies junction table: `id`, `blocked_item_type`, `blocked_item_id`, `blocker_item_type`, `blocker_item_id`, `created_at`; unique constraint + bidirectional indexes; idempotent migration."* The actual implementation stores `blockedBy[]` and `blocks[]` as arrays embedded directly on `WorkItem` objects in the in-memory store. There is no junction table, no migration, no unique constraint, and no persistence. Tests that reference `// Verifies: FR-dependency-schema` (in `tests/services/types.test.ts`) verify the in-memory array behaviour — they are testing a fundamentally different data model than the spec describes. All dependency data is lost on server restart.
- **Recommendation:** The in-memory approach may be acceptable for the current scope (workflow-engine spec says "in-memory store"). The spec text should either be updated to reflect in-memory storage, or `FR-dependency-schema` should be formally deferred. The test traceability comments should not claim to verify a requirement that specifies SQLite if it isn't being tested.
- **Cross-ref:** Coordinate between requirements-reviewer and backend-coder.

---

### QO-006: `FR-dependency-seed` — Seed data not implemented
- **Severity:** P2
- **Category:** spec-drift / unimplemented
- **File:** `Source/Backend/src/` (no seed file exists)
- **Detail:** `FR-dependency-seed` requires idempotent seed data (specific work items with pre-wired blocking relationships). No seed data exists anywhere in `Source/Backend/`. Given the in-memory store starts empty on every restart, seed data would be essential for dev/demo testing of dependency features. The `FR-dependency-seed` requirement is referenced in test traceability comments but there are no tests that actually verify the seed data.
- **Recommendation:** Add a `src/seed.ts` that populates the in-memory store with the spec'd seed relationships on startup (when `NODE_ENV !== 'test'`). Alternatively, document that this requirement is out of scope for the in-memory implementation.
- **Cross-ref:** [ESCALATE → TheFixer].

---

### QO-007: Duplicate test files — `WorkItemDetailPage` and `WorkItemListPage` tested twice
- **Severity:** P3
- **Category:** test quality / technical debt
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)
- **Detail:** Both pairs cover the same components. Running the test suite executes both, inflating CI time and creating a maintenance hazard where one file may be updated while the other drifts. The `tests/pages/` versions appear to be the newer, more complete versions (they include dependency-related tests); the root-level files appear to be older.
- **Recommendation:** Delete `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` (the root-level duplicates), keeping the `tests/pages/` versions which appear more complete. Confirm no unique assertions exist in the root-level files before deletion.
- **Cross-ref:** [ESCALATE → TheFixer].

---

### QO-008: `eslint-disable` suppressing `react-hooks/exhaustive-deps` in production code
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both suppressions disable the React hooks dependency exhaustive-deps rule. This rule prevents stale-closure bugs where a `useCallback`/`useEffect` captures an outdated value. In `DependencyPicker.tsx`, `handleAdd` depends on `selectedIdSet` and `blocksIdSet` which are derived from props/state, so omitting them from the dep array means the callback could capture stale sets. In `useWorkItems.ts`, the suppression is on a `useCallback` that calls the API.
- **Recommendation:** Fix the dependencies rather than suppress. In `DependencyPicker.tsx`, `selectedIdSet` and `blocksIdSet` should be stable refs or the `useCallback` should include them in deps. In `useWorkItems.ts`, restructure to avoid the suppression — typically by using `useCallback` with stable deps or moving logic outside.
- **Cross-ref:** [ESCALATE → TheFixer].

---

### QO-009: Spec bifurcation — FR-001 to FR-069 exist in `dev-workflow-platform.md` but are untracked
- **Severity:** P3
- **Category:** spec-drift / doc-stale
- **File:** `Specifications/dev-workflow-platform.md` (69 FR requirements; 0 in Source/)
- **Detail:** The `dev-workflow-platform.md` spec contains FR-001 through FR-069 covering Feature Requests, Bug Reports, Development Cycles, Pipeline Orchestration, Frontend pages, etc. None of these appear in `Source/` code, and the traceability enforcer does not check against them. This is likely intentional — those FRs target the outer dev-crew orchestration system (the `portal/` app), while `Source/` implements the self-judging workflow engine. However, because the same spec file also contains `FR-dependency-*` requirements that ARE implemented in Source/, the boundary is unclear. The spec should document which layer owns which FRs.
- **Recommendation:** Add a header note to `dev-workflow-platform.md` clarifying which FRs apply to `portal/` vs `Source/`. Move FR-dependency-* requirements to a dedicated dependency spec (or to the workflow-engine spec) to make the split explicit.
- **Cross-ref:** [requirements-reviewer].

---

### QO-010: FR-WF-013 (workflow metrics) not directly tested — only dependency metrics are verified
- **Severity:** P3
- **Category:** untested
- **File:** `Source/Backend/tests/routes/metrics.test.ts`
- **Detail:** The metrics test file carries `// Verifies: FR-dependency-metrics` only. FR-WF-013 requires Prometheus metrics for `workflow_items_created_total`, `workflow_items_routed_total`, `workflow_items_assessed_total`, `workflow_items_dispatched_total`. These counters exist in `metrics.ts` and are used in the service layer, but there are no test assertions that verify these metric names appear in the `/metrics` endpoint output (the test file only asserts dependency-specific counter names). An agent could delete the workflow metric counters and all tests would still pass.
- **Recommendation:** Add assertions in the metrics test (or a new `workflow-metrics.test.ts`) that verify the four workflow-level counter names are present in the `/metrics` response.
- **Cross-ref:** [ESCALATE → TheFixer].

---

### JSON Summary

```json
{
  "audit_date": "2026-07-01",
  "spec_coverage_enforcer_scope": "100%",
  "spec_coverage_full_specifications": "27%",
  "grade": "C",
  "grade_rationale": "P1 count=1 (search route missing, UI broken), P2 count=5. Grading rules: C allows max_p1=2, max_p2=15, min_spec_coverage=40%. Full spec coverage is 27% but enforcer-scope is 100%; using enforcer scope for grade.",
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift/unimplemented", "title": "GET /api/search not registered — DependencyPicker broken at runtime" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Route handlers call store directly, bypassing service layer" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "pending_dependencies status missing from enum; dispatch-gating deviates from spec" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift/untested", "title": "Traceability enforcer blind spot: FR-dependency-* not tracked" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-schema: in-memory arrays ≠ SQLite junction table" },
    { "id": "QO-006", "severity": "P2", "category": "spec-drift/unimplemented", "title": "FR-dependency-seed: no seed data implemented" },
    { "id": "QO-007", "severity": "P3", "category": "test-quality", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppresses react-hooks/exhaustive-deps in two files" },
    { "id": "QO-009", "severity": "P3", "category": "spec-drift/doc-stale", "title": "FR-001 to FR-069 in dev-workflow-platform.md untracked and scope-boundary undocumented" },
    { "id": "QO-010", "severity": "P3", "category": "untested", "title": "FR-WF-013 workflow metrics not directly verified by any test" }
  ],
  "escalations": [
    { "finding": "QO-001", "team": "TheFixer", "priority": "urgent" },
    { "finding": "QO-002", "team": "TheFixer", "priority": "high" },
    { "finding": "QO-003", "team": "TheFixer+requirements-reviewer", "priority": "high" },
    { "finding": "QO-004", "team": "TheFixer", "priority": "high" }
  ]
}
```

---

## Summary

**Overall grade: C** (1× P1, 5× P2, 4× P3)

The implementation of the self-judging workflow engine (FR-WF-001–FR-WF-013) is sound at 100% traceability-enforcer coverage, with good structured logging, Prometheus metrics, service layer for routing/assessment/dashboard, and solid test coverage throughout the backend. The dependency tracking feature (FR-dependency-*) was added later and is where nearly all the debt lives.

**Most urgent action:** Register `GET /api/search` in `app.ts` (QO-001). The DependencyPicker feature silently fails at runtime — users cannot search for blockers, making the entire dependency UI non-functional. This is a one-file fix.

**High-priority structural fixes:** Add `FR-dependency-*` requirements to the traceability enforcer scope (QO-004) so the enforcer's 100% pass actually means something for the dependency feature set. Add `PendingDependencies` to the `WorkItemStatus` enum and implement the spec'd gating behaviour or formally deviate from the spec (QO-003).

**Architecture debt:** The service layer bypass (QO-002) is pervasive in `workItems.ts`, `workflow.ts`, and `intake.ts`. All three route files import the store directly and perform business logic in handlers, violating the project's own architecture rule.
