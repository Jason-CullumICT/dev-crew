---

## Quality Oracle Findings — 2026-06-10

### Spec Coverage: 100% (active requirements)

| Scope | Requirements | Traced | Gap |
|-------|-------------|--------|-----|
| FR-WF-001 to FR-WF-013 (workflow engine) | 13 | 13 | 0 |
| FR-dependency-* (dependency linking) | 15 | 15 | 0 |
| Specifications/dev-workflow-platform.md FR-001–069+ | — | — | portal/ scope (not Source/) |

**Enforcer result (default run):** ✅ PASSED — targets `Plans/self-judging-workflow/requirements.md`
**Enforcer result (dependency-linking):** ⚠️ Reports 7 failures — all false positives (see QO-002)

---

### QO-001: Traceability enforcer silently checks only one requirements file
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py` (auto-discovery logic, lines 30–49)
- **Detail:** The enforcer falls back to the most-recently-modified `requirements.md` under `Plans/`. Multiple active plans exist (`dependency-linking`, `dev-cycle-traceability`) and none are checked unless `--file` is explicitly passed. The CLAUDE.md verification gate (`python3 tools/traceability-enforcer.py`) silently covers only one plan at a time. If the most-recently-modified requirements file changes (e.g., someone touches a different plan), coverage for the workflow engine plan could silently drop off radar.
- **Recommendation:** Add a `--all` mode that scans every `Plans/**/requirements.md` in a single pass, or maintain an explicit manifest in `inspector.config.yml` listing all requirements files to enforce. Update the CLAUDE.md gate command to explicitly target the active plan: `python3 tools/traceability-enforcer.py --plan self-judging-workflow`.
- **Cross-ref:** TheFixer (tool improvement)

---

### QO-002: Enforcer regex produces false positives on dependency-linking requirements
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:76`, `Plans/dependency-linking/requirements.md`
- **Detail:** Running `python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md` reports 7 MISSING requirements: `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007` (work item data IDs used in the seed description), and `FR-070`, `FR-085` (spec cross-reference range markers: "FR-070 — FR-085"). The regex `FR-[A-Z0-9-]+` matches these non-requirement strings. All 15 actual `FR-dependency-*` IDs are correctly traced in Source/. The enforcer is broken for this plan.
- **Recommendation:** Tighten the enforcer regex to `\bFR-[A-Z][A-Z0-9-]*\b` (require at least one alpha character after the prefix) or use a more specific pattern like `FR-(?!0)[A-Z]`. Alternatively, anchor matching to lines that look like table rows: `\| FR-` so inline narrative mentions don't match.
- **Cross-ref:** TheFixer

---

### QO-003: Duplicate frontend test files — old versions have stale mocks
- **Severity:** P2
- **Category:** untested / architecture-violation
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines, **old**)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines, **canonical**)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines, **old**)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines, **canonical**)
- **Detail:** Two distinct versions of each page test exist. The old files (root of `tests/`) have different import paths (`'../src/...'` vs `'../../src/...'`), different mock setups (old versions mock `list`, `create`, `assess` methods that may no longer be in the API), and no imported type assertions. The Vitest config has no exclude rule — **both versions run**. This doubles the test execution time and masks regressions: a test could pass in the old file (with a looser mock) while failing in the canonical version. The old files' mock shapes reference removed methods and will break silently if the API contract changes.
- **Recommendation:** Delete the old root-level duplicates (`tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx`). The `tests/pages/` variants are more complete. Verify no test cases in the old files are absent from the canonical versions before deleting.
- **Cross-ref:** TheFixer

---

### QO-004: FR-WF-013 workflow Prometheus counters have no test assertions
- **Severity:** P2
- **Category:** untested
- **Files:** `Source/Backend/src/metrics.ts`, `Source/Backend/tests/routes/metrics.test.ts`
- **Detail:** `metrics.ts` defines four FR-WF-013 workflow counters (`workflow_items_created_total`, `workflow_items_routed_total`, `workflow_items_assessed_total`, `workflow_items_dispatched_total`). The `metrics.test.ts` file covers `FR-dependency-metrics` (dependency counters) extensively but contains **zero assertions** for the workflow counters. CLAUDE.md requires "Every FR needs a test with `// Verifies: FR-XXX`". FR-WF-013 is covered in source code `Verifies` comments but not in any test assertion that confirms the counters are actually emitted to `GET /metrics`.
- **Recommendation:** Add a `describe('FR-WF-013 workflow counters')` block in `metrics.test.ts` (or a new `Source/Backend/tests/routes/workflowMetrics.test.ts`) with assertions that `workflow_items_routed_total`, `workflow_items_assessed_total`, and `workflow_items_dispatched_total` appear in the metrics endpoint response after exercising the respective workflow actions.
- **Cross-ref:** TheFixer

---

### QO-005: `isValidTransition` — domain logic defined inside route handler
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workflow.ts:33–36`
- **Detail:** A `isValidTransition(from, to)` helper is defined at module level inside the route file. It contains the domain rule for which work item status transitions are valid (wrapping `VALID_STATUS_TRANSITIONS`). CLAUDE.md architecture rule: "Business logic has no framework imports." While this function itself has no framework imports, defining domain logic (even a one-liner) inside a route module blurs service-layer boundaries. If route handlers grow, this pattern encourages embedding more logic inline.
- **Recommendation:** Move `isValidTransition` to `Source/Backend/src/services/router.ts` (which already owns routing logic) or to a `Source/Backend/src/utils/stateMachine.ts` helper. Route handler should call `routerService.isValidTransition(from, to)`.

---

### QO-006: Two logger import paths in production code (split abstraction)
- **Severity:** P3
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/store/workItemStore.ts:10`, all others
- **Detail:** `workItemStore.ts` imports `{ logger }` from `'../utils/logger'` (the raw JSON emitter). Every other file (routes, services, middleware) imports from `'../logger'` (the compat wrapper with a `normalize()` adapter supporting object-first calling style). This means the store logs using a different interface than the rest of the system — `utils/logger` only accepts `(msg: string, ctx?)` while `src/logger` accepts `(msgOrObj: string | Record, ctx?)`. The inconsistency was likely introduced when two backend coders each implemented their own logger and a wrapper was added afterward for compatibility but the store wasn't updated.
- **Recommendation:** Update `workItemStore.ts:10` to `import logger from '../logger'` to use the unified compat wrapper. Then assess whether the `utils/logger` raw export should be kept (it only needs to be the implementation detail of `src/logger`).

