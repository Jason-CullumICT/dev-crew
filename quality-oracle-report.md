---

## Quality Oracle Findings

### Spec Coverage: 96%
**Scope:** `Source/` — Self-Judging Workflow Engine

| Plan | Requirements | Covered | Missing |
|------|-------------|---------|---------|
| FR-WF-001..013 (workflow engine) | 13 | 13 | 0 |
| FR-dependency-* (14 active) | 14 | 13 | 1 (search) |
| **Total** | **27** | **26** | **1** |

**Note:** `Specifications/dev-workflow-platform.md` (FR-001..FR-069) and `Specifications/tiered-merge-pipeline.md` (FR-TMP-001..010) are separate systems (`portal/` and `platform/` respectively) — not in scope for `Source/` audit.

---

### QO-001: `GET /api/search` Route Not Registered — 5 Tests Actively Failing
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/app.ts` (missing route registration)
- **Tests:** `Source/Backend/tests/routes/search.test.ts` — all 5 tests fail (confirmed by test run)
- **Detail:** `FR-dependency-search` requires a cross-entity typeahead search endpoint used by the `DependencyPicker` frontend modal. The service logic was never wired into `app.ts`. The test file itself documents this gap explicitly: *"the GET /api/search endpoint is NOT wired into app.ts. These tests will FAIL until the route is implemented."* The frontend `workItemsApi.searchItems()` already calls `/api/search`, so DependencyPicker typeahead returns 404 at runtime.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` with `GET /api/search?q=` that filters non-deleted work items by title/description match, returns `{data: WorkItem[]}`. Register it in `app.ts` as `app.use('/api', searchRouter)`.
- **Cross-ref:** Frontend DependencyPicker modal is broken at runtime (no typeahead results).

---

### QO-002: Traceability Enforcer Only Checks Most-Recent Plan — FR-dependency-* Unguarded
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:48`
- **Detail:** The enforcer auto-selects the most-recently-modified `requirements.md` in `Plans/`. It currently targets `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013) and declares "TRACEABILITY PASSED". But `Plans/dependency-linking/requirements.md` (16 FR-dependency-* IDs) is never checked — including `FR-dependency-search` which has 5 failing tests. The enforcement gate gives a false green when dependency requirements drift.
- **Recommendation:** Run enforcer against both plan files in CI: `python3 tools/traceability-enforcer.py && python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md`. Or add a glob mode to the enforcer that checks all `Plans/**/requirements.md` files.

---

### QO-003: Canonical Spec IDs (FR-001..FR-069) Never Traced in Source/
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** `Specifications/dev-workflow-platform.md` defines FR-001..FR-069 as the authoritative canonical requirements. None of these IDs appear in `Source/` traceability comments — instead, `Source/` uses plan-level aliases (FR-WF-*, FR-dependency-*). There is no formal mapping from canonical spec IDs → implementation. If the canonical spec is updated (e.g., a requirement description changes), there is no automated way to detect that the implementation drifted.
- **Recommendation:** Add a cross-reference table in each `Plans/*/requirements.md` linking plan IDs to canonical Specification IDs (e.g., "FR-WF-001 implements § workflow-engine.md §Work Item domain model"). This creates a transitive traceability chain.

---

### QO-004: `dependencyCheckDuration` Histogram Missing from Metrics
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` specifies 4 metrics: `dependencyOperations` counter, `dispatchGatingEvents` counter, `dependencyCheckDuration` **histogram**, `cycleDetectionEvents` counter. Only 3 of 4 are implemented — the `dependencyCheckDuration` histogram is absent entirely. Additionally, the implemented metric label names deviate from spec (`action` vs `operation, item_type`; `event` vs `result`; `detected` vs `result`).
- **Recommendation:** Add `dependencyCheckDuration` histogram to `metrics.ts` and instrument `isReady()` and `computeHasUnresolvedBlockers()` calls in `dependency.ts`. Align label names with spec or formally update the spec.

---

### QO-005: Logger Ignores `LOG_LEVEL` Env Var and `NODE_ENV` Pretty-Print Switch
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/utils/logger.ts`
- **Detail:** CLAUDE.md requires (a) `LOG_LEVEL` env var to control verbosity and (b) structured JSON in production, pretty-printing in development. The logger emits all levels unconditionally (no `process.env.LOG_LEVEL` guard) and always outputs JSON regardless of `NODE_ENV`. FR-003 acceptance criteria: "All log output is structured JSON in NODE_ENV=production" — technically met, but the LOG_LEVEL control is entirely missing.
- **Recommendation:** Add level-threshold check: if `process.env.LOG_LEVEL` is set, skip `emit()` for lower-priority levels. Add `NODE_ENV !== 'production'` conditional for pretty-printed output (or document v1 defers pretty-printing).

---

