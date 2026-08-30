---

## Quality Oracle Findings

### Spec Coverage: 100% (enforcer scope) / ~0% (full spec corpus)

| Scope | FRs Found | Traced to Source | Coverage |
|-------|-----------|-----------------|----------|
| `Plans/self-judging-workflow/requirements.md` (enforcer active) | 13 | 13 | **100%** |
| `Plans/dependency-linking/requirements.md` | 15 | 15 | **100%** |
| **`Specifications/dev-workflow-platform.md`** | **74** | **0** | **0%** |
| `Specifications/workflow-engine.md` | ~12 (no formal IDs) | informal | n/a |

---

### QO-001: Traceability Enforcer Scope Gap — Specifications/ Excluded
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer scans `Plans/*/requirements.md` (most-recently-modified fallback) and reports **PASSED**. However, `Specifications/dev-workflow-platform.md` contains **74 formally numbered FRs** (FR-001 through FR-069 plus FR-033–FR-069 pipeline/traceability requirements) that are **completely absent from `Source/`**. These include Feature Request APIs, Bug Report APIs, Development Cycle APIs, Dashboard APIs, Pipeline Orchestration, and an entirely different frontend (FR-022–FR-030). The enforcer never sees these FRs, so the "PASSED" status is misleading — it reflects narrow plan coverage only.
- **Recommendation:** Either (a) update the enforcer to also scan `Specifications/` and surface unimplemented FRs, or (b) formally mark `dev-workflow-platform.md` as a deferred/alternate spec with a header comment so auditors know it's not currently targeted. Decision needs to be made: is this spec abandoned, deferred, or the next implementation target?
- **Cross-ref:** TheFixer (if implementation is intended), requirements-reviewer (if spec needs archival/update)

---

### QO-002: `Specifications/dev-workflow-platform.md` — 74 FRs with Zero Implementation
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:337`
- **Detail:** This spec defines a full-stack feature request management platform (SQLite, Express, React with 7 pages, pipeline orchestration, cycle traceability, AI voting, human approvals). **None of FR-001 through FR-069 exist in `Source/`**. `Source/` instead implements a different system (in-memory work item workflow engine, FR-WF-001–013). The two specs describe incompatible products. It's unclear whether `dev-workflow-platform.md` is: the *next* milestone to build, a *parallel* vision that was shelved, or a *prior* spec that was replaced by the workflow engine. This ambiguity is a governance risk.
- **Recommendation:** Add a status header to `Specifications/dev-workflow-platform.md` — either `STATUS: DEFERRED` / `STATUS: ACTIVE-NEXT` / `STATUS: SUPERSEDED BY workflow-engine.md`. Run a planning session to formally classify it before the next implementation cycle.
- **Cross-ref:** requirements-reviewer (owns Specifications/)

---

### QO-003: FR-dependency-* Plan Targets Wrong Codebase Paths
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Plans/dependency-linking/requirements.md:15`
- **Detail:** Every FR-dependency-* requirement specifies paths like `portal/Backend/src/services/dependencyService.ts`, `portal/Shared/types.ts`, `portal/Backend/tests/dependencies.test.ts`. The actual implementation landed in `Source/Backend/src/services/dependency.ts`, `Source/Shared/types/workflow.ts`, `Source/Backend/tests/routes/dependencies.test.ts`. The plan was written for the portal codebase but executed in a different one. This means if anyone re-reads the plan to verify acceptance criteria, they'll be checking the wrong paths.
- **Recommendation:** Update `Plans/dependency-linking/requirements.md` to replace all `portal/` path references with `Source/` paths, and update acceptance criteria to match the in-memory store (no DB/junction table).
- **Cross-ref:** requirements-reviewer

---

### QO-004: Duplicate Frontend Test Files
- **Severity:** P2
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- **Detail:** Two test files cover the same component (`WorkItemDetailPage`): one at `tests/WorkItemDetailPage.test.tsx` (368 lines) and one at `tests/pages/WorkItemDetailPage.test.tsx` (393 lines). Same for `WorkItemListPage` (286 lines top-level, 262 lines in `pages/`). This doubles test maintenance burden and risks divergence. It's also unclear which file is authoritative.
- **Failure scenario:** A developer updates component behavior and updates one test file but not the other, leaving stale/incorrect tests passing.
- **Recommendation:** Consolidate to `tests/pages/` location (which appears to be the more structured convention). Remove or merge the top-level duplicates. Verify no test cases are lost in the merge.
- **Cross-ref:** TheFixer

---

