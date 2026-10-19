# Quality Oracle Audit — 2026-10-19

**Grade:** B  
*(0 P1s · 2 P2s · 3 P3s · 1 P4 · 0 P1s = passes grading threshold A: max_p1=0, max_p2=3)*

---

## Spec Coverage Summary

| Spec file | FRs found | Traced in Source/ | Coverage |
|---|---|---|---|
| `Plans/self-judging-workflow/requirements.md` (active plan) | 13 | 13 | **100%** ✅ |
| `Plans/dependency-linking/requirements.md` (active plan) | 15 | 15 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` | 74 real FRs* | 0 | **0%** ❌ |
| `Specifications/tiered-merge-pipeline.md` | 10 FR-TMP-* | 0 in Source/ (10 in platform/) | **0% in Source/** ⚠️ |

\* FR-XXX and FR-XXXX are template placeholders excluded from count.

**Key insight:** The traceability enforcer only scans `Plans/*/requirements.md` files (most-recently-modified). The `Specifications/` directory is never enforced against `Source/`. Two specifications (dev-workflow-platform.md, tiered-merge-pipeline.md) have zero coverage in Source/ — but this is because they target different subsystems (portal/ and platform/ respectively). See QO-001 for the enforcer blind-spot finding.

---

## Findings

### QO-001: Traceability Enforcer Does Not Check Specifications/ Against Source/
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-discovers the most recently modified `Plans/*/requirements.md` and only enforces that. It never directly validates `Specifications/*.md` against `Source/`. This means:
  1. `Specifications/dev-workflow-platform.md` (74 real FRs, FR-001 through FR-069 plus dependency FRs) gets zero automated enforcement against Source/. Running the enforcer manually against it yields **76 MISSING** (all untraced in Source/).
  2. `Specifications/tiered-merge-pipeline.md` (10 FR-TMP-* IDs) also reports 13 MISSING when run against Source/ — because the implementation lives in `platform/`, which the enforcer excludes.
  3. Any new Specification added under `Specifications/` without a companion `Plans/*/requirements.md` will never be checked.
- **Recommendation:** Add a second enforcer mode or CI step that explicitly validates each `Specifications/*.md` against the correct implementation directory. At minimum, add a comment at the top of each spec file clarifying which directory implements it (e.g., `# Implemented-in: portal/` or `# Implemented-in: platform/`). This prevents "orphaned specifications" from being silently ignored.
- **Cross-ref:** TheFixer — add `--all-specs` flag to enforcer or create wrapper script.

---

### QO-002: dev-workflow-platform.md Has 0% Traceability in Source/ — Root Cause Unclear
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** All 74 real FRs (FR-001 through FR-069) in the primary domain specification have no `// Verifies:` comments in `Source/`. CLAUDE.md calls Specifications/ "The most critical documents," yet none are enforced against Source/. Investigating the Plans/dependency-linking/requirements.md reveals it references `portal/Backend` and `portal/Frontend` as the implementation directories — confirming that `dev-workflow-platform.md` is implemented in `portal/`, not `Source/`. However:
  - `portal/` is excluded from the traceability enforcer scan directories
  - CLAUDE.md module ownership table lists `portal/` as owned by `frontend-coder`, not a separate system
  - It is not documented that `Specifications/dev-workflow-platform.md` → `portal/` while `Specifications/workflow-engine.md` → `Source/`
  
  This architectural split is invisible to the enforcer, invisible in CLAUDE.md, and invisible to new agents reading the project. A confused agent could write Source/ code claiming to implement FR-001 (which the portal has already implemented) or vice versa.
- **Recommendation:** 
  1. Add a header to each spec file: `# Implemented-in: Source/` or `# Implemented-in: portal/`
  2. Update CLAUDE.md to document this system split explicitly
  3. Extend the enforcer to scan `portal/` for `Specifications/dev-workflow-platform.md` FRs
- **Cross-ref:** requirements-reviewer should update specs; TheFixer should update enforcer.

---

### QO-003: Duplicate Test Files — WorkItemDetailPage and WorkItemListPage
- **Severity:** P3
- **Category:** test-coverage / hygiene
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines, shorter)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines, more comprehensive)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines, shorter)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)
- **Detail:** Both root-level and `tests/pages/` versions of these test files exist and are **not identical** — they differ in imports, test count, and completeness. The `tests/pages/` versions are newer and more complete (import typed fixtures, use `within()`). The root-level versions appear to be older iterations that were never removed. Both likely run in the same test suite, causing:
  - Double coverage inflation (same component tested twice)
  - Maintenance confusion (fixes needed in two places)
  - Risk of conflicting assertions
- **Recommendation:** Delete the root-level `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/WorkItemListPage.test.tsx`. Keep the `tests/pages/` versions (they are more comprehensive).
- **Cross-ref:** TheFixer

---

### QO-004: eslint-disable Comments in Production Source (react-hooks/exhaustive-deps)
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both suppress `react-hooks/exhaustive-deps`. This indicates useCallback/useEffect dependency arrays may be intentionally incomplete to prevent infinite re-render loops — a common but fragile pattern. If the suppressed dependencies change, the hook will silently use stale values.
  - `DependencyPicker.tsx` suppresses deps on the `handleSearch` callback
  - `useWorkItems.ts` suppresses deps on a fetch effect
- **Recommendation:** Investigate whether these can be fixed by: (1) using `useRef` for stable references, (2) wrapping with `useCallback` properly, or (3) adding a comment explaining why the omission is intentional (per the architecture rule: "never swallow errors silently" — same principle applies to lint suppressions). If intentional, replace the eslint-disable line with a `// eslint-disable-next-line react-hooks/exhaustive-deps — intentional: [reason]` comment.
- **Cross-ref:** TheFixer

---

### QO-005: FR-TMP-008 Has No Traceability in platform/
- **Severity:** P4
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`, FR-TMP-008 (Worker Container Prerequisites)
- **Detail:** FR-TMP-001 through FR-TMP-010 are implemented in `platform/orchestrator/lib/workflow-engine.js` and `platform/orchestrator/lib/dispatch.js`. All are traced with `// Verifies: FR-TMP-XXX` comments except FR-TMP-008 (Dockerfile.worker prerequisites for `gh` CLI and Playwright). This is likely because Dockerfile changes don't conventionally carry comment traceability.
- **Recommendation:** Add a comment near the `gh` CLI installation step in `Dockerfile.worker` (or the relevant platform script) — `# Verifies: FR-TMP-008`. Alternatively, add a note in the platform README linking FR-TMP-008 to the Dockerfile.
- **Cross-ref:** platform/ is solo-session only; do not route to TheFixer pipeline.

---

### QO-006: api/client.ts — Silent .catch() in Error Path
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}));` silently swallows JSON parse errors on non-2xx responses. While the immediately-following `throw new Error(...)` means the failure is not fully suppressed, the catch provides no diagnostic context about why the response body couldn't be parsed. This is a borderline violation of the "never swallow errors silently" rule — technically compliant because the outer error is re-thrown, but the inner parse failure loses context.
- **Recommendation:** This is acceptable as-is. If more debugging context is needed, change to `.catch((parseErr) => { console.warn('Failed to parse error body:', parseErr); return {}; })` — but only in development; suppress in production.
- **Cross-ref:** Minor; low priority.

---

## Architecture Rule Compliance Matrix

| Rule | Status | Notes |
|---|---|---|
| Specs are source of truth | ⚠️ PARTIAL | Active plan 100% traced; Specifications/ enforcer blind spot (QO-001) |
| No direct DB calls from routes | ✅ PASS | Routes use store/service layer only; no DB framework in routes |
| Shared types single source of truth | ✅ PASS | All types imported from `Source/Shared/types/workflow.ts` |
| Every FR needs `// Verifies:` | ✅ PASS | Active plan FRs (FR-WF-*, FR-dependency-*): 100% traced |
| No hardcoded secrets | ✅ PASS | No credentials found in Source/ |
| List endpoints return `{data: T[]}` wrappers | ✅ PASS | All list responses follow DataResponse pattern |
| New routes must have observability | ✅ PASS | Structured logger used; Prometheus metrics in routes |
| Business logic has no framework imports | ✅ PASS | Services import only Shared types, not Express |
| Never swallow errors silently | ✅ PASS | DependencyPicker.tsx catch is documented as intentional |
| No `console.log` in production | ✅ PASS | Only structured logger abstraction used |

---

## Pattern Enforcement

| Pattern | Violations |
|---|---|
| `console.log` / `console.error` in production | 0 |
| Hardcoded secrets or credentials | 0 |
| Empty catch blocks (undocumented) | 0 (1 documented) |
| `eslint-disable` suppressions | 2 (QO-004) |
| Source files > 500 lines | 0 (largest: WorkItemDetailPage.tsx at 426 lines) |
| `test.skip` / `todo` | 0 |
| TODO/FIXME with stale dates | 0 |

---

## JSON Summary

```json
{
  "audit_date": "2026-10-19",
  "grade": "B",
  "spec_coverage": {
    "active_plan_pct": 100,
    "specifications_enforced": false,
    "untraced_in_source_by_spec": {
      "dev-workflow-platform.md": 74,
      "tiered-merge-pipeline.md": 10
    },
    "explanation": "Specifications target portal/ and platform/ respectively, not Source/"
  },
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "spec-drift", "title": "Traceability enforcer blind to Specifications/ directory" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "dev-workflow-platform.md vs Source/ split not documented" },
    { "id": "QO-003", "severity": "P3", "category": "hygiene", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-004", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable react-hooks/exhaustive-deps in 2 prod files" },
    { "id": "QO-005", "severity": "P4", "category": "spec-drift", "title": "FR-TMP-008 untraced in platform/" },
    { "id": "QO-006", "severity": "P4", "category": "pattern-violation", "title": "Silent .catch() in api/client.ts error path" }
  ],
  "p1_count": 0,
  "p2_count": 2,
  "p3_count": 2,
  "p4_count": 2,
  "architecture_violations": 0,
  "console_log_violations": 0,
  "hardcoded_secrets": 0,
  "files_over_500_lines": 0
}
```
