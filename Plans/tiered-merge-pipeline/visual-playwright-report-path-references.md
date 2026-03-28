# Visual/Playwright QA Report — dev-crew Path References Update

**Cycle:** run-1774659927912-8dd3ac77
**Role:** visual-playwright
**Team:** TheFixer
**Date:** 2026-03-28

---

## RISK_LEVEL: medium

**Rationale:** Infrastructure renaming across ~10 files, no schema changes, no new pages/endpoints. Touches platform scripts, orchestrator config, server branding, and CLAUDE.md.

---

## Summary

All internal references to the old repo names (`claude-ai-OS`, `container-test`, `Work-backlog`) have been updated to `dev-crew` across the codebase. The implementation matches the dispatch plan exactly.

## Verification Results

### 1. Reference Scan (PASS)

Searched all files in `platform/`, `Source/`, `portal/`, `CLAUDE.md`, `tools/`, `Teams/`, and `Plans/` for old repo references:

- **`claude-ai-OS`**: Zero matches in active code. Only found in `Plans/dev-crew-path-references/dispatch-plan.md` (the fix plan itself, documenting OLD/NEW values — expected).
- **`Work-backlog`**: Zero matches in active code. Only in the dispatch plan.
- **`container-test`**: One match at `platform/orchestrator/lib/workflow-engine.js:1436` — intentionally kept for backwards compatibility with in-flight runs. The line is: `const isPortalRepo = run.repo.includes("container-test") || run.repo.includes("dev-crew");`

Historical documentation files (`docs/superpowers/`) are excluded per the dispatch plan.

### 2. Syntax Checks (ALL PASS)

| File | Status |
|------|--------|
| `platform/orchestrator/server.js` | PASS |
| `platform/orchestrator/lib/config.js` | PASS |
| `platform/orchestrator/lib/workflow-engine.js` | PASS |
| `platform/orchestrator/lib/container-manager.js` | PASS |
| `platform/scripts/setup-workspace.sh` | PASS |
| `platform/scripts/setup-cycle-workspace.sh` | PASS |

### 3. Key Changes Verified

| File | Change | Status |
|------|--------|--------|
| `server.js:2` | Comment: `dev-crew Orchestrator` | PASS |
| `server.js:688` | Repo list: single `dev-crew` entry | PASS |
| `server.js:904` | HTML title: `dev-crew Pipeline` | PASS |
| `server.js:941` | H1 heading: `dev-crew Pipeline` | PASS |
| `server.js:985` | Startup log: `dev-crew orchestrator` | PASS |
| `container-manager.js:118` | `GIT_AUTHOR_NAME=dev-crew` | PASS |
| `container-manager.js:119` | `GIT_AUTHOR_EMAIL=pipeline@dev-crew.local` | PASS |
| `config.js:30` | `workerImage: "dev-crew-worker:latest"` | PASS |
| `setup-cycle-workspace.sh:12` | Git user.name default: `dev-crew` | PASS |
| `setup-cycle-workspace.sh:13` | Git user.email default: `pipeline@dev-crew.local` | PASS |
| `setup-cycle-workspace.sh:38` | Comment updated | PASS |
| `setup-cycle-workspace.sh:41` | Echo updated | PASS |
| `setup-cycle-workspace.sh:63` | Commit message updated | PASS |
| `setup-workspace.sh:54` | Comment: `dev-crew framework` | PASS |
| `setup-workspace.sh:57` | Echo: `dev-crew framework` | PASS |
| `setup-workspace.sh:107` | Git add/commit/push scaffold | PASS |
| `CLAUDE.md:6` | Description: `dev-crew — AI-powered development platform` | PASS |
| `design.md:5` | `dev-crew orchestrator` | PASS |
| `workflow-engine.js:1436` | Portal check includes `dev-crew` | PASS |

### 4. Template Auto-Apply Logic (setup-workspace.sh)

The `setup-workspace.sh` already has the template auto-apply logic at lines 104-111:
- Checks if `Teams/` exists (line 56)
- If not, copies templates from `/app/templates/` (lines 62-100)
- Runs `git add -A`, `git commit`, `git push` (lines 106-111)
- Commit message: `"chore: scaffold agent team structure from dev-crew templates"`
- Push failure is non-fatal (warning + continue)

This matches the task requirements.

## E2E Tests

E2E test file exists at `Source/E2E/tests/cycle-run-1774659927912-8dd3ac77/path-references.spec.ts`:

- Uses relative URLs (compatible with Playwright config baseURL)
- Tests main page renders without errors
- Navigates to cycles page if available
- Verifies body text does NOT contain `claude-ai-OS` or `Work-backlog`
- Checks for zero console errors

## Findings

| # | Severity | Description |
|---|----------|-------------|
| 1 | INFO | `container-test` backwards-compat check in workflow-engine.js:1436 is intentional per dispatch plan |
| 2 | INFO | Historical docs in `docs/superpowers/` still reference old repo names — excluded from scope per dispatch plan |
| 3 | INFO | E2E console error listener is correctly set up before `page.goto('/')` — no missed events. |

## Conclusion

**PASS** — All references updated correctly. No regressions. All syntax checks pass. E2E tests are in place.
