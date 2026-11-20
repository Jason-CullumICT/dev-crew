# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-11-20 — First Audit Run

**Static-only run when services are offline**
- When `localhost:3001` / `localhost:5173` are unreachable, skip performance-profiler and chaos-monkey cleanly. Mark them in the report as "Skipped — services offline" with the config latency budgets still shown for reference. This avoids false negatives and keeps the report honest about what was and wasn't measured.

**Grade calculation: use the most penalising dimension**
- The grading config uses `max_p1`, `max_p2`, AND `min_spec_coverage` as a conjunction — a project must satisfy ALL criteria for a given grade. Spec coverage at 15% (below C minimum of 40%) is enough on its own to give a D, even before counting the 7 P1 findings. Apply the most penalising dimension, not an average.

**Dependency CVEs map to inspector severity as: critical→P1, high→P2, moderate→P3, low→P4**
- This mapping keeps the scorecard consistent whether findings come from quality-oracle or dependency-auditor.

**Cross-reference map (Section 8) is high-value for TheFixer routing**
- The most useful cross-refs were: (a) vitest version lag → 2 critical CVEs both fixed by one command, (b) proxy-addr vulnerability appearing in both Backend and Orchestrator, (c) traceability enforcer scope gap causing QO-001 to never surface in CI.

**Escalation trigger: "auth bypass" and "injection" are canonical security_triggers**
- DEP-002 (proxy-addr) qualifies as "auth bypass"; DEP-001/003/004/005 qualify as "injection/RCE". Route all five to TheGuardians, not TheFixer, even when the fix is a simple `npm update`. TheGuardians must verify exploitability in the actual deployment context.

**First audit baseline**
- All 41 findings are NEW. The next audit's re-verification section should compare FIXED/STILL OPEN/REGRESSED against this run's findings list in `bug-backlog-2026-11-20.json`.

**Report path conventions (from inspector.config.yml)**
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- Bug backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Root `inspector-report.md` is a placeholder (empty); the canonical report is the HTML file.
