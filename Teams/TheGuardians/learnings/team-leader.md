# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-10-19 — Grade F

### Key Findings Summary
- 2 critical confirmed breaches (RED-001: force-approve state machine bypass; RED-005: cascade auto-dispatch via duplicate status — novel, not in pen-tester map)
- All 4 red team objectives achieved against live ephemeral environment
- Compliance pass rate: 17% (4/24 controls) — application effectively has zero security posture
- Root cause of ~40% of findings: absence of any authentication middleware

### Synthesis Notes
- **COMP-005 false positive**: Compliance auditor flagged "No CORS policy" from static code review; red team live-tested and confirmed CORS correctly rejects foreign origins. Static analysis cannot see runtime CORS configuration (likely set in express defaults or middleware not visible in source scan). Remove COMP-level CORS findings unless static config explicitly sets `origin: '*'`.
- **RED-005 novel finding**: The cascade auto-dispatch via `duplicate` status was NOT in the pen-tester's attack surface map — the pen-tester identified a similar pattern (PEN-007, cascade via reject) but missed the `duplicate`/`deprecated` terminal status vector which is more dangerous because it's allowed from any status. Red team's live probing surface is broader than static logic tracing.
- **Deduplication rule validated**: SAST-001 + PEN-001 + COMP-001 + RED-001 are all the same root cause (no auth). Merge into a single CRIT finding to avoid inflating counts. Each specialist correctly identifies the same root cause from its own lens.
- **Grade F trigger**: Grading rubric "F = any confirmed red-team breach of a critical objective" fired correctly. Both RED-001 and RED-005 map to explicit pentest.objectives entries.

### Scoping Decisions
- Red team ran against portal backend (`portal/`) while pen-tester analyzed work-items backend (`Source/Backend/`). Both codebases share the same vulnerability classes, so findings are cross-applicable. This worked well — future runs should note this explicitly in dispatch to avoid confusion.
- Phase 2 ephemeral environment gate was satisfied (docker-compose.test.yml confirmed).

### Calibration Notes for Next Run
- If CRIT-001 (auth) is remediated, expect grade to jump to B or C territory depending on remaining medium findings
- The `force-approve`, `duplicate`/`deprecated` from-any-status transitions are high-value red team targets — include them explicitly in pentest.objectives for future runs
- Stored XSS (RED-003) came through the intake validation gap (SAST-003) — always check intake routes separately from main CRUD routes
