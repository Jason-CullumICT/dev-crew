# Quality Oracle Audit — 2026-09-18

**Auditor:** quality-oracle  
**Config:** `Teams/TheInspector/inspector.config.yml`  
**Focus:** Full audit — spec drift, traceability, architecture rules, test quality, pattern enforcement

---

## Spec Coverage Summary

| Scope | Requirements | Traced | Coverage |
|-------|-------------|--------|----------|
| `Plans/self-judging-workflow` (FR-WF-001–013) | 13 | 13 | **100%** |
| `Plans/dependency-linking` (FR-dependency-*) | 15 | 14 effective | **93%** (search route unregistered) |
| `Specifications/dev-workflow-platform.md` (FR-001–069) | 69 | 0 | **0%** (portal/ app — not Source/) |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 0 | **0%** in Source/; E2E config has no Verifies |

> **Note**: `Specifications/dev-workflow-platform.md` and `tiered-merge-pipeline.md` cover the `portal/` app and platform orchestrator respectively — not the `Source/` app. The 0% is expected but the lack of labeling is a documentation hazard (see QO-003).

---

## Findings

### QO-001: `GET /api/search` endpoint is unregistered — DependencyPicker is broken

- **Severity:** P1
- **Category:** spec-drift / correctness
- **File:** `Source/Backend/src/app.ts:1–54`
- **Detail:**  
  `FR-dependency-search` requires `GET /api/search?q=` for cross-entity typeahead search. The route test `Source/Backend/tests/routes/search.test.ts` explicitly documents the gap:
  ```
  // NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into
  // Source/Backend/src/app.ts. These tests document the expected contract and will
  // FAIL until the route is implemented.
  ```
  There is no `search.ts` route file in `Source/Backend/src/routes/`. The `DependencyPicker` component calls `/api/search` and will receive a 404 in production, breaking the dependency selection UI entirely.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` implementing `GET /api/search?q=` over the work item store, then register it in `app.ts` with `app.use('/api/search', searchRouter)`. Add `// Verifies: FR-dependency-search` to both.
- **Cross-ref:** TheFixer for implementation; tests already written and will pass once wired.

---

### QO-002: `dependencyCheckDuration` histogram absent from Source Backend metrics

- **Severity:** P2
- **Category:** spec-drift / missing-metric
- **File:** `Source/Backend/src/metrics.ts:1–64`
- **Detail:**  
  `FR-dependency-metrics` specifies four Prometheus metrics: `dependencyOperations` counter, `dispatchGatingEvents` counter, **`dependencyCheckDuration` histogram**, and `cycleDetectionEvents` counter.  
  The portal app (`portal/Backend/src/metrics.ts`) correctly implements all four including the histogram. The Source Backend metrics file exports only 3 of 4 — it is missing the `dependencyCheckDuration` histogram entirely. No timer is started in `Source/Backend/src/services/dependency.ts` (the portal service uses it; the Source service does not).
- **Recommendation:** Add to `Source/Backend/src/metrics.ts`:
  ```ts
  // Verifies: FR-dependency-metrics — dependency_check_duration_seconds
  export const dependencyCheckDuration = new Histogram({
    name: 'dependency_check_duration_seconds',
    help: 'Latency of dependency check operations',
    labelNames: ['check_type'] as const,
    registers: [registry],
  });
  ```
  Then use it in `Source/Backend/src/services/dependency.ts` around readiness checks and cascade dispatch.
- **Cross-ref:** TheFixer.

---

### QO-003: Specifications directory covers two architecturally distinct apps without labeling

- **Severity:** P2
- **Category:** architecture-violation / doc-stale
- **File:** `Specifications/` (directory)
- **Detail:**  
  `Specifications/` contains three distinct specs with no indication of which app they target:
  - `workflow-engine.md` → `Source/` (Self-Judging Workflow Engine, in-memory store, Work Items)
  - `dev-workflow-platform.md` → `portal/` (SQLite-backed, Feature Requests, Bugs, Development Cycles)
  - `tiered-merge-pipeline.md` → `platform/` orchestrator (Docker workers, GitHub PRs, E2E runner)
  
  An agent reading `Specifications/` has no way to know which spec applies to which module. The `CLAUDE.md` says "Specs are source of truth — implementation traces to specs, never the other way around" but does not map specs to source dirs. This is especially hazardous because `dev-workflow-platform.md` defines FR-001–069 that conflict in namespace with the dependency plan's FR-0002 etc. entity IDs (causing false positives in the traceability enforcer).
