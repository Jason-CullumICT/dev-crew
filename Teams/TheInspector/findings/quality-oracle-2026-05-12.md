# Quality Oracle Findings — 2026-05-12

**Grade: B** _(0 P1 exploitable failures; 4 P2s; 0 P1 spec violations — but 1 unregistered route with known failing tests keeps this from A)_

> **Scope:** `Source/` — Self-Judging Workflow Engine + Dependency Tracking
> **Specs checked:** `Specifications/workflow-engine.md`, `Plans/self-judging-workflow/requirements.md`, `Plans/dependency-linking/requirements.md`
> **Traceability enforcer result:** PASSED (FR-WF-* suite) / FAILING (FR-dependency-search unregistered)
> **Prior findings:** None (first run)

---

## Spec Coverage: 93%

| Requirement Set | In Spec | Traced in Source | Coverage |
|----------------|---------|-----------------|---------|
| FR-WF-001 – FR-WF-013 (Plans/self-judging-workflow) | 13 | 13 | **100%** |
| FR-dependency-* (Plans/dependency-linking) | 16 | 14 | **87.5%** |
| FR-001 – FR-069 (Specifications/dev-workflow-platform) | 69 | 0 | N/A — different app (portal/) |
| FR-TMP-001 – FR-TMP-010 (Specifications/tiered-merge-pipeline) | 10 | 0 | N/A — different app (platform/) |

> **Architecture clarity note:** `Specifications/dev-workflow-platform.md` and `Specifications/tiered-merge-pipeline.md` describe the portal/ and platform/ applications respectively. Source/ implements the workflow engine. The CLAUDE.md Specifications/ directory layout is correct; the issue is there is no document cross-linking which spec maps to which Source directory. This creates confusion for any new agent reading Specifications/ and then looking at Source/.

---

## QO-001: Specification-Directory to Source-Directory Traceability Gap

- **Severity:** P1 (spec drift / orphaned specs)
- **Category:** spec-drift, architecture-violation
- **File:** `Specifications/dev-workflow-platform.md` / `Specifications/tiered-merge-pipeline.md`
- **Detail:**
  `Specifications/` contains 3 documents:
  - `workflow-engine.md` — maps to `Source/` but has **no FR IDs**, making automated traceability impossible
  - `dev-workflow-platform.md` — 69 FRs for a SQLite-backed app with Feature Requests, Bugs, Cycles. Implemented in `portal/`, NOT `Source/`.
  - `tiered-merge-pipeline.md` — 10 FRs for risk-classification, Playwright E2E, auto-merge. Implemented in `platform/`, NOT `Source/`.

  The traceability enforcer scans only `Plans/*/requirements.md`, never `Specifications/`. Any agent reading the spec directory sees 69 FR-001–FR-069 requirements with zero corresponding Verifies comments in Source/. This looks like massive spec drift but is actually a mapping problem.

  Additionally, `Plans/dependency-linking/requirements.md` was originally written for `portal/Backend` and `portal/Frontend` paths, but was re-implemented in `Source/`. The requirements document still references portal/ paths (15 occurrences), creating confusion about which implementation is canonical.

- **Recommendation:**
  1. Add a comment header to `workflow-engine.md`: `<!-- Source: Source/ → Plans/self-judging-workflow/requirements.md -->`
  2. Add comments to `dev-workflow-platform.md` and `tiered-merge-pipeline.md` pointing to `portal/` and `platform/` respectively.
  3. Update `tools/traceability-enforcer.py` to also accept a `--specs` flag pointing directly at `Specifications/` docs with an explicit source-dir mapping.
  4. Update `workflow-engine.md` to add formal FR-WF-* IDs matching Plans/.
- **Cross-ref:** [ESCALATE → TheFixer for enforcer update]

---

## QO-002: Search Route Unregistered — FR-dependency-search Failing in Tests

