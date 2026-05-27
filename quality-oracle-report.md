Now here is the full Quality Oracle audit report:

---

## Quality Oracle Findings

### Spec Coverage: **25.7%** (Full Spec) / **100%** (Enforcer Scope)

| Spec Document | Requirements | Traced to Source | Coverage |
|---|---|---|---|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` (FR-001 to FR-069+) | 74 | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 0 | **0%** |
| `FR-dependency-*` (from dev-workflow-platform) | 16 | 16 | **100%** |
| **Total** | **113** | **29** | **25.7%** |

---

### QO-001: Missing `GET /api/search` Route — Tests Will Fail
- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/app.ts` (line 1–54) / `Source/Backend/tests/routes/search.test.ts` (line 1–7)
- **Detail:** `FR-dependency-search` requires a `GET /api/search?q=` cross-entity typeahead endpoint. The test file (`search.test.ts`) contains 5 test cases and **explicitly documents that the route is not wired into `app.ts`**. The comment reads: _"These tests document the expected contract and will FAIL until the route is implemented."_ Running `npm test` will produce 5 failing tests.
- **Recommendation:** Add a `/api/search` route handler that filters work items by title/description and register it in `app.ts`. The test file already specifies the full contract.
- **Cross-ref:** TheFixer to implement; route should follow `{data: T[]}` wrapper pattern.

---

### QO-002: Route Handlers Call Store Directly — Architecture Rule Violation
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12,44,73,79,134,142` and `Source/Backend/src/routes/workflow.ts:15,44,71,99,155,174`
- **Detail:** Both route files `import * as store from '../store/workItemStore'` and call store functions directly (`store.findById`, `store.createWorkItem`, `store.updateWorkItem`, `store.softDelete`, `store.findAll`). CLAUDE.md states **non-negotiably**: _"No direct DB calls from route handlers — use the service layer."_ The existing pattern in `router.ts` and `assessment.ts` shows how the service layer should work; routes should delegate to equivalent work-item service functions.
- **Recommendation:** Create `Source/Backend/src/services/workItemService.ts` that wraps the store calls. Route handlers become thin adapters that parse HTTP inputs and delegate to the service.
- **Cross-ref:** `[ESCALATE → TheFixer]`

---

### QO-003: Missing `dependency_check_duration` Histogram — FR-dependency-metrics Gap
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` specifies **4 metrics**: `dependencyOperations` counter, `dispatchGatingEvents` counter, `dependencyCheckDuration` histogram, and `cycleDetectionEvents` counter. `metrics.ts` implements only **3**. The `dependency_check_duration` histogram (measuring BFS/readiness check latency) is absent entirely. This means the `/metrics` endpoint is incomplete relative to the spec.
- **Recommendation:** Add a `Histogram` export `dependencyCheckDurationHistogram` in `metrics.ts` and instrument the `isReady()` / `hasUnresolvedBlockers()` calls in `dependency.ts` with `observe()`.
- **Cross-ref:** `[ESCALATE → TheFixer]`

---

### QO-004: `Specifications/dev-workflow-platform.md` — 74 FRs With Zero Source Coverage
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The primary domain specification defines **74 functional requirements** (FR-001 through FR-069 plus FR-dependency-* extensions) covering FeatureRequests, BugReports, DevelopmentCycles, Tickets, Pipeline Orchestration, and a React SPA with 7 pages. The **source code implements none of these**. Instead, the codebase implements the `workflow-engine.md` spec — a self-judging work item triage engine with in-memory storage that is architecturally incompatible with the SQLite-backed dev lifecycle platform described in `dev-workflow-platform.md`. This is either intentional scope reduction (the simpler system is phase 1) or indicates that 74 planned requirements have been superseded without archival.
- **Recommendation:** The spec relationship must be clarified. If `dev-workflow-platform.md` represents planned future work, mark it `[STATUS: PLANNED - Phase N]` in the document header. If it has been superseded by the workflow engine approach, archive it. Either way, update the traceability enforcer to reflect actual scope.
- **Cross-ref:** Requires solo-session decision; do NOT run through TheFixer pipeline.

---

