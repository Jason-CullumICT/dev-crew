# Requirements: Bake Playwright into Worker Docker Image

Traces to: `Plans/pipeline-optimisations/prompt.md` (item 6)
Spec refs: `Specifications/tiered-merge-pipeline.md` (FR-TMP-003, FR-TMP-008)

## Verdict: APPROVED

### Problem Statement

Every pipeline cycle reinstalls Playwright's Chromium browser binary (~150 MB download) inside
the worker container via `npx playwright install chromium`. This wastes wall-clock time and
bandwidth on every cycle.

### Current State (Implementation Delta)

| Component | State | Finding |
|-----------|-------|---------|
| `platform/Dockerfile.worker` L38-40 | ⚠️ Partial | Chromium IS built into the image via `playwright install chromium`, but `PLAYWRIGHT_BROWSERS_PATH` is **not set** in the Dockerfile, so the binary lands at `/root/.cache/ms-playwright` |
| `platform/orchestrator/lib/workflow-engine.js` L347-362 | ❌ Gap | Still runs `PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright npx playwright install chromium` per cycle — overrides the browser path so the image-baked binary is never used |
| `platform/orchestrator/lib/workflow-engine.js` L364-370 | ❌ Gap | Still runs `npm install @playwright/test` per cycle |
| `platform/orchestrator/lib/workflow-engine.js` L401 | ❌ Gap | E2E test run uses `PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright` — path mismatch means reinstall is always triggered |

The root cause: the engine overrides `PLAYWRIGHT_BROWSERS_PATH` to `/workspace/.playwright`, a
fresh per-cycle path, so the Dockerfile-baked binary is unreachable. Adding the env var to the
Dockerfile at the correct image path and removing the per-cycle install steps closes the gap.

### Spec Amendment Required

`Specifications/tiered-merge-pipeline.md` currently specifies (FR-TMP-003 and FR-TMP-008):
- "Playwright browsers cached at `PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright`"
- "Chromium installed on first use: `npx playwright install chromium`"
- "Playwright installable on demand (npx playwright install chromium)"

These must be updated to reflect the pre-baked approach. FR-PW-003 covers this amendment.

### ⚠️ Module Ownership Constraint

**All implementation FRs touch `platform/` — which is SOLO-SESSION only per CLAUDE.md.**
Pipeline agents (backend-coder, frontend-coder) MUST NOT touch `platform/`.
These changes must be executed by a solo session, not dispatched to team coders.

---

### Functional Requirements

| ID | Description | Layer | Weight | Acceptance Criteria |
|----|-------------|-------|--------|---------------------|
| FR-PW-001 | Pre-bake Playwright chromium at stable image path | [backend] | S | `docker build` succeeds; `docker run <image> ls /ms-playwright/chromium-*` exits 0; `docker run <image> npx playwright --version` exits 0 |
| FR-PW-002 | Remove per-cycle Playwright reinstall from workflow engine | [backend] | S | E2E phase no longer logs "Installing Playwright chromium..."; chromium found at `/ms-playwright`; existing E2E tests still pass |
| FR-PW-003 | Amend tiered-merge-pipeline spec to reflect pre-baked approach | [backend] | S | Spec FR-TMP-003 and FR-TMP-008 reference pre-installed Chromium; no mention of per-cycle install remains |

---

### Detailed FR Specifications

#### FR-PW-001 — `platform/Dockerfile.worker`

```dockerfile
# Add BEFORE the playwright install block (currently line 38):
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Existing block (now installs chromium to /ms-playwright — no change to commands):
RUN npm install -g playwright \
    && playwright install-deps chromium \
    && playwright install chromium

# Add AFTER the playwright install block — pre-install @playwright/test globally:
RUN npm install -g @playwright/test
```

Acceptance test (in CI or manual image build):
```bash
docker build -f platform/Dockerfile.worker -t worker-test .
docker run --rm worker-test ls /ms-playwright/chromium-*  # must exit 0
docker run --rm worker-test npx playwright --version       # must exit 0
```

#### FR-PW-002 — `platform/orchestrator/lib/workflow-engine.js`, `_runPlaywrightE2E()`

Three sub-changes, all within the `_runPlaywrightE2E()` method:

**Sub-change A**: Remove the chromium install block (lines ~347–362):
```js
// DELETE lines 347-362:
// Install Playwright chromium if needed
// Verifies: FR-TMP-003
console.log(`[${run.id}] Installing Playwright chromium...`);
const installResult = await this.containerManager.execInWorker(
  containerId, "bash",
  ["-c", "PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright npx playwright install chromium"],
  { label: "playwright-install" }
);
if (installResult.exitCode !== 0) {
  // Verifies: FR-TMP-010 — graceful degradation on install failure
  console.warn(`[${run.id}] Playwright install failed (exit ${installResult.exitCode}), skipping E2E`);
  run.e2e = { status: "skipped", reason: "install_failed" };
  saveRunFn(run);
  return true;
}
```

**Sub-change B**: Remove the `@playwright/test` per-cycle install from lines ~364–370.
Keep the `test -f package.json || npm init -y` guard (still needed for E2E project directory
initialization), but remove `npm install @playwright/test`:
```js
// BEFORE (lines 366-370):
["-c", "cd /workspace/Source/E2E && (test -f package.json || npm init -y) && npm install @playwright/test 2>/dev/null || true"],

// AFTER:
["-c", "cd /workspace/Source/E2E && (test -f package.json || npm init -y) || true"],
```

**Sub-change C**: Update `PLAYWRIGHT_BROWSERS_PATH` in the E2E test run command (line ~401):
```js
// BEFORE:
["-c", `cd /workspace/Source/E2E && PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright npx playwright test ...`],

// AFTER:
["-c", `cd /workspace/Source/E2E && PLAYWRIGHT_BROWSERS_PATH=/ms-playwright npx playwright test ...`],
```

Acceptance: Pipeline E2E phase runs without triggering a chromium download; log shows no
"playwright-install" step; E2E tests pass against the live app.

Traceability comments: add `// Verifies: FR-PW-002` at the updated E2E runner block.

#### FR-PW-003 — `Specifications/tiered-merge-pipeline.md`

In **FR-TMP-003**:
- Replace: `Playwright browsers cached at PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright`
- With: `Playwright browsers pre-installed in worker image at PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`
- Replace: `Chromium installed on first use: npx playwright install chromium`
- With: `Chromium pre-installed in worker Docker image; no per-cycle download required`

In **FR-TMP-008**:
- Replace: `Playwright installable on demand (npx playwright install chromium)`
- With: `Playwright and Chromium pre-installed in worker image (Dockerfile.worker)`

---

### Scoping Plan

```
Backend (platform/): 3 × S = 3 pts → 1 solo session
```

> All FRs are `[backend]` and touch `platform/`. They MUST be implemented in a **solo session**,
> not dispatched to a pipeline coder. Pipeline agents are prohibited from modifying `platform/`.

### Assignment

- **Solo Session**: FR-PW-001 [S], FR-PW-002 [S], FR-PW-003 [S] — 3 pts total
  - Implement in order: FR-PW-001 → FR-PW-002 → FR-PW-003
  - Run `python3 tools/traceability-enforcer.py` after completion
  - Rebuild worker image to verify chromium baked at `/ms-playwright`
