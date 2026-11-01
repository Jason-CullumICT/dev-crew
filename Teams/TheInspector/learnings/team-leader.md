# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## 2026-11-01 — First audit (audit/inspector-2026-11-01-b5eb3a)

### Synthesis Learnings

1. **Services are often offline on audit branches.** Both backend (:3001) and frontend (:5173) were unreachable. Always check service health first and note which specialists must fall back to static mode. Document clearly in the report — dynamic coverage gaps are auditor blind spots, not clean bills of health.

2. **The enforcer scope gap (portal/ missing from source.dirs) is a critical false-confidence risk.** The primary application (76 FRs in portal/) was entirely invisible to the traceability enforcer. This produced 76 false MISSING alarms and zero actual portal/ compliance verification. Fix: add `"portal/"` to `source.dirs` in `inspector.config.yml` before the next run. This is likely the highest-ROI fix in any audit where the primary app isn't in Source/.

3. **Dependency P1s dominate grade when toolchain is neglected.** 5 of 6 P1 findings came from dependency-auditor (not quality-oracle). A monorepo with ~600 transitive deps and test frameworks 3 major versions behind will consistently land at grade D regardless of code quality. Recommend scheduling dependency sweeps independently of feature work.

4. **Cross-reference map is essential for remediation efficiency.** A single `npm update vitest vite ...` in Source/Frontend resolves 2 P1s and 7 P2s simultaneously. Without the cross-reference map, a team might address each finding individually across 9 separate PRs. Synthesise cross-refs before routing to TheFixer.

5. **TheGuardians escalation threshold:** 4 findings hit security triggers: 2 code injection (Handlebars, Protobufjs), 1 auth bypass (proxy-addr), 1 sensitive data exposed (Vitest UI). All are in dependencies, not application code — but they affect infrastructure (orchestrator, CI/CD). Always escalate when CVSS ≥ 9.0 or when the trigger matches `security_triggers` in config.

6. **Grade formula:** Apply config grading thresholds strictly. 6 P1s > C's max of 2 → D. Do not apply judgment to soften the grade (e.g., "most are dependency CVEs, not real code bugs"). The grade signals urgency; letting it drift misleads operators.

7. **First audit baseline:** When no prior audit exists, all 22 findings are NEW. Set target grade for next run (C or better) and document it in the trend section. The re-verification table is always the first thing operators check on the second run.

### Structural Notes

- Report config paths: HTML → `Teams/TheInspector/findings/audit-{date}-{grade}.html`, JSON backlog → `bug-backlog-{date}.json`
- HTML reports are `.gitignore`d in findings/ — they are large (the D-grade report is ~60KB). Bug backlog JSON is tracked.
- The `escalations` array in the bug backlog JSON is separate from `p1_findings` — this allows TheGuardians to consume only their slice without parsing all findings.
- Performance-profiler and chaos-monkey produce no output when services are offline. Mark their specialist cards as "Skipped" and include the configured latency budgets as reference only.
