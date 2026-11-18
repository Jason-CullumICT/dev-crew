---

## Quality Oracle Findings

### Spec Coverage Summary

| Layer | Total FRs | Traced in Source | Coverage |
|-------|-----------|------------------|----------|
| **Domain Specs** (`Specifications/`) | 79 | 0 | **0%** |
| **Plan FRs** (`Plans/`) | 28 | 28 | **100%** |

The traceability enforcer reports PASS, but it only scans `Plans/` — the 79 canonical domain requirements in `Specifications/` are invisible to it.

---

### QO-001: Traceability Enforcer Blind Spot — Specifications/ Not Checked
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py` / `Specifications/dev-workflow-platform.md`
- **Detail:** `tools/traceability-enforcer.py` only scans `Plans/<feature>/requirements.md` for the most recently modified plan. The canonical domain specs in `Specifications/` contain **69 FRs** (`dev-workflow-platform.md`) and **10 FR-TMP-*** (`tiered-merge-pipeline.md`) — none of these FR-NNN IDs appear anywhere in `Source/` as `// Verifies:` comments. The enforcer reports `TRACEABILITY PASSED` despite 0% coverage of the domain truth layer. CLAUDE.md states *"Specs are source of truth — implementation traces to specs."* The spec-to-source chain is broken at the domain layer.
- **Failure scenario:** A developer implements a domain FR incorrectly or omits it entirely; the enforcer gate passes because it checks Plan-level IDs (FR-WF-*) only. The architectural regression is invisible.
- **Recommendation:** Extend the enforcer to also scan `Specifications/*.md` for `FR-[0-9]+` IDs and cross-check them against source `Verifies:` comments. Alternatively, establish an explicit mapping table from `FR-NNN` (domain) → `FR-WF-NNN` (plan) so coverage can be inferred transitively.
- **Cross-ref:** TheFixer for enforcer fix; requirements-reviewer to audit the FR-NNN → FR-WF-NNN mapping.

---

### QO-002: Architecture Violation — Route Handlers Bypass Service Layer
- **Severity:** P1
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/intake.ts:4`, `Source/Backend/src/routes/workflow.ts:15`
- **Detail:** All three route modules directly `import * as store from '../store/workItemStore'` and call store functions (`store.createWorkItem`, `store.findById`, `store.findAll`, `store.updateWorkItem`, `store.softDelete`) from within route handlers. CLAUDE.md Architecture Rule: **"No direct DB calls from route handlers — use the service layer."** The service layer (`services/assessment.ts`, `services/router.ts`, `services/dependency.ts`, `services/dashboard.ts`) correctly owns store access — but the CRUD and workflow routes bypass it entirely, embedding data-access logic directly in the HTTP layer.
- **Failure scenario:** Business logic added to a service (e.g., a validation rule or audit hook in a future `workItemService.ts`) will silently not apply to anything going through these routes, since they skip the service layer entirely.
- **Recommendation:** Create `services/workItemService.ts` and `services/intakeService.ts` that wrap the store calls and enforce business invariants. Route handlers should call only service functions.
- **Cross-ref:** TheFixer (backend-coder module). `[ESCALATE → TheFixer]`

---

### QO-003: Response Pattern Violation — List Endpoint Returns Raw Object
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `Source/Backend/src/routes/workItems.ts:73-74`
- **Detail:** `GET /api/work-items` calls `store.findAll()` and returns its result directly via `res.json(result)`. `findAll` returns `{data, total, page, limit, totalPages}` — this technically contains the `data` wrapper and matches `PaginatedResponse<T>`. However, since the route handler sends the raw store object without validating shape, any change to the store's return type silently changes the API contract. Additionally, `GET /api/work-items/:id` at line 84 returns the raw `WorkItem` object (correct per CLAUDE.md single-item pattern). **No violation**, but the tight coupling between store shape and API response is fragile.
- **Failure scenario:** Store refactors the return shape; API consumers break with no compile-time error because the route just passes through whatever the store returns.
- **Recommendation:** Map the store response to an explicit API response type in the route handler rather than passing through raw store output.

---

### QO-004: Suppressed Linting Rules in Production Code
- **Severity:** P2
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files contain `// eslint-disable-next-line react-hooks/exhaustive-deps`. CLAUDE.md does not explicitly whitelist eslint-disable comments. Suppressing exhaustive-deps hides potential stale-closure bugs in React hooks — a common source of subtle state management bugs. These suppressions appear in recently modified files (last 14 days per git log).
- **Failure scenario:** A dependency is added to the hook's callback but not to the deps array; the hook runs with stale data silently because the lint rule that would catch it is suppressed.
- **Recommendation:** Fix the underlying deps array issue rather than suppressing the rule. If the suppression is intentional, add an inline comment explaining why (e.g., `// intentionally omit X to avoid re-fetch on every render — X is a stable ref`).

