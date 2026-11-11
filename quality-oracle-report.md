---

## Quality Oracle Findings — 2026-11-11

### Spec Coverage Summary

| Plan | Requirements | Traced | Coverage |
|------|-------------|--------|----------|
| Self-Judging Workflow (FR-WF-*) | 13 | 13 | **100%** ✅ |
| Dependency Linking (FR-dependency-*) | 16 | 15 | **94%** ⚠️ |
| Dev-Workflow-Platform (FR-001–FR-032) | 34 | 0 | **0%** ❌ |
| Tiered Merge Pipeline (FR-TMP-*) | 10 | 0 | **0%** ❌ |

**Blended cross-spec coverage: ~32%** — far below the 80% threshold for an A grade.

> **Note:** The traceability enforcer (`python3 tools/traceability-enforcer.py`) only auto-detects the _most recently modified_ `requirements.md`. It currently targets `Plans/self-judging-workflow/requirements.md` and reports a false PASS. The two older platform specs are silently excluded, masking a large unimplemented surface.

---

### QO-001: Search Route Not Implemented — Intentionally Failing Tests

- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/app.ts` (route missing) / `Source/Backend/tests/routes/search.test.ts:5`
- **Detail:** `GET /api/search` is specified in `FR-dependency-search` and required by the `DependencyPicker` typeahead (`FR-dependency-picker`). The route is **not registered in `app.ts`** and no implementation exists in `Source/Backend/src/routes/`. The test file `search.test.ts` explicitly documents this gap at line 5: _"NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into app.ts. These tests … will FAIL until the route is implemented."_ When tests run, all 5 search tests fail with 404.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` implementing `GET /api/search?q=` that calls `store.findAll` with a text filter on title+description, registers it in `app.ts` as `app.use('/api/search', searchRouter)`.
- **Cross-ref:** FR-dependency-picker (DependencyPicker modal breaks without search)

---

### QO-002: Massive Spec Drift — dev-workflow-platform.md FR-001–FR-032 Entirely Unimplemented

- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The domain specification defines a full-stack platform (FR-001–FR-032) built on SQLite + Express + React covering Feature Requests, Bug Reports, Development Cycles, Approvals, Learnings, Feature Browser, and Pipeline Orchestration (FR-033–FR-069). The traceability enforcer run against `Plans/dev-workflow-platform/requirements.md` confirms **all 34 requirements missing**. The codebase instead implements a "Self-Judging Workflow Engine" (in-memory store, different entity model, different API surface). These are architecturally distinct systems — the spec names `Feature Request (FR-XXXX)` while the code names `WorkItem (WI-XXX)`. Either:
  - The spec is stale and should be updated to match what was actually built, OR
  - The implementation needs to pivot back to the spec
- **Recommendation:** Convene with the requirements-reviewer to formally align. If the self-judging workflow is the intended direction, archive/update `Specifications/dev-workflow-platform.md` and create a new spec that matches FR-WF-* IDs. If the platform spec is still authoritative, a full re-implementation is required.
- **Cross-ref:** TheFixer (reconcile plan); requirements-reviewer (spec ownership)

---

### QO-003: Tiered Merge Pipeline Spec Has Zero Implementation

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** `FR-TMP-001` through `FR-TMP-010` (risk classification, E2E generation, Playwright runner, auto-PR, AI PR review, auto-merge) are defined in the tiered-merge-pipeline spec. No `FR-TMP-*` traceability comments exist anywhere in `Source/`. The plan directory (`Plans/tiered-merge-pipeline/`) contains QA/security reports but **no `requirements.md`**, so the traceability enforcer cannot even scan it.
- **Recommendation:** Either create `Plans/tiered-merge-pipeline/requirements.md` mirroring the FR-TMP-* IDs and begin implementation, or formally mark these FRs as deferred in the spec.

---

### QO-004: `dependencyCheckDuration` Histogram Missing from Metrics

- **Severity:** P2
- **Category:** spec-drift / pattern-violation
- **File:** `Source/Backend/src/metrics.ts:63`
- **Detail:** `FR-dependency-metrics` specifies **4** Prometheus metrics: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `cycleDetectionEvents` counter ✅, and `dependencyCheckDuration` **histogram** ❌. The histogram (measuring latency of dependency readiness checks) is not defined in `metrics.ts` and is not exported. Routes and services that check readiness do not record duration.
- **Recommendation:** Add a `Histogram` for `dependency_check_duration_seconds` in `metrics.ts` and instrument the `isReady()` and `computeHasUnresolvedBlockers()` calls.

---

### QO-005: `FR-dependency-seed` — Seed Data Not Implemented

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/` (no seed file exists)
- **Detail:** The dependency-linking spec requires idempotent seed data: BUG-0010 blocked by BUG-0003/0004/0005/0006/0007; FR-0004 blocked by FR-0003; FR-0005 blocked by FR-0002; FR-0007 blocked by FR-0003 — _seeded after base items exist_. No seed file, no seed script, and no `// Verifies: FR-dependency-seed` comment exists anywhere in `Source/`. The in-memory store starts empty on each run.
- **Recommendation:** Create `Source/Backend/src/seed.ts` with idempotent seeding logic; call it from `app.ts` startup when `NODE_ENV !== 'test'`.

