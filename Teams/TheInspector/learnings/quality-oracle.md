# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-07-11 — First Full Audit

#### Project Layout (Critical for Future Audits)

- **Source/** implements the **self-judging workflow engine** (FR-WF-001..FR-WF-013 + FR-dependency-*)  
  Spec lives in: `Specifications/workflow-engine.md` and `Plans/self-judging-workflow/requirements.md`

- **portal/** implements the **dev-workflow-platform** (FR-001..FR-095 + FR-dependency-*)  
  Spec lives in: `Specifications/dev-workflow-platform.md`, `Plans/image-upload/`, `Plans/dependency-linking/`, `Plans/dev-cycle-traceability/`, etc.  
  Tests live in: `portal/Backend/tests/` and `portal/Frontend/tests/`

- **platform/** implements the **tiered merge pipeline orchestrator** (FR-TMP-001..FR-TMP-010)  
  Spec lives in: `Specifications/tiered-merge-pipeline.md`

#### Traceability Enforcer Scope

`tools/traceability-enforcer.py` only checks the **most recently modified** requirements.md in `Plans/`.  
It scans `Source/` and `E2E/` only — **does NOT scan `portal/` or `platform/`**.  
This means only FR-WF-* is automatically verified; all other spec areas require manual audit.

#### Spec Coverage Trend

- FR-WF-001..FR-WF-013 (Source/): **100%** (enforcer confirms)
- FR-001..FR-069 (portal/): **100%**
- FR-070..FR-095 image upload (portal/): **100%**
- FR-TMP-001..FR-TMP-010 (platform/): **90%** — FR-TMP-008 not traced in Dockerfile.worker
- FR-dependency-* (portal/ + Source/):
  - Source/: **100%** (all FRs use correct IDs)
  - portal/: Implementation present but traceability comments use non-spec IDs (FR-dependency-linking, FR-dependency-ready-check, etc.) instead of spec IDs (FR-dependency-types, FR-dependency-api-types, etc.)

#### Known Open Items (From Plans/dependency-linking/requirements.md delta)

| FR | Status | Details |
|----|--------|---------|
| FR-dependency-api-types | ❌ STILL OPEN | `UpdateBugInput`/`UpdateFeatureRequestInput` in portal/Shared/api.ts lack `blocked_by?: string[]`; DependencyPicker.tsx uses `as any` cast at lines 291+293 |
| FR-dependency-seed | ❌ STILL OPEN | `portal/Backend/src/database/seed.ts` does not exist |
| FR-dependency-frontend-tests | ❌ STILL OPEN | `DependencySection.test.tsx` and `BlockedBadge.test.tsx` missing from portal/Frontend/tests/ |

#### Architecture Violations Found

- `portal/Backend/src/routes/teamDispatches.ts` — direct SQLite queries (`db.prepare(...).all()`, `.run()`) in route handler, bypassing service layer. Also has no `// Verifies:` comment.

#### Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` in:
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`

#### Portal Frontend Untested Components (15 total)

SummaryWidgets.tsx, ActivityFeed.tsx, ApprovalQueue.tsx, PhaseStepper.tsx, TicketBoard.tsx, DependencySection.tsx, BlockedBadge.tsx, RepoSelector.tsx, VoteResults.tsx, FeatureRequestList.tsx, RunDetailRow.tsx, RunsTab.tsx, LearningsList.tsx, BugList.tsx, TeamsPage.tsx

#### Useful File Paths for Future Audits

| File | Why Useful |
|------|------------|
| Plans/dependency-linking/requirements.md | Documents exact implementation delta for dependency features |
| portal/Backend/src/routes/teamDispatches.ts | Only route handler with direct DB calls (architecture violation) |
| portal/Backend/src/metrics.ts | Uses FR-dependency-linking for what spec calls FR-dependency-metrics |
| portal/Backend/src/routes/search.ts | Uses FR-dependency-linking for what spec calls FR-dependency-search |
| platform/Dockerfile.worker | Implements FR-TMP-008 but has no Verifies comment |
