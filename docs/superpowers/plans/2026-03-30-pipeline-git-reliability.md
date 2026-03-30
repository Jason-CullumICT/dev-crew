# Pipeline Git Reliability Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate git repo corruption, merge-conflict PRs, and false-pass smoke tests from the dev-crew pipeline by switching to merge commits, adding pre-flight conflict detection, removing silent failure suppression, and fixing smoke test exit codes.

**Architecture:** Replace the rebase+squash+force-push merge path with a merge-commit strategy. Add a `git merge-tree` dry-run check before every PR creation so conflicts surface as diagnostics rather than broken GitHub PRs. Replace the stash/pop learnings sync pattern with a clean-commit approach. Fix smoke test exit code 2 = skipped (not pass).

**Tech Stack:** Node.js (workflow-engine.js), Bash (run-smoketest.sh), GitHub CLI (`gh`), Git

---

## File Map

| File | What changes |
|------|-------------|
| `platform/scripts/run-smoketest.sh` | Line 297: `exit 0` → `exit 2` when no services found |
| `platform/orchestrator/lib/workflow-engine.js` | (1) Exit code 2 → "skipped" for smoketest; (2) pre-flight conflict check in `_createPR`; (3) replace `--squash` + rebase+force-push block with `--merge` and halt-on-conflict; (4) replace stash/pop learnings sync with clean-commit approach |

---

## Task 1: Fix smoke test exit code

**Files:**
- Modify: `platform/scripts/run-smoketest.sh:294-297`
- Modify: `platform/orchestrator/lib/workflow-engine.js:1359`

### Current state to verify before starting

- [ ] **Step 1: Confirm the current exit code**

```bash
grep -n "exit 0\|exit 1\|exit 2" platform/scripts/run-smoketest.sh
```

Expected output includes:
```
297:  exit 0
301:  exit 0
305:  exit 1
```

Line 297 is the "no services found" branch — that's the one to fix. Lines 301 and 305 stay as-is.

- [ ] **Step 2: Confirm the current smoketest status assignment in workflow-engine.js**

```bash
grep -n "smokeResult.exitCode\|smokePassed\|smokeEffective" platform/orchestrator/lib/workflow-engine.js
```

Expected output includes:
```
1359:      run.phases.smoketest.status = smokeResult.exitCode === 0 ? "passed" : "failed";
1381:      const smokePassed = run.phases.smoketest.status === "passed";
1387:      const smokeEffective = smokePassed || (implPassed && qaPassed);
```

### Make the changes

- [ ] **Step 3: Fix the smoke test exit code**

In `platform/scripts/run-smoketest.sh`, replace lines 293–297:

```bash
# OLD (lines 293-297):
if [[ $TOTAL -eq 0 ]]; then
  echo "  Smoke tests: SKIPPED (no services to test)"
  echo "═══════════════════════════════════════════"
  exit 0
```

```bash
# NEW:
if [[ $TOTAL -eq 0 ]]; then
  echo "  Smoke tests: SKIPPED (no services to test)"
  echo "═══════════════════════════════════════════"
  exit 2
```

- [ ] **Step 4: Handle exit code 2 as "skipped" in workflow-engine.js**

In `platform/orchestrator/lib/workflow-engine.js`, replace line 1359:

```js
// OLD (line 1359):
run.phases.smoketest.status = smokeResult.exitCode === 0 ? "passed" : "failed";
```

```js
// NEW:
run.phases.smoketest.status =
  smokeResult.exitCode === 0 ? "passed" :
  smokeResult.exitCode === 2 ? "skipped" :
  "failed";
```

- [ ] **Step 5: Update smokePassed to treat "skipped" the same as the e2e "skipped" convention**

In `platform/orchestrator/lib/workflow-engine.js`, replace line 1381:

```js
// OLD (line 1381):
const smokePassed = run.phases.smoketest.status === "passed";
```

```js
// NEW:
const smokePassed = run.phases.smoketest.status === "passed" || run.phases.smoketest.status === "skipped";
```

