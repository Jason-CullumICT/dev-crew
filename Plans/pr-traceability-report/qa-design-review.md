# QA Design Review: PR Traceability Report

**Reviewer:** design (TheATeam)
**Date:** 2026-03-30
**RISK_LEVEL: medium**

## Verification Results

### FR-PTR-001: JSON Output Mode — PASS

| Test | Result |
|------|--------|
| `--json` outputs valid JSON | PASS — valid JSON with all required fields |
| `--json` edge case: nonexistent plan | PASS — `{"plan_file": null, "total_frs": 0, ...}` |
| `--json` exit code: 1 on gaps | PASS — exit code 1 when missing FRs |
| `--json` exit code: 0 on pass | PASS — exit code 0 on vacuously true case |
| Human-readable mode unchanged | PASS — decorative output, scan messages, and exit codes all preserved |
| `--json` suppresses decorative text | PASS — only JSON on stdout |
| JSON schema matches contracts.md | PASS — all fields present: plan_file, total_frs, covered_frs, missing_frs, coverage_pct, status |

### FR-PTR-002: parseTraceabilityOutput — PASS

| Test | Result |
|------|--------|
| Valid JSON input | PASS — correctly maps snake_case to camelCase |
| Empty string input | PASS — returns `{ status: "ERROR", error: "..." }` |
| null input | PASS — returns `{ status: "ERROR", error: "..." }` |
| Invalid JSON input | PASS — returns `{ status: "ERROR", error: "..." }` with parse error message |
| Exported from dispatch.js | PASS — `module.exports` includes `parseTraceabilityOutput` |
| Module loads without error | PASS — `node -e "require(…)"` succeeds |

### FR-PTR-003: buildTraceabilitySection — PASS

| Test | Result |
|------|--------|
| 100% coverage output | PASS — `**Coverage: 4/4 FRs (100.0%)** :white_check_mark:` |
| Partial coverage output | PASS — coverage line + "Uncovered requirements:" bullet list |
| Error/unavailable output | PASS — "Traceability data not available." |
| null traceability input | PASS — "Traceability data not available." |
| Section placed after E2E in PR body | PASS — `_createPR` appends traceability last |
| Module loads without error | PASS — `node -e "require(…)"` succeeds |
| Markdown renders correctly | PASS — output matches contracts.md format exactly |

### FR-PTR-004: Traceability Gap Label — PASS

| Test | Result |
|------|--------|
| Label added when `coveragePct < 100` | PASS — conditional check on line 92-98 of workflow-engine.js |
| Label NOT added when status is ERROR | PASS — explicit `status !== "ERROR"` guard |
| Label NOT added when traceability null | PASS — `run.results.traceability &&` null guard |
| gh failure is graceful | PASS — try/catch with `console.warn`, does not throw |

## Security Review

### Shell Injection — LOW risk (mitigated)

- `shellEscape()` in workflow-engine.js wraps strings in single quotes and escapes embedded single quotes via `'\\''` pattern. This is the standard POSIX shell escaping approach.
- `execSync` calls in `_createPR` use `shellEscape()` for title, body, and branch. No raw string interpolation.
- PR number extracted from `gh pr create` output is validated via regex (`/\/pull\/(\d+)/`) before use in subsequent `gh pr edit` — only digits pass through.
- **Finding (INFO):** The `shellEscape` function is adequate for the current use case but would not protect against null bytes. Acceptable given the input sources are controlled pipeline data, not arbitrary user input.

### Command Injection via traceability output — NO RISK

- `parseTraceabilityOutput` only does `JSON.parse()` — no shell execution of parsed content.
- Missing FR IDs that appear in the PR body are plain text strings from the enforcer's regex output. They cannot inject markdown or shell commands in a meaningful way.

## Contract Compliance

All three contracts from `contracts.md` are satisfied:

1. **Traceability Enforcer JSON Output** — matches schema exactly, including edge cases
2. **Run Object Traceability Shape** — `parseTraceabilityOutput` produces the documented shape
3. **PR Body Traceability Section** — `buildTraceabilitySection` produces all three documented formats (100%, partial, error)
4. **PR Labels** — label logic matches the documented conditions table

## Traceability Coverage

The enforcer reports FR-PTR-001 through FR-PTR-004 as MISSING (0% coverage). This is expected because `// Verifies:` comments exist only in `platform/` files (dispatch.js, workflow-engine.js, traceability-enforcer.py), and the enforcer scans `Source/` and `E2E/` directories — not `platform/` or `tools/`. The implementation files correctly have `// Verifies:` comments on the relevant functions:

- `traceability-enforcer.py:123,132,155` — `FR-PTR-001`
- `dispatch.js:326` — `FR-PTR-002`
- `workflow-engine.js:12,31,69,91,117` — `FR-PTR-003`, `FR-PTR-004`

Since these are platform/tools files (not Source/), the enforcer won't find them. This is a known limitation and not a bug — the enforcer is designed for Source/ application code. The `// Verifies:` comments are still present for human reviewers.

**Note:** FR-1, FR-2, FR-3, FR-TMP-004, FR-XXX-001, FR-XXX-009, FR-XXX-010 are false positives — they appear in the requirements.md as example text within JSON schemas and spec prose, not as actual requirements for this feature. Only FR-PTR-001 through FR-PTR-004 are real requirements.

## Issues Found

| # | Severity | Description | File | Recommendation |
|---|----------|-------------|------|----------------|
| 1 | INFO | `shellEscape` doesn't handle null bytes | workflow-engine.js:118 | Acceptable — inputs are controlled pipeline data |
| 2 | INFO | Enforcer regex picks up example FR IDs from requirements prose | traceability-enforcer.py:72 | Known limitation, not blocking |
| 3 | LOW | No unit tests exist for `parseTraceabilityOutput` or `buildTraceabilitySection` | — | Recommend adding tests in a follow-up; functions are verified manually here |

## Verdict

**PASS** — All four functional requirements are correctly implemented. Contracts are satisfied. No security issues found. The implementation follows the graceful degradation pattern consistently. Code is clean and well-structured.
