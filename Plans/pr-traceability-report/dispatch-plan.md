# Dispatch Plan: PR Traceability Report

**Task:** Include traceability report in PR body when pipeline creates a pull request
**Risk Level:** medium
**Team:** TheATeam

## Scoping

| FR | Size | Layer | Assignment |
|----|------|-------|------------|
| FR-TRACE-001 (--json flag) | S | tooling (Python) | backend-coder-1 |
| FR-TRACE-002 (capture after QA) | M | orchestrator (JS) | backend-coder-1 |
| FR-TRACE-003 (PR body section) | M | orchestrator (JS) | backend-coder-1 |
| FR-TRACE-004 (traceability section) | M | orchestrator (JS) | backend-coder-1 |
| FR-TRACE-005 (gap label) | S | orchestrator (JS) | backend-coder-1 |

**Total points:** S(1)+M(2)+M(2)+M(2)+S(1) = 8 → 1 backend coder. All FRs touch tightly coupled files (workflow-engine.js, traceability-enforcer.py). No dispatch.js changes needed — the workflow engine runs the enforcer directly.

No frontend changes required — this feature only modifies orchestrator internals and CLI tooling.

---

## Implementation Stage

### backend-coder-1

**Assigned FRs:** FR-TRACE-001, FR-TRACE-002, FR-TRACE-003, FR-TRACE-004, FR-TRACE-005

**Files to modify:**
1. `tools/traceability-enforcer.py` — Add `--json` argument and JSON output path (FR-TRACE-001)
2. `platform/orchestrator/lib/workflow-engine.js` — Three changes:
   - After stage dispatch loop, before Phase 3.5: run enforcer with `--json`, store on `run.results.traceability` (FR-TRACE-002)
   - In `_createPR`: add `### Traceability` section to PR body (FR-TRACE-003, FR-TRACE-004)
   - In `_createPR`: append `traceability-gap` label when coverage < 100% (FR-TRACE-005)

**Implementation details:**

Read the design doc at `Plans/pr-traceability-report/design.md` for the exact code to add. Key points:

#### 1. traceability-enforcer.py (FR-TRACE-001)
- Add `--json` flag to argparse: `parser.add_argument("--json", action="store_true", help="Output JSON")`
- In `main()`, after `check_traceability()` returns `missing`, if `args.json`:
  ```python
  result = {
      "status": "passed" if not missing else "failed",
      "total_frs": len(fr_ids),
      "covered_frs": [fr for fr in fr_ids if fr not in missing],
      "missing_frs": missing,
      "coverage_percent": round((len(fr_ids) - len(missing)) / len(fr_ids) * 100, 1) if fr_ids else 0.0,
      "requirements_file": str(req_file)
  }
  import json
  print(json.dumps(result))
  sys.exit(0 if not missing else 1)
  ```
- The existing text output path remains the `else` branch (no `--json` flag)

#### 2. workflow-engine.js traceability capture (FR-TRACE-002)
**Placement:** After `run.feedbackLoops = feedbackLoops;` and before `Phase 3.5: Starting app for dynamic testing`.
- Run `python3 tools/traceability-enforcer.py --json` via `execInWorker`
- Parse JSON stdout and store on `run.results.traceability`
- On any failure, set `run.results.traceability = { status: "unavailable", reason: err.message }`
- See design.md section 2 for exact code

#### 3. workflow-engine.js _createPR (FR-TRACE-003, FR-TRACE-004)
- After the `- Feedback loops:` line in the prBody array, append a `### Traceability` section
- Three rendering paths: full coverage, partial coverage (list missing FRs), unavailable
- See design.md section 3 for exact code

#### 4. workflow-engine.js _createPR labels (FR-TRACE-005)
- After computing `labels` from the `labelMap`, check `run.results?.traceability`
- If `coveragePercent < 100`, append `,traceability-gap` to labels string
- Uses existing fallback pattern (retry without labels if they don't exist)

**Add `// Verifies: FR-TRACE-XXX` comments to every change.**

---

## QA Stage

### qa-review-1

**Scope:** Verify all FRs are correctly implemented.

**Checks:**
1. Run `python3 tools/traceability-enforcer.py --json` and verify JSON output structure matches contract in `Plans/pr-traceability-report/contracts.md`
2. Run `python3 tools/traceability-enforcer.py` (without --json) and verify human-readable output is unchanged (NFR-001)
3. Review `workflow-engine.js` traceability capture logic placement and error handling
4. Review `_createPR` traceability section rendering for all three cases (passed, failed, unavailable)
5. Verify `traceability-gap` label logic only fires when coverage < 100%
6. Run `python3 tools/traceability-enforcer.py --json --file Plans/pr-traceability-report/requirements.md` to test with actual requirements
7. Verify all code has `// Verifies: FR-TRACE-XXX` traceability comments
8. Check edge cases: empty FR list, missing requirements file, malformed JSON, no Python available
9. Verify dispatch.js is NOT modified (design decision: workflow engine runs enforcer directly)

RISK_LEVEL: medium
