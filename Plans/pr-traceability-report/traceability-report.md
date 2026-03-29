# QA Traceability Report: PR Traceability Report Feature

**Reporter:** traceability-report (TheATeam)
**Date:** 2026-03-29
**RISK_LEVEL: medium**

## Summary

The implementation adds traceability enforcer results to PR bodies, making spec coverage a first-class artifact in every PR. All 5 functional requirements and 3 non-functional requirements are correctly implemented across 2 files (`tools/traceability-enforcer.py` and `platform/orchestrator/lib/workflow-engine.js`). `dispatch.js` was correctly NOT modified per design decision.

**Verdict: PASS** -- all FRs verified, all tests pass, no security issues found.

## FR Verification

| FR | Description | Status | Evidence |
|----|-------------|--------|----------|
| FR-TRACE-001 | `--json` flag for traceability-enforcer.py | PASS | `argparse` flag added at line 117-119. JSON output branch at lines 125-155. Tested with `--file`, empty file, and auto-detect. Output matches contract schema exactly (all 6 required keys present, correct types). |
| FR-TRACE-002 | Capture traceability results after QA | PASS | Phase 3.4 at workflow-engine.js:1312-1341. Runs `python3 tools/traceability-enforcer.py --json` via `execInWorker`. Parses JSON, stores on `run.results.traceability`. Error handling sets `status: "unavailable"`. |
| FR-TRACE-003 | Store results on run object | PASS | Lines 1323-1331 store `{ status, totalFrs, coveredFrs, missingFrs, coveragePercent }` matching the contract schema. `saveRunFn(run)` called after store at line 1341. |
| FR-TRACE-004 | Add traceability section to PR body | PASS | Lines 405-427 in `_createPR`. Three rendering paths: full coverage ("All FRs covered"), partial (lists missing FRs with "Uncovered FRs:" heading), unavailable ("Traceability: not available"). Spread into `prBody` array at line 443. 3 unit tests verify all paths. |
| FR-TRACE-005 | `traceability-gap` label when < 100% | PASS | Lines 455-458. Appends `,traceability-gap` to existing labels string. Only fires when `status !== "unavailable"` AND `coveragePercent < 100`. 2 unit tests verify positive and negative cases. Existing label fallback (retry without labels) handles missing label gracefully. |

## NFR Verification

| NFR | Description | Status | Evidence |
|-----|-------------|--------|----------|
| NFR-001 | Backward compatibility | PASS | Without `--json`, text output is unchanged: "Targeting requirements from:", "Scanning N requirements", pass/fail banners. Independently verified by running enforcer both ways. |
| NFR-002 | Graceful degradation | PASS | Enforcer failure -> catch block -> `{ status: "unavailable", reason: err.message }`. Empty stdout -> `{ status: "unavailable", reason: "no output" }`. PR body shows "Traceability: not available". No label added. PR creation never fails. |
| NFR-003 | No new dependencies | PASS | Python `json` module is stdlib. No new npm packages in orchestrator. |

## Test Results

### Unit Tests
- **31/31 passed** (0 failed, 0 skipped)
- Command: `node --test platform/orchestrator/lib/workflow-engine.test.js`
- New test suites added:
  - `_createPR traceability section (FR-TRACE-004)` -- 3 tests (full coverage, partial coverage, unavailable)
  - `_createPR traceability-gap label (FR-TRACE-005)` -- 2 tests (gap present at 20%, gap absent at 100%)

### CLI Verification (independently executed)
- `python3 tools/traceability-enforcer.py --json --file Plans/pr-traceability-report/requirements.md` -> valid JSON, exit 1 (11.1% coverage - expected, FRs in platform/ not Source/)
- `python3 tools/traceability-enforcer.py --file Plans/pr-traceability-report/requirements.md` -> human-readable text, unchanged format (NFR-001 confirmed)
- `python3 tools/traceability-enforcer.py --json --file /tmp/empty-frs.md` (no FR IDs) -> `{ "status": "passed", "total_frs": 0 ... }`, exit 0
- JSON contract validation: all 6 required keys present (`status`, `total_frs`, `covered_frs`, `missing_frs`, `coverage_percent`, `requirements_file`), types correct (int, list, float, string)

