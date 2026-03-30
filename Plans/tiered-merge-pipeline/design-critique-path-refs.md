# Design Critique: Update Internal Path and Repo References for dev-crew

**Reviewer:** design (TheFixer)
**Date:** 2026-03-28
**Task:** Update all internal path and repo references from claude-ai-OS / container-test / Work-backlog to dev-crew
**Dispatch plan:** Plans/dev-crew-path-references/dispatch-plan.md
**Spec:** docs/superpowers/plans/2026-03-28-dev-crew-repo-merge.md (Task 7)

---

## RISK_LEVEL: medium

Rationale: Infrastructure renaming across ~10 files, no schema changes, no new features, no auth/security changes. Pure string replacement with one logic addition (template auto-apply commit+push in setup-workspace.sh). Affects platform/ config, scripts, orchestrator server — cross-cutting but low-risk per file.

---

## Summary

The implementation correctly updates all three old repo names (`claude-ai-OS`, `container-test`, `Work-backlog`) to `dev-crew` across active code in platform/, Source/, portal/, CLAUDE.md, tools/, and Teams/. Template auto-apply logic is present in both `setup-workspace.sh` and `setup-cycle-workspace.sh`. Config defaults are clean. One backwards-compat `container-test` reference is intentionally retained.

**Two MEDIUM issues remain** that should be addressed before merge.

---

## Verification Results

### Reference Search (platform/, Source/, portal/, CLAUDE.md, tools/, Teams/)

Searched all active code directories for the three old repo names:

| Old Name | Active Code Hits | Status |
|----------|-----------------|--------|
| `claude-ai-OS` | 0 | PASS |
| `Work-backlog` | 0 | PASS |
| `container-test` | 1 (`workflow-engine.js:1436`) | PASS — intentional backwards compat |

Remaining references exist only in:
- `docs/superpowers/` — historical migration documentation (correct, not modified)
- `Plans/dev-crew-path-references/dispatch-plan.md` — the fix plan itself (documents OLD/NEW values)
- `Plans/tiered-merge-pipeline/` — QA/security/traceability reports referencing the old names in context
- `Source/E2E/tests/` — test assertions verifying old names do NOT appear in UI output

All of the above are expected and correct.

### Syntax Verification

- `platform/orchestrator/server.js` — Line 2: "dev-crew Orchestrator" (correct)
- `platform/orchestrator/lib/config.js` — `githubRepo: ""`, `workerImage: "dev-crew-worker:latest"` (correct)
- `platform/orchestrator/lib/workflow-engine.js` — Line 781: `"dev-crew"` / `"pipeline@dev-crew.local"` (correct)
- `platform/orchestrator/lib/container-manager.js` — Lines 118-119, 238-239: `GIT_AUTHOR_NAME=dev-crew` (verified via git diff)
- `platform/scripts/setup-workspace.sh` — Lines 54-57: "dev-crew" branding, git add/commit/push at lines 104-111 (correct)
- `platform/scripts/setup-cycle-workspace.sh` — Lines 12-13, 38, 41, 63: "dev-crew" branding, scaffold commit (correct)

---

## File-by-File Review

### 1. `platform/orchestrator/server.js` — PASS (INFO)

| Line | Status | Notes |
|------|--------|-------|
| 2 | OK | Comment updated to "dev-crew Orchestrator" |
| ~688 | OK | Repo list references single dev-crew entry |
| ~904 | OK | HTML title "dev-crew Pipeline" |
| ~941 | OK | H1 heading "dev-crew Pipeline" |
| ~985 | OK | Startup log "dev-crew orchestrator" |

**Severity: INFO** — Branding-only changes. No logic impact.

### 2. `platform/orchestrator/lib/workflow-engine.js` — MEDIUM findings

