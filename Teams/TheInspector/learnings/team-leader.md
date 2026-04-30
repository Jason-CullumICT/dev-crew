# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Audit: 2026-04-30 — Grade D

### First audit — baseline established

### Synthesis Lessons

#### Grading requires combining all specialist P1 counts
Quality oracle said "C" (2 P1s). Dependency auditor said "B" (0 P1s in production).
Combined: 3 P1s (QO-001, QO-002, DEP-001) → Grade D per config (C = max_p1:2).
Always count P1s across ALL specialists before assigning final grade.

#### DEP P1s may be context-downgrade candidates
Dependency auditor's DEP-001 is P1 by CVSS (9.8) but has "no exploitable path in current codebase."
Flag these for TheGuardians to re-classify. Note the grade impact in the report so operators understand
the boundary case. Format used: "If DEP-001 re-classified P2 by TheGuardians, grade = C."

#### Two-app architecture: Source/ vs portal/
This repo has TWO applications. Future audits must scope both:
- `Source/` — Self-Judging Workflow Engine (FR-WF-001–013, FR-dependency-*)
- `portal/` — Dev-Workflow-Platform portal (FR-001–095, FR-DUP-*)

The traceability enforcer only scans `Source/` — this is itself a P1 finding (QO-002) until fixed.

#### Performance and chaos specialists need running services
- performance-profiler: requires `curl -sf http://localhost:3001/` to succeed
- chaos-monkey: requires ALL services healthy
- On this audit both were offline → 0 dynamic tests. Grade is incomplete.
- Always note this limitation prominently: "Performance and fault-injection data unavailable."

#### Cross-reference map is the highest-value synthesis output
The cross-reference map saved TheFixer from filing 6 separate tickets when 1 fix (vite upgrade)
resolves DEP-003+004+005+006. Always build this map before writing recommendations.

### Key file paths for future synthesis

| Purpose | Path |
|---------|------|
| Inspector config | `Teams/TheInspector/inspector.config.yml` |
| Findings dir | `Teams/TheInspector/findings/` |
| HTML report (this audit) | `Teams/TheInspector/findings/audit-2026-04-30-D.html` |
| Bug backlog JSON | `Teams/TheInspector/findings/bug-backlog-2026-04-30.json` |
| Quality oracle findings | `Teams/TheInspector/findings/audit-2026-04-30-C.md` |
| Dependency findings | `Teams/TheInspector/findings/audit-2026-04-30.md` |
| Backend entry point | `Source/Backend/src/app.ts` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Metrics | `Source/Backend/src/metrics.ts` |
| Status enum | `Source/Shared/types/workflow.ts` |

### Open items for next audit (2026-05-30)
- Verify DEP-001 escalation outcome from TheGuardians
- Confirm uuid upgraded (DEP-002) — FIXED or STILL OPEN
- Confirm GET /api/search implemented (QO-001) — FIXED or STILL OPEN
- Confirm portal/ added to enforcer (QO-002) — FIXED or STILL OPEN
- Run in dynamic mode (services must be up) to collect performance baselines
- Run chaos-monkey against concurrent state transition scenario
