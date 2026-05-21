## Quality Oracle Findings — 2026-05-21

**Grade: C** (P1 findings present — verification gates non-functional)

---

### Spec Coverage Summary

This repo contains **three distinct applications**, each tracing to a different specification:

| Application | Spec | FR Range | Enforcer Scans? |
|-------------|------|----------|-----------------|
| `Source/` — Self-Judging Workflow Engine | `Specifications/workflow-engine.md` | FR-WF-001 → FR-WF-013 | ✅ Yes |
| `portal/` — Dev Workflow Platform | `Specifications/dev-workflow-platform.md` | FR-001 → FR-069+ | ❌ No |
| `platform/` — Orchestrator Infrastructure | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 → FR-TMP-010 | ❌ No |

- **Source/ requirements**: 13/13 WF-FRs implemented + FR-dependency-* (12/14 fully, 2 gaps)
- **Portal/ requirements**: 95+ FRs covered across FR-001 → FR-095 (spec defines FR-001 → FR-069)
- **Platform/ requirements**: 9/10 FR-TMP IDs annotated (FR-TMP-008 implemented, unannotated)

**Effective enforcer coverage: 13 of 118+ spec requirements = ~11%** (enforcer scans only `Source/`)

---

### QO-001: Verification Gates Entirely Non-Functional

- **Severity:** P1
- **Category:** untested
- **Files:** `Source/Backend/node_modules/` (20 KB, contains only `.vite`), `Source/Frontend/node_modules/` (absent)
- **Detail:** Running `cd Source/Backend && npm test` returns `sh: jest: not found`. The node_modules directory exists but is virtually empty — only a `.vite` directory is present. No Jest binary, no `express`, no `supertest`, no `@shared` alias. Similarly, the Frontend has no `node_modules` at all. All 14 backend test files fail to import and emit `ERR_MODULE_NOT_FOUND`. All frontend tests fail with `Cannot find package 'vite'`. **The CLAUDE.md verification gate (`npm test --workspaces --if-present`) cannot pass.** No test results are available to confirm correctness.
- **Recommendation:** Run `npm install` in both `Source/Backend/` and `Source/Frontend/` before any pipeline run. Consider adding a pre-flight dependency check to the pipeline entry script.
- **Cross-ref:** QO-002 (search gap unverifiable), QO-003 (metric gap unverifiable)

---

### QO-002: Traceability Enforcer Has Critical Blind Spot

- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-selects the most-recently-modified `requirements.md` (currently `Plans/self-judging-workflow/requirements.md` — 13 FRs) and scans only `Source/` and `E2E/`. It reports **TRACEABILITY PASSED** while completely ignoring:
  - `portal/` — 95+ FR-001 → FR-095 implementations for the dev-workflow-platform
  - `platform/` — FR-TMP-001 → FR-TMP-010 orchestrator implementations
  
  Running the enforcer explicitly against `Plans/dev-workflow-platform/requirements.md` returns **34 MISSING** (because they live in `portal/`, not `Source/`). The "PASSED" output is misleading and provides a false sense of coverage.
  
  Root cause: `inspector.config.yml` lists `source.dirs: ["Source/"]` but the primary product code is in `portal/`. The enforcer has no concept of multi-app repos.
- **Recommendation:** 
  1. Add `portal/` and `platform/` to the enforcer's scan paths, OR
  2. Create separate enforcer invocations per app with `--file` pointing to the correct plan, OR
  3. Update `inspector.config.yml` to enumerate all three source dirs
- **Cross-ref:** CLAUDE.md Architecture Rules ("Every FR needs a test with // Verifies: FR-XXX")

---

### QO-003: GET /api/search Route Not Wired (FR-dependency-search)

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/tests/routes/search.test.ts:1-7`, `Source/Backend/src/app.ts`
- **Detail:** The search test file explicitly notes: *"the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* The FR-dependency-search requirement (cross-entity typeahead search for DependencyPicker) is documented, tested, but not registered. `app.ts` registers 5 route prefixes (`/api/work-items`, `/api/dashboard`, `/api/intake`) but has no `/api/search`. Any request to `/api/search` returns 404.
  
  **Note:** The portal app (`portal/Backend/src/routes/search.ts`) has its own search route — this gap is specific to the `Source/` (workflow engine) app.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` implementing `GET /api/search?q=` and register it in `app.ts`. The test contract is already documented in `search.test.ts`.
- **Cross-ref:** FR-dependency-search, QO-001 (tests unrunnable until deps installed)

---

### QO-004: Missing Prometheus Histogram — dependencyCheckDuration (FR-dependency-metrics)

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** FR-dependency-metrics specifies 4 metrics: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `cycleDetectionEvents` counter ✅, `dependencyCheckDuration` histogram ❌. The histogram is completely absent. `metrics.ts` exports only 3 of the 4 required metrics. The spec acceptance criteria states "All 4 metrics visible at GET /metrics; labels correct."
- **Recommendation:** Add a `Histogram` export to `metrics.ts`:
  ```typescript
  export const dependencyCheckDurationHistogram = new Histogram({
    name: 'dependency_check_duration_seconds',
    help: 'Duration of dependency readiness checks',
    labelNames: ['operation'] as const,
    registers: [registry],
  });
  ```
  Record it in `dependency.ts` around `computeHasUnresolvedBlockers` and `isReady` calls.
- **Cross-ref:** FR-dependency-metrics, CLAUDE.md observability rules

---

