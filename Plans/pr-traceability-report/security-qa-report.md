# Security QA Report: PR Traceability Report

**Role:** security-qa
**Team:** TheATeam
**Date:** 2026-03-29
**RISK_LEVEL:** medium

## Summary

The PR traceability report feature threads traceability data through three layers: `traceability-enforcer.py --json` → `workflow-engine.js` (capture) → `_createPR` (render). Implementation covers all 5 FRs (FR-TRACE-001 through FR-TRACE-005) and matches the design doc and contracts.

## Verification Results

### 1. JSON Output Contract (FR-TRACE-001) — PASS
- `python3 tools/traceability-enforcer.py --json --file Plans/pr-traceability-report/requirements.md` produces valid JSON
- All required fields present: `status`, `total_frs`, `covered_frs`, `missing_frs`, `coverage_percent`, `requirements_file`
- Types match contract: `status` is string ("passed"/"failed"), `total_frs` is int, lists are arrays, `coverage_percent` is float
- Exit code 1 when gaps exist, exit code 0 when all covered — matches contract

### 2. Backward Compatibility (NFR-001) — PASS
- Without `--json`, output is human-readable with "Targeting requirements from:", "Scanning X requirements", and the existing pass/fail formatting
- Identical behavior to pre-change — the `--json` flag is purely additive

### 3. Traceability Capture Logic (FR-TRACE-002, FR-TRACE-003) — PASS
- Located at `workflow-engine.js:1312-1341` after `run.feedbackLoops = feedbackLoops;` and before Phase 3.5
- Correct placement: all implementation and QA work is done, Source/ files are finalized
- Uses `execInWorker` with `2>/dev/null` to suppress stderr
- Parses JSON stdout and maps snake_case to camelCase correctly
- Error handling: both empty output and exceptions set `{ status: "unavailable", reason: ... }`
- `saveRunFn(run)` called after capture to persist results

### 4. PR Body Traceability Section (FR-TRACE-004) — PASS
- Located at `workflow-engine.js:405-427`
- Three rendering paths all correct:
  - **Full coverage:** Shows "X/X FRs (100.0%)" + "All FRs covered"
  - **Partial coverage:** Shows "X/Y FRs (Z%)" + "Uncovered FRs:" list
  - **Unavailable:** Shows "Traceability: not available"
- Section appended via `...traceSection` spread into `prBody` array at line 443

### 5. Traceability-gap Label (FR-TRACE-005) — PASS
- Located at `workflow-engine.js:455-458`
- Correctly checks `traceability.status !== "unavailable"` AND `coveragePercent < 100`
- Does NOT add label when data is unavailable (correct — avoids false positives)
- Does NOT add label at 100% coverage (verified by unit test)
- Uses existing fallback pattern: retry without labels if they don't exist on the repo

### 6. Traceability Comments — PASS
- `traceability-enforcer.py`: FR-TRACE-001 referenced at lines 116, 125, 131, 136, 144
- `workflow-engine.js`: FR-TRACE-002/003 at lines 1313, 1324; FR-TRACE-004 at line 405; FR-TRACE-005 at line 455

### 7. Unit Tests — PASS (31/31)
- `workflow-engine.test.js` has dedicated test suites:
  - `_createPR traceability section (FR-TRACE-004)` — 3 tests (full coverage, partial, unavailable)
  - `_createPR traceability-gap label (FR-TRACE-005)` — 2 tests (gap/no-gap)
- All 31 tests pass

### 8. dispatch.js Not Modified — PASS
- `dispatch.js` does not exist in the workspace (confirmed via file check)
- Design decision correctly followed: workflow engine runs enforcer directly

## Findings

### MEDIUM: `--json` mode doesn't handle missing file gracefully
**File:** `tools/traceability-enforcer.py:25-26`
**Description:** When `--json` is specified with `--file /nonexistent.md`, the `get_active_requirements()` function calls `sys.exit(1)` with a plain text error message ("Error: Specified file not found: ...") before the `--json` flag is checked. This means the caller gets non-JSON output when they requested JSON, which would cause `JSON.parse()` to throw in the workflow engine.
**Impact:** Low in practice — the workflow-engine.js code has a try/catch around the parse (line 1336) which catches this and sets `status: "unavailable"`. The degradation is graceful. However, the enforcer should ideally respect the `--json` flag in all error paths.
**Recommendation:** In `get_active_requirements()`, check if JSON mode is requested and output a JSON error object instead of plain text. This is a minor improvement, not a blocker.

### LOW: `2>/dev/null` suppresses stderr in traceability exec
**File:** `workflow-engine.js:1318`
**Description:** The command `python3 tools/traceability-enforcer.py --json 2>/dev/null` discards stderr. If the Python script writes diagnostic info to stderr, it's lost.
**Impact:** Very low. The try/catch and "unavailable" fallback handle failures. The stderr suppression prevents noisy Python warnings (e.g., deprecation notices) from contaminating stdout that gets JSON-parsed.
**Recommendation:** Acceptable trade-off. No change needed.

### LOW: Heredoc injection in PR body
**File:** `workflow-engine.js:466`
**Description:** The PR body is written to a temp file using a heredoc with delimiter `PRBODYEOF`. If FR IDs somehow contained `PRBODYEOF` on a line by itself, it could break the heredoc. However, FR IDs are extracted via regex `FR-[A-Z0-9-]+` which restricts characters to uppercase letters, digits, and hyphens — making this injection impossible in practice.
**Impact:** None in practice. The regex-constrained FR ID format prevents this.
**Recommendation:** No change needed.

### INFO: `coveragePercent` uses `.toFixed(1)` on potentially undefined value
**File:** `workflow-engine.js:411`
**Description:** `traceability.coveragePercent?.toFixed(1) || "0.0"` — if `coveragePercent` is exactly `0`, `(0).toFixed(1)` returns `"0.0"` which is truthy, so this works correctly. If `coveragePercent` is `undefined`, optional chaining returns `undefined` and the fallback `"0.0"` is used. Correct behavior.

### INFO: No new dependencies added (NFR-003) — PASS
- Python `json` module is stdlib
- No new npm packages

## Security Assessment

- **Command Injection:** PR body uses `--body-file` with a temp file instead of inline shell strings — safe pattern
- **Shell Injection:** FR IDs are regex-constrained (`FR-[A-Z0-9-]+`), no user-controlled input reaches shell commands
- **Data Integrity:** Traceability data flows from Python stdout → JSON.parse → JS object properties — typed at each boundary
- **Graceful Degradation (NFR-002):** Verified — traceability failure never blocks PR creation

## E2E Tests Written

- `Source/E2E/tests/cycle-run-1774820351419-e73a9485/traceability-report.spec.ts` — Browser navigation tests
- `Source/E2E/tests/cycle-run-1774820351419-e73a9485/traceability-enforcer-cli.spec.ts` — CLI JSON contract verification

## Verdict

**PASS** — All FRs implemented correctly, all unit tests pass, security review clean, graceful degradation verified. One MEDIUM finding (non-JSON error on missing file in `--json` mode) is mitigated by the workflow engine's try/catch and does not block merge.

RISK_LEVEL: medium
