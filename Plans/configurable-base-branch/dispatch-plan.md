# Dispatch Plan: Replace Hardcoded 'master' with Configurable Base Branch

## Task Summary
Replace all hardcoded `'master'` branch references in `workflow-engine.js` with a configurable base branch helper, unblocking repos that use `'main'` or other default branches.

## Scope
- **scope_tag:** `backend-only`
- **confidence:** `high`
- **files:** `platform/orchestrator/lib/workflow-engine.js` (1 file, 8 occurrences)

RISK_LEVEL: low

## Root Cause Analysis

`workflow-engine.js` hardcodes `'master'` in 6 locations while `config.js` already provides `githubBranch: process.env.GITHUB_BRANCH || "main"` and `run.repoBranch` is available on the run object. Two other locations (lines 1593, 1628) already use `run.repoBranch || "master"` but should also fall through to config.

## Fix Plan

### Step 1: Add `_baseBranch(run)` helper method

Add a new method to the `WorkflowEngine` class:

```javascript
/**
 * Returns the base branch for the given run.
 * Priority: run.repoBranch > config.githubBranch > 'master' (fallback)
 */
_baseBranch(run) {
  return run.repoBranch || this.config.githubBranch || 'master';
}
```

Place it near the top of the class, after the constructor, as a utility method.

### Step 2: Replace all 8 hardcoded occurrences

| Line | Current Code | Replacement |
|------|-------------|-------------|
| 443 | `--base master` | `--base ${this._baseBranch(run)}` |
| 451 | `--base master` | `--base ${this._baseBranch(run)}` |
| 505 | `git diff master...cycle/` | `git diff ${this._baseBranch(run)}...cycle/` |
| 646 | `Merge failed, attempting rebase on master...` | `Merge failed, attempting rebase on ${this._baseBranch(run)}...` |
| 649 | `git fetch origin master && git rebase origin/master` | `git fetch origin ${this._baseBranch(run)} && git rebase origin/${this._baseBranch(run)}` |
| 871 | `run.repoBranch \|\| "master"` | `this._baseBranch(run)` |
| 1112 | `origin/master` | `origin/${this._baseBranch(run)}` |
| 1176 | `origin/master` | `origin/${this._baseBranch(run)}` |

### Step 3: Update existing `run.repoBranch || "master"` patterns

These two locations already partially handle the branch but should use the helper for consistency:

| Line | Current Code | Replacement |
|------|-------------|-------------|
| 1593 | `run.repoBranch \|\| "master"` | `this._baseBranch(run)` |
| 1628 | `run.repoBranch \|\| "master"` | `this._baseBranch(run)` |

### Verification

- Grep for any remaining hardcoded `'master'` in the file (excluding comments/log messages that are purely informational)
- Verify the helper returns correct priority: `run.repoBranch` > `config.githubBranch` > `'master'`
- Existing test file: `platform/orchestrator/lib/workflow-engine.test.js` — run it to confirm no regressions

---

## Dispatch

### backend-fixer-1

**Role file:** `Teams/TheFixer/backend-fixer.md`

**Task:** Implement the `_baseBranch(run)` helper and replace all hardcoded `'master'` references in `platform/orchestrator/lib/workflow-engine.js`.

**Instructions:**
1. Read `platform/orchestrator/lib/workflow-engine.js`
2. Add `_baseBranch(run)` helper method to the `WorkflowEngine` class (after constructor)
3. Replace all 10 occurrences listed in the fix plan above
4. Run `node -e "require('./platform/orchestrator/lib/workflow-engine.js')"` to verify no syntax errors
5. Run existing tests: `cd platform/orchestrator && npm test` if available
6. Grep the file to confirm zero remaining hardcoded `'master'` references in executable code (log messages are acceptable)

**Files to modify:**
- `platform/orchestrator/lib/workflow-engine.js`
