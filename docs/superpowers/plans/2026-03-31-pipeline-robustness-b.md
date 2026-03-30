# Pipeline Robustness B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix pipeline hangs and silent failures via Docker exec timeouts, cycle-level watchdog, git retry, and exit-code capture.

**Architecture:** Five targeted changes across four files — no architectural changes. Phase timeouts bound every exec call; a cycle watchdog catches anything that slips through; git retry survives transient network blips; exit-code fix ensures Claude failures are reported faithfully.

**Tech Stack:** Node.js 22, dockerode, built-in `node:test`, bash

---

## File Map

| File | Change |
|------|--------|
| `platform/orchestrator/lib/docker-client.js` | Add `timeoutMs` to `execInContainer` |
| `platform/orchestrator/lib/container-manager.js` | Add `timeoutMs: 300_000` to `commitAndPush` git exec |
| `platform/orchestrator/lib/workflow-engine.js` | Wire phase timeouts; add cycle watchdog |
| `platform/orchestrator/lib/workflow-engine.test.js` | Add phase-timeout and watchdog test cases |
| `platform/scripts/setup-cycle-workspace.sh` | Add `git_retry`; wrap clone and push |
| `platform/scripts/run-team.sh` | Fix exit-code capture |

---

## Task 1 — Add `timeoutMs` to `execInContainer`

**Files:**
- Modify: `platform/orchestrator/lib/docker-client.js`

Read the file first. The `execInContainer` method starts around line 56 and runs to ~line 108.

- [ ] **Step 1: Read `docker-client.js`**

```bash
# Confirm current line range of execInContainer
grep -n "execInContainer\|async exec\|stream.on" platform/orchestrator/lib/docker-client.js | head -30
```

- [ ] **Step 2: Replace `execInContainer` with timeout-aware version**

Replace the entire `execInContainer` method body. The new method:

1. Destructures `timeoutMs` from the options bag alongside `label`, `quiet`, `user`
2. Renames the inner local variable `exec` → `dockerExec` to avoid shadowing the outer method name
3. Adds a `settled` boolean and a `settle(value)` helper that clears the timer and resolves once:

```js
let settled = false;
let timer = null;
function settle(value) {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  resolve(value);
}
```

4. When `timeoutMs` is provided, sets `timer = setTimeout(...)` that calls:

```js
settle({
  exitCode: 124,
  stdout,
  stderr: stderr + `\n[timeout] exec '${cmd}' exceeded ${timeoutMs}ms`,
});
```

5. In `stream.on("end", ...)` calls `settle({ exitCode, stdout, stderr })` instead of `resolve(...)`
6. In `stream.on("error", ...)` calls `settle({ ... })` and `clearTimeout(timer)`

The resolved shape is unchanged: `{ exitCode, stdout, stderr }`. Default behavior (no `timeoutMs`) is identical to today.

- [ ] **Step 3: Verify no syntax errors**

```bash
node --check platform/orchestrator/lib/docker-client.js
```

Expected: no output (clean parse).

- [ ] **Step 4: Run existing tests**

```bash
node --test platform/orchestrator/lib/workflow-engine.test.js 2>&1 | tail -20
```

Expected: same pass/fail as baseline (no regressions).

- [ ] **Step 5: Commit**

```bash
git add platform/orchestrator/lib/docker-client.js
git commit -m "feat: add timeoutMs to execInContainer (exitCode 124 on timeout)"
```

---

## Task 2 — Add Phase-Timeout Tests

**Files:**
- Modify: `platform/orchestrator/lib/workflow-engine.test.js`

- [ ] **Step 1: Read the test file header and mock factories**

```bash
grep -n "createMockContainerManager\|refreshCredentials\|describe\|it(" platform/orchestrator/lib/workflow-engine.test.js | head -40
```

- [ ] **Step 2: Add `refreshCredentials` to the mock container manager factory**

Find the `createMockContainerManager` function (or the inline object literal used to build the mock). Add:

```js
refreshCredentials: async () => {},
```

