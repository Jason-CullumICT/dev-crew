# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-05-17 — Full Audit

### Spec Coverage Trend
- **FR-001..FR-069** (Specifications/dev-workflow-platform.md): **100%** covered in `portal/`
- **FR-WF-001..FR-WF-013** (Plans/self-judging-workflow/requirements.md): **100%** covered in `Source/`
- **FR-TMP-001..FR-TMP-010** (Specifications/tiered-merge-pipeline.md): **90%** covered in `platform/orchestrator/` — FR-TMP-008 has no traceability comment
- **FR-dependency-*** (Plans/dependency-linking/requirements.md): **87%** — FR-dependency-seed not implemented, FR-dependency-api-types incomplete
- **FR-070..FR-095 + FR-DUP-*** (Plans only): 100% implemented but **absent from Specifications/** — inverse spec drift

### Architecture of the Codebase (Critical Context)
There are **two separate applications**:
1. **`Source/`** — Self-judging Workflow Engine (FR-WF-*); in-memory store; Express + TypeScript
2. **`portal/`** — Dev Workflow Platform (FR-001 to FR-069+); SQLite; Express + TypeScript + React

Both share `Specifications/` and `Plans/` for their respective requirements.

### Traceability Enforcer Blind Spot
`tools/traceability-enforcer.py` scans `["Source", "E2E"]` only. The portal/ implementation (which is the larger app) is **invisible to the enforcer**. Always pass `--file Plans/dev-workflow-platform/requirements.md` (or a portal-specific file) when auditing portal/.

### Known Open Issues (P1/P2 from this run)
| ID | Status | Finding |
|----|--------|---------|
| QO-001 | **OPEN** | FR-070 ID collision: image-upload plan and orchestrator-cycle-dashboard plan both claim FR-070 |
| QO-002 | **OPEN** | Traceability enforcer doesn't scan `portal/` — false confidence on portal/ coverage |
| QO-003 | **OPEN** | FR-dependency-seed missing: `portal/Backend/src/database/seed.ts` does not exist |
| QO-004 | **OPEN** | FR-dependency-api-types: `blocked_by` absent from `UpdateBugInput`/`UpdateFeatureRequestInput` in portal/Shared/api.ts; `as any` cast at DependencyPicker.tsx:291-293 |
| QO-005 | **OPEN** | Silent error swallowing in portal/Frontend (FeatureRequestDetail:80, RepoSelector:20, BugDetail:82) |
| QO-006 | **OPEN** | Specifications/ not updated for FR-070..FR-095, FR-DUP-* (39 FRs only in Plans/) |

### Useful File Paths for Future Audits
- Canonical spec for portal: `Specifications/dev-workflow-platform.md` (FR-001..FR-069)
- Canonical spec for workflow engine: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..FR-WF-013)
- Canonical spec for tiered merge pipeline: `Specifications/tiered-merge-pipeline.md` (FR-TMP-001..FR-TMP-010)
- Extension specs (Plans only): `Plans/image-upload/requirements.md`, `Plans/orchestrator-cycle-dashboard/requirements.md`, `Plans/duplicate-deprecated-status/requirements.md`
- Dependency plan delta: `Plans/dependency-linking/requirements.md` (has implementation delta table)
- portal/ tests: `portal/Backend/tests/` (15 files), `portal/Frontend/tests/` (16 files)
- Source/ tests: `Source/Backend/tests/` (13 files), `Source/Frontend/tests/` (12 files)
- FR ID collision: FR-070 defined in both `Plans/image-upload/requirements.md` AND `Plans/orchestrator-cycle-dashboard/requirements.md`

### Common Pattern Violations Found
- Empty `.catch(() => {})` in portal/Frontend components (architecture rule violation)
- `eslint-disable-next-line react-hooks/exhaustive-deps` in hooks (4 instances)
- Free-text `Verifies:` comments instead of `Verifies: FR-XXX` (DebugPortalPage.tsx, DependencySection.tsx uses FR-0001)
- Large service/component files exceeding 500 lines (5 files)
- No search.test.ts or teamDispatches.test.ts in portal/Backend/tests/
