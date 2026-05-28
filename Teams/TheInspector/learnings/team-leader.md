# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-28 — First consolidated audit (run-20260528-062611)

**Grade resolution:** When combining specialist grades, the overall grade is determined by combined P1/P2 totals against the thresholds in `inspector.config.yml` — not by averaging specialist grades. quality-oracle was C and dependency-auditor was B independently, but combined totals (2 P1, 16 P2) pushed the consolidated grade to D.

**Dev-time CVEs still count:** The dependency-auditor found 7 CVEs in frontend build tools (vite, esbuild, postcss, ws, vitest). Even though production runtime code was clean, these still count as P2 findings in the combined grade. Developer-machine and CI/CD compromise is a real attack surface.

**Cross-reference map is the highest-value synthesis output:** Communicating "one npm update resolves 6 P2s" is far more actionable than 6 individual CVE entries. Always build the cross-ref map — it directly guides remediation triage.

**Escalation path when no PR exists:** Used the console fallback format. Operators must run TheGuardians manually: `Read Teams/TheGuardians/team-leader.md` before merging.

**Services offline → static-only mode:** Both services (localhost:3001, localhost:5173) were offline. performance-profiler and chaos-monkey were deferred. Always document which specialists were deferred and why in the Scope section. Re-run with services live to complete the audit.

**Spec coverage nuance:** Project has a deliberately archived 69-FR spec (dev-workflow-platform.md) with 0% implementation. Exclude archived specs from active coverage calculation; explain the exclusion in the report. Apply grading thresholds to active-spec coverage only.

**Traceability enforcer blind spot:** Enforcer regex `FR-[A-Z0-9-]+` silently ignores all lowercase FR IDs (`FR-dependency-*`). This is a P2 tooling finding — always note it when interpreting enforcer results.

**Finding counts from dependency-auditor:** The dep-auditor summary cited "13 CVEs" but filed 10 named finding IDs (DEP-001 to DEP-010), with Handlebars variants bundled under DEP-001. Use named finding IDs for backlog JSON; use total CVE count for context only.
