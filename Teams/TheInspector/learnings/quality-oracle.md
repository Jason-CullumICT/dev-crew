# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-05-05

### Spec Coverage Trend
- First audit run. Baseline: **82% combined** (100% workflow-engine, ~89% dev-workflow-platform, 0% tiered-merge-pipeline).

### Critical Discovery: Two-Layer Source Structure
This project has **two separate application implementations**, not one:
1. **`Source/`** — implements `Specifications/workflow-engine.md` (FR-WF-001 to FR-WF-013). Self-judging workflow engine with in-memory store.
2. **`portal/`** — implements `Specifications/dev-workflow-platform.md` (FR-001 to FR-069 + FR-dependency-*). Full dev lifecycle platform with SQLite, feature requests, bugs, cycles, pipeline orchestration.

The `inspector.config.yml` only lists `source.dirs: ["Source/"]`. The enforcer therefore **cannot verify portal/ coverage**. Always run the enforcer explicitly against both sets:
```bash
python3 tools/traceability-enforcer.py  # checks Source/ against self-judging-workflow/requirements.md
# Manually check portal/:
grep -r "Verifies:" portal/ --include="*.ts" | wc -l  # should be high (653+ in 2026-05-05 baseline)
```

### Third Implementation: `platform/`
- **`platform/`** — implements `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010). JavaScript orchestrator. Per CLAUDE.md, this is solo-session territory; pipeline agents must not touch it.
- FR-TMP-* have zero Verifies comments — traceability is purely absent. Not a tooling issue; the code simply lacks the comments.

### Common Pattern Violations Found
| Pattern | Location | Severity |
|---------|----------|----------|
| Direct DB calls in route handler | `portal/Backend/src/routes/teamDispatches.ts` | P2 |
| Silent empty `.catch()` | `portal/Frontend/src/components/common/RepoSelector.tsx:20` | P2 |
| eslint-disable without explanation | `Source/Frontend/src/hooks/useWorkItems.ts:63` | P4 |
| Files >500 lines | 5 production files in portal/ | P4 |

### Enforcer Regex Quirk
The enforcer regex `FR-[A-Z0-9-]+` is too broad. It picks up seed data item IDs like `FR-0002`, `FR-0003` from prose like _"FR-0004 blocked_by FR-0003"_ in the dependency-seed section of `dev-workflow-platform.md`. These appear as false-positive MISSING requirements. Safe to ignore `FR-000X` IDs in enforcer output — they are data IDs, not requirement IDs.

### Useful File Paths for Future Audits
- Enforcer: `tools/traceability-enforcer.py`
- Config: `Teams/TheInspector/inspector.config.yml`
- Spec 1 (workflow engine): `Specifications/workflow-engine.md`
- Spec 2 (dev platform): `Specifications/dev-workflow-platform.md`
- Spec 3 (tiered merge): `Specifications/tiered-merge-pipeline.md`
- Plan requirements (for enforcer): `Plans/self-judging-workflow/requirements.md` (FR-WF-*), `Plans/dependency-linking/requirements.md`, `Plans/dev-workflow-platform/requirements.md`
- Portal backend tests: `portal/Backend/tests/` — all have Verifies comments
- Portal frontend tests: `portal/Frontend/tests/` — all have Verifies comments
- Source backend tests: `Source/Backend/tests/` — all have Verifies comments
- Metrics file with one missing spec'd metric: `Source/Backend/src/metrics.ts` (missing `dependencyCheckDuration` histogram)
- Architecture violation file: `portal/Backend/src/routes/teamDispatches.ts` (direct DB, no Verifies)
- Unlinked recent additions: `portal/Frontend/src/pages/TeamsPage.tsx`, `portal/Frontend/src/components/common/RepoSelector.tsx`

### Open Issues (carry forward to next audit)
- QO-001: Add `portal/` to enforcer `source.dirs` or add a multi-spec run to CI
- QO-002: Extract `teamDispatchService.ts` service layer (route has direct DB calls)
- QO-003: Fix silent `.catch()` in `RepoSelector.tsx`
- QO-004: Implement `dependencyCheckDuration` histogram in `Source/Backend/src/metrics.ts`
- QO-005: Add Verifies comments or spec FRs for TeamsPage, RepoSelector, teamDispatches
- QO-006: Add `// Verifies: FR-TMP-XXX` comments to `platform/orchestrator/lib/`
- QO-007: Add `// Verifies: FR-048` to `portal/Frontend/tests/PipelineStepper.test.tsx`