- **Severity:** P1 (failing test, unimplemented requirement)
- **Category:** spec-drift, untested
- **File:** `Source/Backend/src/app.ts` (missing route registration), `Source/Backend/tests/routes/search.test.ts:7`
- **Detail:**
  `GET /api/search` is required by `FR-dependency-search` and is used by the frontend `DependencyPicker` typeahead. The test file `search.test.ts` exists with 6 test cases and explicitly documents: _"NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."_

  No route file `Source/Backend/src/routes/search.ts` exists. The endpoint is absent from `app.ts`. All 6 tests in `search.test.ts` will fail when the test suite runs because `GET /api/search` returns 404.

  The frontend `DependencyPicker` calls `searchItems()` from `Source/Frontend/src/api/client.ts` which hits `/api/search`. At runtime, the picker returns no results.

- **Recommendation:**
  1. Create `Source/Backend/src/routes/search.ts` implementing `GET /api/search?q=` — filter non-deleted work items by title/description match, return `{data: WorkItem[]}`.
  2. Register in `app.ts`: `app.use('/api', searchRouter)`.
  3. Add `// Verifies: FR-dependency-search` comment.
- **Cross-ref:** [ESCALATE → TheFixer for implementation]

---

## QO-003: Architecture Violation — Direct Store Calls from Route Handlers

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts` (all handlers), `Source/Backend/src/routes/workflow.ts` (all handlers), `Source/Backend/src/routes/intake.ts` (both handlers)
- **Detail:**
  CLAUDE.md rule: _"No direct DB calls from route handlers — use the service layer."_

  All three route files import and call `store.*` functions directly:
  ```ts
  import * as store from '../store/workItemStore';
  // ...
  const item = store.createWorkItem({...});
  const result = store.findAll(filters, pagination);
  const updated = store.updateWorkItem(item.id, updates);
  ```

  The store is the data layer. Existing services (`router.ts`, `assessment.ts`, `changeHistory.ts`, `dependency.ts`) correctly sit between routes and the store. However, basic CRUD routes bypass this pattern entirely — calling the store directly. This means there is no service layer for work item creation, listing, updating, deletion, or intake webhook processing.

  **Affected handlers:** POST/GET/PATCH/DELETE `/api/work-items`, POST `/api/intake/zendesk`, POST `/api/intake/automated`, and all approve/reject/dispatch/route/assess actions in `workflow.ts`.

- **Recommendation:**
  Create `Source/Backend/src/services/workItemService.ts` that wraps store calls, and update routes to call the service. This respects the existing pattern established in `router.ts` and `assessment.ts`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

## QO-004: OpenTelemetry Tracing Not Implemented

- **Severity:** P2
- **Category:** architecture-violation, spec-drift
- **File:** `Source/Backend/src/app.ts`, `Source/Backend/src/utils/logger.ts`
- **Detail:**
  CLAUDE.md (Architecture Rules): _"Use OpenTelemetry for distributed tracing... Add custom spans for critical paths... Propagate W3C traceparent header across service boundaries."_

  `dev-workflow-platform.md FR-021`: _"OpenTelemetry tracing: instrument HTTP routes and database calls; propagate W3C traceparent header. Acceptance: Trace/span IDs appear in logs; traceparent header forwarded."_

  Zero OTel code exists in Source/. There is no `@opentelemetry/*` import anywhere. The logger does not inject trace/span IDs. The W3C `traceparent` header is neither read nor forwarded. Logs contain no trace context.

  The current `FR-WF-013` maps only to Prometheus metrics and structured logging — it does not cover OTel. So the OTel requirement falls through the gap between FR-WF-013 and FR-021 (which is a dev-workflow-platform spec, considered out of scope for Source/).

  **Impact:** No distributed tracing capability. Any multi-service debugging is blind. This is an explicit CLAUDE.md architecture rule, not optional.

- **Recommendation:**
  1. Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http` to Backend package.
  2. Create `Source/Backend/src/tracing.ts` and initialize before app start.
  3. Inject trace/span IDs into the logger context.
  4. Add `// Verifies: FR-WF-013` to tracing setup.
- **Cross-ref:** [ESCALATE → TheFixer]

---

## QO-005: Missing `dependencyCheckDuration` Histogram Metric

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:**
  `Plans/dependency-linking/requirements.md FR-dependency-metrics`: _"Add Prometheus counters/histograms... `dependencyCheckDuration` histogram, `cycleDetectionEvents` (labels: result). All four metrics visible at `GET /metrics`."_

  `metrics.ts` defines only **3** of the 4 required metrics:
  - ✅ `dependency_operations_total` (counter)
  - ✅ `dispatch_gating_events_total` (counter)
  - ✅ `cycle_detection_events_total` (counter)
  - ❌ `dependency_check_duration` (Histogram) — **MISSING**

  The histogram should measure latency of readiness checks (`isReady`) and blocker computation (`computeHasUnresolvedBlockers`). Without it, there is no SLO-observable data for dependency check performance — a domain-critical operation per the inspector config.

- **Recommendation:**
  Add to `metrics.ts`:
  ```ts
  export const dependencyCheckDurationHistogram = new Histogram({
    name: 'dependency_check_duration_seconds',
    help: 'Duration of dependency readiness checks',
    labelNames: ['operation'] as const,
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
    registers: [registry],
  });
  ```
  Instrument `isReady()` and `computeHasUnresolvedBlockers()` in `dependency.ts`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

## QO-006: Traceability Enforcer Never Checks `Specifications/` Directory

- **Severity:** P2
- **Category:** spec-drift, pattern-violation
- **File:** `tools/traceability-enforcer.py:16-57`
- **Detail:**
  The traceability enforcer scans only `Plans/*/requirements.md`. It never reads `Specifications/`. This means:
  - FR-001 to FR-069 (`dev-workflow-platform.md`) are enforced only against portal/, never against Source/
  - FR-TMP-001 to FR-TMP-010 (`tiered-merge-pipeline.md`) are never enforced at all in Source/ or platform/
  - `workflow-engine.md` has no FR IDs and thus cannot be enforced

  Additionally, because all requirements.md files have the same timestamp (git clone), the enforcer's "pick most-recently-modified" fallback is non-deterministic across environments. CI may check a different requirements file than local runs.

  When run against `Plans/dependency-linking/requirements.md`, the enforcer reports false failures for `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007`, `FR-070`, `FR-085` — these are cross-references in the document body (not enforcement targets), captured by the broad `FR-[A-Z0-9-]+` regex.

- **Recommendation:**
  1. Add an explicit `--plan` flag to the verification gate command in CLAUDE.md to prevent non-deterministic picking.
  2. Add a mapping config to `inspector.config.yml` or the enforcer itself: spec → source dir → requirements file.
  3. Filter the regex to exclude spec body cross-references (e.g., require `| FR-` table-row prefix or `Verifies:` prefix only).
- **Cross-ref:** [ESCALATE → TheFixer for tooling improvement]

---

## QO-007: Duplicate Frontend Test Files

- **Severity:** P3
- **Category:** doc-stale, pattern-violation
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines); same for `WorkItemListPage.test.tsx` (286 vs 262 lines)
- **Detail:**
  Two test files exist for each of WorkItemDetailPage and WorkItemListPage — one in the root `tests/` directory and one in `tests/pages/`. The files are near-identical with slight line-count differences, suggesting they diverged over time. Both are active (no `.skip`). Running the test suite executes both, inflating test counts and masking which is the authoritative coverage source.
- **Recommendation:**
  Consolidate: keep `tests/pages/WorkItemDetailPage.test.tsx` (matches directory convention used by `tests/components/`), delete the root-level duplicate. Run tests to confirm zero regressions after deletion.
- **Cross-ref:** [ESCALATE → TheFixer]

---

## QO-008: Logger Does Not Switch to Pretty-Print in Development

- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/src/utils/logger.ts:17-25`
- **Detail:**
  CLAUDE.md: _"Use structured JSON logging in production, pretty-printing in development."_

  `utils/logger.ts` always calls `process.stdout.write(JSON.stringify(entry) + '\n')` regardless of `NODE_ENV`. There is no branch for `NODE_ENV !== 'production'`. Every developer log line is raw JSON, making local debugging harder than necessary.

