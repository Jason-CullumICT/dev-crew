# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-10-04 — First Audit Run

**Specialists available vs. run:**
- quality-oracle and dependency-auditor always run in static mode regardless of service availability.
- performance-profiler and chaos-monkey require services running (backend: 3001, frontend: 5173). In CI/audit branches, services are typically offline — plan for static-only audits by default.

**Dependency auditor report format:**
- The dependency-auditor writes a conversational summary to `dependency-auditor-report.md` and a detailed structured report to `Teams/TheInspector/findings/AUDIT-{date}.md`. Always read both — the detailed file has per-package breakdowns and CVE tables essential for the risk matrix and P2 section.

**Grading calibration:**
- With 5 P1 CVEs from dependency-auditor + 3 P1 spec findings from quality-oracle, the grade lands firmly at D. The C threshold (max_p1=2) is exceeded by the first dependency audit alone if the project hasn't run `npm audit` in CI.
- F is the right grade if Handlebars RCE is confirmed exploitable AND a critical domain function fails (both conditions). Without services running, we can't confirm dynamic exploitability — stay at D.

**Cross-reference map value:**
- Root cause A (enforcer blind to Specifications/) drives 3 P1 findings (QO-001, 002, 003). A single one-file fix to `tools/traceability-enforcer.py` resolves all three. Always surface these in §8 — it's the highest-leverage recommendation for the team.

**Escalation routing:**
- No open PR was found on this branch — used printf escalation path. Consider recommending that teams open draft PRs before triggering TheInspector so the GitHub PR comment path can be used for better visibility.

**First audit baseline:**
- All 145 findings are NEW. Next audit (recommended 2026-10-18) should see FIXED items if remediation proceeds per the plan. Track grade trajectory from D → C → B over 2–3 sprints.

**Report output paths:**
- HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Summary: `inspector-report.md` (root of repo, alongside specialist reports)
