---

## Quality Oracle Findings

**Audit date:** 2026-08-15  
**Grade: C** — 1 P1 violation disqualifies B (which requires zero P1s)

---

### Spec Coverage

| Scope | FRs | Covered | % |
|---|---|---|---|
| Workflow Engine (FR-WF-001–013) | 13 | 13 | **100%** |
| Dependency Linking (FR-dependency-*) | 15 | 14 | **93%** |
| Tiered Merge Pipeline (FR-TMP-001–010) | 10 | 0 | **0%** |
| dev-workflow-platform (FR-001–085) | 85 | 0 | n/a — portal/ project, not Source/ |

**In-scope total (workflow engine + dependency):** 27/28 = **96%**  
**Including FR-TMP obligations:** 27/38 = **71%**

---

### QO-001 — Missing `GET /api/search` Route Implementation
- **Severity:** P1
- **Category:** untested / spec-drift
- **File:** `Source/Backend/src/app.ts` (no `/api/search` registration); `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** `FR-dependency-search` is a formal requirement in `Plans/dependency-linking/requirements.md`. The `DependencyPicker` typeahead calls `GET /api/search`, the API client implements `searchItems()`, and 5 test cases exist in `search.test.ts` — but the route is never registered in `app.ts`. The test file itself comments: *"these tests will FAIL until the route is implemented."* Those failures are silent in the CI baseline only if `--passWithNoTests` is somehow in play; otherwise they are active failures.
- **Recommendation:** Add a `/api/search` route handler in a new `Source/Backend/src/routes/search.ts`, register it in `app.ts`, and remove the warning comment once tests pass. The route must filter non-deleted items by title/description match on query param `q`.
- **Cross-ref:** TheFixer (implementation); traceability-enforcer with `--file Plans/dependency-linking/requirements.md` should catch this.

---

### QO-002 — FR-TMP-001 through FR-TMP-010 Have Zero Source Coverage
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md:17`
- **Detail:** `Specifications/tiered-merge-pipeline.md` defines 10 functional requirements (FR-TMP-001 Risk Classification, FR-TMP-002 Playwright E2E test generation, FR-TMP-003 E2E runner pipeline phase, FR-TMP-004 Auto-PR creation, FR-TMP-005 AI PR review, FR-TMP-006 Auto-merge, FR-TMP-007 Configuration, FR-TMP-008 Worker container prereqs, FR-TMP-009 Run JSON extensions, FR-TMP-010 Error handling). `spec-drift-audit.py` confirms **0% coverage** — no `// Verifies: FR-TMP-*` comments exist anywhere in `Source/` or platform tooling. `Source/E2E/playwright.config.ts` exists but carries no traceability back to these FRs.
- **Recommendation:** Either: (a) add `// Verifies: FR-TMP-NNN` comments to the E2E Playwright configs and platform scripts that implement these FRs, or (b) create a `Plans/tiered-merge-pipeline/requirements.md` that the traceability enforcer can scan. The FR-TMP spec is not a template — it describes live pipeline behavior.
- **Cross-ref:** platform/ maintainers (solo-session only per CLAUDE.md).

---

