# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-07-13 — Grade F

### What Happened
- All four specialist reports were available as root-level markdown files (`static-analyzer-report.md`, `pen-tester-report.md`, `red-teamer-report.md`, `compliance-auditor-report.md`). Future runs should check both root and `Teams/TheGuardians/` paths.
- The red-teamer ran against Source/Backend on :3002 (not the docker-compose portal on :3001). This is correct for the application under audit — note the port distinction for future runs.
- The compliance-auditor report was brief (summary only, full matrix in learnings). The learnings file (`compliance-auditor.md`) carried the detailed control mapping — always read learnings files alongside reports.

### Deduplication Notes
- PEN-001 + PEN-003 + RED-001 + RED-010 all describe the same root vulnerability (no auth + overrideRoute bypass). Merged into CRIT-001.
- PEN-002 + SAST-02 + SAST-03 + RED-005 all describe webhook spoofing + enum injection. Merged into CRIT-002.
- PEN-004 + PEN-006 + SAST-09 + RED-002 all describe enumeration + IDOR delete. Merged into HIGH-001.
- The pen-tester summary said "4 High" but the attack surface map listed 5 High entries — PEN-007 and PEN-006 were both High, plus PEN-003, PEN-004. Recount from the full map, not the summary header.

### Grading Calibration
- Automatic F was correctly triggered by RED-001 (state machine bypass) and RED-005 (webhook enum injection) — both are confirmed breaches of named `pentest.objectives`.
- Compliance pass rate was 23% — the primary driver is the complete absence of authentication. Once auth is added, at least 8 failing controls (V2.1, V3.1, V3.3, V4.x, CC6.1, CC6.2, CC6.3, CC7.2) will become passable.

### Patterns for Future Runs
- The `overrideRoute` parameter without enum validation or privilege check is a recurring pattern in Express apps with development-time escape hatches. Flag any `override*` or `bypass*` parameters in static analysis.
- Soft-delete without dependency graph cleanup is a reliable DoS vector in dependency-tracking systems. Add this to the pen-tester's default checklist for any app with soft-delete.
- The `NeedsClarification` verdict bug (binary if/else missing a third enum value) is a common pattern when enums are added after the initial binary logic is written. Static analyzer should flag switch/if-else blocks that don't cover all enum values.
- The compliance auditor found `GDPR` and `ISO 27001` not in security.config.yml but attempted them anyway — this is acceptable behavior; team leader should note in future scope docs if frameworks beyond config should be excluded.

### Quick Win Sequence for Next Engineering Cycle
1. `npm install helmet cors express-rate-limit` → resolves 4 Medium findings in < 4 hours
2. JWT middleware → resolves CRIT-001 root cause and cascades into compliance improvements
3. HMAC webhook + enum validation → resolves CRIT-002
4. Pagination cap + NaN guards → resolves HIGH-001 partial and MED-001
5. dependency.ts `undefined` fix → resolves HIGH-003 in < 30 minutes
