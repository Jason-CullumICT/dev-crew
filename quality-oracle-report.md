Now let me produce the full audit findings report:

---

## Quality Oracle Findings

### Spec Coverage

**Active spec coverage (workflow-engine.md + dependency-linking):** **96%** (27/28 requirements traced; FR-dependency-search intentionally deferred)

**Nominal coverage (all `Specifications/` docs):** **28%** — inflated-low because `dev-workflow-platform.md` (74 FRs, stale/superseded product) and `tiered-merge-pipeline.md` (10 FRs, platform layer) live in `Specifications/` but are not implemented in `Source/`.

**Grade: B** *(0 P1 when stale spec excluded; 4 P2; effective coverage >80%)*
**Grade: D** *(if graded on nominal coverage — misleading, see QO-001)*

---

### QO-001: Stale Spec Pollutes Specifications/ Directory
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** This 74-FR spec describes a different product ("Feature Requests / Bug Reports / Dev Cycles platform") from the one actually implemented in `Source/` (the "Self-Judging Workflow Engine"). Running the enforcer against it shows **0/74 implemented**. Meanwhile `Specifications/workflow-engine.md` is the current active spec (100% implemented). Leaving the superseded spec in `Specifications/` (the "domain truth" directory) causes any inspector, auditor, or new agent to perceive catastrophic drift that doesn't exist. CLAUDE.md says specs are "the most critical documents."
- **Recommendation:** Move `Specifications/dev-workflow-platform.md` to `Plans/dev-workflow-platform/` or `docs/archive/` and add a note in `Specifications/` README that `workflow-engine.md` is the current active domain spec.
- **Cross-ref:** Coordinate with requirements-reviewer before archiving.

---

### QO-002: Inspector Config Traceability Pattern Doesn't Match Actual IDs
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Teams/TheInspector/inspector.config.yml:36`
- **Detail:** The config sets `traceability: "FR-\\d+"` (matches `FR-001`, `FR-042`), but every traceability comment in `Source/` uses `FR-WF-\d+` (e.g., `FR-WF-001`) or `FR-dependency-\w+` (e.g., `FR-dependency-service`). The pattern will never match any `// Verifies:` comment in the codebase. Any inspector specialist using this regex for static analysis will report 0% coverage — a false alarm.
- **Recommendation:** Update the pattern to `"FR-(?:WF|dependency|TMP)-[A-Z0-9-]+"` or the broader `"FR-[A-Z0-9][A-Z0-9-]*"`.

---

### QO-003: GET /api/search Endpoint Unimplemented — Tests Will Fail
- **Severity:** P2
- **Category:** untested
- **File:** `Source/Backend/tests/routes/search.test.ts:1–11`
- **Detail:** `FR-dependency-search` (cross-entity typeahead search for the DependencyPicker) has a full test file — but the route is never registered in `app.ts`. The test file self-documents this: *"These tests document the expected contract and will FAIL until the route is implemented."* The `DependencyPicker.tsx` component depends on this API for its search functionality. Dependency picker UX is broken in production.
- **Recommendation:** Implement `GET /api/search?q=` route in `Source/Backend/src/routes/` and register it in `app.ts`. This is a pre-existing S-weight task in `Plans/dependency-linking/requirements.md`.
- **Cross-ref:** Route to TheFixer (small implementation gap).

---