---

### QO-005: Untested UI Components (No Test Files)
- **Severity:** P3
- **Category:** untested
- **Files:** `Source/Frontend/src/components/Layout.tsx`, `Source/Frontend/src/components/PriorityBadge.tsx`, `Source/Frontend/src/components/StatusBadge.tsx`, `Source/Frontend/src/components/TypeBadge.tsx`, `Source/Frontend/src/pages/DebugPortalPage.tsx`
- **Detail:** Five source components have no corresponding test files. The adjacent components (`BlockedBadge`, `DependencyPicker`, `DependencySection`) all have test files in `tests/components/`. CLAUDE.md testing rules require `// Verifies: FR-XXX` traceability in every test, implying every FR has a test. These components are modified in the last 14 days (recently active).
- **Failure scenario:** A regression in `StatusBadge` or `PriorityBadge` rendering goes undetected until it surfaces in manual QA.
- **Recommendation:** Add unit test files: `tests/components/Layout.test.tsx`, `PriorityBadge.test.tsx`, `StatusBadge.test.tsx`, `TypeBadge.test.tsx`, `tests/pages/DebugPortalPage.test.tsx`.

---

### QO-006: Duplicate Test File for WorkItemDetailPage
- **Severity:** P3
- **Category:** test-coverage
- **Files:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- **Detail:** Two test files cover the same component. The root-level `tests/WorkItemDetailPage.test.tsx` has no `Verifies:` comment at all; the `tests/pages/` version has proper traceability. Running both may result in duplicate test counts, confusing coverage reports, or one shadowing the other depending on Jest's test resolution order.
- **Recommendation:** Remove the root-level `tests/WorkItemDetailPage.test.tsx` (the one without traceability) and retain only `tests/pages/WorkItemDetailPage.test.tsx`. Same check applies to `tests/WorkItemListPage.test.tsx` vs `tests/pages/WorkItemListPage.test.tsx`.

---

### QO-007: Frontend Test Files Missing Verifies Traceability
- **Severity:** P3
- **Category:** spec-drift
- **Files:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (root), `Source/Frontend/tests/WorkItemListPage.test.tsx` (root), `Source/Frontend/tests/CreateWorkItemPage.test.tsx`, `Source/Frontend/tests/integration.test.tsx`, `Source/Frontend/tests/App.test.tsx`
- **Detail:** These test files have no `// Verifies: FR-XXX` comments. Per CLAUDE.md: *"Every FR needs a test with `// Verifies: FR-XXX` traceability comments."* Root-level test files appear to be older duplicates (see QO-006), but `CreateWorkItemPage.test.tsx` and `integration.test.tsx` are substantive tests with no traceability link.
- **Recommendation:** Add `// Verifies: FR-WF-012` to `CreateWorkItemPage.test.tsx`; audit `integration.test.tsx` and `App.test.tsx` to determine which FRs they cover and add corresponding comments.

---

### JSON Summary

```json
{
  "audit_date": "2026-11-18",
  "spec_coverage": {
    "domain_specs_total_frs": 79,
    "domain_specs_traced": 0,
    "domain_coverage_pct": 0,
    "plan_frs_total": 28,
    "plan_frs_traced": 28,
    "plan_coverage_pct": 100,
    "enforcer_verdict": "PASS (checks Plans/ only)"
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer does not check Specifications/ — 79 domain FRs unverified"},
    {"id": "QO-002", "severity": "P1", "category": "architecture-violation", "title": "Three route handlers directly call store, bypassing the service layer"},
    {"id": "QO-003", "severity": "P2", "category": "pattern-violation", "title": "List route passes raw store object to res.json — fragile API contract"},
    {"id": "QO-004", "severity": "P2", "category": "pattern-violation", "title": "eslint-disable-next-line react-hooks/exhaustive-deps in 2 production files"},
    {"id": "QO-005", "severity": "P3", "category": "untested", "title": "5 UI components and pages have no test files"},
    {"id": "QO-006", "severity": "P3", "category": "test-coverage", "title": "Duplicate WorkItemDetailPage test files — root-level version lacks traceability"},
    {"id": "QO-007", "severity": "P3", "category": "spec-drift", "title": "5 frontend test files have no Verifies: traceability comments"}
  ],
  "grade_estimate": "C",
  "grade_rationale": "2 P1s and 2 P2s. Grade C threshold: max_p1=2, max_p2=15, min_spec_coverage=40. Domain spec coverage 0% fails the B-grade threshold (60%)."
}
```

---

**Grade Estimate: C** — Two P1 architecture/traceability violations and two P2 pattern violations. The passing traceability enforcer is a false signal; the canonical domain spec layer has zero source coverage. The service-layer bypass is the highest-priority corrective action.