> **Why:** This aligns smoke test "skipped" with how e2e "skipped" is already handled on line 614 (`e2eStatus === "passed" || e2eStatus === "skipped"`). When no services exist to test, the result is genuinely inconclusive — not a failure. The override logic at line 1387 already handles the false-negative case for when smoke actually fails.

- [ ] **Step 6: Verify the diff looks correct**

```bash
git diff platform/scripts/run-smoketest.sh platform/orchestrator/lib/workflow-engine.js
```

Confirm: only lines 297, 1359, and 1381 changed. No other lines touched.

- [ ] **Step 7: Commit**

```bash
git add platform/scripts/run-smoketest.sh platform/orchestrator/lib/workflow-engine.js
git commit -m "fix: smoke test exit 2 = skipped, not failed"
```

---

## Task 2: Add pre-flight conflict detection before PR creation

**Files:**
- Modify: `platform/orchestrator/lib/workflow-engine.js` — inside `_createPR` method, before the `gh pr create` call

### Understand the insertion point

- [ ] **Step 1: Find the exact insertion point**

```bash
grep -n "Creating PR\|gh pr create\|Write PR body" platform/orchestrator/lib/workflow-engine.js
```

Expected output:
```
434:    console.log(`[${run.id}] Creating PR: ${prTitle}`);
437:    await this.containerManager.execInWorker(
444:    let prResult = await this.containerManager.execInWorker(
```

The pre-flight check goes between the log on line 434 and the body-write on line 437.

### Write the pre-flight check

- [ ] **Step 2: Insert the conflict detection block**

In `platform/orchestrator/lib/workflow-engine.js`, find this section inside `_createPR` (around line 433):

```js
    // Create PR via gh CLI — use temp files to avoid shell injection
    console.log(`[${run.id}] Creating PR: ${prTitle}`);

    // Write PR body to temp file to avoid shell escaping issues
    await this.containerManager.execInWorker(
```

Replace it with:

```js
    // ── Pre-flight: dry-run conflict check before creating PR ──
    const baseBranch = this._baseBranch(run);
    console.log(`[${run.id}] Pre-flight conflict check against ${baseBranch}...`);
    const conflictCheck = await this.containerManager.execInWorker(
      containerId, "bash",
      ["-c", [
        "cd /workspace",
        `git fetch origin ${baseBranch}`,
        `BASE=$(git merge-base HEAD origin/${baseBranch})`,
        // merge-tree outputs conflict markers if conflicts exist
        `CONFLICTS=$(git merge-tree "$BASE" HEAD origin/${baseBranch} 2>&1 | grep -c "^<<<<<<" || true)`,
        `echo "CONFLICT_COUNT=$CONFLICTS"`,
        `if [ "$CONFLICTS" -gt 0 ]; then`,
        `  echo "CONFLICTING_FILES=$(git merge-tree "$BASE" HEAD origin/${baseBranch} 2>&1 | grep "^changed in both" | awk '{print $NF}' | tr '\\n' ',')";`,
        `fi`,
      ].join(" && ")],
      { label: "preflight-conflict-check" }
    );

    const conflictCountMatch = conflictCheck.stdout.match(/CONFLICT_COUNT=(\d+)/);
    const conflictCount = conflictCountMatch ? parseInt(conflictCountMatch[1], 10) : 0;

    if (conflictCount > 0) {
      const filesMatch = conflictCheck.stdout.match(/CONFLICTING_FILES=([^\n]*)/);
      const conflictFiles = filesMatch ? filesMatch[1] : "unknown";
      console.warn(`[${run.id}] Pre-flight: ${conflictCount} conflict(s) detected in files: ${conflictFiles}`);
      run.pr = {
        status: "needs-manual-resolution",
        reason: `${conflictCount} merge conflict(s) detected against ${baseBranch} before PR creation. Conflicting files: ${conflictFiles}`,
      };
      saveRunFn(run);
      // Label the branch for visibility
      await this.containerManager.execInWorker(
        containerId, "bash",
        ["-c", `cd /workspace && git notes add -m "merge-conflicts-detected: ${conflictFiles}" HEAD 2>/dev/null || true`],
        { label: "conflict-note", quiet: true }
      );
      return;
    }
    console.log(`[${run.id}] Pre-flight: no conflicts detected, proceeding to PR creation`);

    // Create PR via gh CLI — use temp files to avoid shell injection
    console.log(`[${run.id}] Creating PR: ${prTitle}`);

    // Write PR body to temp file to avoid shell escaping issues
    await this.containerManager.execInWorker(
```

