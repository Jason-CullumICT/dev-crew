# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Run: 2026-06-19 — Full Audit

#### Spec Coverage Trend
- **Against canonical `Specifications/`:** ~15% (critical drift — two different systems)
- **Against `Plans/self-judging-workflow/requirements.md`:** 100% (13/13 FR-WF-*)
- **Against `FR-dependency-*`:** ~81% (search endpoint missing, histogram missing)
- Trend: First audit — no baseline to compare.

#### Key Architectural Reality
The Source/ code implements the **Self-Judging Workflow Engine** spec (`workflow-engine.md` + `Plans/self-judging-workflow/requirements.md`), NOT the **Dev Workflow Platform** (`Specifications/dev-workflow-platform.md`). These are fundamentally different systems:
- Workflow engine: in-memory store, work items, routing/assessment/dispatch
- Dev Workflow Platform: SQLite backend, feature requests, bugs, development cycles, pipeline orchestration

Both specs live in `Specifications/` but only `workflow-engine.md` is implemented. `dev-workflow-platform.md` (FR-001 to FR-069) is entirely unimplemented in Source/.

#### Enforcer Regex Bug (Critical)
`tools/traceability-enforcer.py` uses pattern `FR-[A-Z0-9-]+` which silently skips any FR with lowercase letters (e.g., `FR-dependency-service`, `FR-dependency-search`). These IDs are never extracted from specs and never checked. Fix: change to `FR-[A-Za-z0-9-]+`.

#### Enforcer Scope Bug (Critical)
The enforcer auto-discovers requirements from `Plans/` (most recently modified requirements.md), NOT from `Specifications/`. The tool passes even though 76 Specifications FRs are unimplemented. The inspector config says `specs.dir: "Specifications/"` but the enforcer ignores that.

#### Known Implementation Gaps (P2)
- `GET /api/search` not wired into `app.ts` — test file `search.test.ts` explicitly documents this. Tests will fail.
- `dependencyCheckDuration` Histogram absent from `metrics.ts` — FR-dependency-metrics requires 4 metrics, only 3 counters present.

#### Architecture Violation Pattern
Routes (`workItems.ts`, `workflow.ts`, `intake.ts`) all import `workItemStore` directly, bypassing the service layer. `intake.ts` has NO service usage at all — it creates work items directly via the store. This violates CLAUDE.md rule: "No direct DB calls from route handlers — use the service layer."

#### Duplicate Test Files
Two near-identical test suites exist for the same components:
- `tests/WorkItemDetailPage.test.tsx` (368 lines) and `tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
- `tests/WorkItemListPage.test.tsx` and `tests/pages/WorkItemListPage.test.tsx`
These should be consolidated. The `tests/pages/` versions appear to be the updated ones.

#### Useful File Paths for Fast Future Audits
- Canonical specs: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- Plan FRs: `Plans/self-judging-workflow/requirements.md`
- Enforcer: `tools/traceability-enforcer.py` (has regex bug + scope bug)
- Backend routes with store bypass: `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `intake.ts`
- Missing endpoint test: `Source/Backend/tests/routes/search.test.ts`
- Missing metric: `Source/Backend/src/metrics.ts` (no histogram)
- Frontend tests without tests: `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `useDashboard.ts`, `useWorkItems.ts`

#### Common Pattern Violations Found
1. FR IDs defined in Plans/ not Specifications/ (breaks spec-first principle)
2. Routes directly accessing the store (bypasses service layer rule)
3. Duplicate test file directories (tests/ and tests/pages/ overlap)
