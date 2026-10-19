# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

---

## Run: 2026-10-19 (inspector-2026-10-19)

### Grading Applied

Config thresholds used:
- A: max_p1=0, max_p2=3, min_spec_coverage=80
- B: max_p1=0, max_p2=8, min_spec_coverage=60
- C: max_p1=2, max_p2=15, min_spec_coverage=40
- D: max_p1=999 (anything worse than C)

4 P1 findings exceeded C's max_p1=2 threshold → Grade D.
Note: Business logic/architecture graded independently at B. Grade D reflects dependency CVEs only.

### Specialist Availability Pattern

- quality-oracle: always runs (static only)
- dependency-auditor: always runs (static only)
- performance-profiler: requires backend at localhost:3001 — was offline this run
- chaos-monkey: requires ALL services healthy — was offline this run

When services are offline, write explicit "not run" entries in all 16 sections rather than omitting them. Use the `none-box` / `info-box` pattern.

### Escalation Routing

P1 findings from dependency-auditor all had `[ESCALATE → TheGuardians]` tags from the specialist. Team leader must:
1. Collect all such tags from specialist reports
2. Deduplicate (none found this run)
3. Emit console escalation block (no PR available this run)
4. List escalations separately in JSON bug backlog under `escalations` array

### Cross-Reference Map (Section 8) — Key Insight

This run produced 4 root-cause clusters that each resolve multiple findings:
- Vitest upgrade → 5 findings (2 P1 + 3 P2) — highest ROI fix
- Jest upgrade → 3 findings (1 P1 + 2 P2)
- CLAUDE.md topology docs → 2 findings (2 P2)
- Build toolchain (Vite/PostCSS) → 3 findings (2 P2 + 1 P3)

Always lead with cross-reference map in executive summary — operators act on root causes, not individual CVEs.

### Three-System Architecture (discovered by quality-oracle)

This repo has three distinct implementation targets:
- Source/ — workflow engine (Express + React, in-memory store)
- portal/ — dev-workflow-platform (SQLite, feature requests, bugs)
- platform/ — orchestrator infrastructure (Docker, pipeline server)

The traceability enforcer only scans Source/. This is QO-001 and QO-002 from this audit.

### HTML Report Generation Notes

The 16-section HTML report template works well. Key sections to populate carefully:
- Section 8 (Cross-Reference Map): most actionable for remediation planning
- Section 9 (P1 Findings): needs full exploit scenario, not just CVE summary
- Section 10 (Risk Matrix): use zero-precondition vs authenticated vs privileged vs physical
- Section 15 (Recommendations): must use the 4-tier structure (block/sprint/next/backlog)

### JSON Backlog Structure

Top-level keys: audit_id, date, grade, totals, escalations[], p2_findings[], p3_findings[], p4_findings[], cross_reference_map[], remediation_schedule{}
Keep escalations in a separate array from p1_findings for easy routing to TheGuardians.

### First-Run Baseline Notes

- All findings tagged NEW — no FIXED/STILL OPEN/REGRESSED counts possible
- Section 7 (Re-verification) and Section 5 (Trend) will be meaningful from second audit onward
- Target grade for next audit: B (after toolchain upgrades resolve all 4 P1s)
