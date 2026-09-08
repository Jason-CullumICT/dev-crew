---

## Quality Oracle Findings — Full Audit · 2026-09-08

---

### Spec Coverage Summary

| Scope | Total FRs | Traced in Source | Coverage |
|-------|-----------|-----------------|----------|
| Domain specs (`Specifications/`) | 77 | 0 | **0%** |
| Active plan (`Plans/self-judging-workflow/`) | 13 | 13 | 100% |
| **Combined** | **90** | **13** | **14%** |

Grade: **D** (0% domain spec coverage; 2 P1 findings)

---

### QO-001: Traceability Enforcer Has Blind Spot — Never Reads Specifications/
- **Severity:** P1
- **Category:** spec-drift / tool-gap
- **File:** `tools/traceability-enforcer.py:28–56`
- **Detail:** `get_active_requirements()` resolves to the most recently modified `Plans/**/requirements.md`. It never looks at `Specifications/`. As a result, `python3 tools/traceability-enforcer.py` reports **PASS** while 77 domain FR IDs from `Specifications/dev-workflow-platform.md` and `Specifications/tiered-merge-pipeline.md` go entirely unchecked. The CLAUDE.md verification gate (`python3 tools/traceability-enforcer.py`) is therefore meaningless for domain spec drift.
- **Reproduction:** Run `python3 tools/traceability-enforcer.py` → PASS. Then run `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` (the tool doesn't support spec files directly, so this fails) — the 77 domain FRs have no code path at all.
- **Recommendation:** Add a second enforcer mode (or a wrapper script) that iterates `Specifications/*.md`, extracts all FR-\d+ IDs, and cross-checks for `// Verifies: FR-NNN` in Source. Add this as a second gate in CLAUDE.md's verification sequence.
- **Cross-ref:** TheFixer (tool enhancement); requirements-reviewer (spec interpretation)

---

### QO-002: 77 Domain Spec Requirements Have Zero Implementation Traceability
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-001→FR-069), `Specifications/tiered-merge-pipeline.md` (FR-1→FR-3)
- **Detail:** The domain truth — approved 2026-03-23 — defines 69+ functional requirements for a full dev workflow platform (Feature Requests with AI voting, Bug Reports, Development Cycles, SQLite backend, 7 subsystems). The current Source code implements a different system (a work-item manager with an in-memory store, FR-WF-001→FR-WF-013). Not a single line of Source code carries `// Verifies: FR-NNN` pointing to a domain spec ID. The domain spec and the codebase describe *different applications*.

  This could be intentional (the platform plan was superseded by the self-judging-workflow plan) — but if so, the domain specs must be updated or archived to reflect the actual scope. As-is, every agent reading `Specifications/` believes a 7-subsystem SQLite-backed platform should exist; the code says otherwise.
- **Recommendation:**
  - If `Specifications/dev-workflow-platform.md` describes the *aspirational full system* and the current source is a *subset phase*, annotate the spec with phase labels and ensure the active plan's requirements trace back to it.
  - If the domain spec was superseded, archive or annotate it explicitly so agents don't treat it as current truth.
  - Either way, add `// Verifies: FR-NNN` comments in source to close the gap for whatever FRs the current code does satisfy (e.g., FR-WF-001..013 can be cross-referenced with the broader domain FR-001, FR-004, etc.).
- **Cross-ref:** requirements-reviewer, TheATeam (spec alignment work)

---

### QO-003: Route Handlers Access Store Directly — Service Layer Bypassed
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/workflow.ts:20`, `Source/Backend/src/routes/intake.ts:4`
- **Detail:** All three route files `import * as store from '../store/workItemStore'` and call store functions directly from request handlers (e.g., `store.createWorkItem()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()`). The architecture rule is explicit: **"No direct DB calls from route handlers — use the service layer."** Only `dashboard.ts` correctly uses a service abstraction. `workflow.ts` is the worst offender — 10 direct store calls across state-transition handlers — meaning business logic (state machine checks, change history) is scattered inside route callbacks instead of encapsulated in a service.
- **Failure scenario:** A new route coder adds a transition without the `buildChangeEntry` call that's manually wired in the route — the change history silently drops. A service encapsulating all transitions would enforce this invariant.
- **Recommendation:** Extract a `workItemService.ts` that owns all CRUD + state transition operations. Route handlers call service methods only. `workflow.ts` transition handlers move entirely into the service layer.
- **Cross-ref:** TheFixer (backend-coder refactor)

---

### QO-004: Duplicate Test Files — Two Copies Will Diverge
- **Severity:** P2
- **Category:** test-coverage / maintenance
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (13,484 bytes)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (13,652 bytes)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (9,348 bytes)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (8,047 bytes)
- **Detail:** Each of these test files exists at two paths. Both are included by the test runner (Jest/Vitest will pick up both). File sizes already differ — the copies have diverged. Fixes applied to one location will not automatically apply to the other, creating stale test coverage. Developers may not realize both files exist.
- **Failure scenario:** A bug is fixed and a regression test is added to `tests/WorkItemDetailPage.test.tsx`. The duplicate at `tests/pages/` still has the old (incomplete) test suite. CI runs both; the broken assertion in the stale copy breaks the build unexpectedly.
- **Recommendation:** Decide on canonical location (`tests/pages/` is more structured). Delete the root-level duplicates. Ensure the surviving copies are the more complete versions (compare file sizes and content).
- **Cross-ref:** TheFixer (cleanup)

---

### QO-005: Six Frontend Source Files Have No Test Coverage (All Recently Modified)
- **Severity:** P3
- **Category:** untested
- **Files:**
  - `Source/Frontend/src/components/Layout.tsx`
  - `Source/Frontend/src/components/PriorityBadge.tsx`
  - `Source/Frontend/src/components/StatusBadge.tsx`
  - `Source/Frontend/src/components/TypeBadge.tsx`
  - `Source/Frontend/src/hooks/useDashboard.ts`
  - `Source/Frontend/src/hooks/useWorkItems.ts`
- **Detail:** All six files were modified in the last 14 days and have no corresponding test file anywhere under `Source/Frontend/tests/`. The two hooks (`useDashboard.ts`, `useWorkItems.ts`) contain fetch logic and filter state that is exercised only indirectly through page-level tests — hook-level error paths and cancellation logic are untested.
- **Recommendation:** Add unit tests for each hook using `@testing-library/react-hooks` or equivalent; add snapshot/render tests for the badge components. These are all small, testable units.
- **Cross-ref:** TheFixer (frontend-coder test work)

---

### QO-006: ESLint Hook Dependency Rule Suppressed Without Rationale
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line` without any comment explaining *why* the dependency is intentionally omitted. This rule exists to prevent stale-closure bugs — silently suppressing it without documentation means the next developer who touches the hook won't understand whether the omission is intentional or a mistake.
- **Recommendation:** Add a brief inline comment (e.g., `// intentionally omit loadItems — would cause infinite refetch loop`) immediately above or on the same line as the eslint-disable. If the suppression is incorrect, fix the dependency array instead.
- **Cross-ref:** TheFixer (frontend-coder cosmetic fix)