### QO-006: Route Handlers Directly Access Store — No Service Layer for CRUD
- **Severity:** P3
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/intake.ts`
- **Detail:** CLAUDE.md: "No direct DB calls from route handlers — use the service layer." All three route files import `* as store from '../store/workItemStore'` and call `store.createWorkItem`, `store.findById`, `store.findAll`, `store.updateWorkItem`, `store.softDelete` directly from route handlers. The service layer exists for routing, assessment, dashboard, dependency, and change history — but NOT for basic CRUD operations.
- **Recommendation:** Extract `Source/Backend/src/services/workItemService.ts` wrapping store operations, and have routes call the service. This decouples routes from the store and makes future persistence changes (e.g., swapping in-memory store for SQLite) a single-file change.

---

### QO-007: Inconsistent Logger Import — `workItemStore.ts` Bypasses the Shim
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Backend/src/store/workItemStore.ts:10`
- **Detail:** All service/route files use `import logger from '../logger'` (the normalized shim that handles both string and object-style log calls). `workItemStore.ts` imports `{ logger }` directly from `'../utils/logger'`, bypassing the shim. The raw logger only accepts `(msg: string, ctx?)` but the shim also handles `({ msg, ...ctx })`. This inconsistency is a maintenance hazard — if the shim's interface evolves, workItemStore.ts will diverge silently.
- **Recommendation:** Update `workItemStore.ts` to import from `'../logger'` (the shim) for consistency with all other backend files.

---

### QO-008: OpenTelemetry Tracing Not Implemented
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/app.ts`
- **Detail:** CLAUDE.md requires "Use OpenTelemetry for distributed tracing" and "Propagate W3C `traceparent` header across service boundaries." The backend has no OTel dependency, no tracer initialization, no custom spans, and neither reads nor forwards the `traceparent` header. This is an architecture rule, not optional. The `Specifications/dev-workflow-platform.md` FR-021 formally requires this with acceptance criteria "Trace/span IDs appear in logs."
- **Recommendation:** Either add `@opentelemetry/sdk-node` + auto-instrumentation for Express + forward `traceparent` header, or formally mark OTel as out-of-scope for the in-memory v1 and update the spec/CLAUDE.md accordingly. Leaving the rule in CLAUDE.md while ignoring it creates false coverage expectations.

---

### QO-009: Duplicate Test Files — `WorkItemDetailPage` and `WorkItemListPage`
- **Severity:** P3
- **Category:** test-quality
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemListPage.test.tsx`
- **Detail:** Both components have duplicate test files in two locations. Both sets run in CI. Future changes to either component risk updating only one test file, creating silent coverage gaps or silent contradictions between suites.
- **Recommendation:** Consolidate into the `tests/pages/` versions (more recent, better organized). Delete the `tests/` root-level duplicates.

---

### QO-010: Dispatch Gating Returns 400 Instead of Setting `pending_dependencies` Status
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/src/routes/workflow.ts:231-244`
- **Detail:** `FR-dependency-dispatch-gating` acceptance criteria: *"PATCH to approved with unresolved blocker → 200 with status=`pending_dependencies`."* The implementation returns `400 { error: "Cannot dispatch: work item has unresolved blocking dependencies" }` instead. The `pending_dependencies` status is absent from `WorkItemStatus`. Functionally safe (dispatch is blocked), but the API contract diverges from the spec — clients expecting 200+status cannot integrate correctly.
- **Recommendation:** Either add `WorkItemStatus.PendingDependencies = 'pending-dependencies'` to the enum and implement the status-setting path, or formally update the spec acceptance criteria to reflect the 400 response contract.

---

### QO-011: `eslint-disable` Without Justification Comment
- **Severity:** P3
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` without an inline comment explaining why the missing dependency is intentional. Per CLAUDE.md architecture rules, disabled linting rules must be documented. Without context, future developers cannot know whether the suppression is load-bearing or accidental.
- **Recommendation:** Add `// intentionally omit <dep> — <reason>` on the same line as the disable comment.

---

### QO-012: `Plans/dependency-linking` Implementation Delta Has Stale `portal/` Paths
- **Severity:** P3
- **Category:** doc-stale
- **File:** `Plans/dependency-linking/requirements.md:38-53`
- **Detail:** The Implementation Delta table marks items like `FR-dependency-service` as "✅ Done" with note "dependencyService.ts, 335 lines, all methods present" — but references `portal/Backend/src/services/dependencyService.ts`, which doesn't exist. The actual implementation is at `Source/Backend/src/services/dependency.ts`. Items `FR-dependency-frontend-tests` are marked "❌ Missing" but the tests now exist in `Source/Frontend/tests/components/`. The entire delta table is based on a stale snapshot of the portal/ system.
- **Recommendation:** Update the Implementation Delta table to reflect `Source/` paths and current status, or add a header noting it's been superseded by the Source/ migration.

---

### Summary JSON

```json
{
  "audit_date": "2026-07-22",
  "scope": "Source/ (Self-Judging Workflow Engine)",
  "grade": "A",
  "spec_coverage": "96%",
  "requirements_checked": 27,
  "requirements_covered": 26,
  "requirements_missing": 1,
  "p1_findings": 0,
  "p2_findings": 2,
  "p3_findings": 10,
  "p4_findings": 0,
  "test_run": {
    "suites_total": 14,
    "suites_failed": 1,
    "tests_total": 169,
    "tests_failed": 5,
    "failing_suite": "tests/routes/search.test.ts",
    "failing_fr": "FR-dependency-search"
  },
  "top_action": "Implement GET /api/search route and register in app.ts — fixes 5 test failures and unblocks DependencyPicker typeahead"
}
```

---

**Grade: A** · 0 P1 · 2 P2 · 10 P3 · 96% spec coverage (in-scope)

The codebase is in solid shape for its scope. The single most impactful fix is registering the `GET /api/search` route in `app.ts` — one line to mount the router, which resolves 5 failing tests and restores the DependencyPicker's typeahead functionality at runtime. Route to **TheFixer** for all P3 items; route to **requirements-reviewer** for the spec ID fragmentation and stale plan documentation.