### E2E Tests
- 5 test files at `Source/E2E/tests/cycle-run-1774820356169-6cc9bb40/`:
  - `traceability-report-dashboard.spec.ts` -- dashboard, cycles, features page navigation
  - `traceability-report.spec.ts` -- dashboard, cycles, orchestrator page navigation
  - `pr-traceability-report.spec.ts`, `traceability-enforcer-cli.spec.ts`, `traceability-pr-report.spec.ts`
- All use relative URLs (no hardcoded localhost)
- All include `// Verifies:` traceability comments

## Traceability Comment Coverage

| FR | traceability-enforcer.py | workflow-engine.js | workflow-engine.test.js |
|----|--------------------------|-------------------|------------------------|
| FR-TRACE-001 | 5 locations (lines 116, 125, 131, 136, 144) | -- | -- |
| FR-TRACE-002 | -- | 2 locations (lines 1313, 1324) | -- |
| FR-TRACE-003 | -- | 2 locations (lines 1313, 1324) | -- |
| FR-TRACE-004 | -- | 1 location (line 405) | 1 location (line 265) |
| FR-TRACE-005 | -- | 1 location (line 455) | 1 location (line 371) |

## Findings

### LOW -- Edge case: `--json` with nonexistent file outputs text error, not JSON
- **File:** `tools/traceability-enforcer.py:25-26`
- **Description:** When `--json --file /nonexistent/path` is used, the error "Error: Specified file not found" is printed as plain text (not JSON) before `sys.exit(1)`. Similarly, `--json --plan nonexistent-plan` outputs text error.
- **Impact:** None in practice. The workflow engine's catch block in Phase 3.4 handles this gracefully -- `JSON.parse()` throws on the non-JSON text, caught by the try/catch, sets `status: "unavailable"`.
- **Recommendation:** Minor improvement for a future iteration: wrap early-exit errors in JSON format when `--json` is set.

### INFO -- `// Verifies:` comments are in `platform/` and `tools/`, not `Source/`
- The enforcer only scans `Source/` and `E2E/` directories, so `// Verifies: FR-TRACE-XXX` comments in `platform/orchestrator/lib/workflow-engine.js` and `tools/traceability-enforcer.py` are not detected by the enforcer itself. This is expected behavior -- the enforcer is designed for application code traceability, not infrastructure/platform code.

### INFO -- dispatch.js not modified (confirmed)
- Verified via `git diff --name-only HEAD`. Only `workflow-engine.js`, `workflow-engine.test.js`, and `traceability-enforcer.py` were changed.
- This aligns with the design decision: workflow engine runs the enforcer directly rather than relying on QA agent coordination in dispatch.js.

## Architecture Review

- **Placement is correct** -- Phase 3.4 runs after all implementation/QA stages complete (after `run.feedbackLoops = feedbackLoops;`), before Phase 3.5 (app start). Source/ files are finalized at this point.
- **Error isolation** -- traceability capture failure cannot block PR creation (separate try/catch with graceful fallback).
- **Existing patterns followed** -- uses `execInWorker` for tooling (same as smoketest, E2E), label handling in `_createPR` follows existing fallback pattern (retry without labels if they don't exist).
- **No security issues** -- no user input flows into shell commands (the enforcer runs with static args `--json`), heredoc uses single-quoted delimiter preventing variable expansion, FR IDs come from project-controlled requirements files.
- **No new dependencies** -- Python stdlib `json`, no npm additions.

## Files Modified

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| `tools/traceability-enforcer.py` | Modified | ~30 lines added (--json flag + JSON output paths) |
| `platform/orchestrator/lib/workflow-engine.js` | Modified | ~50 lines added (Phase 3.4 capture + PR body section + label logic) |
| `platform/orchestrator/lib/workflow-engine.test.js` | Modified | ~170 lines added (5 new test cases for FR-TRACE-004/005) |

**dispatch.js: NOT modified** (confirmed, per design decision)