### QO-005: `Specifications/tiered-merge-pipeline.md` — 10 FRs With Zero Source Coverage
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`, `Source/E2E/` (empty)
- **Detail:** Ten requirements (FR-TMP-001 through FR-TMP-010) cover risk classification, Playwright E2E test generation, auto-PR creation, AI PR review, and auto-merge logic. **No implementation exists** in `Source/` or `platform/`. The `Source/E2E/tests/` directory is empty — the Playwright test output location specified by FR-TMP-002 (`Source/E2E/tests/cycle-{run-id}/`) has never been populated. FR-TMP-007 through FR-TMP-009 describe orchestrator-level changes to `platform/`, which is solo-session territory.
- **Recommendation:** Create a Plan under `Plans/` for this feature with status PENDING. If FR-TMP-007/008/009 touch `platform/`, they must be done in a solo session, not via team pipeline.
- **Cross-ref:** `platform/` is solo-session only per CLAUDE.md.

---

### QO-006: Traceability Enforcer Scope Gap — Reports 100% But Misses 84 FRs
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** `python3 tools/traceability-enforcer.py` targets only `Plans/self-judging-workflow/requirements.md` (13 FRs), reports PASSED, and gives false confidence. It does not scan `Specifications/dev-workflow-platform.md` (74 FRs) or `Specifications/tiered-merge-pipeline.md` (10 FRs). A developer running the verification gate sees green but 74% of spec requirements have no coverage signal.
- **Recommendation:** Either (a) update the enforcer to also scan `Specifications/*.md` for FR IDs and cross-reference against source, or (b) document clearly in the enforcer output that coverage is scoped to the workflow-engine plan only.
- **Cross-ref:** `tools/` is solo-session editable.

---

### QO-007: Two `eslint-disable` Suppressions Without Justification
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` without documenting _why_ the deps are intentionally excluded. In `DependencyPicker.tsx`, a stale closure over a debounced search callback is a real risk if the search function identity changes. CLAUDE.md allows `eslint-disable` but it violates the spirit of observable, auditable code.
- **Recommendation:** Replace with a proper `useCallback` dep array or add an inline comment explaining the intentional omission (e.g., `// intentional: searchFn is stable, adding it would cause infinite re-render`).

---

### QO-008: Silent Error Swallow in API Client
- **Severity:** P3
- **Category:** pattern-violation / architecture-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}))` silently discards JSON parse failures. If the server returns a non-JSON error body (e.g., a proxy 502 with HTML), the client catches the parse error and falls through to `throw new Error(body.message ?? ...)` with `body = {}` — producing a generic `Request failed: 502` with no server-side error detail. CLAUDE.md rule: _"Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."_
- **Recommendation:** Log the parse failure (even as a debug message) or at minimum annotate with a comment explaining that this is intentional error recovery.

---

### QO-009: Duplicate Frontend Test Files — Ambiguous Coverage
- **Severity:** P3
- **Category:** test-quality
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`; same duplication for `WorkItemListPage`
- **Detail:** Two separate test files cover the same page components at different paths. They contain different test cases (the `tests/` root versions appear to have earlier, simpler tests; `tests/pages/` has newer, more complete ones). This creates confusion about which file is authoritative, and both may run, potentially with conflicting mock setups.
- **Recommendation:** Delete the older root-level versions (`tests/WorkItemDetailPage.test.tsx`, `tests/WorkItemListPage.test.tsx`) and consolidate all cases into the `tests/pages/` versions.

---

### QO-010: Non-Standard Verifies Reference in `DebugPortalPage.tsx`
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The file uses `// Verifies: dev-crew debug portal` — not a valid `FR-XXX` identifier. The traceability enforcer pattern is `FR-\d+` or `FR-[A-Za-z-]+`, so this comment would never match any spec requirement and adds no traceability value.
- **Recommendation:** Either map to a real requirement ID or remove the Verifies comment if this file has no spec requirement.

---

### Summary JSON

```json
{
  "audit_date": "2026-05-27",
  "grade": "D",
  "spec_coverage_enforcer_scope": "100%",
  "spec_coverage_full": "25.7%",
  "total_spec_requirements": 113,
  "traced_requirements": 29,
  "untraced_requirements": 84,
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift/untested", "title": "GET /api/search not wired — 5 tests will fail", "fr": "FR-dependency-search"},
    {"id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Route handlers call store directly", "files": ["routes/workItems.ts", "routes/workflow.ts"]},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "dependency_check_duration histogram missing", "fr": "FR-dependency-metrics"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "dev-workflow-platform.md: 74 FRs with 0% source coverage"},
    {"id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "tiered-merge-pipeline.md: 10 FRs with 0% source coverage"},
    {"id": "QO-006", "severity": "P2", "category": "spec-drift", "title": "Traceability enforcer misses 84 spec FRs — false 100% signal"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable without justification in 2 frontend files"},
    {"id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "Silent error swallow in api/client.ts catch block"},
    {"id": "QO-009", "severity": "P3", "category": "test-quality", "title": "Duplicate frontend test files for WorkItemDetailPage and WorkItemListPage"},
    {"id": "QO-010", "severity": "P4", "category": "pattern-violation", "title": "Non-standard Verifies reference in DebugPortalPage.tsx"}
  ],
  "p1_count": 1,
  "p2_count": 5,
  "p3_count": 3,
  "p4_count": 1,
  "console_log_violations": 0,
  "empty_catch_violations": 1,
  "eslint_disable_count": 2,
  "files_over_500_lines": 0
}
```

---

### Grade: **D**

Per `inspector.config.yml` grading thresholds:
- Grade A requires 0 P1, ≤3 P2, ≥80% spec coverage
- Grade B requires 0 P1, ≤8 P2, ≥60% spec coverage  
- Grade C requires ≤2 P1, ≤15 P2, ≥40% spec coverage
- **Grade D: spec coverage is 25.7% (below C's 40% floor)** even though P1/P2 counts would qualify for C

**The dominant failure mode is spec drift**: the enforcer gives a false green (100%) because it only watches 29 of 113 requirements. Two complete specification documents representing the planned product are unimplemented with no tracking.

**Immediate action items (for TheFixer):** QO-001 (search route), QO-003 (histogram). **Solo-session items:** QO-004/QO-005 (spec status clarification), QO-006 (enforcer scope update).
