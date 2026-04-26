# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-04-26 — Grade C

### Spec Coverage Trend
- **Active plan (FR-WF-*):** 100% — enforcer passes cleanly
- **FR-dependency-* features:** 87.5% — 2 gaps (seed + search route)
- **Full Specifications/ corpus:** ~18% — enforcer is blind to this

### Key File Paths for Fast Future Audits

| Purpose | Path |
|---------|------|
| Active traceability enforcer | `tools/traceability-enforcer.py` |
| Enforcer target (only file checked) | `Plans/self-judging-workflow/requirements.md` |
| Domain specs (NOT checked by enforcer) | `Specifications/dev-workflow-platform.md`, `Specifications/tiered-merge-pipeline.md` |
| Backend metrics (Prometheus) | `Source/Backend/src/metrics.ts` |
| Backend app router | `Source/Backend/src/app.ts` |
| Frontend API client | `Source/Frontend/src/api/client.ts` |
| Backend tests root | `Source/Backend/tests/` |
| Frontend tests root | `Source/Frontend/tests/` (also `tests/pages/` — duplicates exist!) |

### Open Findings (as of 2026-04-26)

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| QO-001 | P1 | OPEN | GET /api/search not wired into app.ts — 5 tests fail |
| QO-002 | P2 | OPEN | Traceability enforcer blind to Specifications/ (76 + 13 FRs unmonitored) |
| QO-003 | P2 | OPEN | FR-dependency-seed has zero implementation |
| QO-004 | P2 | OPEN | Missing dependencyCheckDuration histogram metric in metrics.ts |
| QO-005 | P2 | OPEN | Duplicate frontend test files (tests/ vs tests/pages/) for WorkItemDetailPage and WorkItemListPage |
| QO-006 | P3 | OPEN | DebugPortalPage.tsx has non-FR traceability reference |
| QO-007 | P3 | OPEN | 2× eslint-disable react-hooks/exhaustive-deps suppressions |
| QO-008 | P3 | OPEN | WorkItemDetailPage.tsx at 426 lines (approaching 500 limit) |

### Common Pattern Violations (by frequency)
1. **eslint-disable suppressions** — 2 in frontend (react-hooks/exhaustive-deps)
2. **Non-standard Verifies comment** — 1 (DebugPortalPage.tsx)
3. **Missing route registration** — 1 (search endpoint)

### Architecture Observations
- The `Source/` directory implements the "Self-Judging Workflow Engine" (Plans/self-judging-workflow), NOT the full "dev-workflow-platform" described in `Specifications/dev-workflow-platform.md`. These are two separate application scopes. The `portal/` directory likely implements parts of the dev-workflow-platform. This distinction must be clarified in CLAUDE.md or the enforcer config.
- All services are clean of framework imports — architecture rule compliance confirmed.
- No console.log in production code — all logging goes through the logger abstraction.
- All list endpoints use `{data: T[]}` wrappers — confirmed compliant.

### Useful Quick Checks for Next Run
```bash
# Check if search route was wired
grep "search" Source/Backend/src/app.ts

# Check if seed was implemented
grep -r "FR-dependency-seed" Source/

# Check if dependencyCheckDuration histogram was added
grep "dependencyCheckDuration\|dependency_check_duration" Source/Backend/src/metrics.ts

# Check if duplicate test files were resolved
ls Source/Frontend/tests/pages/

# Run enforcer against full specs (expect failures until implemented)
python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md
python3 tools/traceability-enforcer.py --file Specifications/tiered-merge-pipeline.md
```
