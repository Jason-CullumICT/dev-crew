Now the full findings report:

---

## Quality Oracle Findings

**Audit Date:** 2026-06-19  
**Config:** `Teams/TheInspector/inspector.config.yml`  
**Enforcer Result:** `PASS` (against Plans/) / `FAIL: 76 missing` (against Specifications/)

---

### Spec Coverage: ~15%

| Spec File | Requirements Found | Traced to Source | Coverage |
|-----------|-------------------|-----------------|---------|
| `Specifications/dev-workflow-platform.md` | 76 FR-XXX IDs | 0 | **0%** |
| `Specifications/workflow-engine.md` | 0 explicit FR IDs | Functionally complete | ~100% |
| `Specifications/tiered-merge-pipeline.md` | 10 (FR-TMP-*) | 0 | **0%** |
| `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-*) | 13 | **100%** |
| `FR-dependency-*` (dev-workflow-platform.md) | ~16 (regex-invisible) | ~13 | **~81%** |

---

### QO-001: Traceability Enforcer Scope Mismatch — False PASS

- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:48-57`
- **Detail:** The enforcer auto-discovers requirements from `Plans/` (most recently modified `requirements.md`), NOT from `Specifications/`. The `inspector.config.yml` defines `specs.dir: "Specifications/"` but the enforcer ignores this setting. Running `python3 tools/traceability-enforcer.py` reports **PASS** because it only checks the 13 FR-WF-* IDs from `Plans/self-judging-workflow/requirements.md`. Running it against `Specifications/dev-workflow-platform.md` produces **76 MISSING**. The tool gives false confidence — the verification gate passes while 76 canonical spec requirements have zero source coverage.
- **Recommendation:** Modify the enforcer to (a) read `specs.dir` from `inspector.config.yml` or CLAUDE.md and scan `Specifications/*.md` as its default source, not `Plans/`, and (b) fix the regex `FR-[A-Z0-9-]+` → `FR-[A-Za-z0-9-]+` to capture lowercase IDs like `FR-dependency-*`.
- **Cross-ref:** QO-002 (root cause of zero spec coverage)

---

### QO-002: `Specifications/dev-workflow-platform.md` Entirely Unimplemented (76 FRs)

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-001 to FR-069, FR-dependency-types through FR-dependency-frontend-tests)
- **Detail:** The canonical specification describes a **Dev Workflow Platform** (Express + SQLite, feature requests, bug reports, development cycles, pipeline orchestration — 76+ FRs). The actual source code implements a completely different system: a **Self-Judging Workflow Engine** (in-memory store, work items, routing/assessment/dispatch — tracked in `Plans/self-judging-workflow/requirements.md`). No source file contains a `// Verifies: FR-001` through `// Verifies: FR-069` comment. The two systems are architecturally distinct:
  - Dev Platform: SQLite, feature-requests, bugs, cycles, phases, pipeline runs
  - Workflow Engine: in-memory Map, work-items, routing, assessment pod, dispatch
- **This is either:** (a) the Specifications are stale and the workflow-engine is the correct current scope, or (b) the workflow-engine implementation is a precursor and the dev-workflow-platform FRs are the true backlog. Either way, the divergence must be resolved.
- **Recommendation:** Decision required from project owner. If workflow-engine is the correct scope: move FR-WF-001 to FR-WF-013 definitions into `Specifications/` and archive dev-workflow-platform.md. If dev-workflow-platform is the target: the current source is a proof-of-concept and dev-workflow-platform FRs should be the active backlog.

---

### QO-003: Traceability Enforcer Regex Silently Skips Lowercase FR IDs

- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py:64`
- **Detail:** The regex `re.compile(r"FR-[A-Z0-9-]+")` only matches uppercase letters. IDs like `FR-dependency-service`, `FR-dependency-search`, `FR-dependency-metrics` contain lowercase characters and are never extracted from spec files. Verified:
  ```
  'FR-dependency-service'  -> []  # never matched, never checked
  'FR-WF-001'              -> ['FR-WF-001']  # matched correctly
  ```
  This means all 16 `FR-dependency-*` IDs in `Specifications/dev-workflow-platform.md` are invisible to the enforcer. The enforcer could report PASS even if all dependency requirements were deleted.
- **Recommendation:** Change `r"FR-[A-Z0-9-]+"` to `r"FR-[A-Za-z0-9-]+"` in `extract_fr_ids()`.

---

### QO-004: `GET /api/search` Not Implemented — Test Suite Will Fail

- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `Source/Backend/tests/routes/search.test.ts:3-6`, `Source/Backend/src/app.ts`
- **Detail:** `FR-dependency-search` requires `GET /api/search?q=` for cross-entity typeahead. Five tests in `search.test.ts` explicitly document: *"NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts."* The route is absent from `app.ts` (confirmed — only 4 routers registered). The `DependencyPicker` component in `Source/Frontend/src/components/DependencyPicker.tsx` calls `searchItems()` from the API client, which will 404 at runtime.
- **Recommendation:** Implement the search route — add a `search.ts` route file with `GET /api/search?q=`, wire it into `app.ts`, and remove the "NOT wired" note from the test.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-005: `dependencyCheckDuration` Histogram Missing — FR-dependency-metrics Partial

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` specifies 4 Prometheus metrics:
  1. `dependencyOperations` counter ✓ (`dependency_operations_total`)
  2. `dispatchGatingEvents` counter ✓ (`dispatch_gating_events_total`)
  3. `dependencyCheckDuration` **histogram** ✗ — **MISSING**
  4. `cycleDetectionEvents` counter ✓ (`cycle_detection_events_total`)
  
  The `dependencyCheckDuration` histogram is absent. The acceptance criteria states "All 4 metrics visible at `GET /metrics`" — currently only 3 are visible.
- **Recommendation:** Add to `metrics.ts`: `export const dependencyCheckDurationHistogram = new Histogram({ name: 'dependency_check_duration_seconds', help: '...', labelNames: ['operation'], registers: [registry] })` and instrument `DependencyService` calls.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-006: Route Handlers Bypass Service Layer — Architecture Rule Violated

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/workflow.ts:15`, `Source/Backend/src/routes/intake.ts:4`
- **Detail:** CLAUDE.md mandates: *"No direct DB calls from route handlers — use the service layer."* All three main route files import `workItemStore` directly:
  - `workItems.ts` — direct store calls for all CRUD (create, list, get, update, delete)
  - `workflow.ts` — direct store calls for item lookup alongside services for routing/assessment
  - `intake.ts` — **no service layer at all** — creates work items directly via `store.createWorkItem()`

  While `workflow.ts` and `workItems.ts` also use services (router, assessment, dependency, changeHistory), the store bypasses co-exist. The rule exists to keep business logic out of route handlers.
- **Recommendation:** Introduce a `workItemService.ts` wrapping all store operations. Route handlers should import only services, never the store directly. This is especially critical for `intake.ts`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-007: FR Requirement IDs Defined in Plans/ Not Specifications/

- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Plans/self-judging-workflow/requirements.md`, `Source/Backend/src/**/*.ts`
- **Detail:** All 13 `FR-WF-001` through `FR-WF-013` IDs referenced in source `// Verifies:` comments are defined in `Plans/self-judging-workflow/requirements.md`, a Plan document — not in `Specifications/`. CLAUDE.md mandates the workflow: **Specifications → Plans → Source → Tests**, and "Specs are source of truth — implementation traces to specs, never the other way around." The FR IDs should be defined in `Specifications/workflow-engine.md` (or a new spec file), with Plans/ referencing those canonical IDs.
- **Recommendation:** Move FR-WF-001 through FR-WF-013 definitions into `Specifications/workflow-engine.md` as a requirements table. Keep Plans/ as implementation dispatch documents only.

---

### QO-008: `Specifications/tiered-merge-pipeline.md` — 10 FRs Unimplemented

- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 through FR-TMP-010)
- **Detail:** The tiered merge pipeline spec (risk classification, E2E test generation, auto-PR, AI review, auto-merge) has 10 requirements with no corresponding `// Verifies: FR-TMP-*` comments anywhere in Source/. The spec is in the canonical `Specifications/` directory, meaning it is considered active scope. `Source/E2E/playwright.config.ts` and `playwright.pipeline.config.ts` exist but contain no traceability comments.
- **Recommendation:** Either (a) create a Plan and dispatch implementation via TheATeam, or (b) if deferred, move to `Specifications/Future/` with a `# Status: Deferred` header to prevent false spec-drift alarms.

---

### QO-009: Duplicate Frontend Test Files

- **Severity:** P3
- **Category:** test quality
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx`
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx`
- **Detail:** Two separate test suites exist for the same components. The `tests/pages/` versions are slightly larger and more recent. Running both wastes CI time and creates confusion about which is authoritative. The older `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` appear to be superseded.
- **Recommendation:** Delete the older `tests/Work*.test.tsx` root-level files. Consolidate all component tests under `tests/pages/` and `tests/components/`.

