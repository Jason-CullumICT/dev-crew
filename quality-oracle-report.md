---

## Quality Oracle Findings

### Spec Coverage

| Spec | Requirements | Traced | Coverage |
|------|-------------|--------|----------|
| `Specifications/dev-workflow-platform.md` (FR-001–FR-069) | 69 | **0** | **0%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | ~11 | **0** | **0%** |
| `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013) | 13 | 13 | ✅ 100% |
| FR-dependency-* | 15 | 15 | ✅ 100% |

**Overall grade: D** — Primary spec has 0% coverage (grading requires ≥40% for grade C).

---

### QO-001: Primary Spec Entirely Unimplemented
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** `Source/` implements the Self-Judging Workflow Engine (FR-WF-001–013 + FR-dependency-*). The primary spec (`dev-workflow-platform.md`) defines an entirely different application — Feature Requests, Bug Reports, Development Cycles, Pipeline Orchestration (FR-033–049), and Cycle Traceability (FR-050–069). **None** of FR-001 through FR-069 appear anywhere in `Source/` as `// Verifies:` comments. The two apps share no route paths, no entity names, and no business logic: the primary spec calls for `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/pipeline-runs`; the codebase has `/api/work-items`, `/api/intake`, `/api/dashboard`. The `inspector.config.yml` names this project "dev-crew Source App" (the platform spec) but what is running is the workflow engine.
- **Recommendation:** Either (a) update `Specifications/dev-workflow-platform.md` to reflect the workflow-engine as the current active spec, or (b) formally deprecate the workflow-engine implementation and begin implementing the platform spec. Whichever direction is chosen, CLAUDE.md and the inspector config must align to the live spec.
- **Cross-ref:** Escalate decision to requirements-reviewer and project owner before any code change.

---

### QO-002: Traceability Enforcer Produces False-Positive Pass on Primary Spec
- **Severity:** P1
- **Category:** spec-drift / pattern-violation
- **File:** `tools/traceability-enforcer.py` (targeting `Plans/self-judging-workflow/requirements.md`)
- **Detail:** The verification gate `python3 tools/traceability-enforcer.py` exits `PASS` because it targets the most-recently-modified `Plans/*/requirements.md` (the workflow-engine plan), not the primary `Specifications/dev-workflow-platform.md`. CLAUDE.md's mandatory verification gate therefore masks the fact that 69 FRs from the primary spec have zero implementation coverage. Any agent running the gate receives false assurance.
- **Recommendation:** Add a second enforcer invocation or a flag to target `Specifications/dev-workflow-platform.md` directly; or, if the platform spec is deprecated, remove it and replace CLAUDE.md's spec references with the workflow-engine doc. At minimum, the enforcer must not silently ignore the primary spec directory.
- **Cross-ref:** QO-001 (same root cause).

---

### QO-003: Two Logger Abstraction Files — Wrapper Pattern Undocumented
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/logger.ts` and `Source/Backend/src/utils/logger.ts`
- **Detail:** Two logger modules exist. `src/utils/logger.ts` is the canonical implementation (FR-WF-013 verified); `src/logger.ts` is a re-export wrapper described as needed for "backend-coder-2's workflow routes." This is undocumented in CLAUDE.md and creates import ambiguity — new files may import either, breaking the "single log sink" rule. Any file importing the wrong path bypasses the abstraction.
- **Recommendation:** Merge into one file or explicitly document in CLAUDE.md which path is canonical and enforce via an eslint `no-restricted-imports` rule.

---

### QO-004: `WorkItemDetailPage.tsx` and `workflow.ts` Approaching 500-Line Limit
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/WorkItemDetailPage.tsx` (426 lines), `Source/Backend/src/routes/workflow.ts` (374 lines)
- **Detail:** CLAUDE.md's rule flags files >500 lines as needing splitting. Both files are within 75–125 lines of the threshold and growing (both modified in the last 14 days). `WorkItemDetailPage.tsx` renders full detail, dependency section, assessment records, and action buttons in a single component. `workflow.ts` handles route/assess/approve/reject/dispatch/dependency-add/readiness in one file.
- **Recommendation:** Extract sub-components from `WorkItemDetailPage.tsx` (e.g., `AssessmentList`, `ActionBar`). Split `workflow.ts` into `workflow.ts` (route/assess/approve/reject/dispatch) and `dependencies.ts` (add/remove dependency, readiness check) — the latter is already separately tested.

---

### QO-005: Two `eslint-disable` Suppressions in Production Source
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both suppress `react-hooks/exhaustive-deps`. This is a common hook pitfall but disabling the rule masks potential stale-closure bugs. Neither suppression has an accompanying comment explaining why the dependency is intentionally excluded.
- **Recommendation:** Add an inline comment justifying the exclusion, or refactor to avoid the suppression (e.g., using `useCallback` with proper deps).

