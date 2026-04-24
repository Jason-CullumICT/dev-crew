# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-04-24 — First audit run

**Service availability:** On this run, both backend (localhost:3001) and frontend (localhost:5173) were offline. performance-profiler and chaos-monkey were skipped entirely. Schedule a follow-up audit when services are live to capture latency baselines and fault injection results.

**Specialist mode determination:** With no services available, only static specialists ran (quality-oracle, dependency-auditor). Both produce meaningful findings in static mode. Don't hold up the report waiting for dynamic mode — synthesise with what is available and document the gap.

**Grading with 2 specialists vs 4:** When two specialists are skipped, the finding totals will undercount P2/P3. The C grade this run was driven primarily by dependency CVEs. If performance-profiler had run and found latency budget breaches, the grade could have dropped to D. Note this caveat in the report.

**Cross-referencing between quality-oracle and dependency-auditor:** Several root causes span both specialists (e.g., missing service layer → injection risk; phantom FR IDs → cascading spec-drift). Always build the cross-reference map — it's the most actionable section for remediation planning.

**Escalation routing:** The project has no authentication layer — security escalations focus on injection, prototype pollution, and supply chain. When dependency-auditor surfaces CVEs, check if quality-oracle also found related patterns (missing input validation, as any casts) — they often co-occur.

**Inspector.config.yml is present:** The project has a populated config. Grading thresholds are: A=0 P1s/≤3 P2s/≥80% cov, B=0 P1s/≤8 P2s/≥60% cov, C=≤2 P1s/≤15 P2s/≥40% cov. Two P1 CVEs automatically floor the grade at C.

**Spec coverage estimation:** The enforcer only validates self-judging-workflow (FR-WF-001-013). Portal's 89+ FRs require a separate enforcer invocation. This is a P2 finding in itself (QO-005) — flag it every audit until fixed.

**Report paths:** HTML → `Teams/TheInspector/findings/audit-{date}-{grade}.html`, JSON backlog → `Teams/TheInspector/findings/bug-backlog-{date}.json`, summary → `inspector-report.md` at repo root.
