Now the full findings report:

---

## Quality Oracle Findings — 2026-07-06

### Spec Coverage Summary

| Scope | Requirements | Covered | Coverage |
|-------|-------------|---------|----------|
| `Source/` — Workflow Engine (FR-WF-*) | 13 | 13 | **100%** ✅ |
| `Source/` — Dependency Tracking (FR-dependency-*) | 16 | 15 | **94%** ⚠️ |
| `platform/` — Tiered Merge Pipeline (FR-TMP-*) | 10 | 10 | **100%** ✅ (in platform/) |
| `spec-drift-audit.py` output | 10 | 0 | **0%** ❌ (tool misconfigured) |

**Grade (pre-fix): B** — 0 P1, 3 P2 findings, true Source/ spec coverage 100% (tool reads false 0% due to misconfiguration).

---

### QO-001: Missing `/api/search` Endpoint — FR-dependency-search Unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/app.ts`
- **Detail:** `FR-dependency-search` requires `GET /api/search?q=` for cross-entity typeahead used by `DependencyPicker`. The route file `Source/Backend/src/routes/` has no `search.ts`, and `app.ts` registers no search router. The test file `tests/routes/search.test.ts` explicitly acknowledges this: *"GET /api/search endpoint is NOT wired into app.ts. These tests will FAIL until the route is implemented."* The frontend `client.ts:searchItems()` calls this endpoint — the DependencyPicker modal's search is broken end-to-end.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` implementing `GET /api/search?q=` that delegates to a `searchService.search(q)` function scanning work items. Register it in `app.ts` with `app.use('/api', searchRouter)`. Remove the `NOTE` comment from `search.test.ts` once done.
- **Cross-ref:** TheFixer (code gap); tests already written and ready to drive implementation.

---

### QO-002: Architecture Violation — Route Handlers Access Store Directly
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/workflow.ts:15`, `Source/Backend/src/routes/intake.ts:4`
- **Detail:** All three route files `import * as store from '../store/workItemStore'` and call `store.createWorkItem()`, `store.findAll()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()` directly from route handler functions. CLAUDE.md architecture rule (non-negotiable): *"No direct DB calls from route handlers — use the service layer."* The services directory (`Source/Backend/src/services/`) has `assessment.ts`, `router.ts`, `dependency.ts`, `dashboard.ts` — all correctly abstracted — but there is no `workItemService.ts` to encapsulate CRUD and lookup operations. Routes are doing service-layer work.
- **Failure scenario:** Adding caching, pagination optimisations, or access-control checks to work item reads/writes requires editing route files rather than a single service, risking inconsistency across the three routes. Any store API change must be coordinated across all three route files.
- **Recommendation:** Extract `Source/Backend/src/services/workItemService.ts` wrapping `store.*` calls (`createItem`, `listItems`, `getItemById`, `updateItem`, `deleteItem`). Update all three route files to import only from `workItemService`. Traceability comments already on `workItemStore` can stay; add `// Verifies: FR-WF-001, FR-WF-002` to the new service.
- **Cross-ref:** TheFixer.

---

### QO-003: spec-drift-audit.py Generates False 0% Coverage Signal
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/spec-drift-audit.py:43`, `spec-drift-report.json`
- **Detail:** The tool scans `Specifications/` for canonical FR IDs matching `FR-[A-Z]{2,4}-\d{3}`. The only spec file using that format is `tiered-merge-pipeline.md` (FR-TMP-001..010). Source/ implements `FR-WF-*` requirements whose authoritative source is `Plans/self-judging-workflow/requirements.md` (not `Specifications/`). The tool therefore finds 10 canonical FRs, sees 0 covered, and writes `"coverage_percentage": "0.0%"` to `spec-drift-report.json`. This is a false negative: `python3 tools/traceability-enforcer.py` (the correct gate per CLAUDE.md) reports `TRACEABILITY PASSED`. The dashboard and any agent reading `spec-drift-report.json` gets a misleading health signal.
- **Failure scenario:** A future agent reads `spec-drift-report.json`, sees 0% coverage, and concludes Source/ is unimplemented — triggering unnecessary rework or stalled pipelines.
- **Recommendation:** Two options: (a) Add `Plans/self-judging-workflow/requirements.md` as an alias source to `spec-drift-audit.py` with an `fr-aliases.json` mapping `FR-WF-XXX → FR-WF-XXX`; or (b) Move the workflow engine requirements into `Specifications/workflow-engine-requirements.md` using the canonical `FR-WF-\d{3}` format and update both tools. Immediately: add a comment to `spec-drift-report.json` generation noting that FR-WF-* coverage is tracked separately by `traceability-enforcer.py`.
- **Cross-ref:** The tiered merge pipeline FR-TMP-* coverage lives in `platform/orchestrator/` and is intentionally outside Source/ scope — this is correct by design.

---

### QO-004: Stale Pipeline Artifact Committed to Source/E2E/
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/E2E/playwright.pipeline.config.ts:4`
- **Detail:** File hardcodes `testDir: "./tests/cycle-run-1774659927912-8dd3ac77"` — a specific pipeline run ID from a past execution. The directory `Source/E2E/tests/cycle-run-1774659927912-8dd3ac77/` may not exist or may contain E2E tests from a single historical run. The file also lacks a `// Verifies:` traceability comment. Per FR-TMP-002, E2E test files are generated per cycle — this config was presumably auto-generated and accidentally committed.
- **Recommendation:** Delete `Source/E2E/playwright.pipeline.config.ts` (the canonical config is `playwright.config.ts`). If the pipeline config is intentional, add a `// Verifies: FR-TMP-003` comment and use an environment variable for the run-specific `testDir`. Add `playwright.pipeline.config.ts` to `.gitignore`.
- **Cross-ref:** FR-TMP-002, FR-TMP-003.