alongside the existing mock methods. This prevents "not a function" errors when the watchdog path or phase-failure path calls `refreshCredentials`.

- [ ] **Step 3: Add "Phase timeout propagation" describe block**

Add near the bottom of the test file (before the final closing brace/call):

```js
describe("Phase timeout propagation", () => {
  it("marks run failed when exec returns exitCode 124", async (t) => {
    const { WorkflowEngine } = await import("./workflow-engine.js");
    const mockExecResult = { exitCode: 124, stdout: "", stderr: "[timeout] exec exceeded 1800000ms" };
    const cm = createMockContainerManager({ execResult: mockExecResult });
    const engine = new WorkflowEngine(cm, defaultConfig());
    const run = makeRun();

    await engine.executeWorkflow(run, () => {});

    assert.strictEqual(run.status, "failed");
    assert.ok(run.results.error, "error should be set");
  });
});
```

Adjust `createMockContainerManager`, `defaultConfig`, and `makeRun` to match the exact helper names already in the file (read those names in Step 1).

- [ ] **Step 4: Run new test**

```bash
node --test platform/orchestrator/lib/workflow-engine.test.js 2>&1 | grep -A3 "Phase timeout"
```

Expected: `✔ marks run failed when exec returns exitCode 124`

- [ ] **Step 5: Commit**

```bash
git add platform/orchestrator/lib/workflow-engine.test.js
git commit -m "test: assert exitCode 124 propagates as phase failure"
```

---

## Task 3 — Cycle Watchdog + Tests

**Files:**
- Modify: `platform/orchestrator/lib/workflow-engine.js`
- Modify: `platform/orchestrator/lib/workflow-engine.test.js`

- [ ] **Step 1: Find the `executeWorkflow` entry and finally block**

```bash
grep -n "executeWorkflow\|cycleTimeoutMs\|finally\|_activeCredentialsJson" platform/orchestrator/lib/workflow-engine.js | head -30
```

- [ ] **Step 2: Add cycle watchdog at top of `executeWorkflow`**

After the function signature and any variable declarations (before the first `await`), add:

```js
let cycleWatchdogFired = false;
const cycleTimer = setTimeout(async () => {
  cycleWatchdogFired = true;
  const mins = Math.round(this.config.cycleTimeoutMs / 60000);
  console.error(`[${run.id}] Cycle watchdog: timed out after ${mins}m — forcing failure`);
  run.status = "failed";
  run.results = { ...run.results, error: `Cycle timed out after ${mins}m`, allPassed: false };
  saveRunFn(run);
  await this._teardownOnFailure(run.id, containerId).catch(() => {});
}, this.config.cycleTimeoutMs);
```

Note: `containerId` must be in scope. If the container is not yet created at this point, delay the watchdog assignment until after `containerId` is assigned (move the `const cycleTimer = ...` line to just after `containerId` is set).

- [ ] **Step 3: Update `catch` / `finally`**

Replace the existing `catch` block and the standalone `this._activeCredentialsJson = null` with:

```js
} catch (err) {
  if (!cycleWatchdogFired) {
    console.error(`[${run.id}] Workflow error:`, err);
    run.status = "failed";
    run.results = { ...run.results, error: err.message, allPassed: false };
    saveRunFn(run);
    await this._teardownOnFailure(run.id, containerId);
  }
} finally {
  clearTimeout(cycleTimer);
  this._activeCredentialsJson = null;
}
```

The `cycleWatchdogFired` guard prevents double-error-writing when the watchdog already handled the failure.

- [ ] **Step 4: Verify parse**

```bash
node --check platform/orchestrator/lib/workflow-engine.js
```

Expected: no output.

- [ ] **Step 5: Add "Cycle watchdog" test**

In `workflow-engine.test.js`, add a new `describe` block:

