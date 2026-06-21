---

## Quality Oracle Findings — Full Report

**Audit date:** 2026-06-21 | **Enforcer result (default):** PASSED (narrow scope — see QO-004) | **Overall Grade: C**

---

### Spec Coverage: ~87% (Source/-targeted specs) / 0% (tiered-merge pipeline) / unknown (portal/)

| Scope | Requirements | Covered | % |
|---|---|---|---|
| `Source/` — FR-WF-001–013 | 13 | 13 | **100%** ✅ |
| `Source/` — FR-dependency-* | 16 | 14 | **87.5%** ⚠️ |
| `Source/` — FR-TMP-001–010 | 10 | 0 | **0%** ❌ |
| `portal/` — FR-001–095+ | 112 IDs | *unscanned* | **?** |

---

### QO-001 — Missing `/api/search` Route [P1 · spec-drift]
**File:** `Source/Backend/src/app.ts`

The `GET /api/search` endpoint is **never registered** in the Express app. `Source/Backend/tests/routes/search.test.ts` self-documents this at line 5: *"these tests will FAIL until the route is implemented."* Consequence: (a) all 5 search tests fail when the suite runs; (b) `DependencyPicker`'s typeahead is silently broken in the live application — users can't add/search dependencies.

**Fix:** Implement a search handler (filter store by `title`/`description`; exclude soft-deleted; return `{data: T[]}`) and register `app.use('/api/search', searchRouter)` in `app.ts`.

---

### QO-002 — Route Handlers Bypass Service Layer [P2 · architecture-violation]
**Files:** `Source/Backend/src/routes/workItems.ts`, `routes/intake.ts`, `routes/workflow.ts`

CLAUDE.md: *"No direct DB calls from route handlers — use the service layer."* All work-item CRUD handlers call `store.createWorkItem`, `store.findAll`, `store.findById`, `store.updateWorkItem`, `store.softDelete` directly. The `intake.ts` Zendesk and automated handlers do the same. `dashboard.ts` (which correctly calls `dashboardService.*`) demonstrates the expected pattern. This makes unit-testing business logic impossible without HTTP plumbing.

**Fix:** Extract a `Source/Backend/src/services/workItemService.ts`. Route handlers should call only service functions.

---

### QO-003 — `dependencyCheckDuration` Histogram Missing [P2 · spec-drift]
**File:** `Source/Backend/src/metrics.ts`

`FR-dependency-metrics` requires 4 Prometheus instruments. Three exist (`dependency_operations_total`, `dispatch_gating_events_total`, `cycle_detection_events_total`). The **`dependency_check_duration_seconds` histogram is absent** — the only latency signal for the BFS cycle-detection path. No observability on how long dependency checks take.

**Fix:** Add a `Histogram` for `dependency_check_duration_seconds` in `metrics.ts` and instrument `detectCycle`, `isReady`, and `computeHasUnresolvedBlockers` in `dependency.ts`.

---

### QO-004 — Traceability Enforcer Has Critically Narrow Scope [P2 · spec-drift]
**File:** `tools/traceability-enforcer.py`

The enforcer picks the **single most-recently-modified** `requirements.md` and scans only `["Source", "E2E"]`. Three problems: (1) Running against `Plans/dependency-linking/requirements.md` **fails with 7 missing IDs** (FR-0002–FR-0007, FR-070, FR-085) — those IDs live in `portal/`, which is not scanned. (2) `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) is never checked by any enforcer invocation. (3) `portal/` contains 112 FR IDs that are permanently outside enforcer scope.

**Fix:** Add `portal/Backend` and `portal/Frontend` to `source_dirs`. Add a `--all-plans` flag that checks every `Plans/**/requirements.md`. Register `Specifications/tiered-merge-pipeline.md` as a directly enforceable spec.

---

### QO-005 — FR-TMP-001–010 (Tiered Merge Pipeline): 0% Implementation [P2 · spec-drift]
**File:** `Specifications/tiered-merge-pipeline.md`

Ten active functional requirements for risk classification, E2E test generation, Playwright runner, auto-PR, AI PR review, and auto-merge logic have **zero traced implementation** in `Source/`, `portal/`, or `E2E/`. `Source/E2E/playwright.pipeline.config.ts` exists but carries no `FR-TMP-*` traceability and appears to be infrastructure config only. The spec is active in `Specifications/` and not formally superseded.

**Fix:** Either open a plan to implement the spec, or add a `## Status: Deferred` section to the spec file to formally exclude it from coverage expectations.

---

### QO-006 — Duplicate Frontend Test Files [P2 · test-quality]
**Files to remove:** `Source/Frontend/tests/WorkItemListPage.test.tsx`, `Source/Frontend/tests/WorkItemDetailPage.test.tsx`

Two test pairs exist for the same components:
- `tests/WorkItemListPage.test.tsx` (older, 13 tests) vs. `tests/pages/WorkItemListPage.test.tsx` (newer, 13 tests — more complete coverage)
- `tests/WorkItemDetailPage.test.tsx` (12 tests) vs. `tests/pages/WorkItemDetailPage.test.tsx` (16 tests — more thorough)

Both carry identical `// Verifies: FR-WF-010/011` annotations. Running the full test suite executes both, doubling test time and creating maintenance confusion when they diverge.

**Fix:** Delete the top-level duplicates. Keep the `tests/pages/` variants.

---

### QO-007 — OTel Tracing Absent [P3 · architecture-violation]
**File:** `Source/Backend/src/app.ts`

CLAUDE.md mandates OpenTelemetry for all new code: *"Add custom spans for critical paths. Propagate W3C traceparent header across service boundaries."* There is no `@opentelemetry/*` SDK initialization, no HTTP auto-instrumentation, no custom spans (e.g., on BFS cycle detection or assessment pod), and no `traceparent` header extraction. Structured logging ✅ and Prometheus metrics ✅ are present — tracing is the missing third pillar.

---

### QO-008 — `eslint-disable` Without Explanation [P3 · pattern-violation]
**Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`

Both suppress `react-hooks/exhaustive-deps` without an explanatory comment. While the intent (using granular primitive deps to avoid object identity re-triggers) is likely legitimate, the bare suppression adds tech debt noise and makes future maintenance harder.

---

### QO-009 — `portal/` App Traceability Never Enforced [P3 · spec-drift]
**File:** `tools/traceability-enforcer.py`

The `portal/` application contains 112 distinct FR IDs (FR-001–FR-095, FR-DUP-*, FR-dependency-*). It is never scanned. The `Plans/dependency-linking/requirements.md` plan still shows three items as ❌ Missing for `portal/`: `FR-dependency-api-types`, `FR-dependency-seed`, and `FR-dependency-frontend-tests`. These open items have not been re-verified since the dependency-linking plan was written.

---

**Learnings file updated:** `Teams/TheInspector/learnings/quality-oracle.md`
