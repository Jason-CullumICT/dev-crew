# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings (updated 2026-07-24)

### Specialist Report File Locations
- quality-oracle writes to `./quality-oracle-report.md` (root level)
- dependency-auditor writes to `./dependency-auditor-report.md` (root level) + `Teams/TheInspector/findings/dependency-audit-{date}.{md,json}`
- performance-profiler and chaos-monkey write to `./performance-profiler-report.md` and `./chaos-monkey-report.md` respectively (check root level first)

### Grading Decision — First Run
- Grade D was assigned: 5 P1 findings exceeded the C threshold of max 2 P1
- 3 P1 CVEs (CVSS 9.8 each) from dependency-auditor + 2 P1 spec-drift from quality-oracle
- Canonical spec coverage 0% — but this alone would only block A/B grade, not drop to D

### Cross-Reference Map is High-Value
- XR-2 (@opentelemetry staleness) closed 5 findings (1 P1 + 2 P2 + 2 P3) with a single upgrade command — great ROI fix
- XR-3 (FR ID fragmentation) required architectural decision, not just a code fix
- Surfacing these groups before routing to TheFixer saves significant remediation effort

### dev-crew Codebase Specifics
- Source/ uses FR-WF-* IDs (Plans/self-judging-workflow namespace) — NOT FR-001…FR-069 from the canonical spec
- Specifications/dev-workflow-platform.md describes a system that was never built (SQLite-backed) — mark it deferred
- Specifications/workflow-engine.md is what Source actually implements but has zero FR IDs — high-value doc fix
- platform/ directory is excluded from traceability-enforcer.py source_dirs — causes false negatives on FR-TMP-*

### Service Availability
- Backend: http://localhost:3001 was offline during this audit
- Frontend: http://localhost:5173 was offline
- This forced static-only mode — performance-profiler and chaos-monkey both skipped
- Re-run checklist: `curl -sf http://localhost:3001/ && curl -sf http://localhost:5173` before dispatching dynamic-mode specialists

### Dependency Audit Findings Pattern
- handlebars, protobufjs, and @opentelemetry/* are recurring CVE sources — check these first in future audits
- vitest/vite/ws share a common update path — group as a single fix block (XR-1)
- npm audit fix --workspaces resolves most P2 CVEs that are transitive (form-data, brace-expansion, path-to-regexp, ws)

### HTML Report Generation
- All 16 mandatory sections must be present even with no data (use "None" or "NOT RUN" placeholder)
- Section 8 (Cross-Reference Map) is the highest-value section for engineering teams — build it carefully
- Section 12 (Latency) should still document configured budgets even when performance-profiler not run
- Status palette hex: P1 critical #d03b3b, P2 serious #ec835a, P3 warning #fab219, P4 muted #898781, good #0ca30c

### Escalation Routing
- Security escalations (RCE, XSS) → TheGuardians; all others → TheFixer
- When no PR is open and no remote repo configured, print the escalation to stdout — that's correct behavior
- The react-router open redirect (DEP-008) met the XSS trigger threshold despite being P2 — escalated correctly

### Findings Index
- `Teams/TheInspector/findings/INDEX.md` maintained by dependency-auditor for its own artifacts
- Add a master index update after future audits include HTML report and bug backlog paths
