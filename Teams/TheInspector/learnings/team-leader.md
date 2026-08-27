# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-08-27 — First Audit Run

- **Traceability is split across Plans/ and Specifications/**. The enforcer only checks Plans/.
  Quality-oracle will consistently flag this until the architecture is aligned. In the scoping phase,
  always check whether traceability-enforcer.py covers Specifications/ — if not, flag as P1 immediately.

- **Dependency CVEs dominate when npm audit hasn't been run recently.**
  Always check npm audit output in scoping; if there are >5 CVEs, grade the dependency-auditor
  section D or F before the specialist even runs. Set expectations accordingly.

- **Services were offline both times checked** (localhost:3001, localhost:5173).
  performance-profiler and chaos-monkey will both be static-mode unless CI/CD explicitly
  brings up services before the audit. Consider adding a pre-audit service-health step.

- **No prior audit baseline on first run.**
  All findings classify as NEW. The trend section must clearly state "First audit — no baseline."
  Next run will produce delta tracking.

- **Grade calculation requires checking all three criteria simultaneously:**
  P1 count, P2 count, AND spec coverage. A project with 0 P1s but 15% coverage cannot be B.
  Use the config grading thresholds strictly; they are ordered by worst-failing criterion.

- **Cross-reference map (Section 8) is the highest-value section for remediation teams.**
  Grouping by root cause (e.g., "all backend CVEs from one npm audit --fix") dramatically reduces
  effort. Always build this before generating recommendations.

- **Escalation to TheGuardians is non-negotiable for RCE/XSS CVEs in transitive deps.**
  Even if the direct usage of the package seems safe, the CVE surface is real. Security team
  must confirm no code path reaches the vulnerable codepath.

- **When no PR is open**, the escalation falls back to a console notice. This is expected in
  branch-based audit workflows. Document the finding clearly in inspector-report.md so the
  lead engineer sees it on next review.
