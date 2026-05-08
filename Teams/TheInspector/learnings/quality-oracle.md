# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-05-08

### Spec Coverage Trend
- First baseline audit. **Overall effective coverage: ~99%** across all plans when scanning the correct directories.
- The traceability enforcer defaults create a **false 0%** for portal/ implementations — enforcer only scans `Source/` and `E2E/`.

### Critical File Paths for Fast Future Audits

| Path | What it is |
|------|-----------|
| `tools/traceability-enforcer.py:70` | Hardcodes `source_dirs = ["Source", "E2E"]` — misses `portal/` |
| `portal/Backend/src/routes/teamDispatches.ts` | Direct DB in route handler + no Verifies comments |
| `portal/Frontend/src/components/common/RepoSelector.tsx` | No Verifies, silent catch |
| `portal/Frontend/src/pages/TeamsPage.tsx` | No Verifies comments |
| `portal/Frontend/src/components/bugs/BugDetail.tsx:82` | Empty `.catch(() => {})` |
| `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx:80` | Empty `.catch(() => {})` |

### Architecture Notes
- `portal/` implements `Specifications/dev-workflow-platform.md` (FR-001 to FR-069)
- `Source/` implements `Specifications/workflow-engine.md` (FR-WF-001 to FR-WF-013)
- `platform/orchestrator/` implements `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010)
- Plans/*/requirements.md files define FRs 070-095 (image upload, orchestrator dashboard, duplicate/deprecated) — not yet in canonical Specifications/

### Common Pattern Violations Found
1. **Direct DB in route**: `portal/Backend/src/routes/teamDispatches.ts` — only file violating service-layer pattern
2. **Silent catch blocks**: `BugDetail.tsx`, `FeatureRequestDetail.tsx`, `RepoSelector.tsx` — identical pattern (likely copy-paste from single origin)
3. **Inline types in routes**: `TeamDispatch` interface in `teamDispatches.ts` — not in `portal/Shared/types.ts`

### How to Run Multi-Scope Traceability Check
```bash
# To properly check portal/ coverage:
python3 tools/traceability-enforcer.py --file Plans/dev-workflow-platform/requirements.md
# Then manually verify against portal/ (enforcer will report false failures — check portal/ manually)

# Or run with patched source_dirs = ["Source", "E2E", "portal", "platform"]
```

### Open Findings by ID
| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| QO-001 | P2 | OPEN | Enforcer blind spot: portal/ not scanned |
| QO-002 | P2 | OPEN | Direct DB queries in teamDispatches.ts route handler |
| QO-003 | P3 | OPEN | 3 empty .catch(() => {}) blocks in portal/Frontend |
| QO-004 | P3 | OPEN | 3 production files with zero Verifies comments |
| QO-005 | P3 | OPEN | FR-DUP-06 has no Verifies comment anywhere |
| QO-006 | P3 | OPEN | TeamDispatch interface inline in route, not in Shared types |
| QO-007 | P3 | OPEN | FR-070 to FR-095 not incorporated into Specifications/ |
| QO-008 | P4 | OPEN | 2 eslint-disable suppressions in Source/Frontend |
| QO-009 | P4 | OPEN | 5 source files > 500 lines |
| QO-010 | P4 | OPEN | FR-TMP-008 (Dockerfile.worker) lacks Verifies comment |