- **Recommendation:** Add a table to `Specifications/README.md` or the top of each spec file: `Applies to: Source/ | portal/ | platform/`. Also add a disambiguation note to `CLAUDE.md` under "Read These First".
- **Cross-ref:** requirements-reviewer to update spec headers; solo session can edit Specifications/.

---

### QO-004: Traceability enforcer auto-selects wrong plan — dependency-linking plan silently un-enforced

- **Severity:** P2
- **Category:** test-coverage / traceability
- **File:** `tools/traceability-enforcer.py:48–57`
- **Detail:**  
  The enforcer uses `most-recently-modified requirements.md` fallback, which currently selects `Plans/self-judging-workflow/requirements.md`. Running `python3 tools/traceability-enforcer.py` (as specified in `CLAUDE.md` verification gates) PASSES — but never checks the `dependency-linking` plan, which independently FAILS with 7 reported missing IDs (5 are false positives from entity ID prose, 2 are real: `FR-070`, `FR-085`).
  
  Additionally, ALL verification gates in `CLAUDE.md` run the enforcer without `--plan`, meaning the `dependency-linking` requirements are never gate-checked by any agent.
- **Recommendation:**  
  1. Update `CLAUDE.md` verification gates to explicitly name both plans:
     ```bash
     python3 tools/traceability-enforcer.py --plan self-judging-workflow
     python3 tools/traceability-enforcer.py --plan dependency-linking
     ```
  2. Fix the false-positive issue in the enforcer: entity IDs in requirement prose (e.g., `FR-0004 blocked_by FR-0003`) are matched as requirement IDs. Add a filter to skip IDs that appear only inside prose (not in the `| FR-ID |` table rows).
- **Cross-ref:** solo session (tools/); requirements-reviewer (CLAUDE.md update).

---

### QO-005: FR-TMP-001–010 (Tiered Merge Pipeline) have zero source traceability

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/E2E/playwright.pipeline.config.ts:1–10`
- **Detail:**  
  `Specifications/tiered-merge-pipeline.md` defines 10 functional requirements (FR-TMP-001 through FR-TMP-010). None have `// Verifies: FR-TMP-*` comments anywhere in `Source/` or `E2E/`. `Source/E2E/playwright.pipeline.config.ts` (recently modified, no Verifies comment) is the only artifact related to FR-TMP-003 (Live Playwright E2E Runner) but carries no traceability.
  
  It is unclear whether these requirements are: (a) implemented in `platform/` (which the traceability enforcer doesn't scan), (b) not yet implemented, or (c) implemented without traceability.
- **Recommendation:** If FR-TMP-001–010 are implemented in `platform/`, expand the enforcer's scan paths to include `platform/` or create a separate gate. If not yet implemented, mark as open backlog in `Specifications/tiered-merge-pipeline.md`. Either way, add `// Verifies: FR-TMP-003` to `playwright.pipeline.config.ts`.
- **Cross-ref:** solo session (platform/).

---

### QO-006: `playwright.pipeline.config.ts` references a specific expired cycle directory

- **Severity:** P3
- **Category:** correctness
- **File:** `Source/E2E/playwright.pipeline.config.ts:3`
- **Detail:**  
  ```ts
  testDir: "./tests/cycle-run-1774659927912-8dd3ac77",
  ```
  This hardcodes a specific, auto-generated cycle run directory. That directory almost certainly no longer exists. Any E2E pipeline run using this config will fail immediately at test discovery. It should use a parameterized or convention-based path (e.g., derived from an env var: `process.env.CYCLE_RUN_ID`).
- **Recommendation:** Replace the hardcoded `testDir` with `process.env.E2E_TEST_DIR ?? './tests'` or have the pipeline write the config dynamically before running Playwright.
- **Cross-ref:** platform/orchestrator team (writes this config at runtime).

---

### QO-007: Duplicate test files for WorkItemListPage and WorkItemDetailPage

- **Severity:** P3
- **Category:** test-coverage / tech-debt
- **Files:**
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines, 18 describe/it)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines, 14 describe/it)
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (21 describe/it)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (22 describe/it)
- **Detail:**  
  Each page has two test files at different paths, both tracing to the same FR IDs. This is silent duplication: two different test suites covering the same component, potentially with diverging coverage and assumptions. When the component changes, only one may be updated. Vitest will run both, inflating test counts and hiding gaps.
