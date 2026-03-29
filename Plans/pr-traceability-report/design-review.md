# Design Review: PR Traceability Report

**Reviewer:** design (TheATeam)
**Date:** 2026-03-29
**RISK_LEVEL: medium**

## Summary

The implementation adds traceability report data to pipeline-created PRs by:
1. Adding `--json` output to `traceability-enforcer.py`
2. Capturing traceability results in `workflow-engine.js` after QA (Phase 3.4)
3. Rendering a `### Traceability` section in the PR body
4. Adding a `traceability-gap` label when coverage < 100%

## Verification Gates

| Gate | Result |
|------|--------|
| Unit tests (31 tests) | **PASSED** |
| JSON contract validation | **PASSED** |
| Text mode backward compatibility (NFR-001) | **PASSED** |
| Traceability comments present | **PASSED** |
| dispatch.js not modified (design decision) | **PASSED** |
| E2E test files present | **PASSED** |

## FR Coverage

| FR | Status | Location | Notes |
|----|--------|----------|-------|
| FR-TRACE-001 (--json flag) | **IMPLEMENTED** | `tools/traceability-enforcer.py:116-155` | JSON output matches contract schema exactly |
| FR-TRACE-002 (capture after QA) | **IMPLEMENTED** | `workflow-engine.js:1312-1341` | Placed correctly after feedbackLoops, before Phase 3.5 |
| FR-TRACE-003 (store on run) | **IMPLEMENTED** | `workflow-engine.js:1323-1331` | Correct field mapping (snake_case → camelCase) |
| FR-TRACE-004 (PR body section) | **IMPLEMENTED** | `workflow-engine.js:405-427` | Three rendering paths: full, partial, unavailable |
| FR-TRACE-005 (gap label) | **IMPLEMENTED** | `workflow-engine.js:455-458` | Appended to existing label string |

## NFR Coverage

| NFR | Status | Notes |
|-----|--------|-------|
| NFR-001 (Backward compat) | **PASSED** | Text output unchanged when --json not specified |
| NFR-002 (Graceful degradation) | **PASSED** | catch block stores `{ status: "unavailable" }`, PR creation continues |
| NFR-003 (No new deps) | **PASSED** | Uses Python `json` stdlib and existing JS patterns |

## Test Coverage

Tests in `workflow-engine.test.js` cover:
- Full coverage (100%) → "All FRs covered" text
- Partial coverage (60%) → missing FRs listed individually
- Unavailable traceability → "not available" text
- Label added when coverage < 100%
- Label NOT added when coverage = 100%

## Findings

### LOW: `--json` flag doesn't produce JSON on early exit paths
**File:** `tools/traceability-enforcer.py:25-26, 44-46`
**Detail:** When `get_active_requirements()` calls `sys.exit(1)` because a file/plan is not found, it prints a text error even when `--json` is set. This happens before `args.json` is checked.
**Impact:** Minimal — the workflow engine doesn't pass `--file` or `--plan` flags, it uses auto-detect. The catch block in workflow-engine.js handles the non-JSON output gracefully by setting status to "unavailable".
**Severity:** LOW

### INFO: Empty FR list edge case handled correctly
**File:** `tools/traceability-enforcer.py:136-138`
**Detail:** When requirements file exists but contains no FR-XXX patterns, `--json` returns `{ status: "passed", total_frs: 0, ... }` which is correct per the contract.

### INFO: `coveragePercent` uses `.toFixed(1)` in PR body
**File:** `workflow-engine.js:411`
**Detail:** `traceability.coveragePercent?.toFixed(1)` returns a string. This is fine since it's only used in string interpolation for the PR body.

## Architecture Assessment

The design is clean and additive:
- **No dispatch.js changes** — the workflow engine runs the enforcer directly, avoiding coordination complexity
- **Phase 3.4 placement** is correct: after all implementation/QA stages, before app start
- **Error handling** follows existing patterns (catch → warn → degraded state)
- **Label handling** follows the existing fallback pattern (retry without labels if creation fails)

## Verdict

**APPROVED** — All FRs implemented correctly, all tests pass, contracts match, graceful degradation verified. The one LOW finding (non-JSON output on early exit paths) is mitigated by the catch block in workflow-engine.js.
