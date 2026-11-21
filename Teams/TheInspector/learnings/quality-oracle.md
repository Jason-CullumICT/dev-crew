# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## 2026-11-21 — First Full Audit Run

### Project State
- **Active system**: Self-Judging Workflow Engine (WorkItem domain model, in-memory store)
- **Active plan**: `Plans/self-judging-workflow/requirements.md` — FR-WF-001 to FR-WF-013
- **Traceability format**: `// Verifies: FR-WF-XXX` (not `FR-XXX`)
- **Source layout**: `Source/Backend/src/{routes,services,store,utils,models,middleware}/`, `Source/Frontend/src/{pages,components,hooks,api}/`
- **Test layout**: `Source/Backend/tests/{routes,services,store}/`, `Source/Frontend/tests/` (also `tests/pages/` subdirectory — duplicates exist!)

### Critical Discovery: Two-Eras Problem
The repo contains **two distinct systems**:
1. **Old system (FR-001 to FR-089)**: FeatureRequests, BugReports, DevCycles, Tickets backed by SQLite. Described in `Plans/dev-workflow-platform/`, `Plans/orchestrated-dev-cycles/`, `Plans/dev-cycle-traceability/`, `Plans/orchestrator-cycle-dashboard/`, `Plans/image-upload/`, `Plans/dependency-linking/`, `Plans/duplicate-deprecated-status/`.
2. **Current system (FR-WF-001 to FR-WF-013)**: WorkItem workflow engine with in-memory store. Described in `Plans/self-judging-workflow/`.

The old system was **replaced** by the current system. The 7 stale plans describe a codebase that no longer exists. Future auditors should check if `Specifications/dev-workflow-platform.md` has been archived before spending time on FR-001 to FR-089 traceability.

### Traceability Enforcer Behavior
- `python3 tools/traceability-enforcer.py` auto-selects the **most recently modified** `Plans/*/requirements.md`
- Currently selects `Plans/self-judging-workflow/requirements.md` → passes (100%)
- Running against all plans shows 7/8 fail — but this is because 7 plans are stale
- **To check all plans**: `for f in Plans/*/requirements.md; do python3 tools/traceability-enforcer.py --file "$f"; done`

### Key File Paths for Fast Audits
- Specs: `Specifications/workflow-engine.md` (domain truth for current system)
- Stale specs: `Specifications/dev-workflow-platform.md` (old system, FR-001 to FR-069)
- Unimplemented spec: `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010, Phase 1+2)
- Route files: `Source/Backend/src/routes/{workItems,workflow,intake,dashboard}.ts`
- Service files: `Source/Backend/src/services/{assessment,changeHistory,dashboard,dependency,router}.ts`
- Store: `Source/Backend/src/store/workItemStore.ts`
- Duplicate tests: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` duplicates `tests/pages/WorkItemDetailPage.test.tsx`

### Open P1 Findings (as of 2026-11-21)
1. **QO-001** — Enforcer only checks one plan. Fix: run against all plans in verification gate.
2. **QO-002** — Route handlers call store directly (workItems.ts, workflow.ts, intake.ts). Missing service layer for CRUD.

### Spec Coverage Trend
- Active plan (self-judging-workflow): **100%** — well-traced
- All plans combined: ~9% — but mostly explained by stale plans, not implementation gaps
- Tiered-merge-pipeline: **0%** — genuine spec drift, never planned

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` in `useWorkItems.ts:63` and `DependencyPicker.tsx:82`
- No `console.log` violations in production source (logger abstraction is used correctly)
- No hardcoded secrets found
