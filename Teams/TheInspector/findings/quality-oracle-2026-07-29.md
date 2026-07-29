# Quality Oracle Findings — 2026-07-29

## Spec Coverage Summary

| Spec | FR namespace | Requirements | Traced | Coverage |
|------|-------------|-------------|--------|----------|
| `Specifications/workflow-engine.md` | FR-WF-001 – FR-WF-013 | 13 | 13 (Source/) | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` | FR-001 – FR-069 | 74 | ~74 (portal/) | **~100%** ✅ |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 – FR-TMP-010 | 10 | ~8 (platform/orchestrator/) | **~80%** ⚠️ |
| `Plans/dependency-linking/requirements.md` | FR-dependency-* | 15 | 15 (portal/ + Source/) | **100%** ✅ |

**Overall spec coverage: ~97%** — the primary gap is FR-TMP-005 and FR-TMP-006 (unconfirmed) and one concrete implementation gap in `Source/` (FR-dependency-search endpoint unwired).

> **Critical caveat**: The traceability enforcer (`python3 tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`. Running it reports 100% for FR-WF-* but gives a misleading picture of overall project health. The portal app (74 FRs, 1073 Verifies comments) and platform orchestrator (FR-TMP-*) are completely outside the enforcer's scope.

---

## Findings

### QO-001: `GET /api/search` implemented but not wired into app.ts
- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/app.ts` (missing route registration) / `Source/Backend/tests/routes/search.test.ts:6`
- **Detail:** `FR-dependency-search` requires a `GET /api/search?q=` cross-entity typeahead search endpoint. The test file (`search.test.ts`) explicitly acknowledges the route is absent: _"NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."_ The tests will fail on every CI run until the route is registered.
- **Recommendation:** Add the `/api/search` route (the handler logic can live in `Source/Backend/src/routes/` or inline in `app.ts`). The acceptance criteria is in `Plans/dependency-linking/requirements.md` under FR-dependency-search.
- **Cross-ref:** TheFixer — backend fix

---

### QO-002: Traceability enforcer scope excludes portal/ and platform/ — false-passing gates
- **Severity:** P2
- **Category:** architecture-violation / spec-drift
- **File:** `tools/traceability-enforcer.py:80` (`source_dirs = ["Source", "E2E"]`)
- **Detail:** The enforcer's hardcoded scan paths (`Source/`, `E2E/`) exclude the two largest source trees:
  - `portal/` — the main Dev Workflow Platform app with 1,073 `Verifies:` comments covering FR-001 through FR-095
  - `platform/orchestrator/` — the Tiered Merge Pipeline implementation covering FR-TMP-001 through FR-TMP-010
  
  Running `python3 tools/traceability-enforcer.py --file Plans/dev-workflow-platform/requirements.md` reports **34 missing requirements** because it cannot see `portal/`. The verification gate in CLAUDE.md (`python3 tools/traceability-enforcer.py`) provides false assurance for all portal and platform work.
- **Recommendation:** Either (a) extend `source_dirs` in the enforcer to include `portal/` and `platform/`, or (b) add a project-level overrideable config entry in `inspector.config.yml` under `specs:` that lists all source roots to scan. The config already has `source.dirs: ["Source/"]` — wiring that to the enforcer would fix it.
- **Cross-ref:** TheFixer — tooling fix; aligns with CLAUDE.md "Verification gates" requirement

---

### QO-003: Route handlers bypass service layer in Source/Backend
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:44`, `Source/Backend/src/routes/workflow.ts:119`, `Source/Backend/src/routes/intake.ts:19`
- **Detail:** CLAUDE.md mandates "No direct DB calls from route handlers — use the service layer." All three route files call `store.*` methods directly:
  - `workItems.ts`: `store.createWorkItem()`, `store.findAll()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()`
  - `workflow.ts`: `store.findById()`, `store.updateWorkItem()` at 8 call sites
  - `intake.ts`: `store.createWorkItem()` at 2 call sites
  
  Business-logic services (`assessment.ts`, `router.ts`, `changeHistory.ts`, `dependency.ts`) exist and demonstrate the correct pattern. The route files have not been refactored to use them consistently.
- **Recommendation:** Extract store interactions in the three route files into service functions. For example, `workItems.ts` POST could delegate to a `createWorkItemService(body)` that handles validation, store creation, and metrics increment.
- **Cross-ref:** TheFixer — backend refactor

---

### QO-004: FR-TMP-001 to FR-TMP-010 (Tiered Merge Pipeline) not covered by traceability gate
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py` / `Specifications/tiered-merge-pipeline.md`
- **Detail:** `Specifications/tiered-merge-pipeline.md` defines 10 requirements (FR-TMP-001 through FR-TMP-010) covering risk classification, E2E test generation, auto-PR, AI review, and auto-merge. These are implemented in `platform/orchestrator/lib/dispatch.js`, `platform/orchestrator/lib/config.js`, and tested in `platform/orchestrator/lib/workflow-engine.test.js`. However:
  1. The enforcer never scans `platform/`
  2. FR-TMP-005 (AI PR Review) and FR-TMP-006 (Auto-Merge Logic) were not confirmed traced via Verifies comments in this audit
- **Recommendation:** Add `platform/orchestrator/` to the enforcer's scan scope (P2 above), and spot-verify FR-TMP-005/006 traceability.
- **Cross-ref:** QO-002

---