### QO-005: OpenTelemetry Tracing Not Implemented

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/` (entire directory)
- **Detail:** CLAUDE.md Architecture Rules state: *"Use OpenTelemetry for distributed tracing. Auto-instrument HTTP, database, and framework calls. Add custom spans for critical paths. Propagate W3C traceparent header across service boundaries."* `FR-021` (and `FR-WF-013` observability) requires OTel spans. There is zero OTel instrumentation in `Source/Backend/src/`. Structured logging ✅ and Prometheus metrics ✅ are present, but tracing is entirely absent. No `@opentelemetry/*` packages appear in `package.json`.
- **Recommendation:** Install `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`. Add an `instrumentation.ts` entry-point that registers the HTTP and Express instrumentations before `app.ts` loads. Add `// Verifies: FR-021` comment. Propagate `traceparent` header via standard OTel middleware.
- **Cross-ref:** FR-021, CLAUDE.md Architecture Rules

---

### QO-006: Duplicate Logger Abstractions

- **Severity:** P3
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/logger.ts`, `Source/Backend/src/utils/logger.ts`
- **Detail:** Two logger modules exist with overlapping purpose. `utils/logger.ts` is the canonical implementation (writes JSON to stdout). `logger.ts` wraps it with a compatibility shim for a different call signature (`{ msg, ...ctx }` object form). Route files import from `../logger` (default export); the store imports from `../utils/logger` (named export). This dual-import pattern creates cognitive overhead and a maintenance risk: changes to the core logger must be audited against both import paths. The CLAUDE.md architecture rule states "Use the project's logger abstraction, never console.log" — having two abstractions violates the spirit of "single logger sink."
- **Recommendation:** Consolidate: extend `utils/logger.ts` to export a default that accepts both call signatures, then delete `logger.ts`. Update all imports to use one path.
- **Cross-ref:** FR-WF-013

---

### QO-007: Suppressed React Hook Dependency Linting in Recently Modified Files

- **Severity:** P3
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files were modified within the last 14 days and both use `// eslint-disable-next-line react-hooks/exhaustive-deps`. Suppressing this rule can mask stale closure bugs — the component/hook may silently operate on captured values from a previous render. This is especially risky in `DependencyPicker.tsx` which has search typeahead (user-visible state changes) and in `useWorkItems.ts` which drives the list page.
- **Recommendation:** Resolve the underlying hook dependency issue rather than suppressing the lint rule. Use `useCallback`/`useMemo` to stabilize dependencies, or restructure the effect to not need the suppression. If the suppression is intentional, add a comment explaining the reasoning and what prevents a stale closure.

---

### QO-008: FR-TMP-008 Implemented but Unannotated

- **Severity:** P4
- **Category:** spec-drift (minor — implementation exists, traceability missing)
- **File:** `platform/Dockerfile.worker:31-40`
- **Detail:** FR-TMP-008 requires `gh` CLI and Playwright to be installed in the worker container. `Dockerfile.worker` correctly installs both (`gh` via apt, `playwright install chromium`), but the file has no `// Verifies: FR-TMP-008` traceability comment. The enforcer would mark this as "MISSING" if it ever scanned `platform/`.
- **Recommendation:** Add `# Verifies: FR-TMP-008` comment near the `gh` install section in `platform/Dockerfile.worker`.

---

### QO-009: Silent Catch in Frontend API Client

- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}));` — on JSON parse failure, the error is silently swallowed and replaced with an empty object. Downstream code consuming `body.error` would receive `undefined` instead of an actionable error. While this prevents an uncaught rejection, it discards error context. CLAUDE.md states: *"Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."*
- **Recommendation:** Log the parse failure before returning the default: `response.json().catch((e) => { console.error('Failed to parse error body', e); return {}; })` — or better, use the logger abstraction once one is accessible in the frontend.

---

## JSON Summary

```json
{
  "date": "2026-05-21",
  "grade": "C",
  "spec_coverage": {
    "source_app": { "total": 13, "covered": 13, "pct": 100 },
    "source_dependency": { "total": 14, "covered": 12, "pct": 86, "gaps": ["FR-dependency-search (route not wired)", "FR-dependency-metrics (histogram missing)"] },
    "portal_app": { "total": 69, "covered": 95, "pct": 100, "note": "portal not scanned by enforcer" },
    "platform_app": { "total": 10, "covered": 9, "annotated": 9, "note": "FR-TMP-008 implemented, unannotated" }
  },
  "enforcer_effective_coverage": "~11% (13 of ~118 total spec requirements)",
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "untested", "title": "Verification gates entirely non-functional — node_modules not installed" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer has critical blind spot — portal/ and platform/ not scanned" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "GET /api/search not wired in Source/Backend/src/app.ts (FR-dependency-search)" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration histogram missing from metrics.ts (FR-dependency-metrics)" },
    { "id": "QO-005", "severity": "P2", "category": "architecture-violation", "title": "OpenTelemetry tracing not implemented anywhere in Source/Backend" },
    { "id": "QO-006", "severity": "P3", "category": "architecture-violation", "title": "Two logger abstractions (logger.ts + utils/logger.ts) — violates single-sink rule" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable-next-line react-hooks/exhaustive-deps in 2 recently modified files" },
    { "id": "QO-008", "severity": "P4", "category": "spec-drift", "title": "FR-TMP-008 implemented in Dockerfile.worker but unannotated" },
    { "id": "QO-009", "severity": "P4", "category": "pattern-violation", "title": "Silent catch on JSON parse in api/client.ts violates no-silent-swallow rule" }
  ],
  "counts": { "P1": 2, "P2": 3, "P3": 2, "P4": 2 },
  "escalation": []
}
```