| Line | Status | Notes |
|------|--------|-------|
| 781 | OK | Git config updated to "dev-crew" / "pipeline@dev-crew.local" |
| 964 | **MEDIUM** | Grep pattern includes `docker/orchestrator/` — stale path, should be `platform/orchestrator/` |
| 981 | **MEDIUM** | Error message mentions `docker/orchestrator/` as valid source path |
| 1028 | **MEDIUM** | Retry verification grep also includes `docker/orchestrator/` |
| 1436 | OK | Portal detection: `run.repo.includes("container-test") || run.repo.includes("dev-crew")` |
| 1440 | OK | Git diff checks both `Source/` and `portal/` paths |

**Finding MEDIUM-1:** Lines 964, 981, and 1028 reference `docker/orchestrator/` in grep patterns and error messages. This was the old path — it should now be `platform/orchestrator/`. The pattern is used to verify implementation agents modified source code files. A valid change to `platform/orchestrator/` will not be recognized, potentially causing false "no source changes" failures in cycles targeting orchestrator code.

**Fix:** Replace `docker/orchestrator/` with `platform/orchestrator/` in the grep patterns at lines 964 and 1028, and update the error message at line 981.

### 3. `platform/orchestrator/lib/config.js` — PASS (INFO)

| Line | Status | Notes |
|------|--------|-------|
| 10 | OK | `githubRepo` defaults to empty string (no old repo name) |
| 30 | OK | `workerImage` default is "dev-crew-worker:latest" |
| 37-40 | OK | Tiered merge config values present (FR-TMP-007) |

No old references.

### 4. `platform/orchestrator/lib/container-manager.js` — PASS (INFO)

| Line | Status | Notes |
|------|--------|-------|
| 118-119 | OK | GIT_AUTHOR_NAME=dev-crew, GIT_AUTHOR_EMAIL=pipeline@dev-crew.local |
| 238-239 | OK | Same in second container creation path |

Both container creation paths consistent.

### 5. `platform/scripts/setup-cycle-workspace.sh` — PASS (INFO)

| Line | Status | Notes |
|------|--------|-------|
| 12-13 | OK | Git identity defaults: dev-crew / pipeline@dev-crew.local |
| 38 | OK | Bootstrap comment: "dev-crew templates" |
| 40-41 | OK | Conditional: checks Teams/ AND templates exist |
| 62-64 | OK | git add/commit/push with "chore: scaffold agent team structure from dev-crew templates" |

Template auto-apply logic complete with git commit/push and graceful push failure handling.

### 6. `platform/scripts/setup-workspace.sh` — PASS (INFO)

| Line | Status | Notes |
|------|--------|-------|
| 54 | OK | Comment: "Bootstrap with dev-crew framework if Teams/ doesn't exist" |
| 57 | OK | Echo: "bootstrapping with dev-crew framework" |
| 104-111 | OK | git add -A, git commit, git push with graceful failure handling |
| 107 | OK | Commit message: "chore: scaffold agent team structure from dev-crew templates" |

Template auto-apply logic matches Task 7 Step 2 spec:
- Checks `/workspace/Teams/` existence -> skip if present
- Copies `/app/templates/*` into `/workspace/`
- `git add -A && git commit -m "chore: scaffold agent team structure from dev-crew templates"`
- `git push origin HEAD` with warning on failure

### 7. `CLAUDE.md` — PASS (INFO)

Line 6: `**dev-crew** — AI-powered development platform. Orchestrates autonomous agent teams to build software through specifications, plans, and automated pipelines.`

No old repo name references.

### 8. `portal/` — PASS (INFO)

No references to old repo names in `portal/Backend/src/index.ts` or `portal/Frontend/src/api/client.ts`.

### 9. `tools/` — PASS (INFO)

No references to old repo names.

### 10. `Teams/` — PASS (INFO)

No references to old repo names.

---

## Design Observations

### MEDIUM-1: Stale `docker/orchestrator/` in implementation verification grep patterns

**Location:** `platform/orchestrator/lib/workflow-engine.js` lines 964, 981, 1028

