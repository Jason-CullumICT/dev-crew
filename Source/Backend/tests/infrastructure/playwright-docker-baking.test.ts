// Verifies: FR-PW-001, FR-PW-002, FR-PW-003, FR-TMP-003, FR-TMP-008, FR-TMP-010
//
// Infrastructure tests: verify that the "Bake Playwright into worker Docker image"
// feature has been correctly implemented across Dockerfile.worker,
// workflow-engine.js, and the tiered-merge-pipeline spec.
//
// These tests read actual repo files and assert the expected content.
// They fail if the implementation is missing or reverted — acting as
// regression guards and traceability anchors for FR-PW-001/002/003.

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');

const DOCKERFILE = path.join(REPO_ROOT, 'platform', 'Dockerfile.worker');
const WORKFLOW_ENGINE = path.join(REPO_ROOT, 'platform', 'orchestrator', 'lib', 'workflow-engine.js');
const SPEC_FILE = path.join(REPO_ROOT, 'Specifications', 'tiered-merge-pipeline.md');

// ---------------------------------------------------------------------------
// FR-PW-001 — Pre-bake Playwright chromium at stable image path
// ---------------------------------------------------------------------------
describe('FR-PW-001 — Dockerfile.worker bakes Playwright at /ms-playwright', () => {
  let dockerfileContent: string;

  beforeAll(() => {
    dockerfileContent = fs.readFileSync(DOCKERFILE, 'utf8');
  });

  // Verifies: FR-PW-001 — PLAYWRIGHT_BROWSERS_PATH env var points to /ms-playwright
  it('sets ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright', () => {
    expect(dockerfileContent).toMatch(/ENV\s+PLAYWRIGHT_BROWSERS_PATH=\/ms-playwright/);
  });

  // Verifies: FR-PW-001 — Chromium is installed via playwright install chromium in image
  it('installs Chromium browser during image build', () => {
    expect(dockerfileContent).toMatch(/playwright install chromium/);
  });

  // Verifies: FR-PW-001 — @playwright/test is pre-installed globally in the image
  it('pre-installs @playwright/test globally so per-cycle npm install is unnecessary', () => {
    expect(dockerfileContent).toMatch(/npm install -g @playwright\/test/);
  });

  // Verifies: FR-PW-001 — the old unset path (/root/.cache/ms-playwright) is not referenced
  it('does not fall back to the default /root/.cache path (ENV must be explicit)', () => {
    // If PLAYWRIGHT_BROWSERS_PATH is not set, browsers land at the default cache path.
    // This guard ensures the explicit path is always set.
    const hasExplicitEnv = /ENV\s+PLAYWRIGHT_BROWSERS_PATH=\/ms-playwright/.test(dockerfileContent);
    expect(hasExplicitEnv).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FR-PW-002 — Remove per-cycle Playwright reinstall from workflow engine
// ---------------------------------------------------------------------------
describe('FR-PW-002 — workflow-engine.js uses image-baked Chromium, no per-cycle reinstall', () => {
  let engineContent: string;

  beforeAll(() => {
    engineContent = fs.readFileSync(WORKFLOW_ENGINE, 'utf8');
  });

  // Verifies: FR-PW-002 — the per-cycle chromium install block has been removed
  it('does not contain a per-cycle "playwright install chromium" command', () => {
    // The old code ran: PLAYWRIGHT_BROWSERS_PATH=/workspace/.playwright npx playwright install chromium
    expect(engineContent).not.toMatch(/npx playwright install chromium/);
  });

  // Verifies: FR-PW-002 — the per-cycle @playwright/test npm install has been removed
  it('does not run "npm install @playwright/test" per cycle', () => {
    expect(engineContent).not.toMatch(/npm install @playwright\/test/);
  });

  // Verifies: FR-PW-002 — E2E test run uses the image-baked /ms-playwright path
  it('runs E2E tests with PLAYWRIGHT_BROWSERS_PATH=/ms-playwright (not /workspace/.playwright)', () => {
    // Must NOT reference the old per-cycle path
    expect(engineContent).not.toMatch(/PLAYWRIGHT_BROWSERS_PATH=\/workspace\/\.playwright/);
    // Must reference the baked image path
    expect(engineContent).toMatch(/PLAYWRIGHT_BROWSERS_PATH=\/ms-playwright/);
  });

  // Verifies: FR-PW-002 — a traceability comment exists at the updated E2E runner block
  it('has a // Verifies: FR-PW-002 comment in the updated E2E runner block', () => {
    expect(engineContent).toMatch(/Verifies: FR-PW-002/);
  });
});

// ---------------------------------------------------------------------------
// FR-PW-003 — Spec amendment: tiered-merge-pipeline.md reflects pre-baked approach
// ---------------------------------------------------------------------------
describe('FR-PW-003 — tiered-merge-pipeline.md references pre-baked Playwright, not per-cycle install', () => {
  let specContent: string;

  beforeAll(() => {
    specContent = fs.readFileSync(SPEC_FILE, 'utf8');
  });

  // Verifies: FR-PW-003 — spec no longer says "Playwright browsers cached at /workspace/.playwright"
  it('does not describe Playwright browser path as /workspace/.playwright', () => {
    expect(specContent).not.toMatch(/PLAYWRIGHT_BROWSERS_PATH=\/workspace\/\.playwright/);
  });

  // Verifies: FR-PW-003 — spec no longer says "Chromium installed on first use"
  it('does not describe Chromium as "installed on first use" via per-cycle npx command', () => {
    expect(specContent).not.toMatch(/Chromium installed on first use/);
  });

  // Verifies: FR-PW-003 — spec no longer says "Playwright installable on demand"
  it('does not say Playwright is "installable on demand (npx playwright install chromium)"', () => {
    expect(specContent).not.toMatch(/Playwright installable on demand/);
  });

  // Verifies: FR-PW-003 — spec now references pre-installed Chromium in worker image
  it('states that Playwright/Chromium is pre-installed in the worker image', () => {
    // The updated spec must contain language about pre-installation in the image
    expect(specContent).toMatch(/pre-install(ed)?.*worker|worker.*pre-install(ed)?/i);
  });
});

// ---------------------------------------------------------------------------
// FR-TMP-003 — Live Playwright E2E Runner uses correct (baked) browser path
// These tests cross-reference the parent spec FR and verify that the engine
// implementation now uses the image-baked path rather than a per-cycle workspace path.
// ---------------------------------------------------------------------------
describe('FR-TMP-003 — E2E runner references image-baked Chromium path', () => {
  let engineContent: string;

  beforeAll(() => {
    engineContent = fs.readFileSync(WORKFLOW_ENGINE, 'utf8');
  });

  // Verifies: FR-TMP-003 — E2E runner must not trigger a 150 MB per-cycle download
  it('_runPlaywrightE2E does not download Chromium at cycle start', () => {
    // The old "playwright install chromium" step caused the per-cycle 150 MB download.
    // After FR-PW-002 this block must be gone.
    expect(engineContent).not.toMatch(/playwright install chromium/);
  });

  // Verifies: FR-TMP-003 — E2E runner uses /ms-playwright browser path consistently
  it('references /ms-playwright for E2E test execution command', () => {
    expect(engineContent).toMatch(/PLAYWRIGHT_BROWSERS_PATH=\/ms-playwright/);
  });
});

// ---------------------------------------------------------------------------
// FR-TMP-008 — Worker container prerequisites include pre-baked Playwright
// ---------------------------------------------------------------------------
describe('FR-TMP-008 — Dockerfile.worker satisfies container prerequisites', () => {
  let dockerfileContent: string;

  beforeAll(() => {
    dockerfileContent = fs.readFileSync(DOCKERFILE, 'utf8');
  });

  // Verifies: FR-TMP-008 — gh CLI must be in the worker image
  it('installs gh CLI in the worker image', () => {
    expect(dockerfileContent).toMatch(/apt-get install.*\bgh\b|install -y gh/);
  });

  // Verifies: FR-TMP-008 — Playwright is pre-installed (not "on demand") in worker image
  it('pre-installs playwright globally (no per-cycle installation required)', () => {
    expect(dockerfileContent).toMatch(/npm install -g playwright/);
  });

  // Verifies: FR-TMP-008 — PLAYWRIGHT_BROWSERS_PATH is set at image scope
  it('sets PLAYWRIGHT_BROWSERS_PATH so per-cycle overrides are unnecessary', () => {
    expect(dockerfileContent).toMatch(/ENV\s+PLAYWRIGHT_BROWSERS_PATH=\/ms-playwright/);
  });
});

// ---------------------------------------------------------------------------
// FR-TMP-010 — Graceful degradation: skip E2E when no test files present
// The "no tests" skip path must remain functional even after removing the install step.
// ---------------------------------------------------------------------------
describe('FR-TMP-010 — workflow-engine.js still skips E2E gracefully when no tests exist', () => {
  let engineContent: string;

  beforeAll(() => {
    engineContent = fs.readFileSync(WORKFLOW_ENGINE, 'utf8');
  });

  // Verifies: FR-TMP-010 — engine must check for test files before running E2E
  it('checks for E2E test files before attempting to run Playwright', () => {
    expect(engineContent).toMatch(/testFiles\.length === 0|no_tests/);
  });

  // Verifies: FR-TMP-010 — engine sets e2e.status = "skipped" when no tests found
  it('marks run.e2e.status as "skipped" when no test files are present', () => {
    expect(engineContent).toMatch(/status.*skipped|skipped.*status/);
  });
});
