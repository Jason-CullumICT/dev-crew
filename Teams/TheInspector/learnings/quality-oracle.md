# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-06-20

### Spec Coverage Trend
- Active-plan coverage: **93%** (27/29 requirements in self-judging-workflow + dependency-linking plans)
- `Specifications/dev-workflow-platform.md`: **0%** — confirmed as an orphaned spec for a different application (portal-based dev-crew platform with SQLite/Feature Requests/Bug Reports). Not a gap in the workflow engine.

### Key File Locations (for faster future audits)

| What | Where |
|------|-------|
| Active backend requirements | `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013) |
| Active dependency requirements | `Plans/dependency-linking/requirements.md` (FR-dependency-*) |
| Orphaned spec (different system) | `Specifications/dev-workflow-platform.md` (FR-001 to FR-069) |
| Workflow domain spec (no IDs) | `Specifications/workflow-engine.md` |
| Backend source | `Source/Backend/src/` |
| Backend tests | `Source/Backend/tests/` |
| Frontend source | `Source/Frontend/src/` |
| Frontend tests | `Source/Frontend/tests/` |
| Shared types (canonical) | `Source/Shared/types/workflow.ts` |
| Prometheus metrics | `Source/Backend/src/metrics.ts` |
| App entry / route registration | `Source/Backend/src/app.ts` |
| Traceability enforcer | `tools/traceability-enforcer.py` (targets most-recently-modified Plans/*/requirements.md) |

### Open P1/P2 Findings (track for re-verification next run)

| ID | Severity | Summary | Status |
|----|----------|---------|--------|
| QO-001 | P1 | `GET /api/search` not implemented — 5 tests in `search.test.ts` will fail | OPEN |
| QO-002 | P2 | `Specifications/dev-workflow-platform.md` is orphaned spec for different system | OPEN |
| QO-003 | P2 | Traceability enforcer blind to `FR-dependency-*` requirements | OPEN |
| QO-004 | P2 | `dependencyCheckDuration` histogram missing from `metrics.ts` | OPEN |
| QO-005 | P2 | Duplicate frontend tests — WorkItemDetailPage and WorkItemListPage each tested twice | OPEN |
| QO-006 | P2 | OpenTelemetry tracing not implemented (CLAUDE.md architecture rule) | OPEN |

### Common Pattern Violations Found
- `eslint-disable-next-line react-hooks/exhaustive-deps` in `DependencyPicker.tsx:82` and `hooks/useWorkItems.ts:63` — both lack rationale comments
- Silent `.catch(() => ({}))` in `api/client.ts:26` — intentional but undocumented

### Architecture Notes
- No direct store calls from route handlers — clean
- `RouteResult` and `AssessmentResult` interfaces defined in service files, not in `Source/Shared/types/workflow.ts` — P3 violation
- Search route (`FR-dependency-search`) has test file but is NOT registered in `app.ts` — tests are intentionally failing per comment in test file
- Traceability enforcer uses "most recently modified requirements.md" heuristic — fragile; run `--file Plans/dependency-linking/requirements.md` explicitly for full coverage
- Both `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` exist and conflict — same for WorkItemListPage

### Useful Commands
```bash
# Run traceability for all active plans explicitly:
python3 tools/traceability-enforcer.py --file Plans/self-judging-workflow/requirements.md
python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md

# Check what the traceability enforcer would auto-pick:
# (it selects most-recently-modified Plans/*/requirements.md)

# Find all Verifies comments:
grep -rn "Verifies:" Source/ | grep -v node_modules

# Find unimplemented search route:
grep -n "search" Source/Backend/src/app.ts  # should return nothing until fixed

# Check metrics completeness:
grep -n "Histogram\|Counter\|Gauge" Source/Backend/src/metrics.ts

# Check for console.log in production source:
grep -rn "console\." Source/Backend/src/ Source/Frontend/src/ --include="*.ts" --include="*.tsx"
```
