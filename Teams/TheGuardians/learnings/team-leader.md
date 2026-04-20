# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-04-20 | Grade: F | run-20260420-060358

### What Was Found
- **Systemic root cause:** Zero authentication on every endpoint — confirmed live by the red-teamer across both `Source/Backend/` and `portal/Backend/`.
- **State machine bypass confirmed:** `status` field is directly writable via PATCH, making the entire workflow engine irrelevant. This alone triggers Grade F.
- **AI pipeline takeover confirmed:** Anonymous callers can create items and trigger the 5-agent voting pipeline at will.
- **SSRF confirmed (partial):** `actions_url` in team dispatches accepts any URL including cloud metadata endpoints.
- **Coverage gap discovered (RED-007):** The pen-tester analyzed `Source/Backend/` while the test environment runs `portal/Backend/`. PEN-001 through PEN-016 describe the workflow engine, not the live service. Both services share the same vulnerability classes.

### Scoping Lessons
- **Always verify which service `docker-compose.test.yml` actually builds** before dispatching the pen-tester. The pen-tester should receive the compose file path, not just `Source/Backend/`, as the primary target.
- `security.config.yml` target URLs matched the live service port (3001), but the codebase path in static analysis did not match. Add a `source_dir` field to each target entry in `pentest.targets` to prevent this mismatch.
- The red-teamer correctly identified and worked around the mismatch (RED-007) — this is the right behavior.

### Grading Calibration
- 3 confirmed Critical + 22% compliance → Grade F is unambiguous. No calibration needed.
- The compliance auditor's "22%" figure was computed as 5-of-23 controls (including partials). This is consistent with `grading.C.min_compliance_pass_rate: 60` — nowhere close to a passing grade.
- The single "NOT ACHIEVED" red-team objective (soft-deleted item access) was due to the portal service using hard delete (returns 404), not a gap in the red-teamer's technique.

### Deduplication Notes
- SAST-001 + PEN-001 + COMP-001 all describe the same root cause (no auth). Merged into F-001.
- SAST-003 (High from static-analyzer) was downgraded to Medium in synthesis: it is an information-disclosure SAST finding without a direct exploit chain, fitting the Medium definition.
- RED-002 and RED-003 both exploit the same PATCH vector on different entity types; merged into F-002 rather than counting as two separate Critical findings.
- PEN-010 + SAST-007 + COMP-006 + RED-004 all describe unbounded pagination; merged into F-012 (Medium confirmed).

### What to Check Next Run
- Verify `Source/Backend/` is live and audited as a separate target (PROC-001).
- Confirm whether the `status` PATCH fix (F-002) was applied to both services.
- Re-run red-team against `Source/Backend/` fast-track bypass (PEN-003) specifically once it is running live — this was never tested against a live instance.
