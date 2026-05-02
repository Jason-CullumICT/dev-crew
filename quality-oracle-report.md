---

## Quality Oracle Findings

### Spec Coverage: 87%
29 requirements in scope (FR-WF-* + FR-dependency-*) | 27 traced to source | **2 unimplemented**

---

### QO-001 — `GET /api/search` not implemented · **P1 · spec-drift**
`Source/Backend/src/app.ts` | FR-dependency-search

The search route is **explicitly missing**. `tests/routes/search.test.ts` documents this in its header comment: *"these tests will FAIL until the route is implemented."* No `search.ts` file exists under `src/routes/`, and `app.ts` never registers `/api/search`. The `DependencyPicker` modal's typeahead calls `searchItems()` which POSTs to this non-existent endpoint — meaning dependency picking is broken in production.

**Fix:** Create `Source/Backend/src/routes/search.ts`, register `app.use('/api/search', searchRouter)` — the 5 tests already define the contract. Route to **TheFixer**.

---

### QO-002 — Traceability enforcer is single-file blind · **P2 · spec-drift**
`tools/traceability-enforcer.py:49-57`

The enforcer defaults to the **most recently modified** `Plans/*/requirements.md`. Today that's `Plans/self-judging-workflow` (FR-WF-001…013). `Plans/dependency-linking` (16 FR-dependency-* requirements) is **never automatically checked**. Canonical `Specifications/*.md` (FR-001…FR-069 for portal/, FR-TMP-* for platform/) have zero enforced coverage — `spec-drift-report.json` confirms 0% for FR-TMP-*.

**Fix:** CI gate should loop over all plan requirements files: `for req in Plans/*/requirements.md; do python3 tools/traceability-enforcer.py --file "$req"; done`. Add `--all-plans` flag to the enforcer.

---

### QO-003 — `dependencyCheckDuration` histogram absent · **P2 · spec-drift**
`Source/Backend/src/metrics.ts` | FR-dependency-metrics

FR-dependency-metrics requires 4 Prometheus instruments. Only 3 are present in Source/ (all counters). The **histogram** (`dependency_check_duration_seconds`) exists in `portal/Backend/src/metrics.ts` but was never ported to `Source/Backend`. The dependency service's `isReady()` and `detectCycle()` never record timing. The metric test suite doesn't assert for this histogram, so the gap passes silently.

**Fix:** Add `Histogram` to `Source/Backend/src/metrics.ts`; instrument `isReady()` and `detectCycle()` in `services/dependency.ts`; add one test assertion. Route to **TheFixer**.

---

### QO-004 — Route handlers bypass service layer · **P2 · architecture-violation**
`Source/Backend/src/routes/workItems.ts`, `intake.ts`

Architecture rule: *"No direct DB calls from route handlers — use the service layer."* Both `workItems.ts` and `intake.ts` import `* as store` and call `store.createWorkItem`, `store.findAll`, `store.findById`, etc. directly. `dashboard.ts` correctly delegates to `dashboardService`; these two do not. The pattern is **inconsistent across 2 of 4 route files**.

**Fix:** Extract `Source/Backend/src/services/workItemService.ts` wrapping store calls. Migrate the two routes to use it. Route to **TheFixer**.

---

### QO-005 — FR-dependency-dispatch-gating spec deviation · **P2 · spec-drift**
`Source/Backend/src/routes/workflow.ts:230-244` | FR-dependency-dispatch-gating

Acceptance criterion: *"PATCH to approved with unresolved blocker → 200 with status=`pending_dependencies`."* The implementation returns **HTTP 400** and never transitions the item status. `pending_dependencies` doesn't exist in `WorkItemStatus` at all. The `Verifies: FR-dependency-dispatch-gating` comment overstates coverage — the gating works (dispatch is blocked) but the mechanism diverges from the spec.

**Fix:** Either add `PendingDependencies` to the status enum and implement the transition, or update `Plans/dependency-linking/requirements.md` to reflect the 400-based design as an intentional decision. Escalate to **requirements-reviewer** first.

---

### QO-006 — Dual logger abstractions · **P3 · architecture-violation**
`Source/Backend/src/logger.ts` + `Source/Backend/src/utils/logger.ts`

Two active log sinks with different calling conventions coexist. Routes use the default-export compat wrapper (`src/logger.ts`); the store and models use the named export (`src/utils/logger.ts`). The wrapper normalizes between object-style and string-style calls. No `console.log` violations found — the rule is technically met — but "single logger abstraction" intent is undermined.

---

### QO-007 — `eslint-disable` suppressing exhaustive-deps · **P3 · pattern-violation**
`Source/Frontend/src/hooks/useWorkItems.ts:63`

The hook manually enumerates 6 filter fields as deps to avoid object-reference churn, but suppresses the linting rule without explanation. Adding a field to `WorkItemFilters` in the future will silently skip re-fetches. No justification comment present.

---

### QO-008 — Four frontend components without unit tests · **P4 · untested**
`Source/Frontend/src/components/{PriorityBadge,StatusBadge,TypeBadge,Layout}.tsx`

Incidentally tested via page tests but no focused component tests. PriorityBadge's color-map is especially regression-prone.

---

**Grade: C** — 1 P1 (unimplemented endpoint), 4 P2s, 87% in-scope spec coverage. Resolving QO-001 and cutting P2s to ≤ 3 with ≥ 80% coverage would achieve grade B.

Full report written to `Teams/TheInspector/findings/audit-2026-05-02-C.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
