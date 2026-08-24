# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-08-24 (run-20260824-041143) — Grade: F

### What we found
- The application has **zero authentication** across all endpoints. This is a root-cause finding that cascades into the majority of all other findings (CRIT-001). When SAST finds no-auth, treat every other medium finding as effectively Critical because the access barrier is gone.
- The red-teamer ran against `portal/Backend/` (via `docker-compose.test.yml`), **not** `Source/Backend/` which the pen-tester analyzed. Both exhibit the same vulnerability class. Future runs must ensure the red-teamer target URL aligns with the pen-tester target. Document this mapping in `security.config.yml pentest.targets` more explicitly.
- All 4 pentest objectives were breached. The force-approve endpoint (`/api/feature-requests/:id/force-approve`) satisfied two objectives simultaneously: state machine bypass AND malformed verdict bypass.
- SAST-001 and PEN-001 are the same finding — static and dynamic both identified no-auth. Merge pattern: when SAST and PEN identify identical root cause, merge into a single Critical finding, not two High findings.

### Calibration notes
- **Grade F trigger** is reliable and correct: confirmed red-team breach of any critical objective → F, regardless of total count.
- The grading rubric's `max_high: 2` for Grade A is very strict. Even after adding auth (which would fix all Criticals and many Highs), the remaining Highs (HIGH-008 TLS, HIGH-009 audit events) would put the app at Grade B at best without significant compliance work.
- Compliance auditor correctly identified GDPR Art. 17 and TLS gaps that the other specialists did not surface — keep compliance-auditor in Phase 1 always.

### Scoping decisions that paid off
- Having the pen-tester map the attack surface before the red-teamer was essential. The attack-surface-map correctly identified the force-approve and pipeline injection chains.
- Running compliance-auditor and static-analyzer in parallel with pen-tester (Phase 1) meant we had all three perspectives before the red-teamer was dispatched. No rework needed.

### False alarm patterns to avoid
- `pino` listed in package.json but unused — LOW finding, not Medium. A phantom dependency is a supply-chain hygiene issue, not an exploitable weakness. Don't elevate it.
- Stack traces in server logs (COMP-009) — this is Low because they never reach the client. SAST-008 (raw err.message in HTTP 500 responses) is more impactful and could be rated Medium if combined with the no-auth finding, but standalone it's Low.

### Next run focus
- Confirm whether `Source/Backend/` and `portal/Backend/` diverge in vulnerability profile or are identical. If Source/Backend gains auth first, portal/Backend may lag — track separately.
- After auth is added: re-run full Phase 1+2 to verify the cascading fixes. Expect grade B or C — state machine logic (MED-002, HIGH-006), IDOR (HIGH-002), and TLS (HIGH-008) will remain.
- Priority order for TheFixer: CRIT-001 (auth) → CRIT-002/003 (force-approve/cycles) → HIGH-001 (pagination) → HIGH-008 (TLS) → HIGH-009 (audit log events).
