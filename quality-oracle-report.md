---

## Quality Oracle Findings — 2026-08-28

---

### Spec Coverage Summary

| Scope | FRs | Traced | Coverage |
|-------|-----|--------|----------|
| Active plan (`Plans/self-judging-workflow/requirements.md`) | 13 | 13 | **100%** ✅ |
| `Specifications/` FR-dependency-* (16 FRs) | 16 | 14 | **88%** |
| `Specifications/` FR-001 – FR-069 (legacy platform) | ~77 | 0 | **0%** — see QO-001 |

Traceability enforcer verdict: **PASSED** *(scope-limited — see QO-003)*

---

### QO-001 · Stale Canonical Spec — 77+ Requirements Describe a Deprecated Platform
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The primary spec contains FR-001 through FR-069 (feature request APIs, bug report APIs, development cycle management, CI/CD pipeline, learning records, etc.) plus FR-033–FR-049 (pipeline orchestration) and FR-050–FR-069 (dev cycle traceability). **None of these are implemented in `Source/`.** The codebase pivoted to a WorkItem-based self-judging workflow engine (`Plans/self-judging-workflow/`) with no update, supersession notice, or archive marker on the old spec. `Specifications/dev-workflow-platform.md` remains active (no `DEPRECATED` header) but describes a system that no longer exists.
- **Evidence:** `grep -oE "FR-[A-Za-z0-9-]+" Specifications/dev-workflow-platform.md` yields 93 unique IDs; `grep -rn "Verifies:.*FR-00[0-9]\|FR-0[1-9][0-9]" Source/` returns 0 matches.
- **Recommendation:** Either (a) add a `> **DEPRECATED** — superseded by Plans/self-judging-workflow` banner to `Specifications/dev-workflow-platform.md`, or (b) write a new `Specifications/self-judging-workflow.md` that replaces it as the canonical domain truth and retire the old spec. CLAUDE.md mandates specs are source of truth — a spec nobody traces to is dead weight and misleads future agents.
- **Cross-ref:** QO-003 (enforcer gap lets this silently pass)

---

