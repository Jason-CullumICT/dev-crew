# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-05-18 — Initial Full Audit

### Final Grade: F
- **Grade F trigger:** Red team achieved all 4 objectives. Confirmed breaches: 9 (RED-001 through RED-009 + RED-010).
- Even without confirmed breaches, the compliance pass rate (28%) and finding counts (3 Critical, 8 High) would have yielded Grade D.

### Synthesis Patterns That Worked
- PEN findings and RED findings merged 1:1 reliably — every PEN-ID the red-teamer attempted became a RED-ID. The two specialist IDs mapped cleanly to merged MERGED-IDs.
- The static-analyzer's learnings file was the de facto SAST report (no separate report file was written). Future runs: check `Teams/TheGuardians/learnings/static-analyzer.md` first if no dedicated static-analyzer report file exists in `findings/`.
- COMP findings that overlap PEN/RED (COMP-001 → PEN-001, COMP-007 → PEN-005, COMP-009 → PEN-007, COMP-013 → PEN-003) were merged into the highest severity from any specialist.
- COMP findings with no PEN/RED counterpart (COMP-002, COMP-003, COMP-005, COMP-006, COMP-010, COMP-011) were kept as separate High/Medium theoretical findings.

### False Positives Encountered
- None. All specialist findings were genuine for this codebase. The static-analyzer explicitly documented confirmed false positives (Math.random, JSON.parse, stack logging — all were non-issues or correctly handled).

### Grading Calibration Notes
- The compliance auditor graded certain headers/CORS findings as High. Per team-leader synthesis, PEN-010 (CORS) was downgraded to Medium since absent CORS headers is actually the safer state vs. misconfigured wildcard CORS.
- COMP-003 (no Helmet) was kept High per compliance auditor rating; its remediation is trivial (one npm install + one line), so the theoretical risk of a high-severity control gap with a low-effort fix is appropriate.

### Red Team Reliability Notes
- The red-teamer had to start `Source/Backend` manually via `tsx` on port 3002 (different from the `docker-compose.test.yml` stack which runs `portal/Backend` on 3001). This caused initial confusion but was resolved. Future runs: clarify in the dispatch prompt that the target is `Source/Backend`, not `portal/Backend`.
- All 4 PEN-listed Critical findings confirmed by red team. 0 dead-ends in confirmed chains.
- `limit=0` and `limit=abc` do NOT produce the NaN/Infinity response the pen-tester predicted — they fall back to the default of 20 via JS falsy coercion. This is a useful calibration for future pagination-bypass testing.

### What Changed Since Last Run
- First run — no prior baseline.

### Scope Decisions
- GDPR Art. 17 (COMP-011) was included despite not being in `security.config.yml compliance.frameworks` because work items can contain user-supplied PII. Compliance auditor correctly flagged this at Medium. If the team wants formal GDPR scope, add it to `security.config.yml`.
- `portal/Dockerfile` container security findings (SAST-001, SAST-002) were included even though the pentest scope focused on `Source/Backend`. Static analysis of container configuration is in scope per `static_analysis.source_dirs` — but portal/Dockerfile is not in `Source/`. Future runs: clarify whether `portal/` is in static analysis scope.
