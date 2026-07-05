# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## First Run — 2026-07-05

### Spec Coverage Trend
- **Active spec coverage** (workflow-engine.md + dependency-linking): ~90%
  - All 13 FR-WF-* requirements have `// Verifies:` comments in source
  - All 16 FR-dependency-* requirements have `// Verifies:` comments in source
  - Open gaps: FR-dependency-seed (no seed.ts), FR-dependency-metrics (missing histogram), GET /api/search not wired
- **Total Specifications/ coverage**: ~13% (13 FR-WF-* covered out of ~102 FR IDs across all three spec files)

### Key Discovery: Spec Namespace Mismatch
The canonical `Specifications/` directory contains **three specs**:
1. `Specifications/workflow-engine.md` — the **implemented** spec. Uses FR-WF-XXX IDs. Source traces to these.
2. `Specifications/dev-workflow-platform.md` — **NOT implemented**. Uses FR-001–FR-069, FR-033–FR-049, FR-050–FR-069. Zero source coverage.
3. `Specifications/tiered-merge-pipeline.md` — **NOT implemented**. Uses FR-TMP-001–FR-TMP-010. Zero source coverage.

The traceability enforcer (`tools/traceability-enforcer.py`) **only checks the most-recently-modified `requirements.md`** under `Plans/`. When run without arguments it targets `Plans/self-judging-workflow/requirements.md` (FR-WF-* IDs) and reports PASSED — giving a **false green** for the broader spec debt.

### Traceability Enforcer Limitations
- Does NOT scan `Specifications/` directory at all unless passed `--file`
- The `Plans/dependency-linking/requirements.md` contains entity ID references (FR-0002, FR-0003…) that the enforcer misidentifies as requirement IDs — causing false FAILURE on those IDs
- To get a complete picture, run: `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md`

### Architecture Pattern: Direct Store Calls in Routes
Three route files bypass the service layer and call the store directly:
- `Source/Backend/src/routes/workItems.ts` — `import * as store from '../store/workItemStore'`
- `Source/Backend/src/routes/workflow.ts` — `import * as store from '../store/workItemStore'`
- `Source/Backend/src/routes/intake.ts` — `import * as store from '../store/workItemStore'`

This violates the CLAUDE.md rule: "No direct DB calls from route handlers — use the service layer."
Service layer files exist: `services/router.ts`, `services/assessment.ts`, `services/changeHistory.ts`, `services/dependency.ts`, `services/dashboard.ts`.

### Missing Implementation: GET /api/search
`FR-dependency-search` requires `GET /api/search?q=`. The route exists in tests but is NOT registered in `Source/Backend/src/app.ts`. The `DependencyPicker` component uses `searchItems()` from the API client which will always 404.
Test file `Source/Backend/tests/routes/search.test.ts` explicitly documents this gap (line 4–6).

### Missing Metrics
`FR-dependency-metrics` requires 4 metrics. `Source/Backend/src/metrics.ts` has only 3:
- ✅ `dependencyOperationsCounter`
- ✅ `dispatchGatingEventsCounter`
- ✅ `cycleDetectionEventsCounter`
- ❌ `dependencyCheckDuration` (Histogram — missing)

### Duplicate Test Files
Two test files exist in both `Source/Frontend/tests/` (older, simpler) and `Source/Frontend/tests/pages/` (newer, richer):
- `WorkItemDetailPage.test.tsx` — pages/ version has typed imports and more complete setup
- `WorkItemListPage.test.tsx` — pages/ version has typed imports and `within` helper

The root-level versions are likely superseded. The jest config should be verified to confirm which are being run.

### Useful File Paths for Future Audits
- Spec files: `Specifications/*.md`
- Active requirements: `Plans/self-judging-workflow/requirements.md`, `Plans/dependency-linking/requirements.md`
- Enforcer: `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md`
- Store: `Source/Backend/src/store/workItemStore.ts`
- App wiring: `Source/Backend/src/app.ts`
- Metrics: `Source/Backend/src/metrics.ts`

### Common Pattern Violations Found
1. Route handlers importing store directly (3 route files)
2. eslint-disable comments suppressing react-hooks/exhaustive-deps (2 files)
3. Non-standard Verifies comment in DebugPortalPage.tsx