### QO-004: Route Handlers Access Store Directly — Architecture Rule Violated
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/intake.ts:4`, `Source/Backend/src/routes/workflow.ts:15`
- **Detail:** All three route files `import * as store from '../store/workItemStore'` and call store functions directly (e.g., `store.findAll()`, `store.createWorkItem()`). CLAUDE.md architecture rule: **"No direct DB calls from route handlers — use the service layer."** The store IS the data layer; routes should call services which call the store. This pattern exists for `changeHistory`, `dependency`, `router`, `assessment` services — but basic CRUD bypasses the service layer entirely.
- **Failure scenario:** Business logic (e.g., change tracking, cascade dependency checks) added to the service layer won't be invoked because routes bypass it.
- **Recommendation:** Extract store interactions into `workItemService.ts` (CRUD + business rules) and have routes call that. Pattern already established by `dependency.ts`, `router.ts`, `assessment.ts`.

---

### QO-005: Pagination Limit Has No Maximum Cap — Unbounded Data Exfiltration
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:70`, `Source/Backend/src/store/workItemStore.ts:35`
- **Detail:** `GET /api/work-items?limit=999999` is accepted as-is. The store will return all items in a single response with no cap. `inspector.config.yml` explicitly flags "Unbounded list exfiltration" as a threat scenario. The default is 20, but any caller can override it.
- **Failure scenario:** Caller sets `limit=100000`, receives every work item in one payload.
- **Recommendation:** Add `const MAX_LIMIT = 100;` and clamp: `const limit = Math.min(pagination.limit || 20, MAX_LIMIT);` in `workItemStore.findAll()` or at the route level.
- **Cross-ref:** [ESCALATE → TheGuardians] — Security concern per inspector config threat model.

---

### QO-006: Duplicate Test Files for Same Components
- **Severity:** P3
- **Category:** test-coverage
- **Files:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`; same for `WorkItemListPage`
- **Detail:** Two separate test files exist for `WorkItemDetailPage` and `WorkItemListPage`. They are not identical — the `tests/pages/` versions are more thorough (additional imports, richer mocks, more test cases). Running both sets a doubled test count and creates maintenance drift risk. Neither is clearly "the" canonical test.
- **Recommendation:** Consolidate by keeping the more complete `tests/pages/` versions and removing the top-level duplicates, or vice-versa. Add a note in the top-level test dir to prevent re-duplication.

---

### QO-007: eslint-disable Without Justification Comment
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line` but give no explanation. CLAUDE.md does not explicitly call this out, but disabling lint rules silently is an anti-pattern and makes future reviewers uncertain whether the suppression is intentional.
- **Recommendation:** Add a one-line comment above each disable explaining WHY (e.g., `// Intentionally excluding workItemsApi: stable singleton reference, not reactive`).

---

