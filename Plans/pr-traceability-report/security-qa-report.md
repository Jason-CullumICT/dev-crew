# Security QA Report: PR Traceability Report

**Reviewer:** security-qa (TheATeam)
**Date:** 2026-03-31 (updated)
**RISK_LEVEL: medium**

## Scope

Reviewed all three implementation files for command injection, input validation, and markdown injection risks per the dispatch plan security-qa assignments.

Files reviewed:
- `platform/orchestrator/lib/workflow-engine.js` (new file)
- `platform/orchestrator/lib/dispatch.js` (modified — `parseTraceabilityOutput` added)
- `tools/traceability-enforcer.py` (modified — `--json` flag added)

## Findings

### FINDING-01: Shell escaping is correct [INFO]

**File:** `workflow-engine.js:118-121`
**Description:** The `shellEscape()` function uses POSIX single-quote wrapping with `'\''` escape for embedded single quotes. This correctly prevents:
- Command injection via `;`, `|`, `&&`
- Subshell expansion via `$()` and backticks
- Variable expansion via `$VAR`

All user-influenced values passed to `execSync` (`title`, `body`, `branch`) are wrapped in `shellEscape()`. The `prNumber` used in `gh pr edit` is extracted via `/pull/(\d+)/` regex (digits only), so injection is not possible there either.

**Verdict:** PASS — no command injection risk.

### FINDING-02: execSync timeout limits are appropriate [INFO]

**File:** `workflow-engine.js:81,103`
**Description:** PR creation has a 30s timeout, label addition has a 15s timeout. Both are wrapped in try/catch for graceful degradation. This prevents hanging processes.

**Verdict:** PASS.

### FINDING-03: parseTraceabilityOutput handles malicious input safely [INFO]

**File:** `dispatch.js:327-343`
**Description:** Uses `JSON.parse()` in a try/catch. Null/empty/undefined inputs return error objects. Parsed data is mapped to expected types with fallback defaults (`?? 0`, `Array.isArray` check). The parsed output is never executed or interpolated into shell commands in this module — it flows to `run.results.traceability` and then to `buildTraceabilitySection` which only uses it for string formatting.

**Verdict:** PASS — no injection vector.

### FINDING-04: shellEscape crashes on null/undefined input [MEDIUM]

**File:** `workflow-engine.js:118-121`
**Description:** `shellEscape(str)` calls `str.replace()` without a null check. If `run.id`, `run.taskTitle`, or `run.task` is null/undefined, the function throws `TypeError: Cannot read properties of null (reading 'replace')`. Tested with `shellEscape(null)` and `shellEscape(undefined)` — both throw.
**Impact:** The `_createPR` function would fail to create the PR entirely. The outer try/catch on line 79-88 catches this and returns null, so no crash propagation, but the PR is silently not created. This is a reliability issue, not a security vulnerability.
**Recommendation:** Add `str = String(str ?? "")` at the top of `shellEscape`, or add null coalescing at the call sites (e.g., `shellEscape(title ?? "")`).
**Severity:** MEDIUM — could cause silent PR creation failures if any run property is unexpectedly null.

### FINDING-05: PR body markdown injection — LOW risk [LOW]

**File:** `workflow-engine.js:44`
**Description:** `run.task` is interpolated directly into the PR body markdown (`## Summary\n${run.task}`). If `run.task` contained malicious markdown (e.g., fake approval badges, misleading status headers, or image-based phishing), it would render in the PR. Similarly, `run.results.traceability.missingFrs` array items are rendered as bullet points without sanitization.

**Mitigating factors:**
- `run.task` and `run.results` are set by the orchestrator pipeline internally, not by external user input
- `missingFrs` values come from the traceability enforcer parsing FR-IDs from plan files (regex: `FR-[A-Z0-9-]+`), which constrains the character set
- GitHub's markdown renderer does not execute JavaScript

**Recommendation:** No action needed currently. If the pipeline ever accepts external task descriptions (e.g., from GitHub issues), sanitize markdown before including in PR body.

**Severity:** LOW

### FINDING-06: traceability-enforcer.py file traversal — LOW risk [LOW]

**File:** `traceability-enforcer.py:24-29`
**Description:** The `--file` argument accepts an arbitrary filesystem path. A malicious `--file /etc/passwd` would fail because it wouldn't contain FR-IDs, but it would still be read by `read_text()`.

