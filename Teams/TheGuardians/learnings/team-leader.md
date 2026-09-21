# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-09-21 — Grade F (run-20260921-085726)

### What was found
- The application had **zero authentication** anywhere — root cause of every confirmed breach.
- Red-teamer confirmed 9 of 9 exploit chains, including full CI/CD pipeline takeover in ~30s with 12 unauthenticated requests.
- 3 of 4 critical objectives achieved; 1 partial.
- Compliance pass rate: 12% (far below Grade C minimum of 60%).
- 22 total findings (2 Critical, 7 High, 10 Medium, 3 Low) after deduplication across 4 specialists.
- Automatic Grade F triggered by confirmed red-team breach of critical objectives (SEC-002).

### Synthesis patterns that worked well
- **Aggressive deduplication**: SAST-001 + COMP-001 + PEN-001 + RED-001 all mapped to the same root cause (no auth). Merging these into SEC-001 eliminated redundancy and gave a cleaner finding count.
- **Root-cause elevation**: SAST rated no-auth as High; PEN-tester escalated it to Critical after threat-modeling the exploit chain; RED-teamer confirmed it. Final severity correctly landed at Critical (Confirmed).
- **Business logic findings are distinct from auth**: PEN-005 (rejection cascade DoS) and PEN-008 (race condition) are architectural logic flaws independent of auth. These survive auth remediation and should not be dismissed.

### Grading calibration
- When red-team confirms a breach, grade is automatically F regardless of finding counts. Do not second-guess this — it prevents undergrading exploited systems.
- Compliance pass rate should be calculated as full-passes-only for conservatism (12%), not pass+partial (29%). The grading config minimum is 60%; both rates fail it.
- The compliance-auditor counted 20 controls (with some cross-framework overlap), arriving at 35% pass rate. After dedup the consolidated count is 17 with 12% pass rate. Both assessments agree: far below threshold.

### Scope decision that paid off
- Dispatching pen-tester before red-teamer gave the red-teamer a structured attack surface map with prioritized chains. RED-002/008/009 directly followed the PEN attack chain blueprint. This pattern should be preserved in all future runs.

### False-alarm risk to watch
- SAST-008 (no CORS) is Medium but currently not exploitable without auth. After auth is added, it becomes High. Track it as a future escalation trigger.
- COMP-009 (no encryption at rest) is flagged but the current in-memory store holds no PII. If a DB is introduced, re-audit this immediately.

### What to focus on next run
- Verify SEC-001 (auth) and SEC-002 (RBAC + force-approve gate) are both remediated before downgrading grade.
- Re-run static-analyzer against intake routes specifically for SAST-003/007/008 after any backend changes.
- Confirm SEC-005 (soft-delete dependency cascade) is fixed — the DoS path is trivially exploitable.
