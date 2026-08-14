# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-08-14

### Spec Coverage Trend
- **Enforcer-reported coverage**: 100% (13/13 FR-WF-* IDs in Plans/self-judging-workflow/requirements.md)
- **True spec coverage**: ~70% — the enforcer is blind to Specifications/ because those docs lack formal FR-XXX IDs
- `Specifications/workflow-engine.md` has **zero** FR-XXX identifiers; all FR-WF-* IDs live in `Plans/self-judging-workflow/requirements.md`
- `Specifications/tiered-merge-pipeline.md` FR-TMP-001 through FR-TMP-010 are **never scanned** by the enforcer
- Dependency requirements (FR-dependency-*): 11/13 covered; search route not wired, histogram missing

### Key File Locations (for faster future audits)
| Artifact | Path |
|----------|------|
| Main spec (workflow engine) | `Specifications/workflow-engine.md` |
| Plan requirements (enforced) | `Plans/self-judging-workflow/requirements.md` |
| Dependency plan (partially done) | `Plans/dependency-linking/requirements.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Express app registration | `Source/Backend/src/app.ts` |
| Metrics registry | `Source/Backend/src/metrics.ts` |
| Shared types | `Source/Shared/types/workflow.ts` |
| Dependency service | `Source/Backend/src/services/dependency.ts` |

### Common Pattern Violations
- Specs without formal FR-XXX IDs cannot be enforced by the current tool
- eslint-disable-next-line react-hooks/exhaustive-deps used in 2 production files
- Dual logger pattern (logger.ts wraps utils/logger.ts) creates maintenance confusion
- Search route exists in tests but not wired in app.ts (known gap, self-documenting tests)

### Open P1/P2 Findings (for re-verification next run)
| ID | Finding | File | Status |
|----|---------|------|--------|
| QO-001 | /api/search route not registered in app.ts | Source/Backend/src/app.ts | OPEN |
| QO-002 | Traceability enforcer blind to Specifications/ | tools/traceability-enforcer.py | OPEN |
| QO-003 | workflow-engine.md has no FR-XXX IDs | Specifications/workflow-engine.md | OPEN |
| QO-004 | dependencyCheckDuration histogram missing | Source/Backend/src/metrics.ts | OPEN |
| QO-005 | pending_dependencies absent from WorkItemStatus enum | Source/Shared/types/workflow.ts | OPEN |
