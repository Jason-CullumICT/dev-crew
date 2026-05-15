# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-05-15 — Full Spec-Drift & Pattern Audit

### Project Layout (Critical — Read First)

This repo has **three separate implementation surfaces**, each with its own tests and traceability:

| Surface | Spec | FRs |
|---------|------|-----|
| `Source/` (workflow engine SPA) | `Specifications/workflow-engine.md`, `Plans/self-judging-workflow/requirements.md` | FR-WF-001 to FR-WF-013 + FR-dependency-* |
| `portal/` (dev-workflow-platform app) | `Specifications/dev-workflow-platform.md`, `Plans/dev-workflow-platform/requirements.md` | FR-001 to FR-069 + FR-dependency-* |
| `platform/orchestrator/` (JS orchestrator) | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 to FR-TMP-010 |

**The traceability enforcer (`python3 tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`** — it will always report false failures for FR-001 to FR-069 (portal) and FR-TMP-* (platform). This is a known tool gap, not real drift.

### Spec Coverage Trend (Baseline — First Run)

| Spec | FRs Total | Covered | Coverage |
|------|-----------|---------|----------|
| dev-workflow-platform.md (FR-001 to FR-069) | 69 | 69 | 100% |
| workflow-engine.md (FR-WF-001 to FR-WF-013) | 13 | 13 | 100% |
| tiered-merge-pipeline.md (FR-TMP-001 to FR-TMP-010) | 10 | 9 | 90% |
| dependency-linking requirements | 16 | 13 | 81% |

**Overall: 104/108 FRs covered = 96.3%**

### Open P2 Findings (Require Fix)

1. **QO-001 — Traceability enforcer doesn't scan portal/ or platform/** (P2, tooling)
   - `spec-drift-report.json` shows 0% for FR-TMP-* and portal FRs
   - The enforcer `source_dirs` config needs `portal/` and `platform/` added

2. **QO-002 — FR-dependency-api-types STILL OPEN** (P2)
   - `portal/Shared/api.ts`: `UpdateFeatureRequestInput` and `UpdateBugInput` lack `blocked_by?: string[]`
   - `portal/Frontend/src/components/shared/DependencyPicker.tsx` lines 291, 293 use `as any` casts

3. **QO-003 — FR-dependency-seed STILL OPEN** (P2)
   - No `seed.ts` file in `portal/Backend/src/database/`
   - Fresh installs won't have the 8 required dependency seed relationships

4. **QO-004 — Architecture violation: direct DB in route** (P2)
   - `portal/Backend/src/routes/teamDispatches.ts` calls `db.prepare()` directly
   - No service abstraction for team_dispatches entity

### Open P3 Findings

5. **QO-005 — FR-dependency-frontend-tests STILL OPEN** (P3)
   - `portal/Frontend/tests/DependencySection.test.tsx` — MISSING
   - `portal/Frontend/tests/BlockedBadge.test.tsx` — MISSING
   - (Note: `Source/Frontend/tests/components/DependencySection.test.tsx` exists but is for the workflow-engine app, not portal)

6. **QO-006 — FR-TMP-008 no traceability** (P3)
   - FR-TMP-008 (Dockerfile.worker prerequisites) has no `// Verifies: FR-TMP-008` comment anywhere

7. **QO-007 — Unspecified features in portal (scope creep)** (P3)
   - `teamDispatches.ts`, `TeamsPage.tsx`, `RepoSelector.tsx` — no FR in any spec

### Useful Fast-Navigation Paths

- Portal Shared API types: `portal/Shared/api.ts` — UpdateBugInput at line 59
- Portal DependencyPicker: `portal/Frontend/src/components/shared/DependencyPicker.tsx` — as-any at lines 291/293
- Architecture rule violator: `portal/Backend/src/routes/teamDispatches.ts`
- Traceability enforcer: `tools/traceability-enforcer.py` — scans `["Source", "E2E"]` only
- Portal test dir: `portal/Frontend/tests/` — missing DependencySection + BlockedBadge

### Common Pattern Violations Found

- `eslint-disable` for `react-hooks/exhaustive-deps` in: `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`, `portal/Frontend/src/hooks/useApi.ts:35`
- Direct DB access bypassing service layer in `teamDispatches.ts`

### Architecture Rule Quick-Check Status

| Rule | Status |
|------|--------|
| No console.log in production | ✅ Clean |
| No direct DB from routes | ❌ teamDispatches.ts |
| Shared types single source | ✅ Clean |
| No hardcoded secrets | ✅ Clean |
| No skipped tests | ✅ Clean |
| All list endpoints return {data: T[]} | ✅ Clean (spot checked) |
| Every FR needs Verifies: comment | ✅ 96.3% |
| Never swallow errors silently | ✅ Clean |
