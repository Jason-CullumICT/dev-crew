# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run: 2026-04-17 (run-20260417-050202)

### Grading gotcha — combined vs. specialist grades
Specialists self-grade their own domain (dependency-auditor gave itself B, quality-oracle gave itself C). The team leader must apply the grading thresholds to the **combined** P1/P2 counts across all specialists. In this run the combined 3 P1s yielded overall grade D even though both specialists individually graded themselves C or better.

### DEP-001 / DEP-006 escalation: platform/ is solo-session only
`platform/orchestrator` is solo-session only per CLAUDE.md. DEP-006 (protobufjs) and DEP-007 (path-to-regexp) both affect this directory. When routing fixes to TheFixer, explicitly note that `platform/` changes require a solo session — not a pipeline agent.

### Services offline → skipped specialists
When neither backend (localhost:3001) nor frontend (localhost:5173) respond to health checks, performance-profiler and chaos-monkey cannot run. Mark them "Not Run" in the report but document the deferred scenarios and latency budget targets so the next live audit can populate them immediately.

### Cross-reference map is high-value for remediation
The spec management findings (QO-001/002/003/004) all share a single root cause: no centralised FR registry + single-plan enforcer. Grouping them in the cross-reference map shows TheFixer a single fix path rather than four separate tickets.

### First-audit baseline
The first audit produces no FIXED/STILL OPEN/REGRESSED classifications. Stress this in the Trend section and set the expectation that the second audit is where the value of tracking shows up.

### Report filename follows grade
Config specifies `filename_pattern: "audit-{date}-{grade}.html"` — use the overall team-leader grade, not any specialist's individual grade. File: `audit-2026-04-17-D.html`.
