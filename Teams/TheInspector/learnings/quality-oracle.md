# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-07-06 — First Full Audit

**Spec System Structure (critical to know for future audits)**

The project has THREE separate specification systems that should not be conflated:

| System | Spec File | FR Format | Implementation Location |
|--------|-----------|-----------|-------------------------|
| Dev-Crew Portal App | `Specifications/dev-workflow-platform.md` | `FR-001..FR-069`, `FR-dependency-*` | `portal/` |
| Workflow Engine (Source/) | `Plans/self-judging-workflow/requirements.md` | `FR-WF-001..FR-WF-013` | `Source/` |
| Tiered Merge Pipeline | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-001..FR-TMP-010` | `platform/orchestrator/` |

**The spec-drift-audit.py tool is broken for this project:**
- It scans `Specifications/` for canonical `FR-[A-Z]{2,4}-\d{3}` IDs
- Only `tiered-merge-pipeline.md` uses that format → finds 10 IDs (FR-TMP-*)
- Reports 0% coverage because Source/ doesn't implement FR-TMP-* (correctly — those are in `platform/`)
- The true Source/ coverage is 100% per `python3 tools/traceability-enforcer.py`
- **Always run `traceability-enforcer.py`, not `spec-drift-audit.py`, to assess Source/ coverage**

**Architecture violation: routes access store directly**
- `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `intake.ts` all import `workItemStore` directly
- Only services (`assessment.ts`, `router.ts`, `dependency.ts`, `dashboard.ts`) correctly act as the service layer
- There is no `workItemService.ts` for CRUD operations — routes fill that gap
- This violates CLAUDE.md: "No direct DB calls from route handlers — use the service layer"

**Known implementation gap: `/api/search` endpoint missing**
- `Source/Backend/tests/routes/search.test.ts` explicitly documents this is unimplemented
- The route is NOT registered in `Source/Backend/src/app.ts`
- Breaks `DependencyPicker.tsx` typeahead (frontend calls `GET /api/search?q=`)
- The test file is intentional "failing tests document the gap" strategy

**Duplicate test files**
- `tests/WorkItemListPage.test.tsx` AND `tests/pages/WorkItemListPage.test.tsx` both test `WorkItemListPage`
- Same pattern for `WorkItemDetailPage`
- They are NOT identical — different coverage and import styles
- Keeping both creates confusion about which is authoritative

**Useful fast-lookup paths for future audits:**
- Source/ backend services: `Source/Backend/src/services/`
- Source/ backend routes: `Source/Backend/src/routes/`
- Source/ store: `Source/Backend/src/store/workItemStore.ts`
- Source/ metrics: `Source/Backend/src/metrics.ts`
- Traceability enforcer plan target: `Plans/self-judging-workflow/requirements.md`
- Portal backend (separate system): `portal/Backend/src/`

**Spec coverage trend:** First run — baseline established. Source/ FR-WF-* at 100%. FR-dependency-search gap is open. Architecture violation (no service layer for CRUD) is persistent.
