# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-07-06 — Grade F

### What Happened
First full engagement of all four specialists against dev-crew Source App. All six red-team exploit chains succeeded (5 fully, 1 partial). Automatic Grade F triggered by two confirmed critical objective breaches (state machine bypass + full enumeration).

### Synthesis Decisions
- **Deduplication:** 30+ raw findings across 4 specialists collapsed to 19 unique issues. The highest single consolidation was SEC-001 (auth absence), which merged SAST-001, COMP-001, COMP-002 (partial), PEN-001, and RED-001.
- **Severity elevation:** COMP-004 (no helmet) was marked High by compliance-auditor (6 ASVS violations) vs. Medium by static-analyzer; final severity set to High, matching compliance ruling.
- **SEC-009 (RBAC) kept separate from SEC-001 (auth):** COMP-002 specifically notes RBAC is a second-layer problem even after auth is added — important not to merge these, as they have distinct remediation timelines.
- **SEC-007 (ghost blocker) marked Confirmed-Partial:** RED-005 achieved a DoS variant of the soft-delete objective, but direct GET/PATCH on a soft-deleted item returned 404 as expected. The objective was not fully achieved per the stated definition.

### Calibration Notes
- The pen-tester correctly elevated PEN-001 and PEN-002 to Critical (vs SAST's High) — the data-flow analysis showed these were end-to-end objective chains, not just theoretical vulnerabilities. The pen-tester's severity call was more accurate here.
- The red-teamer's failure on Objective 3 ("malformed assessment verdict") is important: `POST /assess` runs an automated pod that ignores the request body. The pen-tester's PEN-003 (direct `/approve`) is the actual exploit path. Log this pattern: "assessment pod ignores external verdict submission" is by design, but the `/approve` backdoor is the real risk.
- Compliance pass rate (13%) is primarily driven by the complete auth absence. Fixing SEC-001 + SEC-008 (helmet) alone would raise the pass rate to ~47% immediately — worth flagging to TheFixer as quick-win ordering.

### False Alarm Patterns to Avoid
- V7.4.1 (generic client error messages): Global errorHandler passes this control. Do not mark FAIL — the per-route catch blocks (SEC-016) are a separate Low finding, not a control failure at the global level.
- SEC-015 (encryption at rest): Correct to mark Medium/N/A rather than High — there is no persistence layer today. Do not escalate to High until a persistence sprint is planned.

### What to Watch Next Run
- PEN-011 (missing `/api/search` endpoint): Once implemented, re-test for ReDoS and unauthenticated full-text search.
- Rate limiting (SEC-012): Once auth is added, the rate-limit risk profile changes — tie this to the auth sprint in TheFixer backlog.
- The cascade auto-dispatch via `reject` (SEC-005) was the most architecturally interesting finding — it reveals the `onItemResolved` side-effect is not documented in the Specifications as intentional behavior. Flag to requirements-reviewer.