---

### QO-005: DebugPortalPage.tsx Has No Spec Requirement
- **Severity:** P3
- **Category:** untested / spec-drift
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The page uses `// Verifies: dev-crew debug portal — embedded container-test viewer` which is not a valid FR-WF-* requirement ID. It is not mentioned in `Plans/self-judging-workflow/requirements.md` or `Specifications/workflow-engine.md`. The route `/debug` is registered in `App.tsx` and links to the portal via iframe. This is an unlinked implementation — scope creep that exists outside the spec.
- **Recommendation:** Either (a) add a requirement `FR-WF-014: Debug portal embedded view` to `Plans/self-judging-workflow/requirements.md`, update the comment to `// Verifies: FR-WF-014`, and add a basic test; or (b) if this is intentionally infrastructure-level (not user-facing product), document it with `// dev-crew infrastructure: debug portal iframe — not a product requirement` and remove it from the routes visible to end-users.
- **Cross-ref:** No spec cross-reference possible.

---

### QO-006: Duplicate Test Files for Page Components
- **Severity:** P3
- **Category:** test-coverage
- **Files:** `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines) vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines); same pair for `WorkItemDetailPage`
- **Detail:** Two distinct test files exist for each of these page components. They are not identical — the `tests/pages/` variants import more specific types and use `within()` for scoped queries, suggesting they are newer rewrites. Both files carry `// Verifies: FR-WF-010` (or FR-WF-011). This doubles the maintenance burden and risks the files diverging, leaving gaps where one tests something the other doesn't.
- **Recommendation:** Determine which file is authoritative (the `tests/pages/` variants appear more complete). Merge any unique test cases from the older file into the newer one, then delete the older file. Update the `// Verifies:` comment to clearly reflect all tested acceptance criteria.
- **Cross-ref:** No escalation needed.

---

### QO-007: eslint-disable Comments Without Documented Reason
- **Severity:** P4
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` without a code comment explaining which dependency was intentionally omitted and why. Suppressing this rule without documentation can mask infinite render loops or stale closure bugs.
- **Recommendation:** Add an inline comment above each suppression explaining the intentional omission, e.g.: `// intentionally omit 'fetchItems' — it is a stable closure and including it would cause re-fetches on every render`.

---

### JSON Summary

```json
{
  "audit_date": "2026-07-06",
  "grade": "B",
  "spec_coverage": {
    "source_fr_wf": "100% (13/13)",
    "source_fr_dependency": "94% (15/16 — FR-dependency-search open)",
    "spec_drift_tool_output": "0% (tool misconfigured — false negative)"
  },
  "findings": [
    {"id": "QO-001", "severity": "P2", "category": "spec-drift",           "file": "Source/Backend/src/app.ts",                              "title": "FR-dependency-search: /api/search endpoint not registered"},
    {"id": "QO-002", "severity": "P2", "category": "architecture-violation","file": "Source/Backend/src/routes/workItems.ts:12",              "title": "Routes access workItemStore directly — no service layer for CRUD"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift",           "file": "tools/spec-drift-audit.py",                              "title": "spec-drift-audit.py generates false 0% coverage signal"},
    {"id": "QO-004", "severity": "P3", "category": "pattern-violation",    "file": "Source/E2E/playwright.pipeline.config.ts:4",             "title": "Stale pipeline run ID hardcoded — leftover artifact"},
    {"id": "QO-005", "severity": "P3", "category": "untested",             "file": "Source/Frontend/src/pages/DebugPortalPage.tsx:1",        "title": "DebugPortalPage has no spec requirement — unlinked implementation"},
    {"id": "QO-006", "severity": "P3", "category": "test-coverage",        "file": "Source/Frontend/tests/WorkItemListPage.test.tsx",        "title": "Duplicate test files for page components"},
    {"id": "QO-007", "severity": "P4", "category": "pattern-violation",    "file": "Source/Frontend/src/components/DependencyPicker.tsx:82", "title": "eslint-disable without documented reason"}
  ],
  "p1_count": 0,
  "p2_count": 3,
  "p3_count": 3,
  "p4_count": 1,
  "escalations": []
}
```

---

**Prior findings re-verification:** No prior findings existed (first run — learnings file was empty).
