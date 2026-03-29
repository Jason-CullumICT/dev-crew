# Dispatch Plan: Replace Hardcoded 'master' with Configurable Base Branch

**Task:** Replace all hardcoded `'master'` branch references in `workflow-engine.js` with a configurable helper that respects `run.repoBranch` and `config.githubBranch`.

**Scope tag:** `backend-only`
**Confidence:** high
**Risk:** low — single file, no schema changes, no new dependencies

RISK_LEVEL: low

## Analysis

### Current State
`platform/orchestrator/lib/workflow-engine.js` hardcodes `'master'` in 8+ places. The config (`lib/config.js` line 11) already defines `githubBranch: process.env.GITHUB_BRANCH || "main"`, and the run object carries `run.repoBranch`. Neither is consistently used — most git commands still reference `'master'` literally.

### Affected Lines (all in `platform/orchestrator/lib/workflow-engine.js`)

| Line | Context | Current Code |
|------|---------|-------------|
| 443 | PR creation with labels | `--base master` |
| 451 | PR creation fallback (no labels) | `--base master` |
| 505 | Diff for AI review | `git diff master...cycle/${run.id}` |
| 646 | Log message for rebase | `"rebase on master"` |
| 649 | Fetch + rebase commands | `git fetch origin master && git rebase origin/master` |
| 871 | Initial repo setup | `${run.repoBranch \|\| "master"}` (partially correct) |
| 1112 | Code change detection (impl) | `origin/master` in merge-base |
| 1176 | Code change detection (retry) | `origin/master` in merge-base |
| 1593 | Already uses helper pattern | `run.repoBranch \|\| "master"` (partially correct) |
| 1628 | Diff for source changes | `run.repoBranch \|\| "master"` (partially correct) |

### Fix Strategy

1. **Add a `_baseBranch(run)` helper method** to the `WorkflowEngine` class:
   ```javascript
   _baseBranch(run) {
     return run.repoBranch || this.config.githubBranch || 'master';
   }
   ```
   This creates a single source of truth with a 3-tier fallback:
   - `run.repoBranch` — per-run override (set during repo validation)
   - `this.config.githubBranch` — env-level config (`GITHUB_BRANCH`, defaults to `"main"`)
   - `'master'` — last-resort fallback for legacy setups

2. **Replace all 10 occurrences** of hardcoded `'master'` or `run.repoBranch || "master"` with calls to `this._baseBranch(run)`:
   - Lines 443, 451: `--base ${this._baseBranch(run)}`
   - Line 505: `` git diff ${this._baseBranch(run)}...cycle/${run.id} ``
   - Line 646: log message uses `this._baseBranch(run)`
   - Line 649: `git fetch origin ${baseBranch} && git rebase origin/${baseBranch}`
   - Line 871: replace `${run.repoBranch || "master"}` with `${this._baseBranch(run)}`
   - Lines 1112, 1176: replace `origin/master` with `origin/${this._baseBranch(run)}`
   - Line 1593: replace `run.repoBranch || "master"` with `this._baseBranch(run)`
   - Line 1628: replace `run.repoBranch || "master"` with `this._baseBranch(run)`

3. **Update the test file** (`workflow-engine.test.js`): Ensure `repoBranch: "master"` in the mock run object still works (it will — the helper reads `run.repoBranch` first). Add a test case verifying the fallback chain.

## Files to Modify

- `platform/orchestrator/lib/workflow-engine.js` — add helper + 10 replacements
- `platform/orchestrator/lib/workflow-engine.test.js` — add `_baseBranch` unit test

## Verification Criteria

- All occurrences of literal `'master'` in workflow-engine.js are replaced (grep returns 0 matches)
- Existing tests pass (`npm test` in `platform/orchestrator/`)
- New test validates the 3-tier fallback: `run.repoBranch` > `config.githubBranch` > `'master'`

---

## Dispatch Instructions

### backend-fixer-1

**Role file:** `Teams/TheFixer/backend-fixer.md`

**Task:** Implement the `_baseBranch(run)` helper and replace all hardcoded `'master'` references in `platform/orchestrator/lib/workflow-engine.js`.

**Instructions:**
1. Add a `_baseBranch(run)` method to the `WorkflowEngine` class, immediately after the existing `_readWorkerFile` helper (around line 56):
   ```javascript
   _baseBranch(run) {
     return run.repoBranch || this.config.githubBranch || 'master';
   }
   ```

2. Replace all 10 hardcoded `'master'` occurrences listed in the Analysis section above with `this._baseBranch(run)`. For string templates inside bash commands, use a local variable for readability:
   ```javascript
   const baseBranch = this._baseBranch(run);
   ```

3. Update the test file `platform/orchestrator/lib/workflow-engine.test.js`:
   - Add a describe block for `_baseBranch` with 3 tests:
     - Returns `run.repoBranch` when set
     - Falls back to `config.githubBranch` when `run.repoBranch` is falsy
     - Falls back to `'master'` when both are falsy

4. Run `npm test` in `platform/orchestrator/` to verify all tests pass.

**Files:**
- `platform/orchestrator/lib/workflow-engine.js`
- `platform/orchestrator/lib/workflow-engine.test.js`

**Scope tag:** `backend-only`
**Confidence:** high
