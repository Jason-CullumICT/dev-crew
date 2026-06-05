# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-06-05 (Grade: D)

### Spec Coverage Trend
- First run — no baseline. Coverage of `Specifications/` = 0% (product pivot not reflected).
- Coverage of `Plans/self-judging-workflow/requirements.md` = 100% (enforcer passes).

### Key Structural Discoveries

**Product pivot not reflected in Specifications/:**  
`Specifications/dev-workflow-platform.md` (74 FRs) describes the old SQLite product. The current `Source/` implements the self-judging workflow engine. `Specifications/workflow-engine.md` is the active spec but has no FR IDs. This is the root cause of the 0% Specifications/ coverage.

**Traceability enforcer auto-selection is misleading:**  
`tools/traceability-enforcer.py` defaults to the most-recently-modified `requirements.md` under `Plans/`. With `Plans/self-judging-workflow/requirements.md` most recent, it only checks 13 FR-WF-* IDs and reports PASSED. Run with `--file Plans/dependency-linking/requirements.md` to also enforce FR-dependency-* coverage.

**FR namespace map:**
- `FR-WF-001` through `FR-WF-013` → self-judging workflow engine (`Plans/self-judging-workflow/requirements.md`)
- `FR-dependency-*` (15 IDs) → dependency tracking feature (`Plans/dependency-linking/requirements.md`)
- `FR-001` through `FR-069+` → OLD SQLite platform (`Specifications/dev-workflow-platform.md`, superseded)
- `FR-070` through `FR-085` → referenced in `Source/Shared/api-contracts.md` but NOT formally defined anywhere

**Architecture violation pattern:**  
`routes/workItems.ts`, `routes/workflow.ts`, `routes/intake.ts` all import `workItemStore` directly. `routes/dashboard.ts` is the correct model (delegates to `dashboardService`). P2 violation of CLAUDE.md rule.

**Useful fast-path files for future audits:**
- `Source/Shared/types/workflow.ts` — single source of truth for domain types; check for inline re-definitions
- `Source/Backend/src/routes/` — always check for direct store imports (architecture violation)
- `Plans/*/requirements.md` — each plan has its own FR namespace; run enforcer per plan
- `Source/Frontend/tests/` — has both top-level and `tests/pages/` subdirectory; duplicate test files for WorkItemDetailPage and WorkItemListPage (top-level variants likely stale)

**Open items confirmed in Source/ (as of 2026-06-05):**
- `FR-dependency-seed` — still unimplemented: no seed file in `Source/`
- `middleware/errorHandler.ts` — no test file
- Frontend hooks (`useWorkItems`, `useDashboard`) — no test files
- Badge components (`PriorityBadge`, `StatusBadge`, `TypeBadge`, `Layout`) — no test files

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` without explanation in 2 files
- Two logger files (`src/logger.ts` re-export shim + `src/utils/logger.ts` implementation)

### Open P1/P2 Findings to Re-verify Next Run
- **QO-001 (P1):** `Specifications/dev-workflow-platform.md` superseded but not archived
- **QO-002 (P2):** Direct store access in `routes/workItems.ts`, `routes/workflow.ts`, `routes/intake.ts`
- **QO-003 (P2):** Traceability enforcer only covers 13/102 requirements
- **QO-004 (P2):** Dependency feature unspecced; `FR-dependency-seed` unimplemented
