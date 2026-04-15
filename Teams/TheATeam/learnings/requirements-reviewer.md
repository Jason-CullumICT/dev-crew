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

## 2026-04-15 — Playwright Worker Image Feature (pipeline-optimisations)

### platform/ Is Solo-Session Only
- Any FR touching `platform/` cannot be assigned to pipeline coders (backend-coder, frontend-coder).
- In the scoping plan, flag these as "solo session" work. Still assign weight (S/M/L/XL) for planning.
- This is enforced by CLAUDE.md module ownership table.

### Always Check Spec Before Declaring Gap
- `Specifications/tiered-merge-pipeline.md` FR-TMP-003 and FR-TMP-008 explicitly specified the
  per-cycle chromium install behavior (`PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright`).
- New FRs that change infrastructure behavior require a spec amendment FR — not just implementation FRs.
- Pattern: when new FRs contradict existing spec FRs, add a spec-amendment FR (e.g., FR-PW-003).

### Partial vs. Missing Implementation
- `Dockerfile.worker` already had `playwright install chromium` but WITHOUT `ENV PLAYWRIGHT_BROWSERS_PATH`,
  so the binary landed at `/root/.cache/ms-playwright` — an implicit default, not a stable known path.
- The engine then overrode the path to `/workspace/.playwright` causing the reinstall.
- Root cause: path mismatch between build-time install (implicit) and runtime override (explicit).
- Fix pattern: make build-time path explicit via `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`, then
  align all runtime references to the same path.

### grep for PLAYWRIGHT_BROWSERS_PATH Is the Key Signal
- When auditing Playwright pre-install features, grep for `PLAYWRIGHT_BROWSERS_PATH` in both
  the Dockerfile and workflow-engine.js. Mismatched paths = root cause of per-cycle reinstall.

### Dockerfile Changes Require Image Rebuild
- When FRs touch Dockerfile.worker, acceptance criteria MUST include a docker build + run verification step.
- Coders/solo-sessions should test with `docker build -f platform/Dockerfile.worker -t test-img .` and
  `docker run --rm test-img ls /ms-playwright/chromium-*`.
