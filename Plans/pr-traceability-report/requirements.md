# Requirements: PR Traceability Report

## Overview
Include traceability enforcer results in the PR body when the pipeline creates a pull request, making spec coverage a first-class visible artifact in every PR.

## Functional Requirements

### FR-TRACE-001: JSON output mode for traceability-enforcer.py
**Priority:** High
**Size:** S
**Files:** `tools/traceability-enforcer.py`

The traceability enforcer must support a `--json` flag that outputs machine-readable JSON instead of human-readable text. The JSON output must include:
- `total_frs`: total number of FR-XXX IDs found in the requirements file
- `covered_frs`: list of FR IDs that have matching `// Verifies: FR-XXX` comments in Source/
- `missing_frs`: list of FR IDs that lack implementation references
- `coverage_percent`: float (0-100) representing coverage
- `requirements_file`: path to the requirements file used
- `status`: "passed" or "failed"

The existing human-readable output and exit code behavior must remain unchanged when `--json` is not specified.

### FR-TRACE-002: Capture traceability results after QA
**Priority:** High
**Size:** M
**Files:** `platform/orchestrator/lib/workflow-engine.js`

After implementation and QA stages complete in `executeWorkflow`, the workflow engine must run `python3 tools/traceability-enforcer.py --json` inside the worker container, parse the JSON output, and store the result on `run.results.traceability`. This runs before Phase 3.5 (app start) so data is available for `_createPR` later. If the enforcer fails or produces unparseable output, store `{ status: "unavailable", reason: "..." }`.

### FR-TRACE-003: Store traceability results on the run object
**Priority:** High
**Size:** M
**Files:** `platform/orchestrator/lib/workflow-engine.js`

After QA stages complete, the workflow engine must:
1. Read the traceability results JSON from the worker filesystem (at `Plans/<plan-dir>/traceability-results.json` or fallback to running the enforcer directly)
2. Parse the JSON and store results on `run.results.traceability` with the structure:
   - `totalFrs`: number
   - `coveredFrs`: string[]
   - `missingFrs`: string[]
   - `coveragePercent`: number
   - `status`: "passed" | "failed" | "unavailable"

### FR-TRACE-004: Add traceability section to PR body
**Priority:** High
**Size:** M
**Files:** `platform/orchestrator/lib/workflow-engine.js` (`_createPR` method)

The `_createPR` method must include a `### Traceability` section in the PR body showing:
- Total FRs in plan vs FRs with `// Verifies` comments
- Coverage percentage (formatted as "X/Y (Z%)")
- List of any uncovered FRs (each on its own line, so reviewers see exactly what's missing)
- If traceability data is unavailable, show "Traceability: not available"

### FR-TRACE-005: Add traceability-gap label when coverage < 100%
**Priority:** Medium
**Size:** S
**Files:** `platform/orchestrator/lib/workflow-engine.js` (`_createPR` method)

If traceability coverage is below 100%, add a `traceability-gap` label to the PR (appended to existing labels). This label should be added in the initial `gh pr create` call if possible, or via `gh pr edit` as a fallback.

## Non-Functional Requirements

### NFR-001: Backward Compatibility
The `--json` flag is additive. Without it, `traceability-enforcer.py` must behave identically to today. Exit codes remain: 0 = all covered, 1 = gaps exist.

### NFR-002: Graceful Degradation
If traceability results are unavailable (no requirements file, enforcer not run, JSON parse failure), the PR body should show "Traceability: not available" and no label should be added. The PR creation must not fail.

### NFR-003: No New Dependencies
The `--json` flag should use Python's built-in `json` module. No new npm packages for the workflow engine changes.