```js
describe("Cycle watchdog", () => {
  it("marks run failed when cycleTimeoutMs elapses", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout", "clearTimeout"] });

    const { WorkflowEngine } = await import("./workflow-engine.js");
    // execInContainer never resolves — simulates infinite hang
    const hangingExec = () => new Promise(() => {});
    const cm = createMockContainerManager({ execFn: hangingExec });
    const config = { ...defaultConfig(), cycleTimeoutMs: 5000, phaseTimeoutMs: 1800000 };
    const engine = new WorkflowEngine(cm, config);
    const run = makeRun();
    const saveRun = t.mock.fn();

    const workflowPromise = engine.executeWorkflow(run, saveRun);
    t.mock.timers.tick(6000);
    await workflowPromise.catch(() => {});

    assert.strictEqual(run.status, "failed");
    assert.ok(/timed out/i.test(run.results.error ?? ""), "error should mention timeout");
  });
});
```

Adjust helper names to match existing factories. If `createMockContainerManager` doesn't accept `execFn`, either update the factory or inline the mock.

- [ ] **Step 6: Run watchdog test**

```bash
node --test platform/orchestrator/lib/workflow-engine.test.js 2>&1 | grep -A3 "Cycle watchdog"
```

Expected: `✔ marks run failed when cycleTimeoutMs elapses`

- [ ] **Step 7: Commit**

```bash
git add platform/orchestrator/lib/workflow-engine.js platform/orchestrator/lib/workflow-engine.test.js
git commit -m "feat: enforce cycle watchdog and phase timeout in workflow-engine"
```

---

## Task 4 — Wire Phase Timeouts to All Execs

**Files:**
- Modify: `platform/orchestrator/lib/workflow-engine.js`
- Modify: `platform/orchestrator/lib/container-manager.js`

- [ ] **Step 1: Find all `execInWorker` calls in `workflow-engine.js`**

```bash
grep -n "execInWorker\|execInContainer" platform/orchestrator/lib/workflow-engine.js | head -40
```

- [ ] **Step 2: Add `timeoutMs: this.config.phaseTimeoutMs` to agent execs**

For every `execInWorker` call that runs a Claude agent (leader, implementation, QA, smoketest, inspector — recognisable by their script paths like `run-team.sh`, `run-smoketest.sh`, `run-inspector.sh`), add `timeoutMs: this.config.phaseTimeoutMs` to the options object passed alongside `label`.

Example diff shape (not verbatim — match exact surrounding code):

```js
// Before
await this.containerManager.execInWorker(containerId, cmd, { label: "leader" });

// After
await this.containerManager.execInWorker(containerId, cmd, { label: "leader", timeoutMs: this.config.phaseTimeoutMs });
```

- [ ] **Step 3: Add `timeoutMs: 300_000` to non-agent execs**

For every `execInWorker` call doing git operations, file reads, commit/push, preflight checks — add `timeoutMs: 300_000` (5 minutes). Labels to look for: `"learnings-sync"`, `"preflight-conflict-check"`, `"commit-check"`, `"remote-verify"`, and any label containing `git`.

- [ ] **Step 4: Update `commitAndPush` in `container-manager.js`**

```bash
grep -n "commitAndPush\|execInContainer\|label.*git" platform/orchestrator/lib/container-manager.js | head -20
```

Find the `execInContainer` call inside `commitAndPush` (around line 396). Add `timeoutMs: 300_000` to its options:

```js
// Before
{ label: "git", quiet: true }

// After
{ label: "git", quiet: true, timeoutMs: 300_000 }
```

- [ ] **Step 5: Verify parse for both files**

```bash
node --check platform/orchestrator/lib/workflow-engine.js && \
node --check platform/orchestrator/lib/container-manager.js
```

- [ ] **Step 6: Run full test suite**

```bash
node --test platform/orchestrator/lib/workflow-engine.test.js 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add platform/orchestrator/lib/workflow-engine.js platform/orchestrator/lib/container-manager.js
git commit -m "feat: pass phaseTimeoutMs and 5m timeout to all worker execs"
```

---

## Task 5 — Git Retry in `setup-cycle-workspace.sh`

**Files:**
- Modify: `platform/scripts/setup-cycle-workspace.sh`

- [ ] **Step 1: Read the file**

```bash
grep -n "git clone\|git push\|git_retry\|set -" platform/scripts/setup-cycle-workspace.sh | head -20
```

