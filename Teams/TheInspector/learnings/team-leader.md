# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-03 — First audit run

**Grade anchoring:** The `inspector.config.yml` grading thresholds are strict. A single P1 eliminates A and B. With 4 P1s the project landed at D. Communicate to operators that grade D = "do not deploy" and grade C = "deploy with monitoring."

**Performance and chaos specialists need services running.** The backend at `:3001` and frontend at `:5173` were both offline at audit time. This silenced two of four specialists and left a significant dynamic-testing gap. When scoping, check service health early and surface the gap prominently in the report rather than mentioning it once in the scope section.

**Dependency auditor grade often drives the floor.** The dependency auditor found 3 critical CVEs (CVSS 9.8) before the quality oracle found 1. On projects with active CVE debt, the dependency grade will frequently be the binding constraint on the overall grade.

**Cross-reference map is high-value.** Grouping the frontend build chain vulnerabilities (vitest + vite + postcss) under a single root cause showed that one `npm audit fix` closes 3 CVEs and 3 TheGuardians escalations simultaneously. Operators respond better to "one command, three findings closed" than a list of three separate tickets.

**platform/ constraint surfaces in remediation.** Two P2 findings (DEP-007, DEP-010) and one P1 (DEP-002) live in `platform/orchestrator` which pipeline agents cannot touch. Always flag these with "Solo session only" in the recommendation so they don't get misrouted to TheFixer.

**Escalation count vs. actual security risk:** The 6 escalations include both P1 (code execution) and P2 (path traversal, header injection) findings. When writing the FINDING_SUMMARY for the PR comment, lead with the highest-severity items (CVSS 9.8) so the headline reflects actual risk, not just count.

**Portal/ blind spot is structural.** The traceability enforcer hard-codes `["Source", "E2E"]` scan dirs. This will appear as an open finding on every future audit until QO-003 is resolved. Note this in scoping so it doesn't look like a regression.

**Spec coverage number requires context.** 95% sounds good but is misleading — it only reflects the subset of requirements the enforcer checks. Always include the caveat "portal/ FRs not enforced" alongside the percentage.
