# Pipeline Robustness C — Deferred Items

> **Status:** Deferred. Implement after Option B is complete and validated in production.
> **Spec reference:** `docs/superpowers/specs/2026-03-31-pipeline-robustness-b-design.md` — "Plan for Option C" section

These four items were deliberately left out of Option B to keep that scope minimal and shippable. Each is independent and can be implemented in any order.

---

## Item 1 — Smoketest Double-App-Startup Fix

**File:** `platform/scripts/run-smoketest.sh`

**Problem:** `run-smoketest.sh` attempts `npm start` even if the app is already running on the target port (started by a prior phase). This causes a port conflict, a misleading error, and a failed smoketest that has nothing to do with code quality.

**Fix:** Before attempting to start the backend or frontend, check whether the port is already responding:

```bash
port_in_use() {
  local port="$1"
  curl -s -o /dev/null -w '%{http_code}' --max-time 1 "http://localhost:${port}" 2>/dev/null | grep -qv "^000$"
}
```

If `port_in_use "$BACKEND_PORT"` returns true, skip the `npm start` block and set `BACKEND_STARTED=true` directly. Same for the frontend port.

**Testing:** Start the app manually on port 3001, then run `run-smoketest.sh` — it should detect the running app and skip startup rather than failing with a port conflict.

---

## Item 2 — Structured `stderr` in Phase Results

**Files:** `platform/orchestrator/lib/workflow-engine.js`, related phase result types

**Problem:** When a phase fails, the only diagnostic is the top-level `run.results.error` string. The stdout/stderr from the failed exec is lost after the run completes — diagnosing requires fetching container logs manually.

**Fix:** Each phase result entry in `run.results.phases` should include a `stderr` field with the last N lines (e.g., 50 lines) of stderr from the exec. The `execInContainer` result already returns `stderr` — it just isn't stored.

Shape change:

```js
// Before
run.results.phases[phaseName] = { passed, exitCode };

// After
run.results.phases[phaseName] = { passed, exitCode, stderr: lastLines(stderr, 50) };
```

Add a `lastLines(str, n)` helper that splits on `\n` and returns the last `n` lines joined.

**Testing:** Trigger a deliberate phase failure (e.g., bad import). Fetch the run JSON — `phases.<name>.stderr` should contain the relevant error lines without opening container logs.

---

## Item 3 — `HEALTHCHECK` in `Dockerfile.worker`

**File:** `platform/Dockerfile.worker`

**Problem:** Docker has no way to detect an unresponsive worker. A worker that passes startup but hangs on internal health checks occupies a port slot and never gets a new exec.

**Fix:** Add a `HEALTHCHECK` instruction to `Dockerfile.worker`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1
```

This requires the worker to expose a health endpoint (which the current worker does not — it's idle by default with `CMD ["tail", "-f", "/dev/null"]`). Options:
- Add a minimal HTTP health server to the worker image
- Or switch to a process-based check: `CMD pgrep -x tail || exit 1`

The process-based check is simpler and sufficient for confirming the container is alive.

**Testing:** Build the worker image and run `docker inspect --format='{{.State.Health.Status}}' <container>` — should show `healthy` within 60s of start.

---

## Item 4 — Hard Container Kill on Cycle Timeout

**File:** `platform/orchestrator/lib/workflow-engine.js`

**Problem:** The cycle watchdog added in Option B marks the run `failed` but leaves the Docker container running. The container idles indefinitely, holding a port slot and preventing new runs from using that slot.

**Fix:** Extend the watchdog callback to also stop the container after marking the run failed:

```js
const cycleTimer = setTimeout(async () => {
  // ... existing: set run.status = "failed", saveRunFn, etc. ...
  await this._teardownOnFailure(run.id, containerId).catch(() => {});
  // ADD: hard stop if teardown didn't kill it
  await this.containerManager.stopContainer(containerId).catch(() => {});
}, this.config.cycleTimeoutMs);
```

Verify that `containerManager.stopContainer` (or equivalent) exists. If it doesn't, add it as a thin wrapper around `docker.getContainer(id).stop({ t: 10 })`.

**Testing:** Set `cycleTimeoutMs` to a small value (e.g., 10s) in a test config, start a run that will hang, wait for the watchdog to fire — `docker ps` should show the container is no longer running.