The implementation verification phase uses grep to check which files agents modified. The pattern includes `docker/orchestrator/` which is the **old** directory path from the pre-merge `claude-ai-OS` repo. The correct path in the merged repo is `platform/orchestrator/`.

**Impact:** Any cycle that targets orchestrator files (e.g., this very pipeline feature) will fail the implementation gate unless it also modifies files matching other patterns (like `Source/`). This is a real functional bug for orchestrator-targeting cycles.

**Recommendation:** Replace `docker/orchestrator/` with `platform/orchestrator/` at:
- Line 964: grep pattern in `diffCheck`
- Line 981: error message text
- Line 1028: grep pattern in `retryDiff`

### MEDIUM-2: `isPortalRepo` naming is semantically misleading

**Location:** `platform/orchestrator/lib/workflow-engine.js` line 1436

`run.repo.includes("dev-crew")` will match **all** cycles targeting the dev-crew repo, not just portal-related ones. The `isPortalRepo` flag is now effectively always true for dev-crew cycles. The downstream `hasSourceChanges` guard (checking `Source/ portal/` diffs at line 1440) prevents unnecessary portal updates, so this is not a functional bug.

**Impact:** Low — the naming is misleading but functionally correct due to the guard.

**Recommendation:** Advisory only. Consider renaming to `hasPortalPath` or `isRepoWithPortal` in a future cleanup. Not blocking for this PR.

### LOW-1: Historical docs in `docs/superpowers/` preserve old repo names

The `docs/superpowers/` directory documents the migration itself. These references are historical context and should NOT be updated. Confirmed correct per the dispatch plan.

### LOW-2: Plans referencing `docker/orchestrator/` paths

The dispatch plan (`Plans/tiered-merge-pipeline/dispatch-plan.md`) and other plan documents still reference `docker/orchestrator/` paths. These are historical plan documents describing work done pre-migration. Updating them would rewrite history. Not blocking.

---

## Findings Summary

| # | Severity | Description | Location |
|---|----------|-------------|----------|
| 1 | MEDIUM | Stale `docker/orchestrator/` in implementation verification grep patterns — will miss platform/ changes | `workflow-engine.js:964,981,1028` |
| 2 | MEDIUM | `isPortalRepo` always true for dev-crew cycles (misleading name, functionally guarded) | `workflow-engine.js:1436` |
| 3 | LOW | Historical docs preserve old repo names (intentional, not a bug) | `docs/superpowers/` |
| 4 | LOW | Plan documents reference old `docker/` paths (historical, not blocking) | `Plans/` |
| 5 | INFO | All branding/naming updates verified correct across 8+ files | platform/, CLAUDE.md |
| 6 | INFO | Template auto-apply logic complete and matches Task 7 Step 2 spec | setup-workspace.sh, setup-cycle-workspace.sh |
| 7 | INFO | config.js clean — empty string default for githubRepo, dev-crew-worker image | config.js |

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 2 |
| LOW | 2 |
| INFO | 3 |

---

## Verdict

**CONDITIONAL APPROVE** — The core reference updates are complete and correct. Two MEDIUM findings should be addressed:

1. **MEDIUM-1 is actionable and recommended for this PR**: Replace `docker/orchestrator/` with `platform/orchestrator/` in `workflow-engine.js` lines 964, 981, and 1028. This is a real functional bug — the verification logic won't recognize changes to the orchestrator's new path, causing false failures for cycles targeting orchestrator code.

2. **MEDIUM-2 is advisory only**: The `isPortalRepo` naming issue is pre-existing and functionally guarded. Non-blocking.

All Task 7 requirements are met:
- All `claude-ai-OS`, `container-test`, and `Work-backlog` references updated in active code
- Template auto-apply logic added to `setup-workspace.sh` with git add/commit/push
- `config.js` defaults updated (no old repo names, dev-crew-worker image)
- Backwards-compat `container-test` check retained at line 1436 (intentional)
