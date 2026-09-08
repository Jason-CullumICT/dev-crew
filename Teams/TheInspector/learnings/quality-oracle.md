# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Run: 2026-09-08 (Full Audit)

### Spec Coverage Trend
- **Domain spec coverage (Specifications/):** 0% — 0 of 77 FR IDs from `Specifications/dev-workflow-platform.md` and `Specifications/tiered-merge-pipeline.md` are referenced with `// Verifies:` in Source/.
- **Plan spec coverage (Plans/self-judging-workflow/requirements.md):** 100% — all 13 FR-WF-* IDs are traced.
- **Trend:** Baseline (first audit). Coverage is split by scope: plan FRs pass the enforcer; domain FRs are entirely invisible to it.

### Critical Discovery: Enforcer Tool Scope Gap
`tools/traceability-enforcer.py` uses `get_active_requirements()` which finds the most recently modified `requirements.md` in `Plans/`. It never reads `Specifications/`. This means:
- Running `python3 tools/traceability-enforcer.py` reports PASS with 0% domain spec coverage.
- The verification gate in CLAUDE.md (`python3 tools/traceability-enforcer.py`) is meaningless for domain spec drift.

### Architecture Violation Pattern
`workItems.ts`, `workflow.ts`, and `intake.ts` all import `../store/workItemStore` directly and call store functions from route handlers. Only `dashboard.ts` correctly uses a service layer. The rule "No direct DB calls from route handlers" is violated in 3 of 4 route files.

### Useful File Paths for Future Audits
- Domain specs: `Specifications/dev-workflow-platform.md` (FR-001 to FR-069), `Specifications/tiered-merge-pipeline.md` (FR-1, FR-2, FR-3)
- Active plan requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013)
- Route files: `Source/Backend/src/routes/{workItems,workflow,intake,dashboard}.ts`
- Traceability enforcer: `tools/traceability-enforcer.py`
- Duplicate test files: `Source/Frontend/tests/WorkItemDetailPage.test.tsx` AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (two copies)

### Common Pattern Violations Found
1. `eslint-disable-next-line react-hooks/exhaustive-deps` without rationale comment (2 locations)
2. Route handlers calling store layer directly (3 route files)
3. Frontend source files with no test counterpart (Layout, PriorityBadge, StatusBadge, TypeBadge, useDashboard, useWorkItems)
