# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-06-29 · Grade F · run-20260629-083857

### What was found
- All 4 pentest objectives achieved. Grade F triggered automatically.
- Root cause of nearly everything: zero auth middleware in `Source/Backend/src/app.ts`.
  A single `app.use(requireAuth)` before route registration would close ~60% of findings.
- CSRF via form-encoded body (RED-009) was the most elegant confirmed chain — bypasses both
  JSON Content-Type assumption and vote-count guard. Watch for this pattern in future Express apps.
- Pagination being entirely non-functional (negative limit accepted) was surprising — the `parseInt`
  was there but no `Math.min` cap and no positive-int guard.
- Compliance pass rate 22%: the two passing controls (7.1.1 no creds in logs, 8.1.1 no PII in logs)
  are both "absence of bad behaviour" — the codebase earns no positive compliance credit.

### Deduplication lessons
- SAST-001 / PEN-001 / COMP-001 / RED-001 all flagged the same root cause. In future runs, static-analyzer
  and compliance-auditor should be told to skip flagging global auth absence if pen-tester already has
  a PEN-001 for it — reduces synthesis noise. But keep all sources in the merged finding for traceability.
- PEN-002 (fast-track override) and RED-003 (PATCH override) are distinct bypass vectors even though
  they share the same root cause. Keep them as merged M-002 but document both paths explicitly.
- Ghost dependency (PEN-008 vs RED-004) overlap was clean: pen-tester predicted it precisely.

### Grading calibration
- Grade F is unambiguous when all objectives are achieved. No calibration needed.
- For future Grade C/D borderline runs: compliance pass rate will be the swing factor once auth exists,
  since SOC2/ASVS controls cluster heavily around auth and its downstream controls.

### Scope decisions that paid off
- Dispatching all three Phase 1 agents in parallel (static-analyzer, compliance-auditor, pen-tester)
  produced highly complementary coverage: SAST found code patterns, compliance found framework gaps,
  pen-tester found exploit chains. Overlap was useful for cross-validation, not redundant.
- Red-teamer correctly operated against ephemeral environment only; Phase 2 gate worked as designed.

### Watch for next run
- If auth is added, re-run will need to evaluate RBAC, session timeout, and JWT config carefully —
  those will become the new leading risks once the auth perimeter exists.
- Check if `express-rate-limit` and `helmet` were added — these are trivially cheap fixes that
  unblock 5+ ASVS controls and should be first commits after M-001.
