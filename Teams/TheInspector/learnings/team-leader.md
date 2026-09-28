# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-09-28 — First audit of dev-crew Source App

1. **Spec coverage is the hardest metric to improve.** The traceability enforcer exits PASSED while 100 of 113 requirements are unaudited. Never trust the enforcer result alone — always cross-reference the raw FR counts from Specifications/ directly in scoping.

2. **Services were offline during the audit.** Both localhost:3001 and localhost:5173 were unreachable. Performance profiler and chaos monkey fell back to static analysis only. Always check service health early in scoping and flag dynamic test gaps prominently in the report.

3. **npm audit produces large CVE counts from transitive deps.** 103 total CVEs sounds alarming, but Source/E2E was completely clean. Focus escalation routing on workspaces with critical-severity CVEs (portal/Backend, platform/orchestrator) rather than treating all workspaces equally.

4. **Cross-reference map is the most actionable synthesis output.** Grouping QO-001+002+003 under "enforcer blind spot" root cause makes it clear that one fix (extending the enforcer to scan Specifications/) resolves all three P1 spec-drift findings. Build this map before writing recommendations.

5. **Grade D was determined by 5 P1 findings and 24.8% spec coverage** (both fail the C threshold of max_p1=2 and min_spec_coverage=40%). The grading config thresholds in inspector.config.yml are the authoritative source; always apply them mechanically.

6. **Escalation triggers fired on Handlebars, protobufjs, and postcss.** All match the config.escalation.security_triggers (injection, code execution). Route to TheGuardians before TheFixer picks up dependency remediation.

7. **This is a first audit — no prior baseline.** All 17 findings (5 P1, 12 P2) are marked NEW. Next audit will be able to show FIXED/STILL OPEN/REGRESSED/NEW breakdown.

8. **inspector-report.md was empty** when synthesis began — it was a placeholder. The canonical output files are now:
   - `Teams/TheInspector/findings/audit-{date}-{grade}.html` — full HTML report
   - `Teams/TheInspector/findings/bug-backlog-{date}.json` — JSON backlog with escalations array