- [ ] **Step 3: Verify insertion looks correct**

```bash
grep -n "Pre-flight\|CONFLICT_COUNT\|needs-manual-resolution\|Creating PR" platform/orchestrator/lib/workflow-engine.js | head -20
```

Expected: pre-flight lines appear, then "Creating PR" line after them.

- [ ] **Step 4: Commit**

```bash
git add platform/orchestrator/lib/workflow-engine.js
git commit -m "feat: add pre-flight merge conflict detection before PR creation"
```

---

## Task 3: Replace squash + rebase+force-push with merge commit

**Files:**
- Modify: `platform/orchestrator/lib/workflow-engine.js` — `_autoMerge` method, lines 636–684

### Understand what's being removed

- [ ] **Step 1: Confirm the exact rebase block location**

```bash
grep -n "\-\-squash\|rebase\|--force\|force-push\|rebase --abort" platform/orchestrator/lib/workflow-engine.js
```

Expected: lines 640, 653, 661, 680–681 all reference these patterns. All will be gone after this task.

### Make the changes

- [ ] **Step 2: Replace the `_autoMerge` merge execution block**

In `platform/orchestrator/lib/workflow-engine.js`, find the `if (shouldMerge)` block (starting around line 636). Replace the entire block from `if (shouldMerge) {` through the closing `} else {` (lines 636–685, ending just before `run.pr.status = newStatus;`):