- [ ] **Step 2: Add `git_retry` function after the `set -` line**

After the shebang and `set -uo pipefail` line (line 2), add:

```bash
git_retry() {
  local attempt=1 max=3 delay=5
  until "$@"; do
    if [ "$attempt" -ge "$max" ]; then
      echo "[git] '$*' failed after $max attempts — giving up" >&2
      return 1
    fi
    echo "[git] attempt $attempt failed, retrying in ${delay}s..." >&2
    sleep "$delay"
    delay=$((delay * 2))
    attempt=$((attempt + 1))
  done
}
```

- [ ] **Step 3: Wrap `git clone` with `git_retry`**

Find the `git clone` line. Replace:

```bash
git clone "$REPO_URL" "$WORKSPACE_DIR/Source"
```

with:

```bash
git_retry git clone "$REPO_URL" "$WORKSPACE_DIR/Source"
```

(Match exact variable names and flags already in the file.)

- [ ] **Step 4: Wrap the non-bootstrap `git push` with `git_retry`**

Find the `git push` that does NOT have `|| true` (the one that pushes the cycle branch). Replace:

```bash
git push origin "$CYCLE_BRANCH"
```

with:

```bash
git_retry git push origin "$CYCLE_BRANCH"
```

The bootstrap push (which already has `|| true`) should NOT get `git_retry`.

- [ ] **Step 5: Verify shell syntax**

```bash
bash -n platform/scripts/setup-cycle-workspace.sh
```

Expected: no output (clean parse).

- [ ] **Step 6: Commit**

```bash
git add platform/scripts/setup-cycle-workspace.sh
git commit -m "feat: add git_retry to setup-cycle-workspace.sh (3 attempts, exponential backoff)"
```

---

## Task 6 — Fix Exit-Code Capture in `run-team.sh`

**Files:**
- Modify: `platform/scripts/run-team.sh`

- [ ] **Step 1: Find the broken capture**

```bash
grep -n "PIPESTATUS\|EXIT_CODE\||| true\|claude -p" platform/scripts/run-team.sh | head -20
```

- [ ] **Step 2: Remove `|| true` and fix to `$?`**

Find the block:

```bash
OUTPUT=$(claude -p "$PROMPT" \
  --allowedTools "$TOOLS" \
  --output-format text \
  2>&1) || true
EXIT_CODE=${PIPESTATUS[0]:-$?}
```

Replace with:

```bash
OUTPUT=$(claude -p "$PROMPT" \
  --allowedTools "$TOOLS" \
  --output-format text \
  2>&1)
EXIT_CODE=$?
```

`$?` is captured immediately after the command substitution. The `|| true` is not needed because the script uses `set -uo pipefail` (not `-e`) — a non-zero exit from a command does not abort the script. `PIPESTATUS` with `|| true` reflected `true`'s exit code (0), swallowing Claude failures.

- [ ] **Step 3: Verify shell syntax**

```bash
bash -n platform/scripts/run-team.sh
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add platform/scripts/run-team.sh
git commit -m "fix: capture Claude exit code with \$? instead of PIPESTATUS after || true"
```

---

## Verification

After all tasks are committed:

```bash
# 1. All unit tests pass
node --test platform/orchestrator/lib/workflow-engine.test.js

# 2. No syntax errors in scripts
bash -n platform/scripts/setup-cycle-workspace.sh
bash -n platform/scripts/run-team.sh

# 3. No syntax errors in JS
node --check platform/orchestrator/lib/docker-client.js
node --check platform/orchestrator/lib/workflow-engine.js
node --check platform/orchestrator/lib/container-manager.js
```

Manual smoke tests from the design spec:
- **Phase timeout**: start a run, kill the worker container mid-exec — run should mark `failed` with a timeout error within `phaseTimeoutMs`, not hang
- **Git retry**: temporarily set a bad git token — should see `[git] attempt N failed, retrying` log lines before hard failure
- **Exit code**: target a bad repo — run should fail with `exitCode` non-zero, not report as passed
