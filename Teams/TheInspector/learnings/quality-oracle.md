# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Audit 2026-10-08

#### Project Architecture
- The project has **two separate app layers**: `portal/` (feature requests, bugs, dev cycles — FR-001..095) and `Source/` (workflow engine — FR-WF-*, FR-dependency-*). They are independent codebases with separate `package.json` files.
- Traceability enforcer (`python3 tools/traceability-enforcer.py`) only scans the **most recently modified** `Plans/*/requirements.md`. Currently targets `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013 only). Does **not** scan portal FRs, FR-dependency-*, or FR-TMP-*.
- The `Specifications/` dir has 3 files: `dev-workflow-platform.md` (FR-001..069 + FR-dependency-*), `tiered-merge-pipeline.md` (FR-TMP-001..010), and `workflow-engine.md` (no numbered FRs — prose spec only).

#### Spec Drift Patterns (recurrent)
- **Plans/ as spec source**: FR-070..089 were defined in `Plans/` review reports and dispatch plans, not in `Specifications/`. Enforcement gap: Plans are implementation artifacts, not domain truth.
- **Implementation without spec**: FR-090..095 (orchestrator runs dashboard) are referenced in `portal/Frontend/src/components/orchestrator/` with `// Verifies:` comments but have **zero spec definition** in any canonical document. First observed: 2026-10-08.

#### Architecture Violations (recurrent risk)
- `Source/Backend/src/routes/workflow.ts`, `workItems.ts`, and `intake.ts` **call `store.*` directly** from route handlers — bypassing the service layer. The architecture rule "No direct DB calls from route handlers" is violated. The store is an in-memory Map used as the data access layer.
- Routes do mixed concerns: some actions are properly delegated to services (`routeWorkItem`, `assessWorkItem`) while other state mutations (approve, reject, dispatch, soft-delete) are done inline in the route handler.

#### Missing Implementations
- `GET /api/search` (FR-dependency-search): Tests exist in `Source/Backend/tests/routes/search.test.ts` and document the gap explicitly (lines 3–6). The route is **not registered** in `Source/Backend/src/app.ts`. Tests will fail. Fix: implement handler + register route.
- `FR-dependency-seed`: No test in `Source/Backend/tests/` verifies the seeded dependency state. Portal tests cover it but Source tests do not.
- `FR-TMP-008`: Worker container prerequisites (gh CLI, Playwright, GITHUB_TOKEN) not verified by any test.

#### Useful File Paths for Future Audits
- `Plans/self-judging-workflow/requirements.md` — authoritative FR-WF-001..013 requirement table
- `Plans/orchestrator-cycle-dashboard/requirements.md` — FR-070..076 definitions
- `Specifications/dev-workflow-platform.md` — FR-001..069 + FR-dependency-* (482 lines)
- `Source/Backend/src/app.ts` — route registration point; check for missing registrations
- `Source/Backend/tests/routes/search.test.ts` — documents search endpoint gap explicitly
- `platform/orchestrator/lib/workflow-engine.test.js` — FR-TMP tests (covers 8/10)
- `portal/` — separate codebase; implements FR-001..095

#### Spec Coverage Trend (baseline)
First audit. Coverage baseline: FR-WF 100%, FR-dependency 93.75%, FR-TMP 80%, portal FR-001..069 100%, portal FR-070..089 100%, FR-090..095 unspecced (drift).

#### Common Pattern Violations
- `eslint-disable-next-line react-hooks/exhaustive-deps` used in DependencyPicker.tsx and useWorkItems.ts without explanatory comments.
- No `console.log` violations in Source/ (logger abstraction is properly used everywhere).
- No hardcoded secrets found in Source/.