```js
// OLD (lines 636-698, the entire shouldMerge if-block):
    if (shouldMerge) {
      console.log(`[${run.id}] Auto-merging PR #${run.pr.number} (${riskLevel} risk)...`);
      const mergeResult = await this.containerManager.execInWorker(
        containerId, "bash",
        ["-c", `cd /workspace && gh pr merge ${run.pr.number} --squash --delete-branch 2>&1`],
        { label: "pr-merge" }
      );

      if (mergeResult.exitCode === 0) {
        run.pr.status = "merged";
        console.log(`[${run.id}] PR #${run.pr.number} merged successfully`);
      } else {
        // Verifies: FR-TMP-010 — merge conflict: try rebase then retry merge
        const baseBranch = this._baseBranch(run);
        console.warn(`[${run.id}] Merge failed, attempting rebase on ${baseBranch}...`);
        const rebaseResult = await this.containerManager.execInWorker(
          containerId, "bash",
          ["-c", `cd /workspace && git fetch origin ${baseBranch} && git rebase origin/${baseBranch} 2>&1 && git push origin "cycle/${run.id}" --force 2>&1`],
          { label: "pr-rebase" }
        );

        if (rebaseResult.exitCode === 0) {
          console.log(`[${run.id}] Rebase succeeded, retrying merge...`);
          const retryMerge = await this.containerManager.execInWorker(
            containerId, "bash",
            ["-c", `cd /workspace && gh pr merge ${run.pr.number} --squash --delete-branch 2>&1`],
            { label: "pr-merge-retry" }
          );
          if (retryMerge.exitCode === 0) {
            run.pr.status = "merged";
            console.log(`[${run.id}] PR #${run.pr.number} merged after rebase`);
          } else {
            console.warn(`[${run.id}] Merge still failed after rebase: ${retryMerge.stdout.slice(-500)}`);
            run.pr.status = "merge-conflict";
            await this.containerManager.execInWorker(
              containerId, "bash",
              ["-c", `cd /workspace && gh pr edit ${run.pr.number} --add-label "merge-conflict" 2>&1 || true`],
              { label: "pr-label", quiet: true }
            );
          }
        } else {
          console.warn(`[${run.id}] Rebase failed: ${rebaseResult.stdout.slice(-500)}`);
          run.pr.status = "merge-conflict";
          await this.containerManager.execInWorker(
            containerId, "bash",
            ["-c", `cd /workspace && git rebase --abort 2>/dev/null; gh pr edit ${run.pr.number} --add-label "merge-conflict" 2>&1 || true`],
            { label: "pr-label", quiet: true }
          );
        }
      }
    } else {
```

Replace with:

```js
    if (shouldMerge) {
      // Merge commit strategy — no rebase, no force-push, ever.
      // Pre-flight conflict detection in _createPR already prevents conflicts
      // from reaching this point. If a conflict somehow appears at merge time,
      // we halt and label explicitly rather than destroying history.
      console.log(`[${run.id}] Auto-merging PR #${run.pr.number} (${riskLevel} risk, merge commit)...`);
      const mergeResult = await this.containerManager.execInWorker(
        containerId, "bash",
        ["-c", `cd /workspace && gh pr merge ${run.pr.number} --merge --delete-branch 2>&1`],
        { label: "pr-merge" }
      );

      if (mergeResult.exitCode === 0) {
        run.pr.status = "merged";
        console.log(`[${run.id}] PR #${run.pr.number} merged successfully`);
      } else {
        // Merge failed — surface explicitly with diagnostic. No rebase, no force-push.
        console.warn(`[${run.id}] Merge failed (exit ${mergeResult.exitCode}): ${mergeResult.stdout.slice(-500)}`);
        run.pr.status = "merge-conflict";
        await this.containerManager.execInWorker(
          containerId, "bash",
          ["-c", `cd /workspace && gh pr edit ${run.pr.number} --add-label "merge-conflict" 2>&1 || true`],
          { label: "pr-label", quiet: true }
        );
      }
    } else {
```

- [ ] **Step 3: Verify no --squash, --force, or rebase references remain in the merge path**

```bash
grep -n "\-\-squash\|--force\b\|force-push\|git rebase\|rebase --abort" platform/orchestrator/lib/workflow-engine.js
```

Expected output: **zero matches**. If any remain, find and remove them.

- [ ] **Step 4: Commit**

```bash
git add platform/orchestrator/lib/workflow-engine.js
git commit -m "feat: replace squash+rebase+force-push with merge commit strategy"
```

---

## Task 4: Replace stash/pop learnings sync with clean-commit approach

**Files:**
- Modify: `platform/orchestrator/lib/workflow-engine.js` — learnings sync block, lines 1598–1611

### Understand the current code

- [ ] **Step 1: Read the current learnings sync block**

```bash
grep -n "stash\|learnings\|mainBranch\|syncScript" platform/orchestrator/lib/workflow-engine.js | head -30
```

Expected: lines 1597–1620 contain the sync block with `git stash --include-untracked || true` and `git stash pop || echo`.

### Make the change

- [ ] **Step 2: Replace the syncScript**

In `platform/orchestrator/lib/workflow-engine.js`, find the `const syncScript = [` block (lines 1598–1611):

```js
// OLD (lines 1598-1611):
        const syncScript = [
          "cd /workspace",
          "git stash --include-untracked || true",
          `git checkout ${mainBranch}`,
          `git pull origin ${mainBranch}`,
          // Checkout learnings files from cycle branch — pattern may not match, that's expected
          `git checkout cycle/${run.id} -- Teams/*/learnings/*.md Teams/TheATeam/*.md Teams/TheFixer/*.md Teams/TheInspector/*.md Teams/Shared/*.md 2>/dev/null || echo "[learnings] No team files to sync"`,
          `git checkout cycle/${run.id} -- CLAUDE.md 2>/dev/null || echo "[learnings] No CLAUDE.md changes"`,
          "git add -A",
          // Fixed: use if/then to avoid bash operator precedence issues
          `if ! git diff --cached --quiet 2>/dev/null; then git commit -m "chore: sync learnings from cycle/${run.id}" && git push origin ${mainBranch}; else echo "[learnings] Nothing to commit"; fi`,
          `git checkout cycle/${run.id}`,
          "git stash pop || echo '[learnings] No stash to pop'",
        ].join(" && ");
```

Replace with:

```js
        // Learnings sync — no stash/pop (stash is unreliable and can orphan work).
        // Strategy: commit any pending changes on the cycle branch first (they belong
        // in the PR anyway), then switch to main, cherry-pick learning files, push, return.
        const syncScript = [
          "cd /workspace",
          // Commit any pending cycle-branch changes so the working tree is clean
          "git add -A",
          `if ! git diff --cached --quiet 2>/dev/null; then git commit -m "chore: pre-learnings-sync commit on cycle/${run.id}"; fi`,
          // Switch to main and pull latest
          `git checkout ${mainBranch}`,
          `git pull origin ${mainBranch}`,
          // Cherry-pick only the learning files from the cycle branch
          `git checkout cycle/${run.id} -- Teams/*/learnings/*.md Teams/TheATeam/*.md Teams/TheFixer/*.md Teams/TheInspector/*.md Teams/Shared/*.md 2>/dev/null || echo "[learnings] No team files to sync"`,
          `git checkout cycle/${run.id} -- CLAUDE.md 2>/dev/null || echo "[learnings] No CLAUDE.md changes"`,
          "git add -A",
          `if ! git diff --cached --quiet 2>/dev/null; then git commit -m "chore: sync learnings from cycle/${run.id}" && git push origin ${mainBranch}; else echo "[learnings] Nothing to commit"; fi`,
          // Return to the cycle branch
          `git checkout cycle/${run.id}`,
        ].join(" && ");
```

- [ ] **Step 3: Verify no stash references remain**

```bash
grep -n "git stash" platform/orchestrator/lib/workflow-engine.js
```

Expected output: **zero matches**.

- [ ] **Step 4: Commit**

```bash
git add platform/orchestrator/lib/workflow-engine.js
git commit -m "fix: replace stash/pop learnings sync with clean-commit approach"
```

---

## Task 5: Final verification

- [ ] **Step 1: Confirm no force-push anywhere in platform/**

```bash
grep -rn "push.*--force\b\|force-push\|push --force-with-lease" platform/
```

Expected output: **zero matches**.

- [ ] **Step 2: Confirm no git stash anywhere in platform/**

```bash
grep -rn "git stash" platform/
```

Expected output: **zero matches**.

- [ ] **Step 3: Confirm smoke test exit codes are correct**

```bash
grep -n "exit 0\|exit 1\|exit 2" platform/scripts/run-smoketest.sh
```

Expected:
```
297:  exit 2       ← skipped (no services)
301:  exit 0       ← passed
305:  exit 1       ← failed
```

- [ ] **Step 4: Confirm workflow-engine handles exit code 2**

```bash
grep -n "exitCode.*2\|skipped\|smokePassed" platform/orchestrator/lib/workflow-engine.js | head -10
```

Expected: line ~1359 references `exitCode === 2 ? "skipped"`, line ~1381 includes `|| run.phases.smoketest.status === "skipped"`.

- [ ] **Step 5: Confirm the rebase block is fully gone**

```bash
grep -n "rebase\|--squash\|--force" platform/orchestrator/lib/workflow-engine.js
```

Expected output: **zero matches**.

- [ ] **Step 6: Final commit with all changes summary**

```bash
git log --oneline -5
```

Expected: 4 new commits visible (Tasks 1–4) on top of the pre-existing history.

---

## Success Criteria Checklist

- [ ] `exit 2` returned by smoke test when no services found (not `exit 0`)
- [ ] `run.phases.smoketest.status === "skipped"` when exit code 2 (not "failed")
- [ ] `smokePassed` is true when status is "skipped" (same as e2e convention)
- [ ] Pre-flight conflict check runs before every `gh pr create` call
- [ ] Conflict detected → `run.pr.status === "needs-manual-resolution"`, no PR created
- [ ] `gh pr merge --merge` used (not `--squash`)
- [ ] Rebase+force-push block is deleted (not patched)
- [ ] No `git stash` or `git stash pop` anywhere in `platform/`
- [ ] No `git push --force` anywhere in `platform/`
- [ ] Learnings sync commits pending cycle changes before switching branches
