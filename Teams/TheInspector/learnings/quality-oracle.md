# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-07-03 — Full Audit

### Spec Coverage Summary

| Spec / Plan | Requirements | Status |
|-------------|-------------|--------|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013) | 13 | ✅ 100% — enforcer PASS |
| `Specifications/dev-workflow-platform.md` (FR-001–069, FR-dependency-*) | ~80 | ⚠️ Implemented in `portal/` (not `Source/`) — enforcer blind spot |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | ⚠️ Implemented in `platform/` — enforcer blind spot |

---

## Critical Learnings

### Codebase Structure (Read This First)
This repo has **three separate implementation zones**:
1. **`Source/`** — Self-Judging Workflow Engine (FR-WF-001–013). Simple in-memory work-item pipeline.
2. **`portal/`** — Full Dev Workflow Platform (FR-001–069, FR-dependency-*). SQLite + React, the main app.
3. **`platform/`** — Orchestrator infrastructure (FR-TMP-001–010). Docker, JS worker orchestrator.

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/` — it is **blind to portal/ and platform/**. Running it against the main spec always produces false failures.

### FR ID Namespace Collision
FR-070 through FR-073 are **assigned to two different features**:
- `Plans/image-upload/requirements.md` — image attachment types/storage (FR-070=ImageAttachment type)
- `Plans/orchestrator-cycle-dashboard/requirements.md` — frontend cycle dashboard (FR-070=OrchestratorCyclesPage)

This is a latent defect. Do not use FR-070+ without checking both plans first.

### FR-dependency-* Naming Schism
The same dependency-linking feature uses three incompatible ID conventions:
- **Spec** (`dev-workflow-platform.md`): `FR-dependency-api-client`, `FR-dependency-api-types`, etc.
- **Plan** (`dependency-linking/requirements.md`): `FR-dependency-types`, `FR-dependency-schema`, etc.
- **Portal code**: `FR-dependency-linking`, `FR-dependency-ready-check`, `FR-dependency-dispatch-gating`

No single convention matches the spec. Cross-reference via feature description, not ID.

### Known Open Items (as of 2026-07-03)
| ID | Location | Issue |
|----|----------|-------|
| FR-dependency-seed | `portal/Backend/src/database/` | `seed.ts` file missing entirely |
| FR-dependency-api-types | `portal/Shared/api.ts` | `UpdateBugInput`/`UpdateFeatureRequestInput` lack `blocked_by?: string[]` |
| Architecture | `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `intake.ts` | Routes import store directly (no service layer) |
| Duplicate tests | `Source/Frontend/tests/` | WorkItemDetailPage and WorkItemListPage tests exist in both `tests/` root and `tests/pages/` |

### Useful File Paths
- Traceability enforcer: `tools/traceability-enforcer.py`
- Portal Shared types: `portal/Shared/types.ts`, `portal/Shared/api.ts`
- Portal dependency service: `portal/Backend/src/services/dependencyService.ts`
- Tiered merge pipeline impl: `platform/orchestrator/lib/workflow-engine.js`
- Source shared types: `Source/Shared/types/workflow.ts`

### Spec Coverage Trend
- First audit run. Baseline established.
- Source/ (workflow engine) is at 100% traceability by plan.
- portal/ covers FR-001–095+ but enforcer cannot verify this automatically.
- FR-TMP-* mostly complete in platform/ with 3 requirements lacking explicit Verifies markers in scanned dirs.