### QO-005: Inline Type Definitions in Services Violate Shared-Types Rule
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/services/assessment.ts:141` and `Source/Backend/src/services/router.ts:60`
- **Detail:** `AssessmentResult` is exported from `assessment.ts` and `RouteResult` from `router.ts` as inline interfaces. CLAUDE.md's architecture rule states: **"Shared types are single source of truth — no inline type re-definitions across layers."** These types are domain-significant (they represent the output of core workflow operations) and should live in `Source/Shared/types/workflow.ts` so the frontend can reference them without importing from backend service files.
- **Failure scenario:** A frontend engineer needs `RouteResult` shape for a UI component and must either duplicate the type (violating the rule) or import from backend (introducing cross-layer coupling).
- **Recommendation:** Move `AssessmentResult` and `RouteResult` to `Source/Shared/types/workflow.ts`. Update backend imports. Add `// Verifies: FR-WF-001` traceability to the Shared types additions.
- **Cross-ref:** api-contract agent, TheFixer

---

### QO-006: eslint-disable in Production Source Without Documented Justification
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82` and `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` without explaining why the suppression is safe. This is a known footgun — exhaustive-deps warnings often indicate bugs where stale closures cause incorrect behavior on dependency changes.
- **Recommendation:** Either fix the hook dependencies to be correct (preferred), or add an inline comment explaining exactly why the suppression is intentional and safe (e.g., `// Intentionally omitting X — we only want this to run on mount`).
- **Cross-ref:** TheFixer (frontend-coder)

---

### QO-007: Large Files Approaching Split Threshold
- **Severity:** P3
- **Category:** simplification
- **Files:** `Source/Backend/src/routes/workflow.ts` (374 lines), `Source/Frontend/src/pages/WorkItemDetailPage.tsx` (426 lines), `Source/Frontend/src/components/DependencyPicker.tsx` (376 lines), `Source/Backend/src/services/dependency.ts` (315 lines)
- **Detail:** Four files exceed 300 lines. The threshold CLAUDE.md references is 500 lines, but at 370-426 lines these are already large. `WorkItemDetailPage.tsx` in particular handles routing, data-fetching, display, and multiple action handlers in one file.
- **Recommendation:** No immediate action required (all below 500), but flag for the next feature cycle. `WorkItemDetailPage.tsx` is the highest priority for refactoring — extract action handlers and assessment display into sub-components.

---

### QO-008: Inconsistent Logger Import Path
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Backend/src/store/workItemStore.ts:10`
- **Detail:** All backend source files import logger from `../logger` (the compat wrapper), but `workItemStore.ts` imports directly from `../utils/logger`. Both work identically at runtime, but the inconsistency is confusing and could break if the compat wrapper ever adds behavior.
- **Recommendation:** Update `workItemStore.ts` to import from `../logger` to match the project convention. One-line fix.

---

### JSON Summary

```json
{
  "audit_date": "2026-08-30",
  "spec_coverage": {
    "enforcer_scope_pct": 100,
    "full_spec_corpus_pct": 0,
    "enforced_frs": 28,
    "untraced_frs_in_specifications": 74
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer excludes Specifications/ entirely"},
    {"id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "74 FRs in dev-workflow-platform.md have zero implementation"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-* plan references wrong codebase paths"},
    {"id": "QO-004", "severity": "P2", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage"},
    {"id": "QO-005", "severity": "P2", "category": "architecture-violation", "title": "AssessmentResult and RouteResult defined inline in services, not Shared/"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable without justification in DependencyPicker and useWorkItems"},
    {"id": "QO-007", "severity": "P3", "category": "simplification", "title": "4 files approaching 500-line split threshold"},
    {"id": "QO-008", "severity": "P4", "category": "pattern-violation", "title": "workItemStore.ts imports logger via wrong path"}
  ],
  "grade": "D",
  "grade_rationale": "2 P1 findings; spec coverage against full Specifications/ corpus is ~0% (threshold for grade A is 80%)",
  "grade_note": "Enforcement-scoped grade: A (0 P1 findings within enforcer scope, 100% enforcer coverage — but enforcer scope is dangerously narrow)"
}
```

---

**Grade: D** (against full spec corpus) / **A** (against enforcer scope only)

The grade gap is the finding. The enforcer gives a clean bill of health because it only sees 28 requirements — but `Specifications/` holds 74 more that no tool watches, no code traces to, and no agent owns. The most urgent action is a governance decision: are those 74 FRs the **next** thing to build, or a **superseded** spec to be archived?
