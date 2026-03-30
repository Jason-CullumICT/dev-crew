# Pipeline Git Reliability Overhaul

**Date:** 2026-03-30
**Status:** Approved
**Scope:** `platform/orchestrator/lib/workflow-engine.js`, `platform/scripts/run-smoketest.sh`

---

## Problem Statement

The dev-crew pipeline has three compounding reliability failures:

1. **Git repo corruption** — `git push --force` after rebase destroys commits pushed concurrently; stash/pop with `|| true` silently orphans work; widespread `2>/dev/null` suppression hides errors and leaves the repo in broken state.

2. **Merge conflicts on PRs** — The rebase + force-push recovery path (workflow-engine.js:648–654) creates conflicts instead of resolving them. If the base branch moves between PR creation and merge, the force-push destroys any commits on the cycle branch since the rebase started.

3. **Smoke test false pass** — `run-smoketest.sh` exits `0` (success) when no services were found to test. The pipeline treats this as a QA pass, masking real startup failures.

---

## Solution Overview

Switch from **rebase + squash-merge + force-push** to **merge commits with pre-flight conflict detection**. This eliminates the entire rebase/force-push failure class. Complement with git safety hardening and correct smoke test exit codes.

---

## Section 1: Merge Strategy (Core Change)

### Current behaviour
```
gh pr merge --squash
  → on failure: git rebase origin/master && git push --force
```

### New behaviour
```
gh pr merge --merge
  → on failure: halt, report conflict, label run needs-manual-resolution
```

**Changes:**
- Replace `gh pr merge --squash` with `gh pr merge --merge` throughout `workflow-engine.js`
- Delete the rebase block at lines 648–654 entirely (not patched — removed)
- Delete the force-push at line 653 entirely
- The cycle branch tip only ever moves forward; no rewinding, no force-push, ever

**Trade-offs:**
- Git history gains merge commits instead of a flat squash history. This is acceptable — there are no existing PR tooling assumptions that depend on squash history.
- Merge conflicts that were previously hidden by force-push are now surfaced explicitly, which is the desired behaviour.

---

## Section 2: Pre-flight Conflict Detection

Before creating a PR, the engine performs a dry-run merge check against the current base branch tip:

```bash
git fetch origin ${baseBranch}
BASE=$(git merge-base HEAD origin/${baseBranch})
CONFLICTS=$(git merge-tree $BASE HEAD origin/${baseBranch} | grep -c "^<<<<<<")
```

**If `CONFLICTS > 0`:**
- Do not create a PR
- Label the run `needs-manual-resolution`
- Write a conflict report to the run state (files affected, conflict count)
- Halt the pipeline stage with a non-zero exit code and a human-readable diagnostic

**If `CONFLICTS == 0`:**
- Proceed to PR creation as normal

This catches conflicts before they produce a broken PR on GitHub, replacing the current silent-failure path with an explicit, actionable error.

---

## Section 3: Git Safety Hardening

### 3a: Stash/pop replaced with temp branch pattern

**Current (workflow-engine.js:1594–1623):**
```bash
git stash --include-untracked || true
git checkout ${mainBranch}
git pull origin ${mainBranch}
git checkout cycle/${run.id} -- [files]
git stash pop || echo '[learnings] No stash to pop'
```

**New:**
```bash
# Ensure cycle branch is clean before switching — commit any pending changes
git diff --quiet && git diff --cached --quiet || \
  git commit -am "chore: auto-commit before learnings sync"

# Now switch to main and cherry-pick learning files
git checkout ${mainBranch}
git pull origin ${mainBranch}          # fail hard if this fails
git checkout cycle/${run.id} -- [files]  # cherry-pick only the learning files
git commit -m "chore: sync learnings from cycle/${run.id}"
git push origin ${mainBranch}

# Return to cycle branch
git checkout cycle/${run.id}
```

No stash involved. If `git pull` or `git push` fails, the command fails explicitly — no silent orphan. The cycle branch must be clean before this runs; any uncommitted work is committed to the cycle branch (it will be included in the PR anyway).

### 3b: Remove `|| true` from destructive git operations

All `|| true` suffixes are removed from:
- `git stash` / `git stash pop`
- `git push` (any variant)
- `git rebase` / `git rebase --abort`
- `git checkout` on cycle branches

`|| true` is retained only on genuinely harmless cleanup ops (e.g., `git rm --cached .playwright/` where the file may not exist).

### 3c: Remove `2>/dev/null` from critical paths

`2>/dev/null` is removed from:
- All `git push` commands
- `git pull` commands
- `git rebase` and `git merge` commands
- Any command in the merge/PR creation critical path

Errors flow to the pipeline log and surface in the run output. Debugging is no longer blind.

---

## Section 4: Smoke Test Exit Codes

**File:** `platform/scripts/run-smoketest.sh`

**Current (line 295):**
```bash
exit 0   # returns success when nothing tested
```

**New:**
```bash
exit 2   # 2 = inconclusive/skipped
```

**Exit code contract:**
| Code | Meaning | Pipeline action |
|------|---------|----------------|
| 0 | Pass — services started and tests passed | Mark stage `passed` |
| 1 | Fail — services started but tests failed | Mark stage `failed`, block merge |
| 2 | Skipped — no services found to test | Mark stage `skipped`, log warning, do not treat as pass |

The pipeline engine (`workflow-engine.js`) is updated to treat exit code 2 as `skipped` rather than `passed`. Auto-merge decisions require `passed` (0), not `skipped` (2).

---

## What Is Not Changed

- Branch naming convention (`cycle/${run.id}`) — unchanged
- PR creation flow (`gh pr create`) — unchanged
- Worker container lifecycle — unchanged
- Risk classification logic — unchanged
- Auto-merge thresholds (low/medium/high risk) — unchanged; they now require a genuine smoke test pass

---

## Files Modified

| File | Change |
|------|--------|
| `platform/orchestrator/lib/workflow-engine.js` | Remove rebase/force-push block; replace squash with merge; add pre-flight conflict check; fix stash/pop; remove `|| true` and `2>/dev/null` from critical paths; handle exit code 2 from smoke test |
| `platform/scripts/run-smoketest.sh` | Change `exit 0` → `exit 2` when no services found |

---

## Success Criteria

- No `git push --force` or `git push --force-with-lease` anywhere in the pipeline
- Merge conflicts surface as explicit pipeline failures with diagnostics, not as broken GitHub PRs
- Smoke test stage shows `skipped` (not `passed`) when no services ran
- `git stash` / `git stash pop` removed from the codebase entirely
- All destructive git operations fail loudly and halt the pipeline stage on error
