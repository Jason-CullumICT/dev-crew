# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## 2026-08-09 — Initial Full Audit

### Architecture Insight: Two Distinct Applications in One Repo

This repo contains **two separate apps** with different spec lineages:

| App | Directory | Spec | FR ID Scheme |
|-----|-----------|------|-------------|
| Self-Judging Workflow Engine | `Source/` | `Specifications/workflow-engine.md` | FR-WF-001 … FR-WF-013 |
| Dev-Workflow Platform | `portal/` | `Specifications/dev-workflow-platform.md` | FR-001 … FR-095, FR-DUP-*, FR-dependency-* |
| Tiered Merge Pipeline | `platform/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 … FR-TMP-010 |

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/` — it is **completely blind** to `portal/` (the primary implementation). This was the P1 finding.

### Critical Tool Gap

`tools/traceability-enforcer.py` line 70 hardcodes `source_dirs = ["Source", "E2E"]`. To be correct it must include `"portal"`. Until fixed, every enforcer run against dev-workflow-platform plans will show false FAILURE results (but the plan for `self-judging-workflow` correctly passes because that code IS in `Source/`).

### FR-Dependency ID Mismatch (P2 — Still Open)

The `Specifications/dev-workflow-platform.md` defines granular IDs like:
- `FR-dependency-schema`, `FR-dependency-service`, `FR-dependency-api-client`, etc.

The code in `portal/` uses different IDs:
- `FR-dependency-linking`, `FR-dependency-dispatch-gating`, `FR-dependency-ready-check`, `FR-dependency-cycle-detection`

These don't match spec-defined IDs. The dependency plan (`Plans/dependency-linking/requirements.md`) uses the granular IDs from spec, but implementation uses the broader aliases.

### Known Open Work Items (from dependency-linking plan delta table)

As of this audit:
1. `FR-dependency-api-types` — `blocked_by?: string[]` missing from `UpdateBugInput`/`UpdateFeatureRequestInput` in `portal/Shared/api.ts`
2. `FR-dependency-seed` — `portal/Backend/src/database/seed.ts` does not exist
3. `FR-dependency-frontend-tests` — `DependencySection.test.tsx` and `BlockedBadge.test.tsx` do not exist in `portal/Frontend/tests/`

### Useful File Paths

- Traceability enforcer: `tools/traceability-enforcer.py` (line 70 = hardcoded scan dirs)
- Spec dir: `Specifications/` (3 files)
- Portal backend routes: `portal/Backend/src/routes/` (bugs, cycles, featureRequests, pipelines, search, teamDispatches)
- Portal Shared types: `portal/Shared/types.ts`, `portal/Shared/api.ts`
- TeamDispatches route (architecture violation): `portal/Backend/src/routes/teamDispatches.ts`
- RepoSelector (swallowed error): `portal/Frontend/src/components/common/RepoSelector.tsx`

### Coverage Trend (Baseline)

- Source/ (workflow engine): 93% source files have Verifies, 96% test files
- portal/ (dev-workflow-platform): high coverage (101 unique FR IDs referenced)
- Spec FR coverage: FR-WF-* 100%, FR-001…FR-069 100% in portal, FR-TMP-* 90% (FR-TMP-008 missing), FR-dependency-* granular IDs = 0% match (different naming scheme used)

### Pattern: teamDispatches.ts is an Unlinked, Architecture-Violating Route

`portal/Backend/src/routes/teamDispatches.ts`:
- Has no `// Verifies:` traceability comment
- Calls `getDb()` directly in route handler (bypasses service layer)
- No spec section covers the team dispatch history feature

### Pattern: Inspector Config Out of Date

`Teams/TheInspector/inspector.config.yml` lists `source.dirs: ["Source/"]` and `source.test_dirs: ["Source/Backend/tests/", "Source/Frontend/tests/"]`. It omits `portal/` entirely. Should add `portal/Backend/` and `portal/Frontend/` to both directives.
