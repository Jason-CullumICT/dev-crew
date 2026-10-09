# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-10-09 — Full Audit

### Spec Coverage Summary

| Scope | FRs Defined | FRs Traced | Coverage |
|-------|------------|------------|----------|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013) | 13 | 13 | **100%** |
| `Plans/dependency-linking/requirements.md` (FR-dependency-*) | 15 | ~12 | **~80%** (3 incomplete per status table) |
| `Specifications/dev-workflow-platform.md` (FR-001..FR-069) | 77 | 0 | **0%** |
| **Grand total** | **105** | **25** | **~24%** |

**The traceability enforcer reports 100% because it only scans the most recently modified plan.**

### Key Findings

- **P1** — `GET /api/search` endpoint implemented in tests but NOT wired into `app.ts` (intentionally failing test gate)
- **P2** — Route handlers (`workItems.ts`, `intake.ts`, `workflow.ts`) import directly from `workItemStore`, bypassing the service layer
- **P2** — Traceability enforcer blind spot: only the most recently modified plan is checked; Specifications/ FRs are never enforced
- **P2** — 77 FRs in `Specifications/dev-workflow-platform.md` have zero implementation (spec drift from a broader platform vision)
- **P3** — Duplicate frontend test files in `tests/` and `tests/pages/` with divergent mocks for the same components
- **P3** — `FR-dependency-*` IDs not enforced by current traceability gate; 3 incomplete per the plan status table
- **P3** — 2 `eslint-disable` comments suppressing `react-hooks/exhaustive-deps`

### Fast-Audit File Paths

- Specs: `Specifications/dev-workflow-platform.md`, `Specifications/tiered-merge-pipeline.md`, `Specifications/workflow-engine.md`
- Active plan: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013 — all 13 implemented)
- Dependency plan: `Plans/dependency-linking/requirements.md` (partially implemented, 3 gaps)
- Enforcer: `tools/traceability-enforcer.py` — scans Plans/ only, picks most-recently-modified
- Routes with architecture violations: `Source/Backend/src/routes/workItems.ts`, `intake.ts`, `workflow.ts`
- Duplicate tests: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` vs `tests/pages/WorkItemDetailPage.test.tsx`
- Missing route: `GET /api/search` — test at `Source/Backend/tests/routes/search.test.ts` (intentionally failing)

### Spec Drift Trend

- First audit — **declining spec-to-code ratio** (Specifications/ FR-001..069 are aspirational but never implemented; codebase is a focused subset)
- The `dev-workflow-platform.md` spec defines the full product vision; the team implemented only one subsystem (self-judging workflow engine)

## Learnings

- The traceability enforcer uses `max(req_files, key=os.path.getmtime)` — always targets the newest plan, making multi-plan projects blind to older plans' FRs
- `Specifications/` FRs use different numbering (FR-001, FR-002, …) from plan FRs (FR-WF-001, FR-dependency-*)  — the enforcer regex `FR-[A-Z0-9-]+` would catch all formats if pointed at the right file
- The `dependency-linking` plan references `portal/` paths (old project layout); the current layout is `Source/` — plan is stale relative to project structure
- No console.log violations in production source (logger abstraction is used correctly)
- No hardcoded secrets found — env vars used correctly
- No large files (>500 lines) — largest is `WorkItemDetailPage.tsx` at 426 lines
- All backend service files are framework-free (no Express imports in services)
