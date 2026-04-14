# Requirements Reviewer Learnings

## 2026-04-14 — Dependency Tracking Feature

### Project Layout (Critical)
- **portal/** is a separate codebase from **Source/**. The portal has its own `portal/Shared/types.ts`, `portal/Backend/`, and `portal/Frontend/`. Never confuse with `Source/Backend/`, `Source/Frontend/`, `Source/Shared/`.
- **Traceability enforcer** only scans `Source/` and `E2E/` — it does NOT enforce portal/ code. Portal FRs can use descriptive IDs like `FR-dependency-linking` (the enforcer accepts `FR-[A-Z0-9-]+`).
- The enforcer auto-selects the most recently modified `requirements.md` in Plans/. Always create a `requirements.md` in the Plan directory (not just a `dispatch-plan.md`) so the enforcer can target it.

### Implementation Delta Pattern
- Always check the existing codebase before decomposing FRs. Run targeted greps across portal/, Source/, Specifications/ to assess what's already built.
- For this feature, 13 of 16 FRs were already implemented. The 3 gaps were: `portal/Shared/api.ts` missing `blocked_by` on update types, missing seed data, missing DependencySection/BlockedBadge test files.
- Use `as any` cast in frontend code as a signal that the shared type definitions are incomplete.

### FR ID Convention
- Spec uses numeric IDs: FR-001 through FR-069 (dev-workflow-platform FRs), continuing from FR-070+.
- Portal dependency FRs use descriptive IDs: `FR-dependency-linking`, `FR-dependency-schema`, etc. These match existing `// Verifies:` comments in portal/ code.
- When creating requirements.md for portal features, use descriptive ID style to match what developers already put in code comments.

### Dispatch Plan vs Requirements
- `Plans/<feature>/dispatch-plan.md` = implementation instructions for coders (files to edit, code to write).
- `Plans/<feature>/requirements.md` = canonical FR list for traceability enforcer and pipeline tracking.
- Both files should exist in the same plan directory. This review created requirements.md from the existing dispatch-plan.md.

### Pipeline State
- The `tools/pipeline-update.sh` script requires a `--run` that matches an existing run ID in `pipeline-state-TheATeam.json`. The run must be created first. When a run already exists (from a prior pipeline-update.sh call), use that run ID.
- Check `tools/pipeline-state-TheATeam.json` to find the current run ID before calling pipeline-update.sh.

### Scoping Weights
- S = 1 pt (< 1 hour, single file or small change)
- M = 2 pts (1-3 hours, multi-file or non-trivial logic)
- L = 4 pts (3-8 hours, new service/component with tests)
- XL = 8 pts (full-day, complex multi-system change)

## 2026-04-14 — Pre-Flight Validation Feature

### Platform Architecture (Critical)
- `platform/orchestrator/server.js` contains `POST /api/work` — the work submission endpoint. This is NOT in `Source/Backend/` and cannot be touched by pipeline agents (backend-coder). Changes to `platform/` require solo-session execution.
- `platform/orchestrator/lib/` already has `validateOrCreateRepo()` in `server.js` BUT: (1) it has side effects (creates repos), (2) it's only called from `/api/repos/validate`, NOT from `POST /api/work`. This is the root cause of the 5-minute-deep failure bug.
- `platform/orchestrator/lib/workflow-engine.test.js` uses `node:test` + `node:assert` — platform tests use Node's built-in runner, NOT vitest. Write new platform tests with the same pattern.
- The traceability enforcer does NOT scan `platform/` — no `// Verifies: FR-XXX` enforcement there, but add them anyway for human traceability.

### Token Architecture
- `config.githubToken` (from `GITHUB_TOKEN` env) is the ONLY GitHub token in the system. The per-request `claudeSessionToken` is for Anthropic API — NOT for GitHub.
- Pre-flight always uses `config.githubToken`, regardless of what the request sends.

### Backwards Compatibility Pattern
- When `resolvedRepo` is empty (no per-request repo + no config.githubRepo), skip pre-flight validation entirely. This preserves existing behaviour for installations without configured repos.

### Error Mapping for GitHub API
- GitHub 401 → return 401 ("token invalid")
- GitHub 403 → return 401 ("token present but lacks access")  
- GitHub 404 on repo → return 404 ("repo not found")
- GitHub 404 on branch → return 404 ("branch not found")

### Spec Gap Pattern
- If a spec doesn't cover the feature being implemented, flag a "Spec gap" in requirements.md and recommend adding a spec section. For this feature: `Specifications/workflow-engine.md` needs a "Pre-flight Validation" section.

### FR ID for Platform+Portal Features
- Use descriptive IDs `FR-preflight-*` (not numeric) for platform/portal features, matching the `FR-dependency-*` pattern established earlier.