---

### QO-010: 7 Frontend Source Files Without Test Coverage

- **Severity:** P3
- **Category:** untested
- **Files:**
  - `Source/Frontend/src/components/Layout.tsx`
  - `Source/Frontend/src/components/PriorityBadge.tsx`
  - `Source/Frontend/src/components/StatusBadge.tsx`
  - `Source/Frontend/src/components/TypeBadge.tsx`
  - `Source/Frontend/src/pages/DebugPortalPage.tsx`
  - `Source/Frontend/src/hooks/useDashboard.ts`
  - `Source/Frontend/src/hooks/useWorkItems.ts`
- **Detail:** All 7 files were modified in the last 14 days (recently added) and have zero corresponding test files. CLAUDE.md testing rules require test coverage for all FRs. `useDashboard` and `useWorkItems` are data-fetching hooks used by primary pages — they should have hook tests.
- **Recommendation:** Add tests for the badge components (render + prop variation), hook tests for `useDashboard`/`useWorkItems` (mock API, verify state transitions), and a smoke test for `Layout` component routing.

---

### QO-011: `eslint-disable-next-line` Suppressions Without Justification Comments

- **Severity:** P4
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files disable `react-hooks/exhaustive-deps` rule via `// eslint-disable-next-line`. While these are line-scoped (not blanket disables), there is no accompanying comment explaining WHY the dependency is intentionally excluded. This is a code smell and makes audits harder.
- **Recommendation:** Add explanation: `// eslint-disable-next-line react-hooks/exhaustive-deps — intentionally omit [X] to prevent re-fetch loop on every render`

---

### JSON Summary

```json
{
  "audit_date": "2026-06-19",
  "spec_coverage": {
    "specifications_dev_workflow_platform": "0%",
    "specifications_workflow_engine": "~100% (no explicit FR IDs)",
    "specifications_tiered_merge_pipeline": "0%",
    "plans_self_judging_workflow": "100% (13/13)",
    "fr_dependency": "~81% (search + histogram missing)",
    "overall_canonical": "~15%"
  },
  "grade": "D",
  "grade_rationale": "3 P1 findings (enforcer false-pass, 76 unimplemented spec FRs, regex bug). Grade D per grading config (max_p1: 0 for grade A-C).",
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Enforcer targets Plans/ not Specifications/ — false PASS"},
    {"id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "76 dev-workflow-platform FRs entirely unimplemented"},
    {"id": "QO-003", "severity": "P1", "category": "spec-drift", "title": "Enforcer regex silently skips FR-dependency-* IDs"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "GET /api/search not implemented — tests will fail"},
    {"id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration histogram missing"},
    {"id": "QO-006", "severity": "P2", "category": "architecture-violation", "title": "Routes bypass service layer — direct store imports"},
    {"id": "QO-007", "severity": "P3", "category": "architecture-violation", "title": "FR IDs defined in Plans/ not Specifications/"},
    {"id": "QO-008", "severity": "P3", "category": "spec-drift", "title": "tiered-merge-pipeline.md 10 FRs unimplemented"},
    {"id": "QO-009", "severity": "P3", "category": "test-quality", "title": "Duplicate frontend test files (tests/ and tests/pages/)"},
    {"id": "QO-010", "severity": "P3", "category": "untested", "title": "7 frontend source files with no test coverage"},
    {"id": "QO-011", "severity": "P4", "category": "pattern-violation", "title": "eslint-disable without justification comments"}
  ],
  "p1_count": 3,
  "p2_count": 3,
  "p3_count": 4,
  "p4_count": 1,
  "escalations": [
    {"finding": "QO-004", "route": "TheFixer", "reason": "Missing route implementation"},
    {"finding": "QO-005", "route": "TheFixer", "reason": "Missing metric definition"},
    {"finding": "QO-006", "route": "TheFixer", "reason": "Architecture refactor — service layer extraction"}
  ]
}
```

---

**Summary of Blockers:** The most urgent issue is structural — the traceability enforcer gives a false PASS (QO-001/003) masking that the canonical `Specifications/dev-workflow-platform.md` is either the wrong spec for this codebase or an entirely unstarted implementation. Until the spec-vs-implementation question (QO-002) is resolved, all other coverage metrics are unreliable. The three P2 findings (missing search route, missing histogram, service layer bypass) are actionable immediately via TheFixer.
