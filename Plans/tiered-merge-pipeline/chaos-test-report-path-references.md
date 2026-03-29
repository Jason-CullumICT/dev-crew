# Chaos Test Report: dev-crew Path References Update

**Role:** chaos-tester
**Team:** TheFixer
**Task:** Update all internal path and repo references for the dev-crew repo structure (Task 7)
**Date:** 2026-03-28

RISK_LEVEL: medium

---

## Verification Summary

### Step 1: Old Reference Scan

Searched all files in `platform/`, `Source/`, `portal/`, `CLAUDE.md`, `tools/`, `Teams/` for references to "claude-ai-OS", "container-test", or "Work-backlog" (excluding `node_modules`, `.git`, and `docs/` historical documentation).

**Results:**
- `platform/orchestrator/server.js` — **CLEAN**. References "dev-crew" correctly.
- `platform/orchestrator/lib/config.js` — **CLEAN**. `workerImage` default is `"dev-crew-worker:latest"` (line 30). No old repo names.
- `platform/orchestrator/lib/workflow-engine.js` — **PARTIAL**. Line 1436 retains `container-test` check alongside `dev-crew` — acceptable for backwards compatibility. However, lines 964, 981, and 1028 still reference `docker/orchestrator/` path in grep patterns for code-change detection. See Finding #5 below.
- `platform/orchestrator/lib/workflow-engine.test.js` — **STALE COMMENT**. Line 5 says `Run with: node --test docker/orchestrator/lib/workflow-engine.test.js` — the path is now `platform/orchestrator/lib/workflow-engine.test.js`. See Finding #6.
- `platform/orchestrator/lib/container-manager.js` — **CLEAN**. Uses `GIT_AUTHOR_NAME=dev-crew` and `GIT_AUTHOR_EMAIL=pipeline@dev-crew.local`.
- `platform/scripts/setup-cycle-workspace.sh` — **CLEAN**. Git identity defaults, bootstrap comment, echo message, and commit message all updated.
- `platform/scripts/setup-workspace.sh` — **CLEAN**. Bootstrap comment, echo message updated. Git add/commit/push scaffold logic present (lines 104-111).
- `CLAUDE.md` — **CLEAN**. Line 6 says "dev-crew".
- `portal/` — **CLEAN**. No old references found.
- `tools/` — **CLEAN**. No old references found.
- `Teams/` — **CLEAN**. No old references found.
- `Source/` — **CLEAN** (excluding E2E test assertions that intentionally check for old names).

### Step 2: Template Auto-Apply Logic in setup-workspace.sh

Verified `platform/scripts/setup-workspace.sh` lines 54-116:
- After template copy, performs `git add -A`
- Commits with message `"chore: scaffold agent team structure from dev-crew templates"`
- Pushes with `git push origin HEAD` (with warning on failure, not fatal)
- The entire block is conditional: only runs if `/workspace/Teams` does not exist AND `/app/templates/Teams` exists

**Severity: INFO** — Logic is correct and matches the Task 7 spec.

### Step 3: config.js Defaults

`platform/orchestrator/lib/config.js`:
- `githubRepo` defaults to `""` (empty string, set by env) — no old repo name hardcoded. **CLEAN**.
- `workerImage` defaults to `"dev-crew-worker:latest"` — correct.
- No other old references found.

### Step 4: Syntax Validation

All files pass syntax checks:
- `node -c platform/orchestrator/lib/config.js` — OK
- `node -c platform/orchestrator/lib/workflow-engine.js` — OK
- `bash -n platform/scripts/setup-workspace.sh` — OK
- `bash -n platform/scripts/setup-cycle-workspace.sh` — OK

---

## Adversarial Scenario Analysis

### Scenario 1: What if leader output contains multiple RISK_LEVEL lines?

**File:** `workflow-engine.js:862`
**Code:** `const riskMatch = leaderResult.stdout.match(/RISK_LEVEL:\s*(low|medium|high)/i);`

