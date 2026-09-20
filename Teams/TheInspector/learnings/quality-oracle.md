# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-09-20

### Spec Coverage Summary

| Spec | FRs Defined | FRs Traced | Coverage |
|------|------------|-----------|----------|
| `workflow-engine.md` (FR-WF-001–013) | 13 | 13 | **100%** |
| `tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 10 (in `platform/`) | 100% (not enforced by tool) |
| `dev-workflow-platform.md` dependency FRs | 16 | 13 | ~81% |

### Codebase Structure (Two Codebases)

This repo has TWO distinct application codebases:
- **`Source/`** — Self-Judging Workflow Engine (Express + React). FR-WF-XXX IDs.
- **`portal/`** — Dev Workflow Platform (separate Express + React). FR-001 to FR-069 + FR-dependency-* IDs.
- **`platform/`** — Orchestrator infrastructure. FR-TMP-XXX implemented here.

The traceability enforcer (`python3 tools/traceability-enforcer.py`) auto-detects the most recently modified `Plans/*/requirements.md`. As of this audit it picks `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013) and PASSES.

To also check the portal and tiered-merge-pipeline plans, run the enforcer with explicit `--file` args.

### Open Issues (Carry Forward)

| ID | Severity | Description | File |
|----|----------|-------------|------|
| QO-001 | P2 | Architecture: routes directly call workItemStore (bypass service layer) | `Source/Backend/src/routes/{workItems,workflow,intake}.ts` |
| QO-002 | P2 | FR-dependency-api-types open: `blocked_by` missing from UpdateBugInput/UpdateFeatureRequestInput; `as any` casts at line 291/293 | `portal/Shared/api.ts`, `portal/Frontend/src/components/shared/DependencyPicker.tsx` |
| QO-003 | P2 | FR-dependency-seed open: no `seed.ts` in portal/Backend/src/database/ | `portal/Backend/src/database/` |
| QO-004 | P2 | FR-dependency-frontend-tests open: DependencySection.test.tsx and BlockedBadge.test.tsx missing | `portal/Frontend/tests/` |
| QO-005 | P3 | Tiered merge pipeline FRs (FR-TMP-*) not covered by automated enforcer | `platform/orchestrator/lib/` |
| QO-006 | P4 | eslint-disable-next-line react-hooks/exhaustive-deps in production hook | `Source/Frontend/src/hooks/useWorkItems.ts:63` |

### Useful Fast-Access Paths

| Purpose | Path |
|---------|------|
| Source WF requirements | `Plans/self-judging-workflow/requirements.md` |
| Portal dependency delta | `Plans/dependency-linking/requirements.md` (has implementation delta table) |
| Tiered merge FRs | `Specifications/tiered-merge-pipeline.md` |
| TMP tests | `platform/orchestrator/lib/workflow-engine.test.js` |
| Portal DB schemas | `portal/Backend/src/database/schema.ts` |
| Portal Shared API types | `portal/Shared/api.ts` |

### Pattern Trends

- **Traceability discipline good in Source/**: All 13 FR-WF-* requirements are traced and enforcer passes.
- **Dependency FRs incomplete in portal/**: 3 of 16 open (api-types, seed, frontend-tests).
- **Architecture shortcut**: The "service layer" pattern is not followed in Source/ routes — they call the store directly. This was accepted for the in-memory MVP but should be called out as tech debt.
- **No console.log violations** in production source files.
- **No hardcoded secrets** found.
- **No empty catch blocks** found.
- **No files > 500 lines** in Source/ (largest: 374 lines).