---

### QO-006: Frontend Components Have No Test Coverage (Recently Modified)
- **Severity:** P2
- **Category:** untested
- **File:** `Source/Frontend/src/components/Layout.tsx`, `Source/Frontend/src/components/StatusBadge.tsx`, `Source/Frontend/src/components/PriorityBadge.tsx`, `Source/Frontend/src/components/TypeBadge.tsx`
- **Detail:** Four UI components modified in the last 14 days have no corresponding test files. Per CLAUDE.md rules, every FR needs a test with `// Verifies:` traceability. `Layout.tsx` is the app shell (sidebar nav, header); a regression in it breaks all pages. The badge components are rendered in list views where correctness matters for UX.
- **Recommendation:** Add component tests (render + snapshot or behavior assertions) with `// Verifies: FR-WF-009/010/011` (whichever FR governs the component's context).

---

### QO-007: `DebugPortalPage.tsx` Uses Non-Standard Verifies ID
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The file has `// Verifies: dev-crew debug portal — embedded container-test viewer`. This is a free-text comment, not a structured `FR-XXX` ID. The traceability enforcer's regex (`FR-\d+`) will not recognize it. There is no matching FR in any spec for a debug portal page.
- **Recommendation:** Either create an FR in the active spec for the debug portal page, or remove the pseudo-Verifies comment if the page is infrastructure (not a specced feature).

---

### QO-008: `DependencyPicker.tsx` Business Logic Imports React Framework
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx`
- **Detail:** CLAUDE.md states "Business logic has no framework imports." `DependencyPicker.tsx` (376 lines) contains mixed UI rendering and business logic for dependency cycle-detection warnings (a domain concern) inline with React hooks. The cycle-detection guard and state-management logic should live in a pure function or hook, not embedded in the component body.
- **Recommendation:** Extract dependency validation logic into a `useDependencyPicker` hook or a pure utility function so it can be tested in isolation without the React tree.

---

### JSON Summary

```json
{
  "audit_date": "2026-09-30",
  "grade": "D",
  "spec_coverage": {
    "dev-workflow-platform (FR-001–FR-069)": "0%",
    "tiered-merge-pipeline (FR-TMP-*)": "0%",
    "self-judging-workflow (FR-WF-001–013)": "100%",
    "dependency (FR-dependency-*)": "100%"
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift",            "summary": "Primary spec (dev-workflow-platform.md FR-001–069) entirely unimplemented" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift",            "summary": "Traceability enforcer targets wrong spec — false-positive PASS on primary spec" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "summary": "Two logger modules — undocumented wrapper creates import ambiguity" },
    { "id": "QO-004", "severity": "P2", "category": "pattern-violation",     "summary": "WorkItemDetailPage.tsx (426 ln) and workflow.ts (374 ln) approaching 500-line split threshold" },
    { "id": "QO-005", "severity": "P3", "category": "pattern-violation",     "summary": "Two eslint-disable suppressions without justifying comments" },
    { "id": "QO-006", "severity": "P2", "category": "untested",              "summary": "Layout + 3 badge components modified in last 14 days with zero tests" },
    { "id": "QO-007", "severity": "P3", "category": "spec-drift",            "summary": "DebugPortalPage uses non-standard free-text Verifies comment, no matching FR" },
    { "id": "QO-008", "severity": "P3", "category": "architecture-violation", "summary": "DependencyPicker mixes domain cycle-detection logic with React rendering" }
  ],
  "p1_count": 2,
  "p2_count": 3,
  "p3_count": 3,
  "clean_checks": [
    "No console.log in production backend source",
    "No hardcoded secrets or URLs found",
    "No swallowed errors — all catch blocks log and respond",
    "No skipped tests (no .skip, .todo, xdescribe)",
    "FR-WF-* and FR-dependency-* 100% traced",
    "All list endpoints use {data: T[]} wrapper (workflow engine)",
    "Service layer used — no direct store calls from route handlers (pattern: routes -> services -> store)"
  ]
}
```

---

**Key actions for next pipeline run:**
1. **[ESCALATE → requirements-reviewer]** Resolve QO-001/QO-002 before any further spec work — decide whether `dev-workflow-platform.md` is active, deprecated, or a future roadmap item.
2. Fix the traceability enforcer scope so the gate cannot pass while primary FRs are unimplemented.
3. Add tests for `Layout.tsx`, `StatusBadge.tsx`, `PriorityBadge.tsx`, `TypeBadge.tsx` (QO-006).
