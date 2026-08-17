# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

---

## Run: 2026-08-17 | Grade: F | Run ID: run-20260817-040932

### What Happened
Full Phase 1 (static-analyzer + compliance-auditor + pen-tester) and Phase 2 (red-teamer) completed. Grade F triggered automatically — 2 confirmed critical-objective breaches (zero auth + state machine bypass). All 4 pentest objectives achieved.

### Key Findings This Run
- **C-001 (root cause):** Literally no auth middleware anywhere in `Source/Backend/src/app.ts`. This one finding unlocks or amplifies every other finding. Fix this first; half the other findings become constraints rather than blockers.
- **C-002:** `overrideRoute: "fast-track"` bypass is trivially exploitable today. Single gating check will fix it.
- **H-003 (novel):** Soft-delete ghost dependency freeze is unique to this codebase's state machine design. The pen-tester correctly flagged it as novel — it would not be caught by generic OWASP scanners.

### Environment Discrepancy — Important for Next Run
The pen-tester analyzed `Source/Backend/` but the red-teamer ran against `portal/Backend/` (because `Source/Backend/` has no `node_modules` and cannot start). 10 of 12 PEN findings carried over. Two are mitigated in the portal (enum validation, CORS). **Next run: ensure `Source/Backend/` has its own Docker Compose target** so the red-teamer tests the same codebase the pen-tester analyzed.

### Grading Calibration
- The static-analyzer estimated Grade B/D — this was wrong because it did not know the red-teamer would confirm critical breaches. Always defer final grade to post-red-team synthesis.
- The compliance-auditor correctly computed 22% pass rate and Grade D; red-team confirmation pushed it to F.
- With zero auth, compliance pass rate will always be catastrophically low — don't waste auditor cycles on controls that are fundamentally blocked by a missing auth layer. On next run, if C-001 is still open, skip ASVS V2.x, V3.x, V4.x deep-dives; they all fail for the same reason.

### Scoping Notes for Next Run
- If C-001 is remediated, the compliance pass rate should jump to ~60-70% (ASVS V2/3/4/9 become potentially satisfiable). Trigger a full re-audit on those controls.
- If the state machine is redesigned, re-scope H-002 and H-003 specifically.
- The `NeedsClarification → Rejected` silent mapping (M-003) is a functional bug disguised as a security finding — route it to TheATeam, not TheFixer.

### False Alarms / Non-Issues This Run
- Sensitive field encryption: `security.config.yml` lists `email`, `password`, `token`, etc. as sensitive fields to audit — none appear in the current WorkItem schema. Compliance auditor correctly noted this as a non-issue. Do not flag as a finding in future runs unless the schema changes.
- No hardcoded secrets, no eval/exec patterns, no weak crypto — clean on those fronts despite everything else failing.
