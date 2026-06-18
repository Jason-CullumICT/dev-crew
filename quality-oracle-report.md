---

## Quality Oracle Findings — 2026-06-18

**Grade: B** | 2 P1 (process) · 3 P2 · 2 P3 · 1 P4 | 5 tests failing

---

### Spec Coverage: 93% (Source/ scope)

| Scope | FRs | Traced | Coverage |
|-------|-----|--------|----------|
| FR-WF-001..013 (workflow engine) | 13 | 13 | **100%** |
| FR-dependency-* (dependency linking) | 16 | 14 | **87.5%** |
| FR-TMP-001..010 (tiered merge pipeline) | 10 | 0 | **0%** |

---

### QO-001 — Traceability enforcer blind to `portal/`
**P1 · architecture-violation · `tools/traceability-enforcer.py:70`**

The enforcer hardcodes `source_dirs = ["Source", "E2E"]`. The `portal/` directory is a full production application (Express + SQLite + React) implementing `Specifications/dev-workflow-platform.md`. Running the enforcer against `Plans/dev-workflow-platform/requirements.md` falsely reports all 34 FRs as missing. The CLAUDE.md pipeline gate (`python3 tools/traceability-enforcer.py`) auto-selects the self-judging-workflow plan and never guards portal/ at all — a developer could strip all traceability from portal/ and the gate still passes.

**Fix:** Add `portal` to `source_dirs` in the enforcer, or wire the scan dirs from `inspector.config.yml → source.dirs`.

---

### QO-002 — `GET /api/search` endpoint not implemented — 5 tests failing
**P1 · spec-drift · `Source/Backend/src/app.ts`**

FR-dependency-search requires `GET /api/search?q=` for the DependencyPicker typeahead. The route is not registered in `app.ts`. The test file explicitly self-documents this: *"the GET /api/search endpoint is NOT wired in... These tests will FAIL until implemented."* This is the only backend test suite failing (164 passing / 5 failing). The `DependencyPicker` frontend component is already wired to call this endpoint, so dependency search is broken at runtime.

**Fix:** Create `Source/Backend/src/routes/search.ts` filtering the store by `q` across title + description, register at `/api/search`, add `// Verifies: FR-dependency-search`.

---

### QO-003 — `dependencyCheckDuration` histogram missing
**P2 · spec-drift · `Source/Backend/src/metrics.ts`**

FR-dependency-metrics specifies 4 Prometheus metrics. Only 3 are implemented (`dependency_operations_total`, `dispatch_gating_events_total`, `cycle_detection_events_total`). The `dependencyCheckDuration` histogram is absent — dependency check performance cannot be observed.

---

### QO-004 — Route handlers bypass the service layer
**P2 · architecture-violation · `Source/Backend/src/routes/*.ts`**

CLAUDE.md: *"No direct DB calls from route handlers — use the service layer."* Three route files (`workItems.ts`, `intake.ts`, `workflow.ts`) import and call `workItemStore` directly. Service files exist for assessment, routing, change history, dependencies, and dashboard — but basic CRUD goes straight to the store.

---

### QO-005 — Duplicate frontend test files (root vs `tests/pages/`)
**P2 · doc-stale · `Source/Frontend/tests/`**

`tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` exist at root level AND in `tests/pages/`. The `tests/pages/` versions are more complete (additional type imports, `within()` usage). Both run and pass, doubling execution and creating maintenance drift risk.

**Fix:** Delete root-level copies (`tests/WorkItemDetailPage.test.tsx`, `tests/WorkItemListPage.test.tsx`).

---

### QO-006 — `eslint-disable` without justification
**P3 · pattern-violation**

Two `// eslint-disable-next-line react-hooks/exhaustive-deps` in `DependencyPicker.tsx:82` and `useWorkItems.ts:63` with no comment explaining why the suppression is safe.

---

### QO-007 — FR-TMP-001..010 unimplemented with no plan
**P3 · spec-drift · `Specifications/tiered-merge-pipeline.md`**

10 requirements for the tiered merge pipeline (risk classification, Playwright E2E, auto-PR, AI review, auto-merge) exist in Specifications/ but have 0 `// Verifies:` references anywhere and no corresponding `Plans/tiered-merge-pipeline/requirements.md`. These are effectively invisible to the pipeline.

**Fix:** Create a Plans entry or add a `status: planned` header to the spec.

---

### QO-008 — FR-dependency-seed scope mismatch
**P4 · spec-drift**

FR-dependency-seed specifies seed data using BUG-XXXX / FR-XXXX IDs (portal format), but it lives in `Plans/dependency-linking/requirements.md` which is a Source/ plan. No seed file exists in `Source/Backend/`. Likely a portal-only requirement that was filed under the wrong plan.

---

Findings saved to `Teams/TheInspector/findings/audit-2026-06-18-B.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
