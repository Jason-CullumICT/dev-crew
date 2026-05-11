# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### Run: 2026-05-11 — Grade C

#### Grading Baseline
- First Inspector-level synthesis. Grade C = max_p1=2 at the threshold.
- Key driver: dependency-auditor found 2 P1 CVEs (handlebars RCE, protobufjs ACE).
- Quality-oracle alone would have been Grade A (0 P1, 1 P2, 96% coverage).
- Lesson: dependency-auditor is the most likely grade-lowering specialist even on architecturally clean projects.

#### Two-Codebase Architecture
- This repo has two separate apps: `Source/` (in-memory, FR-WF-*) and `portal/` (SQLite, FR-001–095).
- The traceability enforcer only scans the most recently modified plan — multi-plan gaps are invisible.
- Always check both codebases independently; quality issues tend to concentrate in `portal/`.

#### Services Were Offline
- Backend (localhost:3001) and Frontend (localhost:5173) were down during audit.
- performance-profiler and chaos-monkey were both skipped.
- To get a full-coverage audit (target grade B+): start both services before running TheInspector.

#### Escalation Path (No PR)
- No GitHub PR existed during this run — used offline escalation text output.
- TheGuardians must be triggered manually via `Teams/TheGuardians/team-leader.md`.

#### Finding Counts (Baseline for Re-verification)
- P1: 2 (both CVEs) | P2: 4 | P3: 9 | P4: 2 | Total: 17
- All findings are NEW — first audit.

#### Key Paths for Future Synthesis
| What | Path |
|------|------|
| Specialist reports (input) | `quality-oracle-report.md`, `dependency-auditor-report.md`, `performance-profiler-report.md`, `chaos-monkey-report.md` (root) |
| HTML report (output) | `Teams/TheInspector/findings/audit-{date}-{grade}.html` |
| JSON backlog (output) | `Teams/TheInspector/findings/bug-backlog-{date}.json` |
| Summary (output) | `inspector-report.md` (root) |
| Config | `Teams/TheInspector/inspector.config.yml` |
