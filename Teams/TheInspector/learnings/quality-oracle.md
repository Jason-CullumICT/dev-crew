# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## First Audit — 2026-06-11

### Project Layout Insight

This repo has **two separate applications** under different source trees:

| Dir | App | Spec document | FR prefix |
|-----|-----|---------------|-----------|
| `Source/` | Self-Judging Workflow Engine | `Plans/self-judging-workflow/requirements.md` | `FR-WF-*` |
| `portal/` | Dev Workflow Platform (full web app) | `Specifications/dev-workflow-platform.md` | `FR-001..069+` |
| `platform/` | Orchestrator infrastructure | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-*` |

**Key insight**: `python3 tools/traceability-enforcer.py` only checks the most-recently-modified plan file (Plans/self-judging-workflow/requirements.md). It does NOT check portal/ or all spec requirements. Always supplement with manual cross-checks using the spec files directly.

### Spec Scope Gap

`Specifications/dev-workflow-platform.md` only covers FR-001 through FR-069. Features added after the initial build (orchestrator-cycle-dashboard = FR-070..076, image-upload = FR-070..089) are defined only in `Plans/` — not in `Specifications/`. This creates:

1. A documentation gap in the authoritative spec file
2. **FR ID collision**: both `Plans/orchestrator-cycle-dashboard/requirements.md` and `Plans/image-upload/requirements.md` define FR-070 for different features. In code, FR-070 is implemented as `OrchestratorCyclesPage`.

### Useful Paths for Fast Future Audits

- Specs: `Specifications/dev-workflow-platform.md`, `Specifications/tiered-merge-pipeline.md`, `Specifications/workflow-engine.md`
- Portal shared types: `portal/Shared/types.ts`, `portal/Shared/api.ts`
- Source shared types: `Source/Shared/types/workflow.ts`
- Traceability enforcer: `python3 tools/traceability-enforcer.py` (only checks Plans/)
- Architecture violations to watch: `portal/Backend/src/routes/teamDispatches.ts` (direct DB in route)
- Open requirement: `portal/Shared/api.ts` lacks `blocked_by` on UpdateBugInput/UpdateFeatureRequestInput

### Open P2 Findings (as of 2026-06-11)

| ID | File | Issue |
|----|------|-------|
| QO-001 | `portal/Shared/api.ts:32,59` | FR-dependency-api-types: UpdateFeatureRequestInput and UpdateBugInput lack `blocked_by?: string[]`; DependencyPicker uses `as any` cast |
| QO-002 | `portal/Backend/src/routes/teamDispatches.ts` | Direct DB calls from route handler (no service layer); no `Verifies:` comment; no test coverage |
| QO-003 | `portal/Shared/api.ts` vs `portal/Backend/src/services/featureRequestService.ts:244` and `bugService.ts:184` | Duplicate type definitions with divergent content |
| QO-004 | `portal/Frontend/src/components/bugs/BugDetail.tsx:82`, `FeatureRequestDetail.tsx:80` | Silent `.catch(() => {})` swallowing errors on load |
| QO-005 | `portal/Frontend/src/pages/TeamsPage.tsx` | Untraced new functionality with no spec backing and no Verifies |

### Spec Coverage Trend

- Baseline (2026-06-11): 100% of FR-001..069 covered; 90% of FR-TMP-001..010 traced (TMP-008 functionally done but no Verifies comment)
