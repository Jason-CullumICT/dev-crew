# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-06-08 · Grade: F · Run ID: run-20260608-083535

### What the run found
- Both `Source/Backend/` and `portal/` codebases are fully unauthenticated — same vulnerability class independently implemented twice. This is a systemic pattern, not an isolated bug.
- All 4 configured red-team objectives were confirmed as live exploits. Automatic Grade F.
- 7 of 8 red-team exploit chains succeeded against the live ephemeral portal service.
- Compliance pass rate: 13% (2/15 controls) — all failures cascade from the single missing auth layer.

### Surprises
- **Stored XSS (RED-006) was not in the pen-tester's static analysis map.** The pen-tester only analyzed `Source/Backend/`; the red-teamer discovered XSS in `portal/`. Going forward, static-analyzer must explicitly check for missing input sanitization in BOTH codebases, not just Source/Backend.
- **Two-codebase split**: The pen-tester mapped `Source/Backend/` while the red-teamer tested `portal/`. This created a coverage gap — the pen-tester's attack chains (PEN-001 through PEN-015) were all Theoretical against Source/Backend, but the red-team confirmed the same patterns independently in portal/. In future runs, scope the pen-tester to BOTH codebases, or add a second pen-tester run scoped to portal/.
- **Phantom blocker via hard-delete** (not soft-delete): The pen-tester identified this as a soft-delete issue; the red-teamer found the portal uses hard-delete. The underlying pattern is the same (missing FK cascade), but the codebases differ in delete implementation. Flag this distinction in future pen-tester briefs.

### Grading calibration
- SAST-006 (Docker socket) is a Critical architectural finding but is in `platform/` (infrastructure, not Source/). It should still count as Critical in the grade but should be flagged as "accepted architectural risk" rather than a code-quality bug. Consider adding a platform-architectural category to distinguish from application findings.
- All 4 red-team objectives achieved → F is correct and unambiguous. No false-alarm risk here.

### Patterns to reuse
- The compliance-auditor's "root cause cascade" framing (all failures trace to missing auth) was accurate and helped prioritize remediation quickly. Useful template for future reports.
- The red-teamer's architecture discrepancy note was critical context. Ensure the red-teamer always notes which codebase/service was actually tested, not just which config targets were listed.

### Scope decisions for next run
- Add `portal/` to the static-analyzer's `source_dirs` in security.config.yml.
- Add `portal/Backend` to pen-tester critical entry points alongside `Source/Backend`.
- If auth is added before next run, the red-teamer should attempt auth bypass (token manipulation, privilege escalation) as primary objectives instead of the current unauthenticated chains.