- **Recommendation:**
  ```ts
  const isDev = process.env.NODE_ENV !== 'production';
  function emit(...) {
    if (isDev) {
      process.stdout.write(`[${level.toUpperCase()}] ${message} ${context ? JSON.stringify(context, null, 2) : ''}\n`);
    } else {
      process.stdout.write(JSON.stringify(entry) + '\n');
    }
  }
  ```
- **Cross-ref:** [ESCALATE → TheFixer]

---

## QO-009: FR-dependency-seed Not Implemented in Source/

- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/src/store/workItemStore.ts` (no seed data)
- **Detail:**
  `FR-dependency-seed` requires idempotent seed data establishing known dependency relationships so that the system has predictable test fixtures from startup. The `Plans/dependency-linking/requirements.md` states specific seeded items (BUG-0010 blocked_by BUG-0003 through BUG-0007, FR-0004 blocked_by FR-0003, etc.). The `resetStore()` function exists in the store but there is no seed function. No `Verifies: FR-dependency-seed` comment exists anywhere in Source/.

  Since Source/ uses an in-memory store (not SQLite), the seed would need to run at server startup and populate the in-memory Map with fixture work items and dependency links.

- **Recommendation:**
  Create `Source/Backend/src/store/seed.ts` that creates fixture work items with known IDs and wires up dependency relationships. Call from the server startup path in `app.ts` when `NODE_ENV === 'development'`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

## QO-010: Two Logger Abstractions Coexist

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Backend/src/logger.ts`, `Source/Backend/src/utils/logger.ts`
- **Detail:**
  Two logger files exist. `utils/logger.ts` is the actual implementation (structured JSON). `logger.ts` is a compatibility shim that re-exports with a different calling convention (accepts object `{msg, ...ctx}` OR string). The store imports from `utils/logger`, while routes import from `logger`. This is fragile — callers must know which import path to use. The wrapper `normalize()` function could silently drop context if the `msg` property is missing from an object argument.

  This dual-logger pattern is a single-source-of-truth violation. The shim exists because two different coding agents wrote routes using different conventions.

