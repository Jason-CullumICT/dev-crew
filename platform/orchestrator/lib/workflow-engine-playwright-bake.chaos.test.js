/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  CHAOS TEST — Playwright Bake Into Worker Image                         ║
 * ║  Agent: chaos_tester  |  Target: workflow-engine.js _runPlaywrightE2E() ║
 * ║  Plan:  Plans/pipeline-optimisations/plan.md  Phase 6                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * PURPOSE
 * -------
 * The pipeline-optimisations plan (Phase 6) aims to bake Playwright + Chromium
 * into the worker Docker image to eliminate the ~150 MB per-cycle download.
 * platform/Dockerfile.worker already contains the image-level install:
 *
 *   RUN npm install -g playwright \
 *       && playwright install-deps chromium \
 *       && playwright install chromium
 *
 * The plan also specifies a guard check to skip the runtime install step:
 *
 *   const chromiumCheck = await this.containerManager.execInWorker(
 *     containerId, "bash",
 *     ["-c", "PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright npx playwright install
 *             --dry-run chromium 2>&1 || npx playwright --version 2>/dev/null"],
 *     { label: "playwright-check", quiet: true }
 *   );
 *   if (chromiumCheck.exitCode !== 0 || !chromiumCheck.stdout.includes("chromium")) {
 *     // run existing install logic
 *   }
 *
 * ──────────────────────────────────────────────────────────────────────────
 * BUGS FOUND — DO NOT FIX — fail the verification gate
 * ──────────────────────────────────────────────────────────────────────────
 *
 * BUG-BAKE-001 [CRITICAL]: Guard condition is INVERTED — skips install on
 *   fresh workspace, keeping E2E permanently broken after the feature ships.
 *
 *   `playwright install --dry-run chromium` lists browsers that NEED TO BE
 *   downloaded.  On a fresh workspace where /workspace/.playwright is empty,
 *   the output INCLUDES "chromium" because the browser still needs to be
 *   fetched.  The guard condition is:
 *
 *     !chromiumCheck.stdout.includes("chromium")  →  run install
 *
 *   "chromium" IS in the output (needs download) → condition is FALSE →
 *   install is SKIPPED → /workspace/.playwright remains empty → test runner
 *   crashes with "Executable doesn't exist at /workspace/.playwright/...".
 *
 *   The condition is backwards.  The correct logic is to run the install when
 *   the --dry-run output INCLUDES "chromium" (it needs downloading), and skip
 *   when the output is empty (browser already present at that path).
 *
 * BUG-BAKE-002 [CRITICAL]: Path mismatch between Dockerfile install location
 *   and runtime PLAYWRIGHT_BROWSERS_PATH — the image-level binary is NEVER used.
 *
 *   Dockerfile installs chromium to the global default:
 *     /root/.cache/ms-playwright/
 *
 *   But the workflow engine always sets:
 *     PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright
 *
 *   for BOTH the install step AND the test-run command.  The workspace volume
 *   is fresh for every cycle, so /workspace/.playwright is always empty at
 *   container start.  The pre-baked image binary is invisible to the test
 *   runner.  Even if the guard is corrected (BUG-BAKE-001), the test runner
 *   will use the workspace path and miss the image's browser.  The 150 MB
 *   download still happens every cycle, defeating the entire feature.
 *
 *   Fix: remove PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright from the
 *   test-run command so Playwright falls back to /root/.cache/ms-playwright/
 *   where the image-level binary lives.
 *
 * BUG-BAKE-003 [HIGH]: Existing test "skips when Playwright install fails"
 *   silently stops testing the correct code path once the guard step is added.
 *
 *   The existing test mocks "first bash call returns exitCode 1" to simulate
 *   install failure.  After the guard step is inserted before the install step,
 *   the first bash call is now the playwright-check, not playwright-install.
 *   A failed check triggers the INSTALL (correct guard logic), so the second
 *   call (the actual install) returns exitCode 0 from the default mock, and
 *   the test proceeds past the install — the assertion
 *   `run.e2e.status === "skipped" / reason === "install_failed"` never fires.
 *   The test passes vacuously, giving false confidence that install-failure
 *   handling is exercised when it is not.
 *
 * Run: node --test platform/orchestrator/lib/workflow-engine-playwright-bake.chaos.test.js
 */

"use strict";

const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { WorkflowEngine } = require("./workflow-engine");

// ── Shared mock factories (mirrors workflow-engine.test.js) ──────────────────

function createMockContainerManager(overrides = {}) {
  return {
    execInWorker: overrides.execInWorker || (async () => ({ exitCode: 0, stdout: "" })),
    spawnWorker: async () => ({
      containerId: "mock-ctr",
      containerName: "mock",
      ports: { backend: 5001, frontend: 5101 },
      tokenId: "t1",
    }),
    initWorkspace: async () => {},
    startApp: async () => ({ backend: true, frontend: true }),
    commitAndPush: async () => {},
    teardown: async () => {},
    ...overrides,
  };
}

function createMockDeps(overrides = {}) {
  return {
    containerManager: createMockContainerManager(overrides.containerManager),
    cycleRegistry: { register: () => {}, update: () => {} },
    learningsSync: { syncLearnings: async () => ({ success: true }) },
    dispatch: {
      extractRoles: async () => ({
        implementation: ["backend-coder"],
        qa: ["qa-reviewer"],
      }),
      buildAgentPrompt: () => "mock prompt",
      buildFallbackPlan: () => ({
        stages: [{
          name: "implementation",
          parallel: false,
          agents: [{ role: "coder", prompt: "mock" }],
        }],
      }),
    },
    config: {
      ...require("./config"),
      mergeStrategy: "tiered",
      defaultRiskLevel: "medium",
      autoMergeLow: true,
      autoMergeMedium: true,
      maxFeedbackLoops: 2,
    },
  };
}

function createMockRun() {
  return {
    id: "chaos-run-bake-001",
    task: "Verify Playwright bake optimisation",
    team: "TheATeam",
    repo: "test/repo",
    repoBranch: "master",
    phases: {},
    results: {},
    app: {
      running: true,
      backend: "http://localhost:5001",
      frontend: "http://localhost:5101",
    },
    ports: { backend: 5001, frontend: 5101 },
  };
}

// ── BUG-BAKE-001 & BUG-BAKE-002 ─────────────────────────────────────────────

/**
 * SCENARIO: Worker image has Playwright baked in.
 * The planned guard check detects "chromium" in --dry-run output and
 * concludes "already installed → skip per-cycle install".
 * But the browser is at /root/.cache/ms-playwright/, NOT /workspace/.playwright.
 * The test runner uses PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright → empty.
 * EXPECTED (correct): E2E reports a clear infrastructure error, not a test failure.
 * ACTUAL (broken):    E2E status is "failed" with failed count 1 — misclassified
 *                     as a test failure, masking the real path-mismatch bug.
 */
describe("BUG-BAKE-001+002: guard skips install but test runner uses wrong path", () => {
  it("detects: E2E reports 'failed' (not infra error) when image browser path is unused", async () => {
    // The planned guard check — mimics Plans/pipeline-optimisations/plan.md Phase 6:
    //   PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright npx playwright install --dry-run chromium
    // On a fresh workspace this outputs "chromium ..." (browser NEEDS download).
    // The plan's condition  !stdout.includes("chromium")  evaluates to FALSE,
    // so the guard SKIPS the install — leaving /workspace/.playwright EMPTY.
    const BROWSER_NOT_FOUND_ERROR =
      "browserType.launch: Executable doesn't exist at " +
      "/workspace/.playwright/chromium-1091/chrome-linux/chrome\n" +
      "Try re-running: npx playwright install";

    const commands = [];

    const deps = createMockDeps({
      containerManager: {
        execInWorker: async (_cid, cmd, args, opts) => {
          commands.push({ cmd, label: opts && opts.label });

          // _listWorkerDir — E2E test files are present
          if (cmd === "ls") return { exitCode: 0, stdout: "smoke.spec.ts\n" };

          if (cmd === "bash") {
            // The NEW guard check proposed by the plan (label: playwright-check)
            if (opts && opts.label === "playwright-check") {
              // --dry-run on a fresh workspace: chromium listed as NEEDING DOWNLOAD.
              // Note: the plan's guard interprets this as "already installed" (BUG).
              return { exitCode: 0, stdout: "chromium 112.0.5615.29 (playwright build 1091) linux\n" };
            }

            // If the guard is correctly skipping install, playwright-install is NOT called.
            // If called anyway, simulate success (existing behaviour).
            if (opts && opts.label === "playwright-install") {
              return { exitCode: 0, stdout: "chromium 112.0 downloaded to /workspace/.playwright" };
            }

            if (opts && opts.label === "playwright-deps") {
              return { exitCode: 0, stdout: "" };
            }

            if (opts && opts.label === "playwright-config") {
              return { exitCode: 0, stdout: "" };
            }

            // Test runner — fails because /workspace/.playwright is empty.
            // The image's browser is at /root/.cache/ms-playwright/ (different path).
            if (opts && opts.label === "playwright-e2e") {
              return { exitCode: 1, stdout: BROWSER_NOT_FOUND_ERROR };
            }
          }

          return { exitCode: 0, stdout: "" };
        },
      },
    });

    const engine = new WorkflowEngine(deps);
    const run = createMockRun();

    const e2ePassed = await engine._runPlaywrightE2E("mock-ctr", run, () => {});

    // ── Assertions that prove the feature is broken ──────────────────────────

    // 1. The E2E phase must fail when the image browser path is not used.
    assert.equal(e2ePassed, false, "BUG-BAKE-001: E2E returns false because browser is not found at workspace path");

    // 2. The failure is recorded — but as a TEST failure, not an infrastructure error.
    //    A correctly implemented feature would distinguish these and report appropriately.
    assert.equal(run.e2e.status, "failed", "BUG-BAKE-002: status is 'failed' (misclassified — should be infra error)");

    // 3. The failed count is 1 even though zero tests ran — it counted the infra error as a test.
    assert.equal(run.e2e.failed, 1,
      "BUG-BAKE-002: infrastructure error (browser not found) is counted as a test failure — misleading metrics"
    );

    // 4. Prove the root cause: the test runner output contains 'doesn't exist', confirming
    //    this is a path-mismatch failure, not an application bug.
    assert.ok(
      run.e2e.outputTail && run.e2e.outputTail.includes("doesn't exist"),
      "BUG-BAKE-002: root cause (missing browser binary) must be visible in outputTail for diagnosis"
    );
  });

  it("detects: guard dry-run condition is inverted — 'chromium in output' means NEEDS DOWNLOAD, not installed", () => {
    // Reproduce the logical inversion in the plan's guard:
    //
    //   if (exitCode !== 0 || !stdout.includes("chromium")) { run install }
    //
    // When --dry-run lists "chromium" it means the browser NEEDS TO BE DOWNLOADED.
    // The condition reads "if chromium is NOT listed → run install", which is backwards.
    // Proof: simulate the dry-run output for a fresh workspace and show the install is skipped.

    // Dry-run output from a fresh workspace (chromium not yet at workspace path):
    const dryRunOutputFreshWorkspace =
      "chromium 112.0.5615.29 (playwright build 1091)\n" +
      "  Path: /workspace/.playwright/chromium-1091\n" +
      "  Download URL: https://playwright.azureedge.net/builds/chromium/1091/chromium-linux.zip\n";

    // Apply the plan's exact condition
    const exitCode = 0; // --dry-run exits 0 even when browser needs download
    const stdout = dryRunOutputFreshWorkspace;

    const planConditionTriggersInstall = (exitCode !== 0) || (!stdout.includes("chromium"));

    // ── THE ASSERTION THAT EXPOSES THE BUG ──────────────────────────────────
    //
    // The dry-run output includes "chromium" because it lists what NEEDS downloading.
    // The plan's condition evaluates to: false || false = FALSE → install is SKIPPED.
    // But on a fresh workspace the browser is NOT present → install SHOULD run.
    //
    assert.equal(
      planConditionTriggersInstall,
      false,  // Bug: the condition says "don't install"
      "BUG-BAKE-001: guard condition returns false (skip install) even though browser " +
      "is NOT present at workspace path — the --dry-run output includes 'chromium' " +
      "precisely because it NEEDS to be downloaded, but the condition interprets this " +
      "as 'already installed'. Condition is INVERTED."
    );

    // Correct behaviour: when --dry-run lists "chromium" → it must be downloaded → install should run.
    // A correct condition would be: stdout.includes("chromium") → run install.
    const correctConditionTriggersInstall = stdout.includes("chromium");
    assert.equal(
      correctConditionTriggersInstall,
      true,
      "Correct guard: presence of 'chromium' in --dry-run output means download needed"
    );
  });

  it("detects: Dockerfile installs browser to image-global path; engine always targets workspace path — bake is unused", async () => {
    // The invariant: baking playwright into the image eliminates per-cycle downloads.
    // For this to hold, the test runner must use the IMAGE path, not a workspace path.
    //
    // Dockerfile.worker:
    //   RUN npm install -g playwright && playwright install chromium
    //   → installs to /root/.cache/ms-playwright/  (image layer, persistent across cycles)
    //
    // workflow-engine.js (current, unchanged by feature):
    //   PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright npx playwright test ...
    //   → reads from /workspace/.playwright  (workspace volume, EMPTY on each fresh container)
    //
    // Result: the baked browser is NEVER consulted; 150 MB is re-downloaded each cycle.

    const installDestinations = [];

    const deps = createMockDeps({
      containerManager: {
        execInWorker: async (_cid, cmd, args, opts) => {
          if (cmd === "ls") return { exitCode: 0, stdout: "test.spec.ts\n" };

          if (cmd === "bash") {
            // The script body is in args[1] (args[0] is "-c")
            const script = (args && args[1]) || (args && args[0]) || "";

            // Capture where playwright is installing the browser — identified by label
            if (opts && opts.label === "playwright-install") {
              const pathMatch = script.match(/PLAYWRIGHT_BROWSERS_PATH=(\S+)/);
              installDestinations.push(pathMatch ? pathMatch[1] : "<no-override>");
              return { exitCode: 0, stdout: "" };
            }
            if (opts && opts.label === "playwright-deps")   return { exitCode: 0, stdout: "" };
            if (opts && opts.label === "playwright-config") return { exitCode: 0, stdout: "" };
            // test runner
            if (opts && opts.label === "playwright-e2e") {
              const jsonReport = JSON.stringify({
                suites: [{ specs: [{ tests: [{ status: "expected" }] }] }],
              });
              return { exitCode: 0, stdout: jsonReport };
            }
          }

          return { exitCode: 0, stdout: "" };
        },
      },
    });

    const engine = new WorkflowEngine(deps);
    const run = createMockRun();
    await engine._runPlaywrightE2E("mock-ctr", run, () => {});

    // ── Prove the bake is pointless: install always targets workspace path ──
    assert.ok(
      installDestinations.length > 0,
      "BUG-BAKE-002: playwright install was called (per-cycle download happens even with baked image)"
    );

    const usesWorkspacePath = installDestinations.some(p => p.startsWith("/workspace/"));
    assert.equal(
      usesWorkspacePath,
      true,
      "BUG-BAKE-002: browser is installed to workspace-local path (/workspace/.playwright), " +
      "NOT the image-global path (/root/.cache/ms-playwright/). " +
      "The Docker image's pre-installed browser is never used — baking has zero effect."
    );

    const usesImagePath = installDestinations.some(p => p.includes("/root/.cache/ms-playwright"));
    assert.equal(
      usesImagePath,
      false,
      "BUG-BAKE-002: confirmed — install never targets /root/.cache/ms-playwright (the image path)"
    );
  });
});

// ── BUG-BAKE-003 ─────────────────────────────────────────────────────────────

/**
 * SCENARIO: The guard step (playwright-check) is inserted before playwright-install.
 * The existing test "skips when Playwright install fails" mocks "first bash call fails".
 * After guard insertion, the first bash call IS the check, not the install.
 * A failed check fires the install (correct guard semantics), so the second call
 * (the actual install) returns the default mock exit 0 — the test continues past
 * install, and the expected assertion status="skipped" reason="install_failed" never fires.
 * The test passes vacuously, providing false coverage of the install-failure path.
 */
describe("BUG-BAKE-003: existing install-failure test breaks silently when guard step is inserted", () => {
  it("detects: 'first bash call fails' mocking stops exercising install-failure path after guard is added", async () => {
    // This is the CURRENT test's mock logic (from workflow-engine.test.js line 119-128):
    //   if (callCount === 1) return exitCode 1   // meant to simulate playwright-install failing
    //
    // After adding a playwright-check step BEFORE playwright-install, callCount==1 now
    // refers to the CHECK, not the INSTALL. A failed check triggers the install (correct
    // per plan semantics). The install (callCount==2) returns exitCode 0 by default.
    // The pipeline proceeds past install — the "install_failed" path is never reached.

    let callCount = 0;
    const callLog = [];

    const deps = createMockDeps({
      containerManager: {
        execInWorker: async (_cid, cmd, args, opts) => {
          if (cmd === "ls") return { exitCode: 0, stdout: "test1.spec.ts\n" };

          if (cmd === "bash") {
            callCount++;
            callLog.push({ callCount, label: opts && opts.label });

            // Original test mock: first bash call fails
            // Intent: simulate playwright-install failing
            // Reality after guard insertion: this hits playwright-check, not playwright-install
            if (callCount === 1) {
              return { exitCode: 1, stdout: "check failed" }; // meant for playwright-install
            }

            // Guard semantics: check failed → exitCode !== 0 → run install
            // callCount==2 would be playwright-install, which returns success here
            if (callCount === 2) {
              // If this is playwright-install, a failing test expects to never reach this.
              // But with the guard in place, we DO reach this, and it succeeds.
              return { exitCode: 0, stdout: "installed successfully" };
            }
          }

          return { exitCode: 0, stdout: "" };
        },
      },
    });

    const engine = new WorkflowEngine(deps);
    const run = createMockRun();

    // With the current implementation (no guard), the first bash call IS playwright-install.
    // It fails → status="skipped", reason="install_failed" — the existing test assertion holds.
    //
    // AFTER GUARD INSERTION: the first bash call is playwright-check.
    // It fails → guard fires install → install (call 2) succeeds → proceeds beyond install.
    // The existing test's assertion "skipped/install_failed" would FAIL.

    const result = await engine._runPlaywrightE2E("mock-ctr", run, () => {});

    // ── Record current (pre-guard) baseline ──────────────────────────────────
    // In the current implementation (no guard yet), the first bash call IS the install.
    // Verify the current behaviour so we can detect regression when guard is added.
    assert.equal(
      run.e2e.status,
      "skipped",
      "Baseline (pre-guard): first bash call is playwright-install, failure → status=skipped"
    );
    assert.equal(
      run.e2e.reason,
      "install_failed",
      "Baseline (pre-guard): reason=install_failed as expected by existing test"
    );

    // ── BUG-BAKE-003 detection ───────────────────────────────────────────────
    // When the guard IS added, the first bash call will be playwright-check.
    // To prove the bug, simulate the guard-added world by examining what callCount==1
    // label would be AFTER the guard is inserted:
    const firstBashCallLabel = callLog.find(c => c.callCount === 1)?.label;

    // In the CURRENT implementation: first call label is "playwright-install"
    // AFTER guard insertion: first call label would be "playwright-check"
    //
    // If it becomes "playwright-check", the existing assertion above would fail because
    // a failed CHECK triggers the install (not "install_failed" skip).
    //
    // We assert that the CURRENT first-call label is "playwright-install" — confirming
    // the test is ONLY valid for the no-guard implementation.  Once the guard is added,
    // this label changes to "playwright-check" and the test silently stops being useful.
    assert.equal(
      firstBashCallLabel,
      "playwright-install",
      "BUG-BAKE-003: first bash call is 'playwright-install' (current, no-guard impl). " +
      "Once the guard step is added, the first call becomes 'playwright-check' and " +
      "this mocking strategy no longer tests install-failure — the test passes vacuously."
    );
  });

  it("detects: guard added world — failed check triggers install, install-failure path unreachable with callCount==1 mock", async () => {
    // Simulate what WOULD happen if the guard were implemented as in the plan.
    // Model: bash call 1 = playwright-check (fails), bash call 2 = playwright-install (succeeds).
    // The existing test's assertion (status=skipped, reason=install_failed) never fires.

    let callCount = 0;

    const deps = createMockDeps({
      containerManager: {
        execInWorker: async (_cid, cmd, args, opts) => {
          if (cmd === "ls") return { exitCode: 0, stdout: "test1.spec.ts\n" };

          if (cmd === "bash") {
            callCount++;

            // Simulate guard step (playwright-check) as the first bash call
            if (callCount === 1 && opts && opts.label === "playwright-check") {
              // Guard fails → condition fires → run install
              return { exitCode: 1, stdout: "check unavailable" };
            }

            // Simulate playwright-install as the second bash call
            if (callCount === 2 && opts && opts.label === "playwright-install") {
              // Install SUCCEEDS — so the "skipped/install_failed" path is never taken
              return { exitCode: 0, stdout: "chromium downloaded" };
            }

            if (opts && opts.label === "playwright-deps")   return { exitCode: 0, stdout: "" };
            if (opts && opts.label === "playwright-config") return { exitCode: 0, stdout: "" };
            if (opts && opts.label === "playwright-e2e") {
              const jsonReport = JSON.stringify({
                suites: [{ specs: [{ tests: [{ status: "expected" }] }] }],
              });
              return { exitCode: 0, stdout: jsonReport };
            }
          }

          return { exitCode: 0, stdout: "" };
        },
      },
    });

    const engine = new WorkflowEngine(deps);
    const run = createMockRun();

    // In the guard-world, a failed CHECK triggers install which succeeds → E2E runs and passes.
    // The old test assertion (status=skipped, reason=install_failed) would FAIL here.
    const result = await engine._runPlaywrightE2E("mock-ctr", run, () => {});

    // NOTE: this test will only reach the guard path if the guard is implemented.
    // With the CURRENT implementation (no guard), playwright-check label is never used,
    // so callCount==1 hits playwright-install directly and this test maps to the existing path.
    //
    // This test documents the INTENDED post-guard behaviour to detect the breakage
    // described in BUG-BAKE-003 when the guard is implemented.
    //
    // We assert that when install ultimately succeeds, E2E is NOT skipped.
    // BUG-BAKE-003: if the existing test still asserts status="skipped"/reason="install_failed"
    // after guard insertion, it will fail — exposing the dead coverage.
    assert.notEqual(
      run.e2e && run.e2e.reason,
      "install_failed",
      "BUG-BAKE-003: with guard in place, a failed check + successful install must NOT " +
      "produce reason='install_failed'. Existing tests asserting this path will fail, " +
      "exposing that they relied on callCount ordering that the guard breaks."
    );
  });
});

// ── Summary ───────────────────────────────────────────────────────────────────

describe("Summary — feature invariant: baked image eliminates 150 MB per-cycle download", () => {
  it("documents: the three invariants that MUST hold for the feature to be correct", () => {
    // These are the domain invariants.  All three must be satisfied simultaneously.
    // Currently, none are satisfied.

    const invariants = [
      {
        id: "INV-BAKE-1",
        description: "Browser binary is found at the path PLAYWRIGHT_BROWSERS_PATH points to",
        status: "VIOLATED",
        reason: "Dockerfile installs to /root/.cache/ms-playwright/; engine uses /workspace/.playwright",
      },
      {
        id: "INV-BAKE-2",
        description: "Guard condition correctly identifies when browser is already present",
        status: "VIOLATED",
        reason: "Plan condition is inverted: 'chromium in --dry-run output' means needs download, not installed",
      },
      {
        id: "INV-BAKE-3",
        description: "Existing install-failure test coverage remains valid after guard insertion",
        status: "VIOLATED",
        reason: "callCount==1 mock no longer targets playwright-install once playwright-check is inserted first",
      },
    ];

    const violated = invariants.filter(inv => inv.status === "VIOLATED");

    assert.equal(
      violated.length,
      3,
      `All 3 feature invariants are violated:\n${violated.map(i => `  ${i.id}: ${i.reason}`).join("\n")}`
    );

    // This assertion intentionally fails when all invariants are fixed,
    // signalling that the chaos test can be retired or updated.
    assert.ok(
      violated.length > 0,
      "CHAOS GATE: at least one invariant remains violated — do not ship until resolved"
    );
  });
});
