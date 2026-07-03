# Team Leader Learnings

_Persistent learnings for the team leader agent. Updated after each audit run._

## Learnings

### 2026-07-03 — First audit run (run-20260703-060752)

**Codebase has 3 distinct implementation zones — all must be scoped**
- `Source/` = workflow engine (13 FRs, fully enforcer-visible)
- `portal/` = main dev platform app (~80 FRs, enforcer-blind)
- `platform/` = orchestrator infrastructure (10 FRs, enforcer-blind)
- The traceability enforcer only scans `["Source", "E2E"]` by default. Without fixing this, the quality gate is meaningless as a project-wide signal. Always scope all 3 zones explicitly in the audit plan.

**Services were offline — performance-profiler and chaos-monkey skipped**
- Backend: http://localhost:3001 not reachable
- Frontend: http://localhost:5173 not reachable
- Both dynamic specialists were skipped. Schedule a follow-up audit with services running to get chaos and latency data.

**Grade D driven by dep CVEs + tooling blindspot — code quality is actually good**
- The Source/ workflow engine code is clean (100% spec coverage, no architecture violations)
- The grade drag came from dependency CVEs (handlebars CVSS 9.8, vitest CVSS 9.8) and the enforcer blindspot
- After patching deps and fixing the enforcer, grade should recover to B

**Dependency audit always adds P1/P2 — weight it appropriately**
- 637 transitive deps across the workspace — expected for modern Node.js projects
- npm audit is reliable and fast; dependency-auditor should always run static even without services
- Handlebars is a common transitive dep — watch it on every run

**FR ID collisions are a coordination failure — flag early**
- FR-070–073 claimed by two plans. This kind of collision corrupts traceability permanently if unchecked.
- Recommend: add FR ID reservation to the planning process (requirements-reviewer should check for clashes before assigning new IDs)

**Cross-reference map is high-value — don't skip it**
- Frontend dep chain (vite/vitest) accounts for 4 findings that one npm update pass resolves
- Backend dep chain accounts for 5 findings that one npm audit fix pass resolves
- Grouping by root cause helps TheFixer batch-fix efficiently

**Escalation triggers hit on injection and code execution — correct**
- DEP-001 (handlebars injection), DEP-002 (vitest code exec), DEP-003 (CRLF injection) all correctly escalated to TheGuardians
- No PR was open, so escalation printed to stdout — correct fallback path
