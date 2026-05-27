# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-05-27 — First Run

### Spec Coverage Trend
- **Enforcer-scoped coverage**: 100% (29/29 requirements from Plans/self-judging-workflow)
- **Full-spec coverage**: ~25.7% (29/113 requirements across all Specifications/)
- Two entire spec documents (`dev-workflow-platform.md`, `tiered-merge-pipeline.md`) have 0% source coverage

### Active P1 Findings

#### P1 — Missing `GET /api/search` endpoint
- Test file `Source/Backend/tests/routes/search.test.ts` explicitly documents that the route is **not wired in `app.ts`**
- 5 tests will fail at runtime
- FR: `FR-dependency-search`

### Active P2 Findings

#### P2 — Route handlers call store directly (architecture violation)
- `Source/Backend/src/routes/workItems.ts` — calls `store.findById`, `store.createWorkItem`, `store.updateWorkItem`, `store.softDelete` directly
- `Source/Backend/src/routes/workflow.ts` — calls `store.findById`, `store.updateWorkItem` directly
- Violates CLAUDE.md rule: "No direct DB calls from route handlers — use the service layer"

#### P2 — Missing `dependency_check_duration` histogram
- `Source/Backend/src/metrics.ts` has 3 of 4 FR-dependency-metrics requirements
- Missing: `dependency_check_duration` histogram

#### P2 — Traceability enforcer ignores 84 spec FRs
- `tools/traceability-enforcer.py` only targets `Plans/self-judging-workflow/requirements.md`
- `Specifications/dev-workflow-platform.md` (74 FRs: FR-001–FR-069+) — 0% coverage in source
- `Specifications/tiered-merge-pipeline.md` (10 FRs: FR-TMP-001–010) — 0% coverage in source

### Key File Paths (for faster future audits)
- Requirements tracked by enforcer: `Plans/self-judging-workflow/requirements.md`
- All spec docs: `Specifications/dev-workflow-platform.md`, `Specifications/tiered-merge-pipeline.md`, `Specifications/workflow-engine.md`
- Traceability enforcer: `tools/traceability-enforcer.py`
- Backend routes: `Source/Backend/src/routes/` (4 files: workItems, workflow, dashboard, intake)
- Backend metrics: `Source/Backend/src/metrics.ts`
- Frontend tests (duplicate paths): `Source/Frontend/tests/` has both `WorkItemDetailPage.test.tsx` and `pages/WorkItemDetailPage.test.tsx`

### Common Pattern Violations Found
1. `eslint-disable-next-line react-hooks/exhaustive-deps` in `DependencyPicker.tsx:82` and `useWorkItems.ts:63`
2. Silent `.catch(() => ({}))` in `Source/Frontend/src/api/client.ts:26`
3. Direct store import in route files (should go through services)
4. `DebugPortalPage.tsx` uses non-standard Verifies comment: `// Verifies: dev-crew debug portal`

### Architecture Discovery
- The implementation follows `workflow-engine.md` (self-judging workflow engine, in-memory store)
- `dev-workflow-platform.md` describes a full SQLite-based dev lifecycle management system — this is either a future planned state or a parallel product spec that has not been implemented
- The two systems are architecturally incompatible (different entities, different persistence)
- E2E test directory `Source/E2E/tests/` is empty — FR-TMP-002/003 (Playwright tests) never started

### Grading (per inspector.config.yml thresholds)
- P1 findings: 1, P2 findings: 4 → Grade **C** (max_p1=2, max_p2=15, min_spec_coverage=40%)
- However, spec coverage is ~26% which is below the 40% threshold for C → Grade **D**
