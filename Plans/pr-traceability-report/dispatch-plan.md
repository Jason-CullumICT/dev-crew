# Dispatch Plan: PR Traceability Report

RISK_LEVEL: medium

## Task Summary

Include traceability enforcer results in PR body when pipeline creates a pull request. Three files modified: traceability-enforcer.py (add --json flag), dispatch.js (capture output in QA phase), workflow-engine.js (new file, _createPR with traceability section).

## Plan References

- Requirements: `Plans/pr-traceability-report/requirements.md`
- Design: `Plans/pr-traceability-report/design.md`
- Contracts: `Plans/pr-traceability-report/contracts.md`
- Related spec: `Specifications/tiered-merge-pipeline.md` (FR-TMP-004)

---

### backend-coder-1

**Scope:** All three files — this is a backend/platform-only change with no frontend component.

**Assignments:**

1. **FR-PTR-001 — JSON output for traceability-enforcer.py**
   - File: `tools/traceability-enforcer.py`
   - Add `--json` argument to the argparse parser
   - When `--json` is set, suppress all `print()` calls and instead collect results into a dict
   - At the end of `main()`, when `--json`: output `json.dumps(result_dict)` to stdout
   - JSON schema (see contracts.md):
     ```json
     {"plan_file": "...", "total_frs": N, "covered_frs": N, "missing_frs": [...], "coverage_pct": N.N, "status": "PASS|FAIL"}
     ```
   - Edge case: when no plan file or no FRs found, output `{"plan_file": null, "total_frs": 0, "covered_frs": 0, "missing_frs": [], "coverage_pct": 100.0, "status": "PASS"}`
   - Do NOT change exit codes (0=pass, 1=fail)
   - Do NOT break existing human-readable output when `--json` is not passed
   - Add `import json` at the top

2. **FR-PTR-002 — Capture traceability in dispatch.js QA phase**
   - File: `platform/orchestrator/lib/dispatch.js`
   - This is about ensuring the QA phase contract includes traceability capture
   - In the `buildAgentPrompt` function, for QA agents, the prompt already includes `Run python3 tools/traceability-enforcer.py if available`
   - Add a comment in the QA rules section noting that the enforcer should be run with `--json` flag and its output stored
   - Add a utility function `parseTraceabilityOutput(stdout)` that:
     - Takes raw stdout string from the enforcer
     - Parses JSON, maps to `{ totalFrs, coveredFrs, missingFrs, coveragePct, status }`
     - On parse failure, returns `{ status: "ERROR", error: "<message>" }`
   - Export `parseTraceabilityOutput` from the module

3. **FR-PTR-003 + FR-PTR-004 — workflow-engine.js with _createPR**
   - File: `platform/orchestrator/lib/workflow-engine.js` (NEW FILE)
   - Create module following the factory pattern from dispatch.js: `createWorkflowEngine(runClaudeFn, workspace)`
   - Implement `_createPR(run)` function that:
     - Builds PR title: `cycle/${run.id}: ${run.taskTitle || 'pipeline cycle'}`
     - Builds PR body with these sections (in order):
       - `## Summary` — run task description
       - `### Implementation` — status summary
       - `### QA Results` — pass/fail summary
       - `### Smoketest` — pass/fail
       - `### Inspector` — grade if available
       - `### E2E Results` — test counts if available
       - `### Traceability` — built from `run.results.traceability` per contracts.md
     - Calls `gh pr create --title "..." --body "..." --base master --head cycle/${run.id}`
     - After PR creation, if `run.results.traceability.coveragePct < 100`, runs `gh pr edit <number> --add-label traceability-gap`
     - All `gh` calls wrapped in try/catch for graceful degradation
   - Implement `buildTraceabilitySection(traceability)` helper:
     - If `!traceability || traceability.status === "ERROR"`: return "Traceability data not available."
     - If 100% coverage: return bold coverage line with checkmark
     - If < 100%: return coverage line + "Uncovered requirements:" bullet list
   - Export: `createWorkflowEngine` (default), plus `buildTraceabilitySection` for testing
   - Add `// Verifies: FR-PTR-001, FR-PTR-002, FR-PTR-003, FR-PTR-004` comments

**Verification gates:**
- Existing traceability-enforcer.py tests still pass (run without --json)
- `python3 tools/traceability-enforcer.py --json` outputs valid JSON
- `node -e "require('./platform/orchestrator/lib/workflow-engine.js')"` loads without error
- `node -e "require('./platform/orchestrator/lib/dispatch.js')"` loads without error
- Run `python3 tools/traceability-enforcer.py` (human-readable mode) to confirm no regression

### qa-review-and-tests

**Scope:** Review all changes for correctness, contract compliance, and regressions.

**Assignments:**
1. Verify FR-PTR-001: Run `python3 tools/traceability-enforcer.py --json` and confirm valid JSON output matching contracts.md schema
2. Verify FR-PTR-001 backward compat: Run `python3 tools/traceability-enforcer.py` (no --json) and confirm human-readable output unchanged
3. Verify FR-PTR-002: Read dispatch.js, confirm `parseTraceabilityOutput` handles valid JSON, invalid JSON, and empty input
4. Verify FR-PTR-003: Read workflow-engine.js, confirm `buildTraceabilitySection` handles all three cases (100%, partial, error)
5. Verify FR-PTR-004: Read workflow-engine.js, confirm traceability-gap label logic
6. Run traceability enforcer against this plan's requirements to check FR coverage
7. Check for security issues (no command injection in shell calls, proper input validation)

### traceability-reporter

**Scope:** Verify all FR-PTR-XXX requirements have `// Verifies:` comments in the implementation.

### security-qa

**Scope:** Review for command injection risks in shell exec calls (dispatch.js running python, workflow-engine.js running gh CLI). Verify proper escaping/sanitization of any user-controlled strings that end up in shell commands or PR body markdown.
