# Team Leader — Learnings

<!-- Updated after each Guardian run. Record surprises, scope decisions that paid off, scoping mistakes to avoid. -->

## Run: 2026-11-02 · run-20261102-105717 · Grade: F

### What the run found
- **Grade F automatic** — red-teamer confirmed 5 live exploits with zero credentials against ephemeral Docker environment. 3 of 4 named objectives breached.
- **Root cause is architectural**: zero identity layer. 9 of 14 compliance controls fail directly because no auth exists. CRIT-001 is the single blocker for the majority of remediation.
- **False positives to note**: PEN-007 (input length DoS) was a false positive — red-teamer confirmed limits are enforced. Soft-delete access (Objective 2) was correctly blocked by `findById()`.
- **Red team scope divergence**: Red-teamer found `/api/feature-requests` and `/api/cycles` endpoints not originally in the pentest target list (`/api/work-items`). This is the same application but the red-teamer explored beyond the original scope. Future runs should verify the full route list first.
- **Confirmed safe**: Bug state machine transitions, parameterized queries (SQL injection blocked), CORS browser-level protection (evil.example.com blocked), input length limits.
- **Positive foundation**: Structured JSON logging infrastructure, Prometheus metrics instrumentation, CRUD route enum validation, and error-handling patterns are all well-built. The security layer simply needs to be built on top.

### Scoping decisions that paid off
- Dispatching compliance-auditor in parallel with pen-tester was essential — COMP findings (TLS, Helmet, session policy) were not covered by the pen-tester's scope and added 4 High findings.
- Red-teamer correctly identified `/api/cycles` and `/api/feature-requests` as out-of-scope-but-in-scope targets beyond the original PEN list. Worth noting these for future runs.

### Synthesis calibration notes
- PEN-001 (Critical: no auth) and SAST-001 (High: no auth) merged into CRIT-001. The pen-tester's severity (Critical) was correct; SAST rated it High because SAST doesn't confirm live exploitability. For future runs: if both SAST and PEN flag the same auth absence, use PEN severity as the final severity.
- CORS was flagged by pen-tester (Low) and compliance-auditor (High). Red-teamer confirmed browser CORS works. Final severity: Low. Future pattern: if red-teamer shows a control works, downgrade the severity.
- The `/metrics` endpoint was flagged by all 4 agents. It was confirmed dumped (531 lines) in RED-003. Classify as High regardless of individual agent severity.

### What to watch next run
- Has CRIT-001 (auth) been implemented? If so, re-run full suite — many findings become impossible to confirm.
- Watch for the `/api/cycles` and `/api/feature-requests` endpoints — they are in scope for the red-teamer even if not listed in `security.config.yml pentest.critical_entry_points`.
- Session management policy (MED-005): if auth is added, confirm JWT expiry is ≤15 min before clearing this finding.
