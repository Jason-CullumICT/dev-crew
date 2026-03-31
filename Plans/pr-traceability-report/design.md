# Design: PR Traceability Report

## Architecture Overview

This feature touches three files across two layers:

```
tools/traceability-enforcer.py     (CLI tool — add --json output mode)
        ↓ JSON stdout
platform/orchestrator/lib/dispatch.js  (QA phase — capture + parse output)
        ↓ run.results.traceability
platform/orchestrator/lib/workflow-engine.js  (PR creation — format + emit section)
```

The workflow-engine.js file does not exist yet and must be created. It will contain the `_createPR` logic that was previously planned in FR-TMP-004 of the tiered merge pipeline spec.

## Design Decisions

### 1. JSON output via --json flag (not separate command)

Adding a `--json` flag to the existing enforcer keeps one tool with two output modes. The alternative (a separate script) would duplicate logic.

### 2. Traceability runs after QA agents, not during

QA agents may add `// Verifies:` comments. Running the enforcer after QA completes ensures we capture the final state of traceability coverage.

### 3. workflow-engine.js as new module

Since workflow-engine.js doesn't exist yet, the backend-coder will create it with at minimum the `_createPR` function. This function builds the PR body and calls `gh pr create`. The traceability section is one part of the body it constructs.

The module should export a `createWorkflowEngine(runClaudeFn, workspace)` factory (consistent with dispatch.js pattern) and expose `_createPR(run)` for building and creating the PR.

### 4. Graceful degradation everywhere

- Enforcer missing/fails → store `{ status: "ERROR" }`, skip PR section
- `gh` CLI missing → skip label, log warning
- No plan file found → enforcer exits 0 with empty results

## Data Flow

```
1. QA phase completes
2. dispatch.js runs: python3 tools/traceability-enforcer.py --json --plan <slug>
3. Parse stdout JSON → run.results.traceability = { totalFrs, coveredFrs, missingFrs, coveragePct, status }
4. Pipeline proceeds to PR creation
5. workflow-engine.js _createPR reads run.results.traceability
6. Builds "### Traceability" markdown section
7. Appends to PR body
8. After PR created: if coveragePct < 100, run `gh pr edit --add-label traceability-gap`
```

## File Changes

### tools/traceability-enforcer.py
- Add `--json` argument to argparse
- When `--json`: collect results into dict, `json.dumps()` to stdout, suppress all other print output
- Existing behavior unchanged when `--json` not passed

### platform/orchestrator/lib/dispatch.js
- After QA agents complete, add a step to exec `python3 tools/traceability-enforcer.py --json` in the worker
- Parse JSON, store on `run.results.traceability`
- Wrap in try/catch for graceful degradation

### platform/orchestrator/lib/workflow-engine.js (NEW)
- Create module with `_createPR(run)` function
- PR body builder includes sections for: summary, implementation status, QA, smoketest, inspector, E2E, **traceability**
- Traceability section: coverage line + table of missing FRs (if any)
- After PR creation: conditionally add `traceability-gap` label