### QO-003 — Route Handlers Bypass Service Layer (Architecture Violation)
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:44`, `Source/Backend/src/routes/workflow.ts:44`, `Source/Backend/src/routes/intake.ts:19`
- **Detail:** CLAUDE.md rule: *"No direct DB calls from route handlers — use the service layer."* Across three route files, `store.*` functions are called directly from request handlers at **12+ call sites** (e.g., `store.createWorkItem()`, `store.findById()`, `store.findAll()`, `store.updateWorkItem()`, `store.softDelete()`). The store is in-memory rather than a DB, but the layering rule still applies — it ensures business logic remains testable in isolation and doesn't bleed into the HTTP boundary. The `workflow.ts` route also performs status-transition logic inline (setting `assignedTeam`, mutating `changeHistory`) that belongs in a service.
- **Recommendation:** Introduce a `workItemService.ts` that wraps store operations and expose only service functions from routes. For `workflow.ts`, move the inline state-mutation blocks (lines 119–140, 175–200, 269–290) into the `router.ts` or a new `workflowService.ts`.
- **Cross-ref:** TheFixer — refactor scope.

---

### QO-004 — `spec-drift-audit.py` Incorrectly Reports 0% Coverage of Active Requirements
- **Severity:** P2
- **Category:** pattern-violation / tooling
- **File:** `tools/spec-drift-audit.py:36`
- **Detail:** The tool scans `Specifications/` for canonical FR IDs (`FR-[A-Z]{2,4}-\d{3}` regex) and finds only the 10 `FR-TMP-*` IDs from `tiered-merge-pipeline.md`. It does **not** scan `Plans/` where the active requirements for Source/ live (`FR-WF-*`, `FR-dependency-*`). Result: the tool reports 0 of 10 canonical FRs covered and classifies the 13 `FR-WF-XXX` source annotations as "untracked implementations" — a false alarm that would trigger alarm in any CI gate using this tool. Meanwhile, the 69 FRs in `dev-workflow-platform.md` use plain `FR-NNN` format and are invisible to the tool entirely.
- **Recommendation:** Either (a) extend `spec-drift-audit.py` to also scan `Plans/*/requirements.md` as a source of canonical FRs, or (b) populate `tools/fr-aliases.json` to map `FR-WF-001→FR-WF-001` through `FR-WF-013` and `FR-dependency-*` so the tool recognises them. Also clarify in `Specifications/` that `dev-workflow-platform.md` is scoped to the `portal/` project, not `Source/`.

---

### QO-005 — `eslint-disable` Comments Suppressing Hook Dependency Warnings in Production
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` via `// eslint-disable-next-line`. CLAUDE.md lists disabled linting rules as a code pattern violation. In `useWorkItems.ts`, a stale-closure bug may be hidden; in `DependencyPicker.tsx`, an intentionally-missing dependency in a debounce effect is the likely cause. These should be explicitly documented or refactored (use `useCallback` wrapping or add the dependency safely).
- **Recommendation:** For each suppress comment, document *why* the lint rule can be safely bypassed with a comment, or restructure the hook to satisfy the linter without disabling.

---

### QO-006 — Duplicate Test Files for WorkItemDetailPage and WorkItemListPage
- **Severity:** P3
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`; same for `WorkItemListPage`
- **Detail:** Both pages have a test in `tests/` (root) and a second test in `tests/pages/`. The root-level files appear to be older versions; the `tests/pages/` versions are more complete (more assertions). If both run, they may exercise overlapping but different scenarios, making coverage reporting ambiguous and creating maintenance surface.
- **Recommendation:** Consolidate to one canonical location (`tests/pages/` matches the source structure `src/pages/`). Delete or merge the root-level duplicates.

---

### QO-007 — `Specifications/dev-workflow-platform.md` Scope Ambiguity
- **Severity:** P3
- **Category:** spec-drift / doc-stale
- **File:** `Specifications/dev-workflow-platform.md:337`
- **Detail:** This document defines 85 FRs (FR-001–FR-085) for a SQLite-backed platform with feature requests, bug reports, and dev cycles. The `Source/` directory implements the **Self-Judging Workflow Engine** (an entirely different domain). The two specs describe different applications. Plans like `Plans/dev-workflow-platform/`, `Plans/dependency-linking/`, `Plans/orchestrated-dev-cycles/` reference the portal app. Without clear labelling, future agents may incorrectly try to implement portal FRs inside the workflow engine Source.
- **Recommendation:** Add a scope header to `Specifications/dev-workflow-platform.md` — e.g. `> **Scope:** portal/ codebase (SQLite backend). For the Source/ workflow engine see workflow-engine.md and Plans/self-judging-workflow/.`

---

### QO-008 — Frontend UI Components Without Dedicated Tests
- **Severity:** P4
- **Category:** test-coverage
- **File:** `Source/Frontend/src/components/Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`
- **Detail:** Four shared components lack any dedicated test file. All are used extensively (Layout wraps every page; the three badge components appear in list and detail views). `BlockedBadge.tsx`, `DependencyPicker.tsx`, and `DependencySection.tsx` all have tests — these four do not.
- **Recommendation:** Add `tests/components/Layout.test.tsx` and badge tests asserting correct className/text for each prop value. The badge components are small enough to reach 100% branch coverage in under 20 lines each.

---

### QO-009 — `DebugPortalPage` Untested
- **Severity:** P4
- **Category:** test-coverage
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx`
- **Detail:** No test file exists for `DebugPortalPage`. The page renders an `<iframe>` embedding the portal at `http://localhost:4200`. While trivial, it carries a `// Verifies: dev-crew debug portal` comment referencing an undefined FR ID, and a smoke test would ensure the iframe renders without crash.
- **Recommendation:** Add a minimal render test and correct the comment to reference a valid FR ID or label it as infrastructure.

---

```json
{
  "audit_date": "2026-08-15",
  "grade": "C",
  "spec_coverage": {
    "workflow_engine": { "total": 13, "covered": 13, "pct": 100 },
    "dependency_linking": { "total": 15, "covered": 14, "pct": 93 },
    "tiered_merge_pipeline": { "total": 10, "covered": 0, "pct": 0 },
    "dev_workflow_platform": { "note": "portal/ project, not Source/ — excluded from coverage" }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "GET /api/search route unimplemented; 5 tests fail" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-001 through FR-TMP-010: 0% source coverage" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Route handlers call store directly (12+ sites)" },
    { "id": "QO-004", "severity": "P2", "category": "tooling", "title": "spec-drift-audit.py scans Specifications/ only, misses Plans/ FRs" },
    { "id": "QO-005", "severity": "P3", "category": "pattern-violation", "title": "2 eslint-disable comments in production source" },
    { "id": "QO-006", "severity": "P3", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-007", "severity": "P3", "category": "doc-stale", "title": "dev-workflow-platform.md scope ambiguity (portal/ vs Source/)" },
    { "id": "QO-008", "severity": "P4", "category": "test-coverage", "title": "4 frontend UI components without dedicated tests" },
    { "id": "QO-009", "severity": "P4", "category": "test-coverage", "title": "DebugPortalPage untested" }
  ],
  "escalations": [],
  "traceability_enforcer": "PASS (Plans/self-judging-workflow only — dependency-linking not scanned by default)"
}
```

---

**Learnings updated** at `Teams/TheInspector/learnings/quality-oracle.md` with coverage trend, tool discovery, and the P1/P2 issue register for re-verification on the next run.