### QO-002 · Routes Directly Import the Store — Service Layer Bypassed
- **Severity:** P2
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/routes/workItems.ts:12`
  - `Source/Backend/src/routes/intake.ts:4`
  - `Source/Backend/src/routes/workflow.ts:15`
- **Detail:** All three route handlers do `import * as store from '../store/workItemStore'` and call store CRUD directly. CLAUDE.md rule: *"No direct DB calls from route handlers — use the service layer."* The in-memory store is the persistence layer; this pattern makes routes depend on persistence implementation details and cannot be unit-tested without the store. `assessment.ts`, `router.ts`, and `dashboard.ts` services exist and are correctly positioned; the CRUD path breaks that pattern.
- **Failure scenario:** A future change swapping the in-memory store for a real DB forces edits inside every route file rather than only in one service. Tests that mock the route layer can't isolate store behavior.
- **Recommendation:** Extract a `WorkItemService` (or add methods to existing services) wrapping `createWorkItem`, `findAll`, `findById`, `updateWorkItem`, `softDelete`. Route handlers import the service, not the store. The store remains the store's internal concern.
- **Cross-ref:** TheFixer (refactor task)

---

### QO-003 · Traceability Enforcer Scope Gap — Specifications/ Never Checked
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer's `get_active_requirements()` function only scans `Plans/*/requirements.md` files and picks the **most recently modified one** (currently `Plans/self-judging-workflow/requirements.md`). It never reads `Specifications/`. The 93 FR IDs in the canonical spec are never validated. The tool reports "TRACEABILITY PASSED" while 77 main-spec FRs are untraced. This false-green misleads agents and solo sessions.
- **Failure scenario:** An agent believes spec coverage is 100% because the enforcer passed; it actually has no idea whether the canonical spec is covered.
- **Recommendation:** Add a `--spec` flag (or a `Specifications/` scan mode) that also checks `Specifications/*.md` against `Source/`. At minimum, add a comment to `tools/traceability-enforcer.py` warning that it only covers active plans, not the canonical spec directory.

---

### QO-004 · FR-dependency-search: `/api/search` Not Wired in app.ts
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/tests/routes/search.test.ts:1–7`
- **Detail:** `FR-dependency-search` (from `Specifications/dev-workflow-platform.md:473`) requires a `GET /api/search?q=` cross-entity typeahead endpoint. The test file explicitly self-documents that the route is **not wired into `app.ts`** and the tests will fail until implemented. No route handler for `/api/search` exists in `Source/Backend/src/routes/`. The `DependencyPicker` frontend component depends on this endpoint for its typeahead search.
- **Failure scenario:** `DependencyPicker` search input sends requests to `/api/search` and receives 404s; dependency linking via typeahead is broken in the UI.
- **Recommendation:** Implement the search handler (filter `workItemStore.findAll()` by title/description substring) and register it in `app.ts`. The test contract is already written.
- **Cross-ref:** TheFixer

---

### QO-005 · Duplicate Test Files — Root `tests/` vs `tests/pages/`
- **Severity:** P3
- **Category:** test-coverage
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines, **no Verifies comments**)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines, has Verifies)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (has Verifies)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (also exists)
- **Detail:** Two sets of test files cover the same pages with overlapping but differently named test cases (confirmed via `diff`). The root-level versions predate the `tests/pages/` versions; the latter have proper `// Verifies:` traceability while the root versions do not. Both run in the test suite, doubling execution time for these pages and creating confusion about which is authoritative.
- **Recommendation:** Delete the root-level `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` (the non-tracing versions) and treat `tests/pages/` as canonical. Confirm zero coverage regression before deleting.

---

### QO-006 · FR-dependency-seed Not Implemented
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:475`
- **Detail:** `FR-dependency-seed` specifies idempotent seed data (items with pre-linked blockers) that should run after base items exist. No seed script or seed initialization exists in `Source/Backend/`. The in-memory store resets on restart, making the absence more impactful — developers and E2E tests always start from an empty graph, making dependency features difficult to manually verify without scripted setup.
- **Recommendation:** Add a `store/seed.ts` called from `app.ts` startup (guarded by `NODE_ENV !== 'test'`) that creates a small set of WorkItems with known blocker relationships so the dependency UI can be exercised immediately on start.

---

### QO-007 · Two `eslint-disable-next-line` in Production Frontend Source
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both disable `react-hooks/exhaustive-deps`. This rule exists to prevent stale-closure bugs in effects; suppressing it without a documented reason hides potential correctness issues.
- **Recommendation:** For each, either (a) fix the dependency array to satisfy the rule, (b) add a `// reason:` comment explaining why the suppression is intentional, or (c) extract the logic so the rule can be satisfied cleanly.

---

### QO-008 · WorkItemDetailPage.tsx Approaching 500-Line Threshold
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/WorkItemDetailPage.tsx` (426 lines)
- **Detail:** CLAUDE.md flags files over 500 lines as candidates for splitting. At 426 lines, this file contains the main page component, `ActionButtons`, `AssessmentCard`, and `HistoryEntry` sub-components all inline. One additional feature (e.g., edit form, dependency panel expansion) will push it over.
- **Recommendation:** Extract `ActionButtons`, `AssessmentCard`, and `HistoryEntry` into `Source/Frontend/src/components/` files. The page file should only compose them.

---

### Findings Not Raised

| Check | Result |
|-------|--------|
| Hardcoded secrets / credentials | ✅ None found |
| Empty catch blocks | ✅ None found |
| Skipped / todo tests | ✅ None found |
| `console.log` in production source | ✅ None found (only in `logger.ts` with Verifies comment) |
| No Verifies comments in production files | ✅ All production source files carry at least one `// Verifies:` |
| Direct DB calls from services | ✅ Services are clean |

---

### JSON Summary

```json
{
  "audit_date": "2026-08-28",
  "grade": "C",
  "grade_rationale": "1 P1, 3 P2 — exceeds B threshold (max_p2: 8, max_p1: 0); P1 stale-spec finding prevents A",
  "spec_coverage": {
    "active_plan_pct": 100,
    "canonical_spec_pct": 16,
    "note": "Enforcer reports 100% but only covers active plan; canonical spec is 88% FR-dependency + 0% FR-001..069"
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Stale canonical spec — 77+ FRs describe deprecated platform"},
    {"id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Routes directly import workItemStore, bypassing service layer"},
    {"id": "QO-003", "severity": "P2", "category": "pattern-violation", "title": "Traceability enforcer never checks Specifications/ directory"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-search: /api/search endpoint missing from app.ts"},
    {"id": "QO-005", "severity": "P3", "category": "test-coverage", "title": "Duplicate test files — root tests/ vs tests/pages/ with no-Verifies root copies"},
    {"id": "QO-006", "severity": "P3", "category": "spec-drift", "title": "FR-dependency-seed not implemented; store always starts empty"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "2 eslint-disable-next-line react-hooks/exhaustive-deps in production source"},
    {"id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "WorkItemDetailPage.tsx at 426 lines, approaching 500-line split threshold"}
  ],
  "escalations": [],
  "tools_run": ["traceability-enforcer.py (PASSED — scoped to active plan only)"]
}
```

---

**Grade: C** — One P1 (stale spec), three P2s (architecture violation, tooling gap, unimplemented endpoint). The implementation itself is clean: no secrets, no swallowed errors, no skipped tests, complete Verifies coverage on all production files, and the active plan is 100% traced. The debt is structural: the canonical spec was never updated when the system was redesigned, and the tooling enforces only the plan layer.