**Finding:** `String.match()` returns the **first** match only (non-global regex). If a leader outputs multiple lines like:
```
RISK_LEVEL: low
...
RISK_LEVEL: high
```
The first match wins (`low`), potentially under-classifying risk.

**Severity: MEDIUM** — An adversarial or confused leader could produce contradictory risk levels. The first-match behavior is deterministic but may not pick the safest option. Consider using `matchAll` and taking the highest risk level, or documenting that the first occurrence is authoritative.

**Mitigation:** This is pre-existing behavior from the tiered-merge-pipeline, not introduced by the path references task. No regression.

### Scenario 2: What if E2E tests exist but are malformed?

**File:** `workflow-engine.js` E2E phase (Phase 5.5)
**Analysis:** The `_runPlaywrightE2E` method parses JSON output from Playwright. If tests are malformed (syntax errors, bad imports), Playwright exits non-zero with non-JSON output.

**Finding:** The method wraps in try/catch per FR-TMP-010. JSON parse failure would be caught, and `run.e2e.status` would be set to `"error"`. This is correct graceful degradation.

**Severity: LOW** — No issue with this task. Pre-existing behavior is well-handled.

### Scenario 3: What if `gh pr create` returns unexpected output?

**Finding:** The `_createPR` method parses PR URL from stdout. If `gh` returns unexpected format (e.g., GitHub API error message), the regex may not match, and `run.pr.number` could be undefined.

**Severity: LOW** — Pre-existing concern, not related to the path references task. The error handling wraps in try/catch.

### Scenario 4: What if the merge fails mid-way?

**Finding:** The `_autoMerge` method handles merge conflicts by labeling the PR and setting status to `"conflict"`. If the merge partially succeeds then fails (e.g., network timeout during squash merge), the PR could be in an indeterminate state.

**Severity: LOW** — Pre-existing concern. The `gh pr merge` command is atomic from GitHub's perspective — it either succeeds or fails completely.

### Scenario 5: Stale `docker/orchestrator/` path in code-change detection greps

**File:** `workflow-engine.js` lines 964, 981, 1028
**Code:** Grep patterns include `docker/orchestrator/` for detecting whether code files were modified.

**Finding:** The directory structure was moved from `docker/orchestrator/` to `platform/orchestrator/`. The grep patterns at lines 964 and 1028 still include `docker/orchestrator/` alongside other paths. If a worker checks out the current repo structure, changes to `platform/orchestrator/` files would NOT match the `docker/orchestrator/` pattern — but they would still match the broader `lib/` pattern in the same grep.