---

### QO-006: Architecture Rule Violation — Routes Call Store Directly (No Service Layer)

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12–14`, `Source/Backend/src/routes/workflow.ts:15`
- **Detail:** CLAUDE.md mandates: _"No direct DB calls from route handlers — use the service layer."_ Both route files import `* as store from '../store/workItemStore'` and call store functions directly (e.g., `store.createWorkItem()`, `store.findAll()`, `store.updateWorkItem()`). While this is an in-memory store rather than a database, the architectural pattern is violated — routing concerns are coupled to persistence concerns. The workflow actions in `workflow.ts` correctly go through service functions for domain logic (routeWorkItem, assessWorkItem), but then call `store.*` for CRUD updates directly in the route handlers.
- **Recommendation:** Create a `workItemService.ts` that wraps store operations and add business-logic validation there. Route handlers should only marshal input, call service, and marshal output.

---

### QO-007: Traceability Enforcer False-PASS — Only Scans Most-Recent Plan

- **Severity:** P2
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py:38–47`
- **Detail:** `python3 tools/traceability-enforcer.py` (the mandated verification gate) auto-selects the **most recently modified** `requirements.md`. Today it targets `Plans/self-judging-workflow/requirements.md` and reports `TRACEABILITY PASSED`. It silently skips `Plans/dev-workflow-platform/requirements.md` (34 unimplemented FRs) and all other plans. This creates a **false green gate** — agents run the gate, see PASSED, and miss the full picture.
- **Recommendation:** Update the enforcer to scan **all** `requirements.md` files in `Plans/` (or at least emit a warning that other plans were skipped). Alternatively, add a CI step that explicitly runs the enforcer against each known plan.

---

### QO-008: Dual Logger Implementations with Incompatible Signatures

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Backend/src/logger.ts` and `Source/Backend/src/utils/logger.ts`
- **Detail:** Two logger implementations exist. `utils/logger.ts` uses `logger.info('message', { ctx })` (string-first API). `logger.ts` is a compatibility shim that accepts both strings and `{ msg, ...rest }` objects. Different source files use different callers — `workItemStore.ts` calls `logger.info('Work item created', { id })` while route files call `logger.info({ msg: 'Work item created', workItemId })`. This results in inconsistent JSON log structure in production: some entries use `{"message": "..."}`, others use `{"msg": "..."}`.
- **Recommendation:** Standardize on one signature. Remove the compat shim; migrate all callers to `{ msg, ...fields }` object-style and use a single logger.

---

### QO-009: ESLint Suppressions Hide React Hook Dependency Bugs

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions exist in production code. These suppress warnings that often indicate stale closure bugs — components may use outdated data because the effect does not re-run when dependencies change.
- **Recommendation:** Audit both suppression sites. If the omitted deps are truly safe to exclude (intentional once-only effects), add a comment explaining why. If not, fix the dependency array.

---

### Overall Grade: **D**

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| P1 findings | 2 | 0 max (grade A/B) | ❌ |
| P2 findings | 5 | ≤3 max (grade A) | ❌ |
| Spec coverage (blended) | ~32% | ≥80% (grade A) | ❌ |

**Dominant issues:** Two un-waivable P1 findings (search route not implemented, entire platform spec untraced) and cross-spec coverage of 32% place this squarely in the D band.

---

```json
{
  "audit_date": "2026-11-11",
  "grade": "D",
  "spec_coverage": {
    "self_judging_workflow": "100%",
    "dependency_linking": "94%",
    "dev_workflow_platform": "0%",
    "tiered_merge_pipeline": "0%",
    "blended": "32%"
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift/untested",         "summary": "GET /api/search route not implemented; 5 tests explicitly written to fail" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift",                   "summary": "dev-workflow-platform.md FR-001–FR-032 (34 FRs) have zero implementation in Source/" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift",                   "summary": "tiered-merge-pipeline.md FR-TMP-001–010 have zero implementation" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift/pattern-violation", "summary": "dependencyCheckDuration histogram missing from metrics.ts" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift",                   "summary": "FR-dependency-seed: no seed data implementation exists" },
    { "id": "QO-006", "severity": "P2", "category": "architecture-violation",       "summary": "Route handlers call store directly; no service layer intermediary" },
    { "id": "QO-007", "severity": "P2", "category": "pattern-violation",            "summary": "Traceability enforcer only scans most-recent plan — false PASS reported" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation",            "summary": "Two logger implementations with incompatible call signatures" },
    { "id": "QO-009", "severity": "P3", "category": "pattern-violation",            "summary": "eslint-disable suppressions on react-hooks/exhaustive-deps in production hooks" }
  ],
  "escalations": []
}
```
