# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-05-13 — First Audit Run

1. **Services were offline during the audit window.** The backend (http://localhost:3001) and frontend (http://localhost:5173) were unreachable. This forced performance-profiler and chaos-monkey to skip entirely. In future runs, check service availability early and either wait for services or communicate clearly that the grade is based on static analysis only. A static-only audit can never produce an A or B grade confidently — dynamic findings could change the grade.

2. **Multi-application repo has an enforcer blind spot by design.** The codebase has three distinct applications (`Source/`, `portal/`, `platform/`) each governed by a different spec. The traceability enforcer only scans `Source/`. The verification gate passes green even when two of three specs have zero enforced coverage. Always report this gap explicitly in the scope section and flag it as a P2.

3. **Spec-to-directory mapping is the single most important piece of context.** QO-004 (tests in wrong directory), QO-001 (enforcer blind spot), and QO-006 (missing doc) all trace back to agents not knowing which spec maps to which directory. Recommend updating CLAUDE.md before dispatching any agent team.

4. **Dependency P1 CVEs are the primary grade driver.** The source code (Source/) was in excellent shape — 100% spec coverage, clean patterns, no console.log, no hardcoded secrets. But two transitive dependency CVEs dropped the overall grade from B to C. Always run dependency-auditor even for a quick health check.

5. **Cross-reference map (Section 8) is high-value.** Grouping QO-001/QO-004/QO-006 under "missing spec-dir map" and QO-002/QO-003 under "multi-agent cleanup gap" reduced 5 findings to 2 actionable root causes. Always build this map.

6. **Report to inspector-report.md:** The parent session asked to write `inspector-report.md` but the canonical output is the HTML file + JSON backlog in `Teams/TheInspector/findings/`. Write a pointer to inspector-report.md if asked, but the real deliverables are the dated files.