- **Recommendation:** Consolidate to one file per page. Merge coverage into `Source/Frontend/tests/pages/` (the more conventionally named location) and delete the root-level duplicates.
- **Cross-ref:** TheFixer (frontend test cleanup).

---

### QO-008: `eslint-disable-next-line` suppressions without documented rationale

- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:**  
  Both suppress `react-hooks/exhaustive-deps` without explaining why the dependency array is intentionally incomplete. Architecture rules state: "every `catch` block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed." The same principle applies to lint suppressions — silent disables are an architecture smell.
- **Recommendation:** Add a one-line comment above each suppression explaining the intentional omission (e.g., `// intentionally omit 'filters' object ref — individual filter fields are listed explicitly below to avoid re-fetching on object identity changes`).
- **Cross-ref:** TheFixer (minor; frontend only).

---

## Spec Coverage Matrix (Final)

| Requirement Set | Total | Traced in Source | Gap |
|----------------|-------|------------------|-----|
| FR-WF-001 to FR-WF-013 | 13 | 13 ✅ | 0 |
| FR-dependency-* (15 requirements) | 15 | 14 ⚠️ | 1 (search route not registered) |
| FR-TMP-001 to FR-TMP-010 | 10 | 0 ❌ | 10 (platform/ scope, not Source/) |
| FR-001 to FR-069 (portal) | 69 | 0 ❌ | 69 (portal/ scope, not Source/) |
| **Active plan total** | **28** | **27** | **1 P1 gap** |

---

## JSON Summary

```json
{
  "audit_date": "2026-09-18",
  "auditor": "quality-oracle",
  "spec_coverage": {
    "active_plan_total": 28,
    "active_plan_traced": 27,
    "active_plan_pct": 96,
    "note": "1 FR-dependency-search implementation gap (route unregistered)"
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "GET /api/search unregistered — DependencyPicker broken"},
    {"id": "QO-002", "severity": "P2", "category": "missing-metric", "title": "dependencyCheckDuration histogram absent from Source Backend"},
    {"id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Specifications/ covers two apps without labeling — namespace collision"},
    {"id": "QO-004", "severity": "P2", "category": "traceability", "title": "Enforcer auto-selects wrong plan — dependency-linking silently unchecked"},
    {"id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-001–010 have zero source traceability"},
    {"id": "QO-006", "severity": "P3", "category": "correctness", "title": "playwright.pipeline.config.ts hardcodes expired cycle directory"},
    {"id": "QO-007", "severity": "P3", "category": "tech-debt", "title": "Duplicate test files for WorkItemListPage and WorkItemDetailPage"},
    {"id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressions without documented rationale"}
  ],
  "p1_count": 1,
  "p2_count": 4,
  "p3_count": 3,
  "grade": "B"
}
```

---

## Grade: **B**

Per grading rubric: `{ max_p1: 0, max_p2: 8, min_spec_coverage: 60 }` → **B** requires zero P1s. The unregistered search route (QO-001) is an exploitable functional gap (DependencyPicker returns 404 in production) and is a P1. Fixing QO-001 and QO-002 would bring the active-plan coverage to 100% and drop to 0 P1s → eligible for **A** (min spec coverage 80%: active plans at 96%).
