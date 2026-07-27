# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-07-27 (run-20260727-065003) — Grade: F

### Scope Delta: Live Target Was portal/Backend, Not Source/Backend

The pen-tester analyzed `Source/Backend` (work-items engine with `/api/work-items` routes), but `docker-compose.test.yml` serves `portal/Backend` (feature-request/bug/cycle portal with `/api/feature-requests`, `/api/bugs`, `/api/cycles` routes). Routes like `/api/work-items` return 404 on the live target. The red-teamer correctly detected this and re-derived all four objectives against the actual running surface.

**Action for future runs:** Update `security.config.yml pentest.targets` to reflect the actual docker-compose service, or add a note clarifying which backend is the live red-team target. If both backends are in scope, list both explicitly.

### Grading Calibration

- Two Critical Confirmed findings (F-001 zero auth + F-002 state machine bypass via force-approve) → automatic Grade F.
- Even without red-team confirmation, the compliance pass rate of ~4% would have placed this at Grade D at best.
- Grade F was unambiguous — no calibration edge cases.

### Deduplication Notes

- SAST-001 + PEN-001 + COMP-001 + COMP-002 + RED-001 all collapse into a single F-001 finding. This is the most common pattern: every specialist finds the missing auth layer independently. In future runs, if auth is added, these findings will diverge more (COMP-002 RBAC may fail even when COMP-001 passes).
- PEN-007 and RED-008 are the same root-cause finding (deleted blocker sabotage) but RED-008 adds the cross-type (Bug → FR) dimension discovered only during live testing. Keep as one merged F-004 but document both dimensions.
- SAST-007 (unbounded pagination) merged into F-005 (full dataset enumeration) since RED-005 confirmed the live exploit. The NaN guard aspect of SAST-007 is still a distinct sub-remediation step.

### Patterns That Did NOT Trigger False Alarms

- Prometheus metrics endpoint: correctly flagged High in SAST, confirmed live by red team. No false alarm.
- Sequential DocId: Low finding, not exploited directly, correctly kept as theoretical.
- Frontend circular dependency guard: Medium theoretical, correctly not elevated — no live exploit path was feasible without auth being present.

### What Worked Well

- Phase 1 parallel dispatch (static-analyzer, compliance-auditor, pen-tester) produced comprehensive coverage with minimal overlap.
- Red-teamer's scope-detection logic was excellent: it identified the target mismatch immediately and re-derived objectives rather than giving up or falling back to static analysis.
- Compliance-auditor exceeded the two configured frameworks (OWASP-ASVS, SOC2) by also covering GDPR and ISO 27001 — this additional coverage surfaced F-015 (RTBF) and F-023 (data retention) which were not in the original scope. Accept this expansion.

### Recommendations for Next Run

1. Fix F-001 first — all other confirmed findings become harder to exploit once auth is in place.
2. After F-001 is fixed, re-run the red-teamer against the same ephemeral environment to verify no auth bypass remains.
3. Update `security.config.yml pentest.targets` to list `portal/Backend` explicitly.
4. Add F-004 (UUID migration) to the backlog as a prerequisite for F-003 (IDOR) remediation — IDOR is easier to validate once IDs are not guessable.

