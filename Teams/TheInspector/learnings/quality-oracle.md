# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit #1 — 2026-07-15

### Spec Coverage Trend
- **DECLINING** — Two of three Specifications documents have 0% implementation coverage.
- `workflow-engine.md` + dependency tracking: well-covered (~95%)
- `dev-workflow-platform.md` (FR-001–FR-069): **0% covered** — 76 requirements unimplemented
- `tiered-merge-pipeline.md` (FR-TMP-001–FR-TMP-010): **0% covered**

### Traceability Enforcer Scope Gap
- `tools/traceability-enforcer.py` targets the **most recently modified** `requirements.md` in `Plans/`, not `Specifications/`. This produces a false-green "TRACEABILITY PASSED" while 76+ spec requirements have zero implementation. Confirmed via:
  - `python3 tools/traceability-enforcer.py` → PASSED (scans Plans/self-judging-workflow/requirements.md)
  - `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` → FAILED (76 missing)
  - `python3 tools/traceability-enforcer.py --file Specifications/tiered-merge-pipeline.md` → FAILED (13 missing)

### Useful File Paths
| Path | Purpose |
|------|---------|
| `Specifications/dev-workflow-platform.md` | Main platform spec; FR-001–FR-069 + FR-dependency-* |
| `Specifications/workflow-engine.md` | Workflow engine spec; no formal FR table in spec (IDs live in Plans/) |
| `Specifications/tiered-merge-pipeline.md` | Merge pipeline spec; FR-TMP-001–010 |
| `Plans/self-judging-workflow/requirements.md` | FR-WF-001–013; what the enforcer actually scans |
| `Source/Shared/types/workflow.ts` | Shared types; annotated with FR-WF-001 + FR-dependency-* |
| `Source/Backend/src/metrics.ts` | Prometheus metrics; missing `dependency_check_duration` histogram |
| `Source/E2E/playwright.pipeline.config.ts` | Hardcoded stale test dir for cycle-run-1774659927912 |

### Common Pattern Violations
- `FR-dependency-seed` specified but no seed script found
- `dependency_check_duration` Histogram specified in FR-dependency-metrics but not implemented
- Non-standard Verifies comment in `DebugPortalPage.tsx` (not FR-XXX format)
- `api-contracts.md` references FR-070–FR-085 which don't exist in any spec document

### Architecture Health
- ✅ No `console.log` violations in production source
- ✅ No empty catch blocks
- ✅ No skipped/TODO tests
- ✅ Service layer used; no direct DB calls from routes
- ✅ Logger abstraction in place (`Source/Backend/src/utils/logger.ts`)
- ⚠️ workflow-engine.md spec has no formal FR table — requirement IDs live in Plans/
