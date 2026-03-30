# Pipeline Robustness B — Design Spec

**Date:** 2026-03-31
**Status:** Approved
**Scope:** Fix hangs and silent failures in the orchestrator pipeline

## Problem

Runs either hang indefinitely or fail without a visible, actionable error message. Root causes:

1. `cycleTimeoutMs` and `phaseTimeoutMs` exist in config but are enforced nowhere — a hung Docker exec or Claude agent holds the pipeline open forever.
2. No retry on git network operations — a transient `git clone` or `git push` failure permanently fails the run.
3. `run-team.sh` silently swallows Claude's non-zero exit code — failures are reported as success.

## In Scope (Option B)

Five targeted changes across four files. No architectural changes.

## Out of Scope (deferred to Option C)

- Smoketest double-app-startup fix
- Structured stderr in run result JSON per phase
- `HEALTHCHECK` in Dockerfile.worker
- Cycle watchdog that kills the container (not just marks failed) after timeout

---

## Change 1: Docker exec timeout

**File:** `platform/orchestrator/lib/docker-client.js`

Add `timeoutMs` to the `execInContainer` options bag. Implementation:

```
Promise.race([
  <existing exec stream promise>,
  <timeout promise that resolves after timeoutMs with exitCode: 124>
])
```

- `exitCode: 124` follows the unix `timeout` command convention.
- On timeout, stderr gets: `[timeout] exec '<cmd>' exceeded <ms>ms`
- The timer is cleared in the `stream.on("end")` handler to prevent leaks.
- Default: no timeout (callers opt in by passing `timeoutMs`).

This is the foundational fix — every caller can now bound its exec.

## Change 2: Phase timeout enforcement

**File:** `platform/orchestrator/lib/workflow-engine.js`

Pass `timeoutMs` on exec calls:
- Claude agent execs (leader, implementation, QA, smoketest, inspector): `this.config.phaseTimeoutMs` (default 30 min)
- Non-agent execs (git ops, file reads, commit/push): 5 minutes fixed (`300_000`)

When a phase times out, exitCode 124 propagates through the existing failure path. The run is marked `failed` and `run.results.error` is set to `"Phase '<name>' timed out after 30 minutes"`.

**Container-manager delegation:** `execInWorker` forwards the `timeoutMs` option to `docker-client.execInContainer` unchanged.

## Change 3: Cycle-level watchdog

**File:** `platform/orchestrator/lib/workflow-engine.js`

A `setTimeout` set at the entry of `executeWorkflow`:

```js
const cycleTimer = setTimeout(async () => {
  run.status = "failed";
  run.results = { ...run.results, error: `Cycle timed out after ${cycleTimeoutMs / 60000}m`, allPassed: false };
  saveRunFn(run);
  await this._teardownOnFailure(run.id, containerId).catch(() => {});
}, this.config.cycleTimeoutMs);
```

Cleared in the `finally` block. This is a safety net — phase timeouts catch most hangs earlier.

## Change 4: Git retry in setup-cycle-workspace.sh

**File:** `platform/scripts/setup-cycle-workspace.sh`

Add a `git_retry` shell function before any git network operations:

```bash
git_retry() {
  local attempt=1 max=3 delay=5
  until "$@"; do
    if [ $attempt -ge $max ]; then
      echo "[git] '$*' failed after $max attempts" >&2
      return 1
    fi
    echo "[git] attempt $attempt failed, retrying in ${delay}s..." >&2
    sleep $delay
    delay=$((delay * 2))
    attempt=$((attempt + 1))
  done
}
```

Applied to:
- `git clone` (network required, fails on any blip)
- `git push` at the end (branch push before cycle starts)

The bootstrap `git push` already has `|| true` so it does not use `git_retry`.

## Change 5: Fix run-team.sh exit code

**File:** `platform/scripts/run-team.sh`

**Current (broken):**
```bash
OUTPUT=$(claude -p "$PROMPT" --allowedTools "$TOOLS" --output-format text 2>&1) || true
EXIT_CODE=${PIPESTATUS[0]:-$?}
```

When Claude exits non-zero, `|| true` runs and PIPESTATUS reflects `true`'s exit (0). Failures are silently reported as success.

**Fix:**
```bash
OUTPUT=$(claude -p "$PROMPT" --allowedTools "$TOOLS" --output-format text 2>&1)
EXIT_CODE=$?
```

`$?` is captured immediately after the substitution. The `|| true` is unnecessary because the script uses `set -uo pipefail` (not `-e`) — non-zero exit from a command does not abort the script.

---

## Plan for Option C (future)

**File to create:** `docs/superpowers/plans/YYYY-MM-DD-pipeline-robustness-c.md`

Deferred items:
1. **Smoketest double-start** — `run-smoketest.sh` tries to start an already-running app. Fix: check if the port is already responding before attempting `npm start`, skip start if so.
2. **Structured stderr in results** — each phase result JSON should include a `stderr` tail so failures are diagnosable from the run JSON without checking container logs.
3. **Dockerfile.worker HEALTHCHECK** — add `HEALTHCHECK CMD curl -f http://localhost:3001/api/health || exit 1` so Docker can detect and restart unresponsive workers.
4. **Hard container kill on cycle timeout** — current watchdog only marks the run failed. Extend to also `docker stop` the container so it doesn't idle indefinitely consuming a port slot.

---

## Files Changed

| File | Change |
|------|--------|
| `platform/orchestrator/lib/docker-client.js` | Add `timeoutMs` to `execInContainer` |
| `platform/orchestrator/lib/container-manager.js` | Forward `timeoutMs` in `execInWorker` |
| `platform/orchestrator/lib/workflow-engine.js` | Pass phase timeouts; add cycle watchdog |
| `platform/scripts/setup-cycle-workspace.sh` | Add `git_retry`, apply to clone/push |
| `platform/scripts/run-team.sh` | Fix exit code capture |

## Testing

- Phase timeout: start a run targeting a repo, manually kill the worker container mid-exec — run should mark failed within `phaseTimeoutMs` with a `timeout` error, not hang.
- Git retry: mock a flaky git (e.g., temporary bad token) — should see retry log lines before hard failure.
- Exit code: run a leader session against a bad repo — should fail with non-zero, not show as passed.
