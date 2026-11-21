# Quality Oracle Findings — 2026-11-21

## Spec Coverage Summary

| Scope | FRs Defined | FRs Traced | Coverage |
|-------|-------------|------------|----------|
| Active plan (self-judging-workflow) | 13 | 13 | **100%** |
| All 8 plans combined (enforcer scan) | ~150 unique IDs | ~13 | **~9%** |
| `Specifications/tiered-merge-pipeline.md` | 10 (FR-TMP-*) | 0 | **0%** |

> **Context**: 7 of 8 plans in `Plans/` describe a system (FeatureRequests/BugReports/DevCycles with SQLite, FR-001 to FR-089) that appears to have been replaced by the current WorkItem workflow engine (FR-WF-001 to FR-WF-013). The traceability enforcer silently passes because it only checks the most-recently-modified plan.

---

## QO-001: Traceability Enforcer Checks Only One Plan — 7/8 Plans Silently Ignored
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py` (enforcer design) / `CLAUDE.md` (verification gate)
- **Detail:** `python3 tools/traceability-enforcer.py` (the CLAUDE.md verification gate) auto-selects the most-recently-modified `requirements.md` — currently `Plans/self-judging-workflow/requirements.md`, which passes. When the enforcer is run against each plan individually, **7 of 8 plans fail**: dependency-linking (7 FRs missing), dev-cycle-traceability (21), dev-workflow-platform (34), duplicate-deprecated-status (15), image-upload (21), orchestrated-dev-cycles (18), orchestrator-cycle-dashboard (8). The verification gate gives a false green.
- **Recommendation:** Either (a) run the enforcer against all plans in a loop in `CLAUDE.md`'s verification gate, or (b) archive/delete obsolete plans that describe the replaced system (FR-001–FR-069 era) so the enforcer scope is accurate. Add a `tools/traceability-enforcer-all.sh` wrapper that runs `traceability-enforcer.py --file` for every `Plans/*/requirements.md` and fails if any plan fails.
- **Cross-ref:** TheFixer (fix enforcer), requirements-reviewer (archive stale plans)

---

## QO-002: Route Handlers Directly Call In-Memory Store — Service Layer Bypassed
- **Severity:** P1
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/workflow.ts:44`, `Source/Backend/src/routes/intake.ts:19`
- **Detail:** Architecture rule: *"No direct DB calls from route handlers — use the service layer."* All three route files import `* as store from '../store/workItemStore'` and call `store.createWorkItem`, `store.findById`, `store.updateWorkItem`, `store.softDelete`, `store.findAll` directly. A service directory exists (`services/assessment.ts`, `services/dependency.ts`, `services/router.ts`, `services/dashboard.ts`, `services/changeHistory.ts`) but CRUD operations bypass it entirely. The store is the data layer; routes must not own persistence logic.
- **Failure scenario:** A developer adds pagination logic or soft-delete guard directly in a route instead of the store, duplicating business logic across handlers. The existing `services/dependency.ts` correctly imports the store — routes should do the same indirection.
- **Recommendation:** Create `services/workItemService.ts` exposing `createWorkItem`, `getWorkItem`, `listWorkItems`, `updateWorkItem`, `deleteWorkItem`. Move store calls and business logic (the `hasUnresolvedBlockers` check in workItems.ts, state validation) into the service. Routes then call service functions only.
- **Cross-ref:** TheFixer → backend-coder

---

## QO-003: `Specifications/tiered-merge-pipeline.md` — 10 FR-TMP-* Requirements, Zero Implementation
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** The spec defines 10 requirements (FR-TMP-001 through FR-TMP-010): risk classification, E2E test generation, Playwright runner gate, auto-PR creation, AI PR review, auto-merge logic, post-merge validation, auto-revert, bug ticket creation, dashboard PR status. No `// Verifies: FR-TMP-*` comment exists anywhere in `Source/`. No plan in `Plans/` exists for this spec. The spec references `docs/superpowers/specs/2026-03-25-tiered-merge-pipeline-design.md`. This is complete spec drift — an entire feature exists in domain truth but not in code.
- **Recommendation:** Create `Plans/tiered-merge-pipeline/requirements.md` for Phase 1 scope, or explicitly mark the spec as "Phase 2 — not yet planned" with a backlog status so the enforcer ignores it.
- **Cross-ref:** TheATeam (new feature work)

---

## QO-004: 7 Plans Describe a Replaced System (FR-001 to FR-089 Era)
- **Severity:** P2
- **Category:** spec-drift / doc-stale
- **File:** `Plans/dev-workflow-platform/`, `Plans/orchestrated-dev-cycles/`, `Plans/dev-cycle-traceability/`, `Plans/orchestrator-cycle-dashboard/`, `Plans/image-upload/`, `Plans/dependency-linking/`, `Plans/duplicate-deprecated-status/`
- **Detail:** These 7 plans describe a system of FeatureRequests, BugReports, Development Cycles, and Tickets backed by SQLite (FR-001 to FR-089). The current implementation is a WorkItem workflow engine (FR-WF-001 to FR-WF-013) with an in-memory store — a different domain model and stack. No `Verifies: FR-001` through `Verifies: FR-089` comments exist in source. The plans are either obsolete (the old system was replaced) or they represent a large body of unimplemented work. 
- **Recommendation:** Audit each plan to determine if it is (a) obsolete — archive to `Plans/_archived/`; (b) future work — add it to a backlog and mark explicitly. `Specifications/dev-workflow-platform.md` similarly needs an "archived" or "superseded by workflow-engine.md" header.

---

## QO-005: Placeholder FR IDs in Plan Requirements Files
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Plans/dev-workflow-platform/requirements.md`, `Plans/image-upload/requirements.md`, `Plans/orchestrated-dev-cycles/requirements.md`, `Plans/dev-cycle-traceability/requirements.md`, `Plans/orchestrator-cycle-dashboard/requirements.md`
- **Detail:** Multiple requirements files contain literal `FR-XXX`, `FR-XXXX`, and `FR-0XX` as requirement IDs (found by the enforcer scan). These are authoring placeholders that were never replaced with real IDs. They create noise in enforcer output and may mask untraced real requirements.
- **Failure scenario:** A coder sees `// Verifies: FR-XXX` in the requirements doc, copies it as-is into their implementation file — the enforcer then passes for the wrong reason.
- **Recommendation:** Grep each file for `FR-XXX\b` and either assign real sequential IDs or delete the placeholder row.

---

## QO-006: Duplicate Test Files for Same Components
- **Severity:** P2
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`; same for `WorkItemListPage.test.tsx`
- **Detail:** Two files test `WorkItemDetailPage`: `tests/WorkItemDetailPage.test.tsx` (368 lines) and `tests/pages/WorkItemDetailPage.test.tsx` (393 lines). Same duplication for `WorkItemListPage`. This creates ambiguity about which is authoritative, risks divergent mock setups, and inflates apparent test coverage. `tests/pages/` appears to be the newer location; the root-level files are likely stale.
- **Recommendation:** Verify which version is more complete, remove the stale copy, update any CI or index imports. Archive finding — do not leave both.
- **Cross-ref:** TheFixer → frontend-coder

---

## QO-007: ESLint Suppressions in Production Source
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line`. This rule catches stale closures in `useEffect`/`useCallback`. The suppression is a code smell that often masks real bugs (callbacks referencing stale state). Architecture rules prohibit suppressing linting rules.
- **Recommendation:** Fix the dependency arrays. For `useWorkItems.ts`, if `fetchWorkItems` is stable (useCallback), include it; if not, it should be memoized. For `DependencyPicker.tsx`, audit which deps are intentionally omitted and either add them or use a ref pattern.

---

## JSON Summary

```json
{
  "audit_date": "2026-11-21",
  "auditor": "quality-oracle",
  "spec_coverage": {
    "active_plan_self_judging_workflow": "100% (13/13)",
    "all_plans_combined": "~9% (enforcer fails 7/8 plans)",
    "tiered_merge_pipeline_spec": "0% (0/10 FR-TMP-* traced)"
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift/architecture-violation", "title": "Traceability enforcer single-plan scope — 7/8 plans silently ignored"},
    {"id": "QO-002", "severity": "P1", "category": "architecture-violation", "title": "Route handlers bypass service layer, calling store directly"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "tiered-merge-pipeline spec (10 FRs) has zero implementation"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift/doc-stale", "title": "7 plans describe a replaced system (FR-001 to FR-089 era)"},
    {"id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "Placeholder FR-XXX IDs in requirements files confuse enforcer"},
    {"id": "QO-006", "severity": "P2", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressions in useWorkItems.ts and DependencyPicker.tsx"}
  ],
  "p1_count": 2,
  "p2_count": 4,
  "p3_count": 1,
  "grade": "C",
  "grade_rationale": "2 P1 findings (enforcer scope gap + arch violation) and 4 P2 findings. Active plan at 100% coverage but macro picture shows large spec debt. Grading config: C = max_p1:2, max_p2:15, min_spec_coverage:40."
}
```
