---

## Quality Oracle Findings

### Spec Coverage: ~94%

| Plan | In-scope Requirements | Traced | Coverage |
|------|----------------------|--------|----------|
| self-judging-workflow (FR-WF-001–013) | 13 | 13 | **100%** *(enforcer verified)* |
| dependency-linking (FR-dependency-\*) | ~16 Source/-applicable | ~14 | **~88%** |
| tiered-merge-pipeline (FR-TMP-\*) | 10 | 0 | **0%** *(no requirements.md — Phase 2, not yet in scope)* |
| dev-workflow-platform (FR-001–069) | 69 | 0 in Source/ | **N/A** *(implemented in `portal/`, not `Source/`)* |

**Overall for active in-scope requirements: ~94%**

---

### QO-001: `GET /api/search` Route Missing From `app.ts`
- **Severity:** P1
- **Category:** spec-drift / unimplemented
- **File:** `Source/Backend/src/app.ts` + `Source/Backend/tests/routes/search.test.ts:5`
- **Detail:** `FR-dependency-search` requires a `GET /api/search` cross-entity endpoint used by the `DependencyPicker` typeahead. The test file `Source/Backend/tests/routes/search.test.ts` **explicitly documents** that the route is not wired into `app.ts`: *"NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* The traceability enforcer reports **PASS** because the test file references the FR ID — this is a **false-positive traceability pass**. At runtime, all `DependencyPicker` search calls will return 404.
- **Recommendation:** Implement the search route (scan `workItemStore.getAll()`, filter by title/description, exclude soft-deleted), register it in `app.ts` under `GET /api/search`, and wire the `searchItems` client function.
- **Cross-ref:** TheFixer (implementation), QO-002 (enforcer limitation)

---

### QO-002: `dependencyCheckDuration` Histogram Missing from Prometheus Metrics
- **Severity:** P2
- **Category:** spec-drift / observability
- **File:** `Source/Backend/src/metrics.ts:63`
- **Detail:** `FR-dependency-metrics` specifies **4** Prometheus metrics: `dependencyOperations` counter ✓, `dispatchGatingEvents` counter ✓, `dependencyCheckDuration` **histogram** ✗, `cycleDetectionEvents` counter ✓. The histogram is absent from `metrics.ts`. The spec acceptance criterion states "All 4 metrics visible at `GET /metrics`." Without the histogram, latency SLO measurement for dependency resolution (e.g., BFS cycle detection) is impossible.
- **Recommendation:** Add a `Histogram` named `dependency_check_duration_seconds` with label `operation` to `metrics.ts`; instrument `hasUnresolvedBlockers` and `detectCycle` calls in `dependency.ts`.
- **Cross-ref:** TheFixer

---

### QO-003: Duplicate Test Files for WorkItemDetailPage and WorkItemListPage
- **Severity:** P2
- **Category:** test-quality / maintenance-debt
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (stale)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (authoritative, newer)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (stale)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (authoritative, newer)
- **Detail:** Both `tests/` root and `tests/pages/` contain tests for the same pages. The `pages/` versions are more complete (import proper shared types, use `within` from RTL, mock more API functions). The root versions are outdated stubs with fewer mocked functions. Running both doubles test counts and creates maintenance confusion — any update to the page must be reflected in two files.
- **Recommendation:** Delete the root-level duplicates (`tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx`); the `tests/pages/` versions are canonical.
- **Cross-ref:** TheFixer

---

### QO-004: `eslint-disable` for `react-hooks/exhaustive-deps` in Production Source
- **Severity:** P2
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Architecture rules flag disabled linting rules as a concern. The suppressions silence the React rules-of-hooks linter for intentional dependency-list narrowing. While these are `next-line` suppressions (not file-wide) and are functionally intentional, they represent tech debt — suppressions without justifying comments invite future violations and break IDE enforcement.
- **Recommendation:** Add a one-line comment *before* each suppression explaining *why* the dependency list is intentionally narrowed (e.g., `// intentionally omit 'searchItems' — stable API ref, adding would cause infinite re-fetch`). Per architecture rules, suppression without documented rationale is prohibited.
- **Cross-ref:** TheFixer

---

