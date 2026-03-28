# QA Report: Update Internal Path and Repo References for dev-crew

**Cycle:** run-1774659927912-8dd3ac77
**Role:** qa-review-and-tests
**Team:** TheFixer
**Date:** 2026-03-28 (v2 — independent re-verification)

RISK_LEVEL: medium

Rationale: Cross-cutting reference update across 8+ files in platform/, portal/, CLAUDE.md, tools/, Teams/. No schema changes or new endpoints, but touches config, scripts, and workflow engine.

---

## Summary

All internal references to the old repo names (`claude-ai-OS`, `container-test`, `Work-backlog`) have been correctly updated to `dev-crew` across the codebase. Template auto-apply logic with git commit/push was added to `setup-workspace.sh`. Config defaults updated.

## Verification Results

### 1. Old Reference Scan

Searched `platform/`, `Source/`, `portal/`, `CLAUDE.md`, `tools/`, `Teams/`, `Plans/` for `claude-ai-OS`, `container-test`, and `Work-backlog`.

**Results:**
- **portal/**: No old references found - PASS
- **Source/**: No old references found - PASS
- **tools/**: No old references found - PASS
- **Teams/**: No old references found - PASS
- **CLAUDE.md**: Updated to `dev-crew` - PASS
- **Plans/orchestrator-cycle-dashboard/design.md**: Updated to `dev-crew orchestrator` - PASS
- **Plans/dev-crew-path-references/dispatch-plan.md**: Contains OLD/NEW comparison text (expected - this is the fix plan) - INFO
- **docs/superpowers/plans/2026-03-28-dev-crew-repo-merge.md**: Historical migration doc, explicitly excluded - INFO

**Single intentional backward-compat reference:**
- `workflow-engine.js:1436` — `run.repo.includes("container-test") || run.repo.includes("dev-crew")` — Intentional backward compatibility for in-flight runs - PASS

### 2. File-by-File Review

| File | Change | Status |
|------|--------|--------|
| `platform/orchestrator/server.js:2` | Comment: `dev-crew Orchestrator` | PASS |
| `platform/orchestrator/server.js:688` | Repo list: single `dev-crew` entry | PASS |
| `platform/orchestrator/server.js:904` | HTML title: `dev-crew Pipeline` | PASS |
| `platform/orchestrator/server.js:941` | H1 heading: `dev-crew Pipeline` | PASS |
| `platform/orchestrator/server.js:985` | Startup log: `dev-crew orchestrator` | PASS |
| `platform/orchestrator/lib/workflow-engine.js:781` | Git config: `dev-crew` + `pipeline@dev-crew.local` | PASS |
| `platform/orchestrator/lib/workflow-engine.js:1436` | Portal check: backward compat `container-test` + `dev-crew` | PASS |
| `platform/orchestrator/lib/workflow-engine.js:1440` | Git diff scope: `Source/ portal/` | PASS |
| `platform/orchestrator/lib/container-manager.js:118-119` | `GIT_AUTHOR_NAME=dev-crew`, `GIT_AUTHOR_EMAIL=pipeline@dev-crew.local` | PASS |
| `platform/orchestrator/lib/container-manager.js:238-239` | Same for `spawnWorkerFromVolume` | PASS |
| `platform/orchestrator/lib/config.js:30` | `dev-crew-worker:latest` | PASS |
| `platform/scripts/setup-cycle-workspace.sh:12-13` | Git identity defaults: `dev-crew` | PASS |
| `platform/scripts/setup-cycle-workspace.sh:38` | Comment updated | PASS |
| `platform/scripts/setup-cycle-workspace.sh:41` | Echo message updated | PASS |
| `platform/scripts/setup-cycle-workspace.sh:63` | Commit message: `scaffold agent team structure from dev-crew templates` | PASS |
| `platform/scripts/setup-workspace.sh:54` | Comment updated | PASS |
| `platform/scripts/setup-workspace.sh:57` | Echo message updated | PASS |
| `platform/scripts/setup-workspace.sh:104-111` | Git add/commit/push after template copy — added correctly | PASS |
| `CLAUDE.md:6` | `dev-crew` description | PASS |
| `Plans/orchestrator-cycle-dashboard/design.md:5` | `dev-crew orchestrator` | PASS |

### 3. Template Auto-Apply Logic (setup-workspace.sh)

The dispatch plan required: if `/workspace/Teams/` does not exist, copy templates, git add, commit with message "chore: scaffold agent team structure from dev-crew templates", and push. If Teams/ exists, skip.

**Implementation review:**
- Lines 56-116: Correctly checks `! -d "$WORKSPACE/Teams"` before bootstrapping
- Lines 104-111: After `echo "Framework bootstrapped"`, correctly runs `git add -A`, `git commit`, `git push` with error handling
- Commit message matches spec: `chore: scaffold agent team structure from dev-crew templates`
- Push failure is non-fatal (warning printed, continues) - good resilience

**Severity: PASS** - All requirements met.

### 4. Config.js Default Repo Reference

- `config.js:30`: `workerImage` default changed from `claude-ai-os-worker:latest` to `dev-crew-worker:latest` - PASS
- No other config values reference old repo names - PASS

### 5. Syntax Validation

| File | Check | Result |
|------|-------|--------|
| `platform/orchestrator/server.js` | `node -c` | PASS |
| `platform/orchestrator/lib/config.js` | `node -c` | PASS |
| `platform/orchestrator/lib/workflow-engine.js` | `node -c` | PASS |
| `platform/orchestrator/lib/container-manager.js` | `node -c` | PASS |
| `platform/scripts/setup-workspace.sh` | `bash -n` | PASS |
| `platform/scripts/setup-cycle-workspace.sh` | `bash -n` | PASS |

### 6. Traceability Enforcer

```
TRACEABILITY PASSED: All requirements have implementation references.
```

### 7. Architecture Compliance

- No direct DB calls from route handlers: N/A (infrastructure changes only)
- No hardcoded secrets: PASS (all secrets via env vars)
- No framework imports in business logic: N/A
- Observability: existing structured logging maintained, no `console.log` regressions

## Findings

| # | Severity | Description | Status |
|---|----------|-------------|--------|
| 1 | INFO | `container-test` reference retained in `workflow-engine.js:1436` for backward compat | Accepted (documented in dispatch plan) |
| 2 | INFO | Historical docs in `docs/` correctly excluded from updates | N/A |
| 3 | INFO | `Plans/dev-crew-path-references/dispatch-plan.md` contains OLD/NEW comparison text with old names | Expected (fix plan documentation) |

## E2E Tests

Written to `Source/E2E/tests/cycle-run-1774659927912-8dd3ac77/`:

1. **path-references.spec.ts** — Dashboard loads, navigates to cycles page, verifies body text has no old repo names, checks for zero console errors. Uses relative URLs.
2. **path-references-security.spec.ts** — Checks work-items page, inspects full HTML source (not just visible text) for old repo names, tests cross-page navigation. Uses relative URLs.
3. **path-references-config.spec.ts** (NEW) — Verifies orchestrator health endpoint, pipeline dashboard title/heading contain "dev-crew", and API runs endpoint returns valid JSON without old repo names.

All tests use relative URLs as required by the pipeline Playwright config (baseURL provided externally).

## Independent Re-Verification (2026-03-28)

Re-ran full grep scan of `platform/`, `Source/`, `portal/`, `CLAUDE.md`, `tools/`, `Teams/` for all three old repo names:
- `claude-ai-OS`: **0 matches** in active code — PASS
- `Work-backlog`: **0 matches** in active code — PASS
- `container-test`: **1 match** at `workflow-engine.js:1436` (intentional backwards-compat) — PASS
- `portal/Backend/src/`: **0 matches** — PASS
- `portal/Frontend/src/`: **0 matches** — PASS
- `container-manager.js`: **0 matches** — PASS
- `server.js`: **0 matches** — PASS

Both `setup-workspace.sh` and `setup-cycle-workspace.sh` have complete template auto-apply logic with Teams/ existence check, template copy, git add/commit/push, and error handling.

## Verdict

**PASS** — All old repo references have been correctly updated to `dev-crew`. Template auto-apply logic is correctly implemented in both setup scripts. Config defaults updated. No regressions found. All syntax checks pass. Zero new test failures introduced.
