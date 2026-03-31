# Requirements: PR Traceability Report

## Overview

Include traceability enforcer output in PR body when the pipeline creates a pull request, making spec coverage a first-class visible artifact in every PR.

## Functional Requirements

### FR-PTR-001: JSON Output Mode for Traceability Enforcer [backend]

The traceability enforcer (`tools/traceability-enforcer.py`) must support a `--json` flag that outputs machine-readable results.

- When `--json` is passed, output a JSON object to stdout (no decorative text)
- JSON schema:
  ```json
  {
    "plan_file": "Plans/example/requirements.md",
    "total_frs": 10,
    "covered_frs": 8,
    "missing_frs": ["FR-XXX-009", "FR-XXX-010"],
    "coverage_pct": 80.0,
    "status": "FAIL"
  }
  ```
- `status` is `"PASS"` when `missing_frs` is empty, `"FAIL"` otherwise
- Exit code remains 0 for PASS, 1 for FAIL (unchanged behavior)
- Human-readable output (existing behavior) remains the default when `--json` is not passed

### FR-PTR-002: Capture Traceability Output in QA Phase [backend]

The orchestrator's dispatch/QA phase must capture the traceability enforcer's JSON output and store it on the run object.

- After QA agents complete, run `python3 tools/traceability-enforcer.py --json --plan <plan-name>` inside the worker container
- Parse the JSON output and store as `run.results.traceability`:
  ```js
  run.results.traceability = {
    totalFrs: 10,
    coveredFrs: 8,
    missingFrs: ["FR-XXX-009", "FR-XXX-010"],
    coveragePct: 80.0,
    status: "PASS" | "FAIL"
  }
  ```
- If the enforcer fails to run or produces invalid JSON, store a fallback:
  ```js
  run.results.traceability = { status: "ERROR", error: "<message>" }
  ```

### FR-PTR-003: Traceability Section in PR Body [backend]

The `_createPR` function in `workflow-engine.js` must include a `### Traceability` section in the PR body.

- Section placed after existing QA/inspector results sections
- Format when traceability data is available:
  ```markdown
  ### Traceability
  **Coverage: 8/10 FRs (80.0%)**

  | Status | FR ID |
  |--------|-------|
  | :white_check_mark: | FR-XXX-001 |
  | :x: | FR-XXX-009 |
  | :x: | FR-XXX-010 |
  ```
- Format when traceability data is unavailable or errored:
  ```markdown
  ### Traceability
  Traceability data not available.
  ```
- When coverage is 100%, show a single summary line (no table of missing FRs needed)

### FR-PTR-004: Traceability Gap Label [backend]

When traceability coverage is below 100%, add a `traceability-gap` label to the PR.

- Applied via `gh pr edit --add-label traceability-gap` after PR creation
- Only applied when `run.results.traceability.coveragePct < 100`
- Not applied when traceability data is unavailable (don't penalize for enforcer errors)
- If `gh` CLI is unavailable, log a warning and continue (graceful degradation, consistent with FR-TMP-004)

## Non-Functional Requirements

- NFR-1: The `--json` flag must not break existing traceability-enforcer behavior (backward-compatible)
- NFR-2: Traceability capture must not block the pipeline if the enforcer script is missing or fails
- NFR-3: PR body section must render correctly in GitHub markdown
