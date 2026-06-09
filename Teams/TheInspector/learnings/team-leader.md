# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-06-09 — First audit run

**Dual-app architecture is the key structural fact.**
This repo has two completely separate apps: `Source/` (workflow engine, in-memory store, Express REST + React SPA) and `portal/` (dev-workflow-platform, SQLite, feature requests/bugs/dev cycles). Every specialist must be briefed on this split. The traceability enforcer, spec coverage numbers, and test discovery are all affected by it.

**The traceability enforcer is blind to portal/ (QO-001 — P1).**
`source_dirs = ["Source", "E2E"]` is hardcoded in `tools/traceability-enforcer.py`. Until this is fixed, any portal-targeting plan will appear as 100% failing even if fully traced. Do not report portal/ spec coverage as "0%" — it's a tool gap, not a code gap. Estimated actual portal/ coverage is ~95%+ based on manual review (300 Verifies comments present).

**Scoping must note which plans the enforcer can actually validate.**
The enforcer auto-selects the most-recently-modified plan. As of 2026-06-09 that is `self-judging-workflow` (100% pass). All other 7 plans are skipped. When reporting spec coverage, always note which plans were actually verified.

**Services were offline for this audit.**
Both `http://localhost:3001/` and `http://localhost:5173` were unreachable. Performance-profiler and chaos-monkey were skipped. Latency budgets and chaos scenarios remain unvalidated. Flag this prominently in the scope section.

**Grade D was driven by 3 P1 findings.**
- DEP-001: Handlebars RCE (CVSS 9.8) via stale `express@4.18.2` — injection class → escalated to TheGuardians
- DEP-002: Vitest UI file read/execute (CVSS 9.8) — dev-tool RCE → escalated to TheGuardians
- QO-001: Broken verification gate — architecture rule violation

With DEP-001 + DEP-002 patched and QO-001 fixed, the grade would rise to B (0 P1, 4 P2 remaining — within B threshold of max_p2: 8 assuming spec coverage ≥60%).

**Cross-reference map saves remediation effort.**
Updating `express` alone resolves DEP-001 + DEP-004 + DEP-005 + DEP-017 (4 findings).
Updating `vitest` alone resolves DEP-002 + DEP-009 + DEP-010 + DEP-013 + DEP-015 (5 findings).
Fixing the enforcer resolves QO-001 + QO-002 + QO-003 + QO-009 (4 findings).
Always build the cross-reference map — it's the highest-value section for operators.

**Escalation path when no PR/REPO context is available.**
The project had no open PR and `gh repo view` returned empty. The escalation block correctly fell back to console output. Document the escalation in the inspector-report.md prominently so human operators can act on it.

**Output convention established.**
- HTML report: `Teams/TheInspector/findings/audit-{date}-{grade}.html`
- JSON backlog: `Teams/TheInspector/findings/bug-backlog-{date}.json`
- Markdown synthesis: `inspector-report.md` at project root (per user workflow)
- JSON backlog is embedded in `inspector-report.md` AND saved separately for machine consumption.

**No prior audit baseline.**
All findings are NEW. Next audit should compare against this baseline. Expect FIXED on DEP-001/DEP-002 (easy npm updates) and potentially on QO-001 (one-line fix). Watch for REGRESSED if any P3 moderate CVEs are introduced by new dependencies.