### QO-005: `dependencyCheckDuration` histogram missing from Source/Backend metrics
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts:40-62`
- **Detail:** `FR-dependency-metrics` requires four metrics: `dependencyOperations` counter, `dispatchGatingEvents` counter, `dependencyCheckDuration` histogram, and `cycleDetectionEvents` counter. `Source/Backend/src/metrics.ts` implements three counters but **no histogram**. The histogram is correctly implemented in `portal/Backend/src/metrics.ts` (line 23), which is the authoritative location per the spec. The Source/ file incorrectly claims `// Verifies: FR-dependency-metrics` without delivering all four metrics.
- **Recommendation:** Either add the `dependencyCheckDuration` Histogram to `Source/Backend/src/metrics.ts`, or narrow the Verifies comment to only the three counters it actually implements (e.g., `// Verifies: FR-WF-013 — dependency operation counters`).
- **Cross-ref:** TheFixer — backend

---

### QO-006: Logger missing dev-mode pretty-printing
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/utils/logger.ts:24`
- **Detail:** CLAUDE.md and FR-003 require "structured JSON logging in production, pretty-printing in development." `utils/logger.ts` always emits `JSON.stringify(entry)` via `process.stdout.write` regardless of `NODE_ENV`. There is no conditional pretty-print branch. This makes local development harder to debug (machine-readable JSON requires piping through `jq`).
- **Recommendation:** Add a `process.env.NODE_ENV !== 'production'` branch that uses `JSON.stringify(entry, null, 2)` or a formatted string output.
- **Cross-ref:** TheFixer — minor backend fix

---

### QO-007: Duplicate logger files with ambiguous ownership
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Backend/src/logger.ts` and `Source/Backend/src/utils/logger.ts`
- **Detail:** Two logger files exist: `src/utils/logger.ts` (the canonical structured JSON implementation) and `src/logger.ts` (a compatibility wrapper that re-exports with a different call signature supporting object-first arguments). Routes imported from both paths. This creates ambiguity: new contributors may use either, the wrapper silently transforms `logger.error({msg, ...})` calls while the canonical version takes `(string, ctx)`. The comment in `logger.ts` says "Backend-coder-2's workflow routes import `logger` as default from this module" — explaining the origin but not resolving the long-term ownership.
- **Recommendation:** Canonicalize on one file. Either (a) update `utils/logger.ts` to support both call signatures and remove `logger.ts`, or (b) formally designate `logger.ts` as the canonical entry point and have it fully own the implementation. Update all import sites to use one path.
- **Cross-ref:** TheFixer — minor refactor

---

### QO-008: eslint-disable comments without documented justification
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line` but provide no inline comment explaining why the exhaustive deps rule is intentionally violated. This pattern makes it impossible to distinguish "we thought about this" from "we silenced the noise."
- **Recommendation:** Add a one-line comment explaining the intentional omission, e.g., `// intentionally omit X to avoid infinite loop on initial mount`.

---

## Grade

Per `inspector.config.yml` grading criteria:

| Criteria | Value |
|----------|-------|
| P1 findings | 1 |
| P2 findings | 3 |
| P3 findings | 3 |
| P4 findings | 1 |
| Spec coverage | ~97% |

**Grade: B** — P1 finding (unwired search route / failing tests) is a clear blocker. No P1 that constitutes an exploitable security issue. P2 findings are structural debt.

---

## JSON Summary

```json
{
  "date": "2026-07-29",
  "grade": "B",
  "spec_coverage_pct": 97,
  "requirements_total": 112,
  "requirements_traced": 109,
  "findings": [
    {
      "id": "QO-001",
      "severity": "P1",
      "category": "spec-drift",
      "title": "GET /api/search not wired into app.ts — tests will fail",
      "file": "Source/Backend/src/app.ts",
      "fix_team": "TheFixer"
    },
    {
      "id": "QO-002",
      "severity": "P2",
      "category": "architecture-violation",
      "title": "Traceability enforcer excludes portal/ and platform/ — false-passing gates",
      "file": "tools/traceability-enforcer.py",
      "fix_team": "TheFixer"
    },
    {
      "id": "QO-003",
      "severity": "P2",
      "category": "architecture-violation",
      "title": "Route handlers call store.* directly, bypassing service layer",
      "file": "Source/Backend/src/routes/workItems.ts",
      "fix_team": "TheFixer"
    },
    {
      "id": "QO-004",
      "severity": "P2",
      "category": "spec-drift",
      "title": "FR-TMP-001..010 (tiered merge pipeline) not covered by traceability gate",
      "file": "tools/traceability-enforcer.py",
      "fix_team": "TheFixer"
    },
    {
      "id": "QO-005",
      "severity": "P3",
      "category": "spec-drift",
      "title": "dependencyCheckDuration histogram missing from Source/Backend metrics",
      "file": "Source/Backend/src/metrics.ts",
      "fix_team": "TheFixer"
    },
    {
      "id": "QO-006",
      "severity": "P3",
      "category": "architecture-violation",
      "title": "Logger missing dev-mode pretty-printing (NODE_ENV check absent)",
      "file": "Source/Backend/src/utils/logger.ts",
      "fix_team": "TheFixer"
    },
    {
      "id": "QO-007",
      "severity": "P3",
      "category": "pattern-violation",
      "title": "Two logger files with ambiguous ownership",
      "file": "Source/Backend/src/logger.ts",
      "fix_team": "TheFixer"
    },
    {
      "id": "QO-008",
      "severity": "P4",
      "category": "pattern-violation",
      "title": "eslint-disable comments without documented justification",
      "file": "Source/Frontend/src/hooks/useWorkItems.ts",
      "fix_team": "TheFixer"
    }
  ]
}
```