---

### JSON Summary

```json
{
  "audit_date": "2026-09-08",
  "grade": "D",
  "spec_coverage": {
    "domain_specs_total": 77,
    "domain_specs_traced": 0,
    "domain_coverage_pct": 0,
    "plan_specs_total": 13,
    "plan_specs_traced": 13,
    "plan_coverage_pct": 100
  },
  "findings": [
    {
      "id": "QO-001",
      "severity": "P1",
      "category": "spec-drift/tool-gap",
      "file": "tools/traceability-enforcer.py",
      "line": 28,
      "title": "Traceability enforcer never reads Specifications/ — false PASS on domain spec drift"
    },
    {
      "id": "QO-002",
      "severity": "P1",
      "category": "spec-drift",
      "file": "Specifications/dev-workflow-platform.md",
      "line": 1,
      "title": "77 domain spec FR IDs have zero Verifies references in Source/ — 0% domain coverage"
    },
    {
      "id": "QO-003",
      "severity": "P2",
      "category": "architecture-violation",
      "files": [
        "Source/Backend/src/routes/workItems.ts:12",
        "Source/Backend/src/routes/workflow.ts:20",
        "Source/Backend/src/routes/intake.ts:4"
      ],
      "title": "Route handlers import and call store directly — service layer bypassed"
    },
    {
      "id": "QO-004",
      "severity": "P2",
      "category": "test-coverage/maintenance",
      "files": [
        "Source/Frontend/tests/WorkItemDetailPage.test.tsx",
        "Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx",
        "Source/Frontend/tests/WorkItemListPage.test.tsx",
        "Source/Frontend/tests/pages/WorkItemListPage.test.tsx"
      ],
      "title": "Duplicate test files at two paths — copies have already diverged"
    },
    {
      "id": "QO-005",
      "severity": "P3",
      "category": "untested",
      "files": [
        "Source/Frontend/src/components/Layout.tsx",
        "Source/Frontend/src/components/PriorityBadge.tsx",
        "Source/Frontend/src/components/StatusBadge.tsx",
        "Source/Frontend/src/components/TypeBadge.tsx",
        "Source/Frontend/src/hooks/useDashboard.ts",
        "Source/Frontend/src/hooks/useWorkItems.ts"
      ],
      "title": "6 recently-modified frontend source files have no test coverage"
    },
    {
      "id": "QO-006",
      "severity": "P3",
      "category": "pattern-violation",
      "files": [
        "Source/Frontend/src/hooks/useWorkItems.ts:63",
        "Source/Frontend/src/components/DependencyPicker.tsx:82"
      ],
      "title": "eslint-disable (react-hooks/exhaustive-deps) suppressed without rationale comment"
    }
  ],
  "p1_count": 2,
  "p2_count": 2,
  "p3_count": 2,
  "escalations": []
}
```

---

### Routing

| Finding | Route to |
|---------|----------|
| QO-001 — Enforcer tool gap | **TheFixer** (tool enhancement, low effort — add `--specs` mode) |
| QO-002 — Domain spec drift | **requirements-reviewer** (scope decision) → **TheATeam** (traceability work) |
| QO-003 — Service layer bypass | **TheFixer / backend-coder** (refactor workItems, workflow, intake routes) |
| QO-004 — Duplicate test files | **TheFixer** (delete stale copies, keep canonical) |
| QO-005 — Untested hooks/badges | **TheFixer / frontend-coder** (add unit tests) |
| QO-006 — ESLint suppression | **TheFixer / frontend-coder** (add rationale comment) |
