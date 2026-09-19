# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit History

| Date | Grade | P1 | P2 | P3 | P4 | Enforcer |
|------|-------|----|----|----|----|----------|
| 2026-09-19 | C | 2 | 4 | 4 | 1 | PASSED (narrow) |

---

## Key Facts for Faster Future Audits

### Spec Layout
- **`Specifications/workflow-engine.md`** — domain narrative for the Self-Judging Workflow Engine; NO formal FR IDs defined
- **`Specifications/dev-workflow-platform.md`** — contains TWO sets of requirements:
  - FR-001..FR-069: for a feature-request/bug-report/dev-cycle platform — **NOT implemented in Source/**
  - FR-dependency-*: for dependency tracking — **implemented in Source/**
- **`Plans/self-judging-workflow/requirements.md`** — FR-WF-001..013 — what the traceability enforcer checks; all traced
- The enforcer (`tools/traceability-enforcer.py`) auto-selects the most-recently-modified `requirements.md` under `Plans/` — it does NOT scan `Specifications/`

### Source Layout
- **Backend routes:** `Source/Backend/src/routes/` — workItems, workflow, dashboard, intake
- **Backend services:** `Source/Backend/src/services/` — assessment, changeHistory, dashboard, dependency, router
- **Backend store:** `Source/Backend/src/store/workItemStore.ts` — in-memory Map store with file persistence
- **Shared types:** `Source/Shared/types/workflow.ts` — single source of truth for WorkItem types
- **Frontend pages:** `Source/Frontend/src/pages/` — Dashboard, WorkItemList, WorkItemDetail, CreateWorkItem, DebugPortal

### Persistent Open Issues (as of 2026-09-19)

#### P1: GET /api/search missing
- `Source/Backend/tests/routes/search.test.ts` documents the gap explicitly (lines 1-7)
- `Source/Backend/src/app.ts` has NO `/api/search` route registered
- Spec: `FR-dependency-search`

#### P1: FR-001..FR-069 untraced
- 69 requirements in `Specifications/dev-workflow-platform.md` have zero source references
- These describe a different product (FeatureRequest/BugReport/DevelopmentCycle)
- Need clarity on whether this is abandoned, future, or a separate codebase

#### P2: Routes bypass service layer
- `routes/workItems.ts`, `routes/workflow.ts`, `routes/intake.ts` all import `store/workItemStore` directly
- Violates architecture rule: "No direct DB calls from route handlers"
- No workItemService.ts exists

#### P2: FR-dependency-seed unimplemented
- Seed data (BUG-0010 blocked_by BUG-0003..0007 etc.) never implemented
- Zero `// Verifies: FR-dependency-seed` references anywhere

#### P2: Duplicate test files
- `tests/WorkItemDetailPage.test.tsx` AND `tests/pages/WorkItemDetailPage.test.tsx` (similar but different)
- `tests/WorkItemListPage.test.tsx` AND `tests/pages/WorkItemListPage.test.tsx` (similar but different)

### Useful Patterns
- **Finding Verifies comments:** `grep -rn "Verifies:" Source/ --include="*.ts" --include="*.tsx"`
- **Finding FR IDs in specs:** `grep -oP "^\|\s*(FR-[A-Za-z0-9-]+)" Specifications/ -r | grep -oP "FR-[A-Za-z0-9-]+"`
- **Running enforcer:** `python3 tools/traceability-enforcer.py` (auto-picks latest plan)
- **Finding store imports in routes:** `grep -rn "from.*store" Source/Backend/src/routes/`
- **Files modified in last 14 days:** `git log --since="14 days ago" --name-only --format="" -- Source/ | sort -u`

### Pattern Violations Seen
- `eslint-disable-next-line react-hooks/exhaustive-deps` in useWorkItems.ts:63 and DependencyPicker.tsx:82 — without documented justification
- `DependencyPicker.tsx:56-58` — silent catch on search with fallback to empty, no logging
- Two logger abstractions: `src/logger.ts` (wrapper) and `src/utils/logger.ts` (real) — fragmented imports

### Spec Coverage Trend
- 2026-09-19: First audit — baseline established
  - FR-WF (enforcer): 100% ✅
  - FR-dependency-* (manual): 93.8% (15/16 — search and seed missing)
  - FR-001..069 (canonical spec): 0% (different product, not started)
