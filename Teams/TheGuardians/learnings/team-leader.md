# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-09-14 — Grade F

### Synthesis Calibration Notes

**Target mismatch (important for future runs):** The pen-tester statically analysed `Source/Backend/` (the workflow engine). The live Docker target in `docker-compose.test.yml` runs `portal/Backend/` — a different application (feature portal with `/api/feature-requests`, `/api/bugs`, `/api/cycles`, `/api/learnings`). Both apps share the same root vulnerability (zero auth), so RED findings confirmed against the live target are valid signals for both codebases. Future orchestrations should explicitly confirm which backend the Docker environment serves before dispatching the pen-tester.

**Red teamer target confirmation:** Instruct the red teamer to first verify the target's actual API surface (e.g., `GET /`, `GET /api`) before assuming it matches the pen-tester's static analysis. Divergence should be flagged immediately.

**CORS discrepancy:** Compliance auditor (static) flagged no CORS middleware; red teamer (live) found CORS restricts evil origins. This is a pattern to watch — static analysis of absent middleware doesn't always mean the behaviour is absent (framework defaults, reverse proxy). Downgrade CORS to Low when red team can't confirm browser-level bypass.

**Confirmed vs Theoretical spread:** 7 of 21 consolidated findings were confirmed live. The root cause (zero auth) cascades into almost every other finding. Future runs with auth in place will need much more targeted testing — the majority of current findings collapse once CRIT-001 is remediated.

**Grading certainty:** RED-002 (state machine bypass via force-approve) alone triggers Grade F. The other two confirmed objectives (RED-005, RED-006) add evidence but the grade was already determined. This is the expected behaviour.

**Deduplication patterns:** SAST + PEN findings on the same vulnerability (e.g., SAST-001 + PEN-001 + PEN-002 + COMP-001/002 all map to the auth gap) should always merge into a single consolidated finding. The source_ids field in the JSON backlog preserves traceability to all originating reports.

**False alarms in this run:** None — all findings were substantiated by at least one of the four specialists. No synthesis-level false positives identified.

**Positive findings (no vulnerabilities):** Hardcoded secrets (none), dangerous APIs (none), SQL injection (N/A — in-memory store), prototype pollution (blocked by enum validation), mass assignment (blocked by service layer).

### What Changed Since Last Run
First run — no prior baseline available.
