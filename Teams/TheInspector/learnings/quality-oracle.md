# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-10-15 — Full Audit (Grade: C)

### Spec Coverage Trend

| Date | Plans Coverage | Specs Coverage | Grade |
|------|---------------|----------------|-------|
| 2026-10-15 | 100% (13/13 FR-WF) | 67% (26/39 app-relevant FRs) | C |

### Critical Discovery: Two Spec Corpora for Two Different Apps

**`Specifications/dev-workflow-platform.md`** (FR-001..FR-069, FR-dependency-*) describes a
**SQLite-backed Express + React dev-workflow-platform** (feature requests, bug reports, dev cycles).
This is NOT the codebase in `Source/`. The Source/ codebase is the **self-judging workflow engine**
(in-memory store, work items, assessment pod, work router).

The relevant spec for Source/ is:
- `Plans/self-judging-workflow/requirements.md` → FR-WF-001..FR-WF-013 (100% covered)
- `Specifications/workflow-engine.md` → prose spec, no numbered IDs
- `Specifications/dev-workflow-platform.md` (FR-dependency-*) → partial implementation in Source/
- `Specifications/tiered-merge-pipeline.md` → FR-TMP-001..FR-TMP-010 (0% in Source/)

### Key File Paths (for faster future audits)

| What | Where |
|------|-------|
| App entry point | `Source/Backend/src/app.ts` |
| Registered routes | `app.ts` lines 22-31 — 4 routers only (workItems, workflow, dashboard, intake) |
| Missing search route | `GET /api/search` NOT in app.ts — search.test.ts acknowledges this gap |
| Metrics | `Source/Backend/src/metrics.ts` — 4 counters for FR-WF-013, 3 counters for FR-dependency-metrics |
| Missing histogram | `dependency_check_duration_seconds` — NOT in metrics.ts |
| Shared types | `Source/Shared/types/workflow.ts` |
| Import inconsistency | WorkItem.ts uses `@shared/`, everything else uses `../../../Shared/` |
| Traceability enforcer target | `Plans/self-judging-workflow/requirements.md` (Plans, not Specifications/) |
| Seed data | Missing — FR-dependency-seed unimplemented |

### Open Findings from This Run

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| QO-001 | P1 | OPEN | /api/search not wired — FR-dependency-search unimplemented |
| QO-002 | P1 | OPEN | dev-workflow-platform.md describes a different application |
| QO-003 | P2 | OPEN | dependencyCheckDuration histogram missing |
| QO-004 | P2 | OPEN | FR-TMP-001..010 Tiered Merge Pipeline — 0% in Source/ |
| QO-005 | P2 | OPEN | Traceability enforcer validates Plans/, not Specifications/ |
| QO-006 | P2 | OPEN | FR-dependency-seed — seed data never implemented |
| QO-007 | P3 | OPEN | Inconsistent @shared vs relative imports |
| QO-008 | P3 | OPEN | eslint-disable suppressions in DependencyPicker.tsx and useWorkItems.ts |
| QO-009 | P4 | OPEN | Duplicate logger: src/logger.ts re-exports src/utils/logger.ts |

### Pattern Observations

- **FR-WF-013 is overloaded** — assigned to logger utils, Prometheus metrics, error handler,
  request logging, and the metrics endpoint. Consider splitting to FR-WF-013a/b or more specific IDs.
- **Catch blocks are clean** — all route catch blocks log with `logger.error` before returning 500.
  No silent swallowing found.
- **No console.log in production** — logger abstraction is used consistently. `grep` confirms only
  one hit in `src/utils/logger.ts` itself (as the `// Verifies` comment).
- **No hardcoded secrets** found in Source/.
- **No TODO/FIXME** comments found in Source/.
- **No test.skip or test.todo** found in Source/.
- **All list endpoints use {data: T[]} wrappers** — verified in route handlers.
