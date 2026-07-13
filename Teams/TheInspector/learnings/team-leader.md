# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

## Run: 2026-07-13 (run-20260713-055359) — Full Codebase Audit

### Grade: D
- P1: 3 (2 CRITICAL CVEs + 1 spec governance), P2: 10, P3: 51, P4: 1
- Spec coverage: ~98% — strong; dependency hygiene is the critical gap

### Grading Lesson
- Dependency auditor CVEs (CRITICAL/HIGH) map directly to P1/P2 in the combined grade
- A single npm audit fix run can clear all P1 CVEs — this is usually the fastest path to a grade improvement
- CVSS 9.8 = P1 regardless of whether it's runtime or build-time

### Escalation Routing
- All CVSS-scored CVEs (CRITICAL + HIGH from dependency audit) → TheGuardians
- Spec governance violations (QO-001 class) → requirements-reviewer + TheFixer; do NOT route to TheGuardians
- No auth bypass or domain failure found → F grade not triggered

### Specialist Mode Lessons
- Both performance-profiler and chaos-monkey skipped (services offline)
- To enable dynamic mode next audit: start backend (port 3001) and frontend (port 5173) before audit begins
- Static analysis from quality-oracle partially covers what chaos-monkey would test (e.g., QO-003 direct DB calls)

### Cross-Reference Patterns Found
1. Outdated npm ecosystem → touches every CVE finding across all projects (single fix = npm audit fix)
2. Spec governance gap → one root cause creates 3 findings (QO-001, QO-002, QO-007); promote FRs to Specifications/
3. Missing observability → QO-005 + QO-006 are companion findings; solve in one PR

### File Paths for Fast Future Audits
- Inspector config: `Teams/TheInspector/inspector.config.yml`
- Grading thresholds: `Teams/TheInspector/inspector.config.yml` (grading section)
- Quality oracle report: `quality-oracle-report.md` (repo root after each run)
- Dependency auditor report: `dependency-auditor-report.md` (repo root after each run)
- Prior audit HTML: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- Prior bug backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`

### Synthesis Process That Worked
1. Read all specialist reports first (parallel)
2. Map CRITICAL/HIGH CVEs to P1/P2 using grading config thresholds
3. Count total P1s across all specialists to determine grade
4. Build cross-reference map by finding root causes that appear in 2+ findings
5. Escalate anything matching security_triggers from config.escalation to TheGuardians
6. Write HTML report with all 16 sections, then bug-backlog JSON, then inspector-report.md summary