- **Recommendation:**
  Migrate all callers to use the `{msg, ...ctx}` object convention (already used by most routes), then replace `utils/logger.ts` with a single implementation supporting both call styles. Remove the shim.
- **Cross-ref:** [ESCALATE → TheFixer]

---

## Summary JSON

```json
{
  "audit_date": "2026-05-12",
  "grade": "B",
  "spec_coverage_source": "93%",
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Spec directory ↔ Source/ mapping undocumented; workflow-engine.md lacks FR IDs" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "GET /api/search unregistered in app.ts — 6 tests will fail" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Routes call store directly, bypassing service layer" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "OpenTelemetry tracing absent from Source/ entirely" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration histogram missing from metrics.ts" },
    { "id": "QO-006", "severity": "P2", "category": "pattern-violation", "title": "Traceability enforcer never checks Specifications/; non-deterministic plan selection" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-008", "severity": "P3", "category": "spec-drift", "title": "Logger always emits JSON — no dev pretty-print mode" },
    { "id": "QO-009", "severity": "P3", "category": "spec-drift", "title": "FR-dependency-seed unimplemented (no seed data in Source/)" },
    { "id": "QO-010", "severity": "P3", "category": "pattern-violation", "title": "Two coexisting logger abstractions (shim + implementation)" }
  ],
  "totals": { "P1": 2, "P2": 4, "P3": 4, "P4": 0 },
  "escalate_to_TheFixer": ["QO-002", "QO-003", "QO-004", "QO-005", "QO-006", "QO-007", "QO-008", "QO-009", "QO-010"],
  "no_issues": ["console.log usage", "hardcoded secrets", "empty catch blocks", "eslint-disable suppression", "files over 500 lines"]
}
```