### QO-005: Traceability Enforcer Produces False-Positive Coverage
- **Severity:** P2
- **Category:** architecture-violation / tooling-gap
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer scans *all* files under `Source/` for `// Verifies: FR-XXX` comments. A reference in a **test file** satisfies the check even when the **implementation** is absent. `FR-dependency-search` passes the enforcer because `search.test.ts` references it — yet `app.ts` never registers the route. The enforcer also only targets the **most recently modified `Plans/*/requirements.md`** (currently `self-judging-workflow`), leaving the 16 `FR-dependency-*` requirements from the `dependency-linking` plan unchecked.
- **Recommendation:** (a) Extend enforcer to optionally distinguish `Source/Backend/src/` from `Source/Backend/tests/` — require at least one reference in `src/` for backend FRs. (b) Add a `--plan all` mode that aggregates all `requirements.md` files. Interim: run `python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md` as a second gate.
- **Cross-ref:** [ESCALATE → TheFixer for tooling fix]

---

### QO-006: Several Frontend Helper Files Lack Unit Tests
- **Severity:** P3
- **Category:** test-coverage
- **Files (no dedicated test):**
  - `Source/Frontend/src/components/Layout.tsx`
  - `Source/Frontend/src/components/PriorityBadge.tsx`
  - `Source/Frontend/src/components/StatusBadge.tsx`
  - `Source/Frontend/src/components/TypeBadge.tsx`
  - `Source/Frontend/src/pages/DebugPortalPage.tsx` (16-line stub)
  - `Source/Frontend/src/hooks/useDashboard.ts`
  - `Source/Frontend/src/hooks/useWorkItems.ts`
- **Detail:** Badge components and hooks are exercised indirectly through page-level tests, but direct unit tests would isolate regressions faster. Architecture rule: "Every FR needs a test." All badge components carry `// Verifies: FR-WF-010/011` traceability but no corresponding test file targets them by name.
- **Recommendation:** Add `StatusBadge.test.tsx`, `PriorityBadge.test.tsx`, `TypeBadge.test.tsx` at a minimum. Hooks could be tested with `renderHook` from `@testing-library/react`. DebugPortalPage is a low-value stub — defer or mark with a justifying comment.
- **Cross-ref:** TheFixer

---

### QO-007: `workflow.ts` Route File Approaching Complexity Threshold
- **Severity:** P3
- **Category:** architecture-violation (boundary)
- **File:** `Source/Backend/src/routes/workflow.ts:374`
- **Detail:** At 374 lines, `workflow.ts` bundles workflow actions (route/assess/approve/reject/dispatch) *and* the dependency endpoints (add/remove link, get ready). Architecture rule: "Large files (>500 lines) may need splitting." The file is not over the threshold but mixes two logical domains. The dependency route handlers (lines ~300–374) belong semantically with a `dependencies.ts` router.
- **Recommendation:** Extract dependency-specific endpoints into `Source/Backend/src/routes/dependencies.ts` and register under `/api/work-items` in `app.ts`. This will also make `search.ts` registration (QO-001 fix) natural.
- **Cross-ref:** TheFixer

---

```json
{
  "audit_date": "2026-09-06",
  "auditor": "quality-oracle",
  "spec_coverage_pct": 94,
  "total_findings": 7,
  "p1": 1,
  "p2": 4,
  "p3": 2,
  "grade": "B",
  "grade_rationale": "0 P1s would push to A; 1 P1 (missing search route) pulls to B per grading config",
  "open_p1_findings": ["QO-001"],
  "open_p2_findings": ["QO-002","QO-003","QO-004","QO-005"],
  "open_p3_findings": ["QO-006","QO-007"],
  "escalations": ["QO-001 → TheFixer","QO-002 → TheFixer","QO-005 → TheFixer"],
  "false_positive_flag": "TRACEABILITY PASSED result for FR-dependency-search is a false positive — route unimplemented",
  "enforcement_gaps": [
    "Plans/dependency-linking/requirements.md not scanned by enforcer",
    "Plans/tiered-merge-pipeline has no requirements.md (Phase 2)"
  ]
}
```

---

**Summary for TheFixer routing:**

| ID | Action | Priority |
|----|--------|----------|
| QO-001 | Implement `GET /api/search` and register in `app.ts` | P1 |
| QO-002 | Add `dependencyCheckDuration` histogram to `metrics.ts` | P2 |
| QO-003 | Delete stale root-level duplicate test files | P2 |
| QO-004 | Add rationale comments to `eslint-disable` suppressions | P2 |
| QO-005 | Extend traceability enforcer to check `src/` vs `tests/` references | P2 |
| QO-006 | Add unit tests for badge components and hooks | P3 |
| QO-007 | Extract dependency routes to `dependencies.ts` router | P3 |