### QO-008: Silent Error Swallow in API Client
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}))` silently discards JSON parse errors, returning an empty object `{}`. CLAUDE.md rule: **"Never swallow errors silently."** If the server returns a non-JSON error body, the caller receives `{}` with no indication of failure.
- **Failure scenario:** Server returns `500 Internal Server Error` with HTML body → `body.message` is `undefined` → error message becomes "Request failed: 500" with no server detail.
- **Recommendation:** Log the parse error or pass it through: `.catch((parseErr) => { console.warn('Failed to parse error body', parseErr); return {}; })` — at minimum acknowledge it exists. Better: don't swallow at all and let the outer `if (!response.ok)` throw with the status code.

---

### QO-009: Two Logger Abstractions — Architectural Debt
- **Severity:** P3
- **Category:** pattern-violation
- **Files:** `Source/Backend/src/logger.ts` and `Source/Backend/src/utils/logger.ts`
- **Detail:** Two logger files exist for the same concept. `src/utils/logger.ts` is the implementation; `src/logger.ts` is a compat shim wrapping it for routes that `import logger from '../logger'`. The store imports directly from `utils/logger`. This two-logger pattern adds complexity without benefit.
- **Recommendation:** Migrate all imports to point directly at `utils/logger` and delete the shim. Or invert: make `src/logger.ts` the canonical export and have `utils/logger.ts` re-export from it.

---

### QO-010: Frontend Components Missing Tests
- **Severity:** P3
- **Category:** test-coverage
- **Files:** `Source/Frontend/src/components/Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`
- **Detail:** Four UI components have no test files. `BlockedBadge`, `DependencyPicker`, and `DependencySection` DO have tests (added with the dependency-linking plan). The four above were part of the original FR-WF build and remain untested. CLAUDE.md: "Every FR needs a test."
- **Recommendation:** Add `Layout.test.tsx`, `PriorityBadge.test.tsx`, `StatusBadge.test.tsx`, `TypeBadge.test.tsx` under `Source/Frontend/tests/components/`.

---

### QO-011: Backend Infrastructure Files Without Tests
- **Severity:** P3
- **Category:** test-coverage
- **Files:** `Source/Backend/src/middleware/errorHandler.ts`, `Source/Backend/src/utils/id.ts`
- **Detail:** The error handler and ID generator have no dedicated unit tests. The error handler is critical — a regression here breaks all error responses.
- **Recommendation:** Add `tests/middleware/errorHandler.test.ts` with tests for 500 response shape, logging, and content-type. Add `tests/utils/id.test.ts` for the `WI-XXX` generation sequence.

---

### QO-012: node_modules Not Installed — Verification Gates Cannot Run
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `Source/Backend/`, `Source/Frontend/`
- **Detail:** Neither backend nor frontend have `node_modules` installed. Running `npm test` fails with `"jest: not found"`. CLAUDE.md verification gates (`npm test --workspaces --if-present`) cannot execute. Any agent completing a task cannot actually run the verification gates as required.
- **Recommendation:** Ensure `npm install` is run in both `Source/Backend/` and `Source/Frontend/` as part of CI setup and agent startup. Consider adding a bootstrap script or README note.

---

### JSON Summary

```json
{
  "run_date": "2026-08-16",
  "auditor": "quality-oracle",
  "spec_coverage": {
    "effective_pct": 96,
    "nominal_pct": 28,
    "active_specs": {
      "workflow_engine": { "total": 13, "covered": 13, "pct": 100 },
      "dependency_linking": { "total": 15, "covered": 14, "pct": 93, "note": "FR-dependency-search intentionally deferred" }
    },
    "inactive_specs": {
      "dev_workflow_platform": { "total": 74, "covered": 0, "status": "stale/superseded" },
      "tiered_merge_pipeline": { "total": 10, "covered": 0, "status": "platform-layer, not Source/" }
    }
  },
  "grade": "B",
  "grade_note": "B on effective coverage (96%, 0 P1, 4 P2); would be D on nominal coverage due to stale spec — see QO-001",
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "spec-drift",            "title": "Stale dev-workflow-platform.md in Specifications/" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Inspector config traceability pattern wrong (FR-\\d+ vs FR-WF-/FR-dependency-)" },
    { "id": "QO-003", "severity": "P2", "category": "untested",              "title": "GET /api/search unimplemented — DependencyPicker broken" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "Routes call store directly, bypassing service layer" },
    { "id": "QO-005", "severity": "P2", "category": "architecture-violation", "title": "Unbounded pagination limit — no cap on GET /api/work-items?limit" },
    { "id": "QO-006", "severity": "P3", "category": "test-coverage",         "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation",     "title": "eslint-disable without justification comment" },
    { "id": "QO-008", "severity": "P3", "category": "architecture-violation","title": "Silent error swallow in api/client.ts catch" },
    { "id": "QO-009", "severity": "P3", "category": "pattern-violation",     "title": "Two logger abstractions (logger.ts + utils/logger.ts)" },
    { "id": "QO-010", "severity": "P3", "category": "test-coverage",         "title": "Layout, PriorityBadge, StatusBadge, TypeBadge missing tests" },
    { "id": "QO-011", "severity": "P3", "category": "test-coverage",         "title": "errorHandler.ts and utils/id.ts missing tests" },
    { "id": "QO-012", "severity": "P2", "category": "pattern-violation",     "title": "node_modules not installed — verification gates cannot run" }
  ],
  "p1_count": 0,
  "p2_count": 5,
  "p3_count": 6,
  "p4_count": 0,
  "escalations": [
    { "id": "QO-005", "route_to": "TheGuardians", "reason": "Unbounded list exfiltration matches inspector.config threat scenario" }
  ]
}
```

---

**Summary for routing:**

| Priority | Finding | Route To |
|----------|---------|----------|
| P2 | QO-001 Stale spec in Specifications/ | requirements-reviewer |
| P2 | QO-002 Inspector config pattern wrong | solo-session (config change) |
| P2 | QO-003 GET /api/search unimplemented | TheFixer |
| P2 | QO-004 Routes bypass service layer | TheFixer |
| P2 | QO-005 Unbounded pagination | TheGuardians → TheFixer |
| P2 | QO-012 node_modules missing | solo-session / CI setup |
| P3 | QO-006 Duplicate test files | TheFixer |
| P3 | QO-007–011 Various hygiene | TheFixer |