**Mitigating factors:**
- This is a local CLI tool run inside a Docker container
- The orchestrator controls what arguments are passed
- No secrets would match the FR-ID regex pattern

**Severity:** LOW

### FINDING-07: traceability-enforcer.py JSON output is safe [INFO]

**File:** `traceability-enforcer.py:156-166`
**Description:** Uses `json.dumps()` which properly escapes all special characters. Exit codes remain consistent (0=PASS, 1=FAIL). The `--json` flag correctly suppresses all `print()` calls via the `quiet=args.json` parameter.

**Verdict:** PASS.

### FINDING-08: Missing fields in JSON parse handled safely [INFO]

**File:** `dispatch.js:332`
**Description:** `parseTraceabilityOutput` calls `JSON.parse(stdout.trim())` on the full stdout string. If Python emits warnings to stdout before the JSON, parsing fails. However, the enforcer uses `quiet=args.json` to suppress prints, and Python warnings go to stderr. Graceful degradation returns `{ status: "ERROR" }`. Tested with prefixed output — confirmed it fails safely.
**Severity:** LOW — handled by graceful degradation.

### FINDING-09: Missing fields in JSON parse handled safely [INFO]

**File:** `dispatch.js:337-338`
**Description:** When the enforcer JSON is missing fields (e.g., `{}`), `parseTraceabilityOutput` returns `status: "ERROR"` because `raw.status` won't match `"PASS"` or `"FAIL"`. This correctly triggers the "data not available" fallback in `buildTraceabilitySection`.

**Verdict:** PASS.

## Verification Gates

| Gate | Result |
|------|--------|
| `node -e "require('./platform/orchestrator/lib/workflow-engine.js')"` | PASS |
| `node -e "require('./platform/orchestrator/lib/dispatch.js')"` | PASS |
| `python3 tools/traceability-enforcer.py --json --plan pr-traceability-report` | PASS (valid JSON output) |
| `python3 tools/traceability-enforcer.py --plan pr-traceability-report` | PASS (human-readable output unchanged) |
| `buildTraceabilitySection` handles 100%, partial, error, null | PASS |
| `parseTraceabilityOutput` handles valid JSON, invalid JSON, empty, null | PASS |
| `shellEscape` handles adversarial inputs (quotes, backticks, $, ;, pipes, newlines) | PASS |
| PR number extraction (`/pull/(\d+)/`) only captures digits | PASS |

## Contract Compliance

| Requirement | Status | Notes |
|------------|--------|-------|
| FR-PTR-001 (JSON output) | PASS | `--json` flag outputs correct schema, edge cases handled |
| FR-PTR-002 (Capture in QA) | PASS | `parseTraceabilityOutput` correctly maps snake_case to camelCase |
| FR-PTR-003 (PR body section) | PASS | All three variants (100%, partial, error) match contracts.md |
| FR-PTR-004 (Gap label) | PASS | Applied only when status !== ERROR and coveragePct < 100 |
| NFR-1 (Backward compat) | PASS | Human-readable output unchanged when --json not passed |
| NFR-2 (Non-blocking) | PASS | try/catch around all shell calls, error fallbacks |
| NFR-3 (GitHub markdown) | PASS | Section format matches contracts.md exactly |

## Traceability Coverage Note

The traceability enforcer reports 0% coverage because all `// Verifies: FR-PTR-*` comments are in `platform/` and `tools/` directories, which the enforcer does not scan (it only scans `Source/` and `E2E/`). This is expected — these are infrastructure files, not product source code. The FR-PTR requirements are correctly traced within their implementation files.

Additionally, the enforcer picks up false-positive FR-IDs from requirements.md (FR-1, FR-2, FR-3, FR-XXX-001, FR-XXX-009, FR-XXX-010, FR-TMP-004) which are example/reference IDs in the documentation, not actual requirements. This is a pre-existing limitation of the enforcer's regex pattern (`FR-[A-Z0-9-]+`), not introduced by this feature.

## Summary

**No CRITICAL or HIGH severity issues found.** One MEDIUM-severity issue (FINDING-04: `shellEscape` crashes on null/undefined input — reliability, not security). Two LOW-severity items (markdown injection, file traversal) mitigated by architecture. One LOW item (stdout prefix handling) handled by graceful degradation.

The implementation is secure against command injection. The MEDIUM finding should be addressed before merge to prevent silent PR creation failures when run properties are unexpectedly null. All contracts are met and edge cases are handled correctly.
