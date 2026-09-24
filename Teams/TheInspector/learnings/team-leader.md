# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings from 2026-09-24 Audit (run-20260924-073556)

### Grading Dynamics

- **Code quality vs dependency health are independent axes.** This run's codebase was B-quality (0 P1, 1 P2 from quality-oracle) but dependency-auditor added 3 P1 CVEs → overall grade D. Always frame this clearly in the report so operators don't mistake a D for bad code.
- **First combined run establishes baseline.** If prior audit files exist only from a subset of specialists (e.g., quality-oracle-only run), treat the current run as "first full run" for trend purposes.

### Escalation Notes

- DEP-001 (protobufjs CVSS 9.8) and DEP-002 (handlebars CVSS 9.8) share the same root cause (AST type confusion). Flag this in Section 8 (Cross-Reference Map) — one security investigation covers both.
- No PR was open at synthesis time → escalation was printed to stdout rather than posted as PR comment. This is expected behavior; note in report.

### Specialist Availability

- Both backend (localhost:3001) and frontend (localhost:5173) were offline at audit time → performance-profiler and chaos-monkey could not run dynamic analysis. Always note deferred specialists clearly in Section 4 and Section 12.

### Report Patterns

- The `inspector.config.yml` `grading` thresholds are: A=0P1/3P2, B=0P1/8P2, C=2P1/15P2, D=999P1. With 3 P1s, the grade is D (not F, which is reserved for exploitable auth bypass + critical domain failure — CVEs without confirmed exploit paths do not qualify as F).
- Section 11 (Spec Coverage) needs two sub-sections when the repo has both an "active" spec and a "planned" (unimplemented) spec — show both clearly with context so the 0% planned coverage doesn't read as a regression.
- Section 8 (Cross-Reference Map) is most useful when grouping by root cause (e.g., "AST type confusion" covers two different P1 CVEs, same investigation resolves both).

### Dependency Audit Insights

- `portal/Backend` with 577 transitive dependencies is the single highest-risk workspace — watch it in future runs.
- `npm audit` counts CVEs per advisory × workspace, so the same CVE in multiple workspaces inflates counts. Note this when summarising P2 totals.
- License compliance was clean (MIT/Apache 2.0/BSD throughout) — this is worth calling out positively when true.

### Next Audit Preparation

- If DEP-001/002/003 are fixed, the next run should target grade B.
- Run with services up to enable dynamic profiler + chaos analysis.
- Add npm audit CI gate to prevent P1 CVE regressions silently accumulating.
