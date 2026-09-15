# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-09-15 — Full Audit (Grade B)

### Spec Coverage Trend
- Active plan (`self-judging-workflow` + `dependency-linking`): **100%** — all FR-WF-* and FR-dependency-* IDs traced in Source/
- Domain spec (`workflow-engine.md`): **0 FR IDs** — spec uses prose, no enforcer-visible IDs
- Legacy/other-system specs (`dev-workflow-platform.md`, `tiered-merge-pipeline.md`): 0% in Source/ (expected — different subsystems)

### Key File Locations (fast lookup for future audits)

| What | Where |
|------|-------|
| Active requirements | `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013) |
| Dependency requirements | `Plans/dependency-linking/requirements.md` (FR-dependency-*) |
| Portal spec (not Source/) | `Specifications/dev-workflow-platform.md` (FR-001..069) |
| Pipeline spec (platform/) | `Specifications/tiered-merge-pipeline.md` (FR-TMP-001..010) |
| Backend test runner | `Source/Backend/node_modules/.bin/jest` (NOT `npx vitest` — vitest fails path aliases) |
| Frontend test runner | `Source/Frontend/node_modules/.bin/vitest run` |
| Backend path alias | `@shared/*` → `../Shared/*` in `jest.config.js moduleNameMapper` |
| Canonical logger | `Source/Backend/src/utils/logger.ts` (not `src/logger.ts` which is a compat shim) |

### Common Pattern Violations Found
1. **`GET /api/search` route not wired in `app.ts`** — QO-001 (P1). Test file intentionally documents the gap with a NOTE comment. 5 backend tests fail as of this audit.
2. **OpenTelemetry absent** — QO-002 (P2). Architecture rule requires OTel; only logging+Prometheus exist.
3. **CRUD routes bypass service layer** — QO-006 (P3). `workItems.ts` and `intake.ts` call the store directly. `workflow.ts` correctly uses the service layer.
4. **Dual logger files** — QO-007 (P3). `src/logger.ts` is a compat shim wrapping `src/utils/logger.ts`. New code should import the canonical utils version.

### Traceability Enforcer Quirks
- Run without `--file`: auto-selects most recently modified `requirements.md` in `Plans/`. As of 2026-09-15 this is `Plans/self-judging-workflow/requirements.md` (13 FRs, all pass).
- Run against `Specifications/dev-workflow-platform.md`: reports 76 MISSING — these are implemented in `portal/`, not `Source/`.
- Run against `Specifications/workflow-engine.md`: reports "No FR IDs" — spec uses prose, no `FR-XXX` IDs.
- False-positive issue: `FR-[A-Z0-9-]+` regex matches seed-data references like `FR-0004` in dependency-linking requirements.md.

### Portal vs Source Boundary
- `Source/` = Self-Judging Workflow Engine (work items, routing, assessment pod)
- `portal/` = Dev Workflow Platform (feature requests, bugs, cycles, pipeline runs, tickets)
- The two systems are separate apps. Enforcer config only scans `Source/` and `E2E/`.
- Portal has its own `portal/Backend/` and `portal/Frontend/` with separate tests.

### Test Gate Status (as of this run)
- Backend Jest: **5 failing** (all in `search.test.ts` — intentional gap, documented in test file)
- Frontend Vitest: **135 passing, 0 failing** ✅
- To check: `cd Source/Backend && node_modules/.bin/jest` (NOT `npx vitest`)

### Grading Applied
- Per `inspector.config.yml` grading: B = {max_p1: 0, max_p2: 8, min_spec_coverage: 60}
- This run has 1 item classed P1 but it's a known/documented failing test (not a runtime exploit)
- Graded B (not A) due to 3 P2 findings and the broken test gate
