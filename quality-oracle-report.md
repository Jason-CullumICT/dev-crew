---

## Quality Oracle Findings

### Spec Coverage: **0%** (domain) / 100% (plan-level)

| Scope | Requirements | Traced | Missing |
|-------|-------------|--------|---------|
| `Specifications/dev-workflow-platform.md` (domain truth) | 74 | 0 | **74** |
| `Plans/self-judging-workflow/requirements.md` (plan-level) | 13 | 13 | 0 |

The enforcer passes green — but is watching the wrong file.

---

### QO-001: Traceability Enforcer Targets Wrong Requirements File
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-selects the **most recently modified** `requirements.md` under `Plans/`. This resolves to `Plans/self-judging-workflow/requirements.md` (13 FR-WF-XXX items), not the authoritative domain spec `Specifications/dev-workflow-platform.md` (74 FR-001–FR-069 items). Running `python3 tools/traceability-enforcer.py` exits 0 and prints **PASSED**, while running it with `--file Specifications/dev-workflow-platform.md` reveals **74 missing requirements** (exit 1). CI is measuring the wrong gate.
- **Recommendation:** Update `inspector.config.yml` → `specs.enforcer` to pin to the domain spec: `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md`. Additionally, add a CI step that runs both the plan-level check AND the domain spec check.
- **Cross-ref:** QO-002

---

### QO-002: Total Domain Spec Drift — 0% of 74 Requirements Traced
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** All 74 domain requirements (FR-001 through FR-069 plus dependency FRs) have **zero** `// Verifies: FR-XXX` traceability comments anywhere in `Source/`. The implementation was built against the plan-level spec (`FR-WF-001–FR-WF-013`) which defines a *work-item workflow engine*. The domain spec describes a *different system*: feature requests, bug reports, development cycles, SQLite persistence, pipeline orchestration, and 7 frontend pages (FR-022–FR-030). The implementation covers none of those. This is either: (a) the domain spec is a *future target* and the plan-level system is the correct current implementation, or (b) there is severe drift requiring reconciliation. Either way, the domain spec and implementation are completely decoupled.
- **Recommendation:** Decision required at product level: (a) retire or archive FR-001–FR-069 in favor of the current plan-level spec, or (b) treat the domain spec as the next implementation target and backfill `// Verifies:` comments for any parts already implemented. Update CLAUDE.md to clarify which spec is authoritative.
- **Cross-ref:** QO-001

---

### QO-003: Architecture Violation — Direct Store Access from Route Handlers
- **Severity:** P1
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/intake.ts`
- **Detail:** Three route files import and call the store directly (`import * as store from '../store/workItemStore'`), then invoke `store.createWorkItem()`, `store.findAll()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()` from inside request handlers. CLAUDE.md architecture rule: **"No direct DB calls from route handlers — use the service layer."** The store is the data layer (equivalent to DB). By contrast, workflow.ts correctly imports from `../services/router`, `../services/assessment`, and `../services/dependency` for domain logic — but still bypasses the service layer for state reads/writes on every action handler (`store.findById` called ~10 times in `workflow.ts`).
- **Recommendation:** Create a `workItemService.ts` (or equivalent) that wraps all store operations. Route handlers should only call into service layer functions; the service layer calls the store. This is the pattern already used for `router`, `assessment`, `dashboard`, `dependency`, and `changeHistory` services.
- **Cross-ref:** Route to TheFixer

---

### QO-004: Known Failing Test — `/api/search` Route Not Registered
- **Severity:** P2
- **Category:** untested
- **File:** `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** The test file opens with: *"NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into `Source/Backend/src/app.ts`. These tests document the expected contract and will FAIL until the route is implemented. This is intentional."* Running `npm test` in the Backend workspace will fail for this file. The route file does not exist; no handler handles `/api/search`. This is a documented gap but breaks the CI gate.
- **Recommendation:** Either implement `GET /api/search` and wire it into `app.ts` (the tests define the contract), or gate these tests with `test.skip` and a ticket reference until the feature is scheduled.
- **Cross-ref:** Route to TheFixer

---

