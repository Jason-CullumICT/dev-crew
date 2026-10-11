# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### Run 2026-10-11

#### Synthesis Observations

**Two-codebase structure**: This project has two distinct app codebases requiring separate analysis:
- `Source/` — Self-Judging Workflow Engine (specs: Specifications/workflow-engine.md, FR-WF-*)
- `portal/` — Dev Workflow Platform UI + Backend (specs: Specifications/dev-workflow-platform.md, FR-001..FR-069 + FR-dependency-*)

**Grade calculation pattern**: With config thresholds (A: max_p1=0, B: max_p1=0, C: max_p1=2, D: catch-all), even a single P1 drops grade to C or below. CVE clusters from outdated dev tooling (jest, vitest) can dominate grade more than application logic issues.

**Services offline = 2 specialists idle**: performance-profiler and chaos-monkey both require services running. Plan audits to be run with services live for complete coverage. First audit of a branch may always be services-down if run in CI without service startup.

**Escalation path without GitHub PR**: When `gh pr view` returns empty (no PR yet), use terminal escalation block with clear instructions pointing to Teams/TheGuardians/team-leader.md.

**Quick upgrade paths compress multiple findings**: 
- `vitest@5.0.3` resolves DEP-003 + DEP-004 + DEP-005 + DEP-006 (4 findings, 1 command)
- `jest@30.5.2` resolves DEP-001 + DEP-007 (2 findings, 1 command)
- Identifying these clusters is high-value synthesis the specialists don't do individually

#### Grade Baselines
- 2026-10-11: **D** (5 P1 CVEs, 7 P2, 3 P3)
- Target for next run: **B** (after CVE remediation: 0 P1, 7 P2 → meets B threshold)

#### Report Format Notes
- All 16 mandatory sections must be present; empty sections use "None" — never omit
- Section 8 (Cross-Reference Map) was the most actionable synthesis — group findings by root cause first
- Section 10 (Risk Matrix) exploitability: dev/build dependencies map to "Authenticated" (requires developer env access); runtime deps like proxy-addr map to "Zero-precondition" (any network user behind proxy)