---

### QO-007: Silent catch in `api/client.ts` — violates error-swallowing rule
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:**
  ```ts
  const body = await response.json().catch(() => ({}));
  ```
  JSON parse failures are silently caught and replaced with an empty object. The thrown `Error` is then constructed from `body.message ?? \`Request failed: ${response.status}\`` — so if the server returns a non-JSON body, the error message loses context (becomes just the status code). CLAUDE.md: "Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."
- **Recommendation:** Either add an inline comment (`// JSON parse may fail for non-JSON error bodies (e.g., HTML 502 proxies) — fall back to empty object intentionally`) or restructure to: `const text = await response.text(); const body = safeJsonParse(text) ?? { message: text }`.

---

### QO-008: Undocumented `eslint-disable` suppressions in two production files
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line` but provide no explanation of why the suppression is safe. This rule exists to prevent stale-closure bugs. Silently suppressing it without a rationale comment means future readers have no indication whether the dependency was intentionally omitted or was simply forgotten.
- **Recommendation:** Add inline explanation: `// eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally omit X to avoid infinite refetch loop (X changes on every render)`.

---

### QO-009: `Specifications/dev-workflow-platform.md` defines 69+ FRs with no traceability in `Source/`
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The `Specifications/` directory is declared "the most critical documents — domain truth." `dev-workflow-platform.md` defines FR-001 through FR-069+ (feature requests, bug reports, development cycles, pipeline orchestration). None of these are implemented in `Source/` — they are implemented in `portal/`. The enforcer never targets this spec file. If someone runs `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md`, they'll see 69+ failures. This creates confusion: are these requirements abandoned? Deferred? Or simply portal-scoped?
- **Recommendation:** Add a comment at the top of `Specifications/dev-workflow-platform.md` stating: `<!-- Implementation target: portal/ — not Source/ -->`. Update `inspector.config.yml` to set `specs.implementation_dir` explicitly. Consider a separate requirements file in `Plans/dev-workflow-platform/requirements.md` scoped to `portal/` so the enforcer can run against it without confusion.
- **Cross-ref:** This is an architectural documentation gap, not a code bug. The portal implementation is real — just not traceable from the spec file.

---

### QO-010: `WorkItemDetailPage.tsx` at 426 lines approaching 500-line threshold
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/WorkItemDetailPage.tsx` (426 lines)
- **Detail:** CLAUDE.md architecture check flags files >500 lines as needing splitting. At 426 lines and growing (dependency section, assessment section, change history all in one component), this file is 15% from the threshold. The component mixes data fetching, business action handlers, and multiple sections of UI.
- **Recommendation:** Proactively extract the assessment display and change history timeline into sub-components (`WorkItemAssessmentPanel`, `WorkItemHistory`) before the file crosses 500 lines.

---

### Summary

```json
{
  "audit_date": "2026-06-10",
  "grade": "B",
  "spec_coverage_pct": 100,
  "requirements_total": 28,
  "requirements_traced": 28,
  "requirements_untraced": 0,
  "findings": [
    {"id": "QO-001", "severity": "P2", "category": "spec-drift", "title": "Enforcer checks only one requirements file at a time"},
    {"id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "Enforcer regex false positives on dependency-linking requirements"},
    {"id": "QO-003", "severity": "P2", "category": "untested", "title": "Duplicate frontend test files with stale mocks"},
    {"id": "QO-004", "severity": "P2", "category": "untested", "title": "FR-WF-013 workflow Prometheus counters have no test assertions"},
    {"id": "QO-005", "severity": "P3", "category": "architecture-violation", "title": "isValidTransition domain logic in route handler"},
    {"id": "QO-006", "severity": "P3", "category": "architecture-violation", "title": "Split logger abstraction (store vs routes/services)"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "Silent catch swallows JSON parse error in api/client.ts"},
    {"id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "Undocumented eslint-disable suppressions"},
    {"id": "QO-009", "severity": "P3", "category": "spec-drift", "title": "dev-workflow-platform.md specs not traced (portal scope gap)"},
    {"id": "QO-010", "severity": "P4", "category": "pattern-violation", "title": "WorkItemDetailPage.tsx approaching 500-line threshold"}
  ],
  "p1_count": 0,
  "p2_count": 4,
  "p3_count": 5,
  "p4_count": 1,
  "escalate_to_guardians": false,
  "route_to_fixer": ["QO-002", "QO-003", "QO-004", "QO-006", "QO-007", "QO-008", "QO-010"],
  "route_to_fixer_tool": ["QO-001", "QO-002"]
}
```

---

**Grade: B** — 0 P1s, 4 P2s, 100% active spec coverage. The workflow engine spec is fully traced and all FR-WF IDs are covered in both source and tests. The four P2s are tooling reliability issues (enforcer scope, enforcer false positives) and test hygiene (duplicate test files, missing Prometheus counter assertions) — none are functional defects in the domain logic.