### QO-005: Duplicate Test Files — Same Components Tested Twice
- **Severity:** P2
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- **Detail:** Both files test `WorkItemDetailPage` with slightly different mock setups (the `pages/` version imports shared types directly; the root version doesn't). Same situation with `WorkItemListPage.test.tsx` vs `pages/WorkItemListPage.test.tsx`. This is likely an artifact of two frontend coders working independently. Running the test suite executes both file pairs — inflating pass counts while potentially hiding gaps, since reviewers may assume either file provides full coverage.
- **Recommendation:** Consolidate into a single file per component. The `pages/` variant is more complete (imports shared types, uses `within`). Delete the root-level duplicates or merge any unique assertions into the `pages/` versions.
- **Cross-ref:** Route to TheFixer

---

### QO-006: Duplicate Logger Modules — Shim Layering
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/logger.ts`
- **Detail:** `src/logger.ts` is an explicit compatibility shim that re-exports `src/utils/logger.ts`. Its comment says *"Backend-coder-2's workflow routes import `logger` as default from this module."* Routes currently import from `'../logger'` (the shim). This is a two-layer logger stack created by multiple pipeline coders using different import paths. Both files carry `// Verifies: FR-WF-013`. The shim adds indirection and `normalize()` to handle object-vs-string overloads, meaning route calls like `logger.error({ msg: '...' })` flow through an extra adapter layer.
- **Recommendation:** Consolidate to a single canonical logger. Either: (a) update `src/utils/logger.ts` to export a default that accepts both signatures and delete `src/logger.ts`, or (b) rename `src/utils/logger.ts` to `src/logger.ts` and eliminate the shim. Update all imports consistently.
- **Cross-ref:** Route to TheFixer

---

### QO-007: OpenTelemetry Not Implemented — Architecture Rule Violated
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/` (all files)
- **Detail:** CLAUDE.md mandates: *"Use OpenTelemetry for distributed tracing... Auto-instrument HTTP, database, and framework calls... Propagate W3C `traceparent` header across service boundaries."* Domain spec FR-021 requires OTel. No OpenTelemetry packages exist in `Source/Backend/package.json`; no trace/span IDs appear in any log output; the `traceparent` header is neither read nor forwarded. Structured logging writes timestamps but no `traceId` or `spanId` fields, making distributed debugging impossible.
- **Recommendation:** Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node` to the backend. Initialize OTel SDK in `app.ts` before routes. Inject `trace_id` and `span_id` into log entries via OTel context. Read and forward `traceparent` on outgoing calls.
- **Cross-ref:** Route to TheFixer; escalate as observability gap to TheGuardians if SLOs exist

---

### QO-008: Spec Architecture Mismatch — Domain Spec Requires SQLite, Implementation Uses In-Memory Store
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/store/workItemStore.ts`
- **Detail:** Domain spec FR-002 requires *"Initialize Express + TypeScript backend with SQLite; define and run schema migrations for all entity tables."* FR-035 requires `pipeline_runs` and `pipeline_stages` tables. FR-052 requires `cycle_feedback` table with schema migrations. The implementation uses a plain in-memory `Map` with optional JSON file persistence. There is no SQLite, no Knex/TypeORM, no migration runner. When the backend restarts, all in-memory data is lost (acknowledged in inspector config chaos section). This is either an approved deviation or an un-implemented requirement.
- **Recommendation:** Clarify whether persistence is in scope for the current system. If approved as in-memory-only, update the domain spec to remove FR-002/035/052 SQLite references. If persistence is required, plan a migration from the in-memory store to SQLite using Knex.
- **Cross-ref:** QO-002; decision required at product level

---

### QO-009: Frontend Components and Hooks Without Tests
- **Severity:** P3
- **Category:** test-coverage
- **Files:** `Source/Frontend/src/components/Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `Source/Frontend/src/hooks/useDashboard.ts`, `Source/Frontend/src/hooks/useWorkItems.ts`, `Source/Frontend/src/pages/DebugPortalPage.tsx`
- **Detail:** Six production files have zero test coverage. The hooks (`useDashboard`, `useWorkItems`) are the primary data-fetching layer for the frontend — failures here would silently break the entire UI. `PriorityBadge`, `StatusBadge`, and `TypeBadge` are display components used across multiple pages. `Layout.tsx` renders the shell navigation that wraps all routes. `DebugPortalPage` is an iframe wrapper for the portal.
- **Recommendation:** Add unit tests for the two hooks using `@testing-library/react`'s `renderHook`. Add smoke-render tests for the four badge/layout components. `DebugPortalPage` is low-risk (static iframe) — a single render test is sufficient.

---

### QO-010: `eslint-disable` in Production Source Without Rationale
- **Severity:** P3
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line`. This lint rule exists to prevent stale closures — disabling it without explanation risks missing dependency arrays that cause bugs (e.g., fetches that never re-run when params change). Neither comment explains *why* the disable is intentional.
- **Recommendation:** Either fix the dependency arrays (preferred), or add an inline comment explaining why the suppression is safe: e.g., `// eslint-disable-next-line react-hooks/exhaustive-deps -- fetchRef is stable; adding it would cause infinite re-fetch`.

---

```json
{
  "audit_date": "2026-08-11",
  "spec_coverage": {
    "domain_spec": { "file": "Specifications/dev-workflow-platform.md", "total": 74, "traced": 0, "pct": 0 },
    "plan_spec": { "file": "Plans/self-judging-workflow/requirements.md", "total": 13, "traced": 13, "pct": 100 }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Enforcer targets wrong requirements file" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "0% domain spec coverage — 74/74 requirements untraced" },
    { "id": "QO-003", "severity": "P1", "category": "architecture-violation", "title": "Direct store access from 3 route handlers" },
    { "id": "QO-004", "severity": "P2", "category": "untested", "title": "/api/search route not registered — 1 test file intentionally failing" },
    { "id": "QO-005", "severity": "P2", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-006", "severity": "P2", "category": "architecture-violation", "title": "Duplicate logger shim layering" },
    { "id": "QO-007", "severity": "P2", "category": "architecture-violation", "title": "OpenTelemetry not implemented — traceparent missing" },
    { "id": "QO-008", "severity": "P2", "category": "spec-drift", "title": "Domain spec requires SQLite; impl is in-memory only" },
    { "id": "QO-009", "severity": "P3", "category": "test-coverage", "title": "6 production frontend files with zero test coverage" },
    { "id": "QO-010", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable in production hooks without rationale" }
  ],
  "grade": "D",
  "grade_reason": "3 P1 findings; domain spec coverage = 0% (below 40% threshold for C)",
  "prior_p1_p2_status": "first_run_no_priors"
}
```

---

**Grade: D**

Three P1s anchor the grade at D regardless of everything else. The most urgent issue is **QO-001** — the CI traceability gate is watching the wrong file and printing a false pass. Fix that first, then QO-003 (architecture violation, direct store access), then QO-004 (the search route that intentionally fails tests). QO-002 and QO-008 require a product-level decision about whether the domain spec is a live target or a superseded document.
