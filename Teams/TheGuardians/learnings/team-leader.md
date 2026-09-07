# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-09-07 (run-20260907-081952) — Grade F

### Scope Mismatch Discovery
The pen-tester statically analyzed `Source/Backend/` (work-items API), but `docker-compose.test.yml` builds and runs `portal/Backend/` (feature-requests and bugs domain model). This is a persistent scope ambiguity: the project has two backends. On future runs, explicitly dispatch the pen-tester against **both** `Source/Backend/src/` and `portal/Backend/src/` to avoid this gap.

The red-teamer correctly handled the mismatch by re-mapping all objectives to the portal domain and confirming all vulnerability classes still applied. The architectural patterns (no auth, no rate limiting, etc.) were identical in both codebases.

### Deduplication Patterns That Worked Well
- SAST-001 + PEN-001 + COMP-01 + RED-001 merged cleanly into MERGED-001 — all specialists flagged the same root cause (no auth middleware)
- SAST-003 + PEN-005 + RED-006 merged cleanly — limit parameter not enforced, all three confirmed from different angles
- SAST-004 + PEN-010 + COMP-08 + RED-005 — same metrics endpoint, four-specialist convergence

### Findings the Red Teamer Added That Pen-Tester Missed
- **RED-007** (Unauthenticated Orchestrator Proxy / SSRF): the pen-tester focused on `Source/Backend/` and did not discover the orchestrator proxy route in `portal/Backend/`. This is a High finding that would have been missed entirely without the red team run.
- **RED-008** (Stored XSS): pen-tester flagged it as a potential future risk (PEN-003 remediation note), but the red team confirmed the backend stores script payloads verbatim. Worth tracking XSS as a dedicated pen-tester check going forward.

### Grading Calibration
- Automatic F triggered correctly. Both conditions were met: (1) red-team confirmed breaches of critical objectives, (2) 4/4 objectives achieved.
- Compliance pass rate of 18% is far below any grade threshold — the app has zero security layer. The compliance score alone would have forced a D, but the red-team confirmation makes this an F regardless.

### What to Check Next Run
- Whether authentication was added to `portal/Backend/src/index.ts` (the running service) not just `Source/Backend/src/app.ts` (the source of truth)
- Whether MERGED-002 (PATCH status bypass) was fixed — this was the most impactful single code change available
- Whether the orchestrator proxy (RED-007) got auth middleware
- Platform-scope findings SAST-008 and SAST-009 require a solo session — check git log for `platform/docker-compose.yml` changes

### False Alarm Check
No false alarms in this synthesis. All findings were corroborated by at least two independent specialist reports, and the red team confirmed the critical ones live.