However, this means that if an agent modifies only files at `platform/orchestrator/server.js` (which doesn't match `lib/`), the code-change detection could miss it. The pattern should include `platform/` or `platform/orchestrator/`.

**Severity: MEDIUM** — Stale path pattern. Could cause false "no code files modified" failures for changes to `platform/orchestrator/server.js` or `platform/orchestrator/package.json`. These files would need to match one of the other patterns (which they might via the `lib/` catch-all for `lib/` subdirectory files but NOT for root-level orchestrator files).

**Recommendation:** Update `docker/orchestrator/` to `platform/orchestrator/` in the grep patterns at lines 964 and 1028. Also update the feedback message at line 981 from `docker/orchestrator/` to `platform/orchestrator/`.

### Scenario 6: Stale run-command comment in workflow-engine.test.js

**File:** `workflow-engine.test.js:5`
**Code:** `Run with: node --test docker/orchestrator/lib/workflow-engine.test.js`

**Finding:** The comment still references the old `docker/` path. Should be `platform/orchestrator/lib/workflow-engine.test.js`.

**Severity: LOW** — Comment only, does not affect runtime. But could confuse developers running tests.

### Scenario 7: What if setup-workspace.sh fails to push the scaffold commit?

**File:** `setup-workspace.sh:108-110`
**Code:**
```bash
if ! git push origin HEAD; then
  echo "⚠ WARNING: Failed to push scaffold commit — continuing anyway"
fi
```

**Finding:** If the push fails (network, auth, branch protection), the scaffold exists locally but not remotely. The next cycle on the same workspace would find `Teams/` exists and skip scaffolding, which is correct. But if the volume is cleaned up and re-created, the scaffold would be re-applied. This is acceptable — idempotent behavior.

**Severity: INFO** — Correct behavior. The warning is logged.

### Scenario 8: What if portal detection triggers falsely on dev-crew repos?

**File:** `workflow-engine.js:1436`
**Code:** `const isPortalRepo = run.repo.includes("container-test") || run.repo.includes("dev-crew");`

**Finding:** Every dev-crew run would match `isPortalRepo = true`. However, the actual portal update only triggers if `Source/` or `portal/` files changed (line 1440 checks `git diff --name-only ... -- Source/ portal/`). If only `platform/` files changed, the portal update is correctly skipped.

**Severity: INFO** — The portal gate correctly prevents false updates. No issue.

### Scenario 9: What if Teams/ exists but is empty?

**File:** `setup-workspace.sh:56`, `setup-cycle-workspace.sh:40`
**Code:** `if [[ ! -d "$WORKSPACE/Teams" ]]` / `if [ ! -d "$WORKSPACE/Teams" ]`

**Finding:** The check tests for directory existence, not for non-empty directory. If `Teams/` is an empty directory (e.g., left by a failed previous scaffold), the bootstrap would be skipped, leaving the workspace without agent team definitions.

**Severity: LOW** — Edge case. An empty `Teams/` directory is unlikely in normal operation but could occur if a previous scaffold was interrupted. The scaffold would need to be re-triggered manually.

---

## Findings Summary

| # | Severity | Finding | File | Regression? |
|---|----------|---------|------|-------------|
| 1 | INFO | All old repo references properly updated to "dev-crew" | Multiple | No |
| 2 | INFO | Template auto-apply logic correct with git add/commit/push | setup-workspace.sh | No |
| 3 | INFO | config.js defaults use "dev-crew-worker:latest" | config.js | No |
| 4 | INFO | Backwards-compat container-test check is intentional | workflow-engine.js:1436 | No |
| 5 | **MEDIUM** | `docker/orchestrator/` path in code-change grep patterns is stale | workflow-engine.js:964,981,1028 | **Missed update** |
| 6 | LOW | Stale `docker/` path in test run comment | workflow-engine.test.js:5 | Missed update |
| 7 | MEDIUM | Multiple RISK_LEVEL lines: first match wins (pre-existing) | workflow-engine.js:862 | No — pre-existing |
| 8 | INFO | Portal detection on dev-crew repos gated by file-change check | workflow-engine.js:1436-1443 | No |
| 9 | LOW | Empty Teams/ directory bypasses bootstrap | setup-workspace.sh:56 | No — pre-existing |
| 10 | INFO | All JS and shell files pass syntax validation | Multiple | No |

**Overall Assessment:** The path references update is **mostly complete**. No CRITICAL or HIGH severity issues. Two MEDIUM findings: one is a stale `docker/orchestrator/` path in code-change detection greps (Finding #5 — should be updated to `platform/orchestrator/`), and one is a pre-existing first-match behavior for risk classification. One LOW finding is a stale comment in the test file (Finding #6).

**Action items for implementation agents:**
1. Update `docker/orchestrator/` → `platform/orchestrator/` at workflow-engine.js lines 964, 981, and 1028
2. Update comment at workflow-engine.test.js:5 from `docker/orchestrator/` to `platform/orchestrator/`

---

## E2E Test Coverage

E2E test files exist at `Source/E2E/tests/cycle-run-1774659927912-8dd3ac77/`:
1. `path-references.spec.ts` — Verifies main page renders without old repo names
2. `path-references-security.spec.ts` — Verifies work-items and dashboard pages don't leak old names
3. `path-references-chaos.spec.ts` — Chaos-specific adversarial tests (added by this report)

All tests use relative URLs and rely on the pipeline Playwright config's `baseURL`.
