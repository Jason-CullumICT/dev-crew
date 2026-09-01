# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-09-01

### Spec Coverage Trend
**First run — baseline established.**

| Scope | Requirements | Traced in Source | Coverage |
|-------|-------------|-----------------|----------|
| `Plans/self-judging-workflow` (FR-WF-*) | 13 | 13 | **100%** |
| `Plans/dependency-linking` (FR-dependency-*) | 16 | ~14 | **~88%** |
| `Specifications/dev-workflow-platform.md` (FR-001–FR-074) | 74 | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 10 | 0 | **0%** |
| **TOTAL** | **113** | **~27** | **~24%** |

> **Note:** 0% on the two large Specifications is because those specs describe applications that were never built (the codebase pivoted to the self-judging-workflow engine). If scoped to active plans only, coverage is ~93%.

### Common Pattern Violations Found
- Missing route registration (`GET /api/search` has tests and a Verifies comment but is not wired in `app.ts`)
- Traceability enforcer only checks the most-recently-modified `Plans/*/requirements.md` — misses all `Specifications/` documents
- Plans written for `portal/` path structure but implementation lives in `Source/`
- Duplicate test files for same page (tests/ vs tests/pages/ directories)
- Two `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions in production hooks

### Useful File Paths for Future Audits
- Traceability enforcer: `tools/traceability-enforcer.py` — auto-selects most-recently-modified `Plans/*/requirements.md`
- App entry point / route wiring: `Source/Backend/src/app.ts`
- Active plan requirements: `Plans/self-judging-workflow/requirements.md`, `Plans/dependency-linking/requirements.md`
- Possibly-obsolete specs: `Specifications/dev-workflow-platform.md`, `Specifications/tiered-merge-pipeline.md`
- Metrics definitions: `Source/Backend/src/metrics.ts`
- Known failing test file: `Source/Backend/tests/routes/search.test.ts` (explicitly documented as failing — search route not wired)

### Prior P1/P2 Findings to Re-Verify Next Run
| ID | Finding | Status |
|----|---------|--------|
| QO-001 | `GET /api/search` not in app.ts → search tests fail | OPEN |
| QO-002 | Enforcer blind to 84+ Specifications requirements | OPEN |
| QO-003 | `Specifications/dev-workflow-platform.md` has 0% implementation (74 FRs) | OPEN |
| QO-004 | `Plans/dependency-linking` references `portal/` paths — stale | OPEN |
| QO-005 | Duplicate test files for WorkItemDetailPage and WorkItemListPage | OPEN |
