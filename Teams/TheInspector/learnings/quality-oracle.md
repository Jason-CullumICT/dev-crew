# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Run 1 — 2026-06-07 (Full Audit)

#### Spec Coverage Trend
- **Plans-level coverage**: 27/29 requirements traced (93%) — FR-WF-* all pass; FR-dependency-search and FR-dependency-seed are missing implementations
- **Specifications-level coverage**: 0/69 requirements traced (0%) — `Specifications/dev-workflow-platform.md` uses `FR-001..FR-069` numeric IDs; source code uses `FR-WF-*` and `FR-dependency-*` namespaces — complete namespace disconnect

#### Critical File Paths for Future Audits
- `tools/traceability-enforcer.py` — auto-selects most recently modified `Plans/*/requirements.md`; does NOT scan `Specifications/`; produces false green when specs have untouched requirements
- `Plans/self-judging-workflow/requirements.md` — the plan the enforcer currently validates (FR-WF-001..013)
- `Specifications/dev-workflow-platform.md` — canonical spec with FR-001..069; describes a different domain (FeatureRequests, BugReports, DevelopmentCycles, SQLite) than what Source/ implements (WorkItems, in-memory store)
- `Specifications/workflow-engine.md` — the spec that DOES match Source/ implementation but uses prose, not FR-XXX IDs
- `Source/Backend/tests/routes/search.test.ts` — intentionally failing test documenting the missing `GET /api/search` route
- `Source/Backend/src/app.ts` — search route NOT wired here

#### Common Pattern Violations Found
1. Traceability enforcer does not target Specifications/ — only Plans/
2. Two ID namespaces exist (spec: FR-NNN, code: FR-WF-* and FR-dependency-*) with zero cross-linking
3. eslint-disable without inline justification in 2 frontend files
4. Silent JSON error swallow in api/client.ts (architecture rule violation)
5. No OpenTelemetry packages installed despite CLAUDE.md mandate

#### Architecture Observations
- Backend: Express + TypeScript + in-memory store (no SQLite despite FR-002 in dev-workflow-platform.md)
- Frontend: React + Vite + Tailwind, no test framework issues, good coverage overall
- All production source files have `// Verifies:` comments (recently modified files: 100%)
- All test files carry `Verifies:` comments (123 in backend, 153 in frontend)
- No `console.log` in production source — logger abstraction correctly enforced
- No hardcoded secrets or URLs in source files
- No files exceed 500 lines (largest: WorkItemDetailPage.tsx at 426 lines)
