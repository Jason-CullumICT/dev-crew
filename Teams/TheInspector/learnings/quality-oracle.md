# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit: 2026-11-07 — Full Audit

### Key Project Context Discovered

- **Product implemented**: Self-Judging Workflow Engine (workflow item intake, routing, assessment, dispatch)
- **Specification that matches implementation**: `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md`
- **Specification that does NOT match implementation**: `Specifications/dev-workflow-platform.md` (FR-001–FR-069) — describes a different historical product (feature request management, dev cycles, pipeline orchestration) that is **not built** in `Source/`
- **FR naming in source**: `FR-WF-001` to `FR-WF-013` and `FR-dependency-*` (from Plans, not from main Specifications)
- **FR naming in Specifications**: `FR-001` to `FR-069` (untraced in Source)

### Traceability Enforcer Behaviour

- `tools/traceability-enforcer.py` auto-detects the most recently modified `Plans/*/requirements.md`
- It scans `Plans/self-judging-workflow/requirements.md` → passes (FR-WF-* all traced)
- It does **NOT** scan `Specifications/` directory at all — the inspector.config.yml `specs.dir` is not used by the enforcer
- The enforcer ALWAYS passes as long as Plans-level FRs are traced, regardless of Specifications-level coverage

### Useful File Paths

- Main spec (unimplemented product): `Specifications/dev-workflow-platform.md`
- Workflow engine spec (implemented): `Specifications/workflow-engine.md`
- Plans requirements (what enforcer tracks): `Plans/self-judging-workflow/requirements.md`
- Backend routes: `Source/Backend/src/routes/` (workItems, workflow, dashboard, intake — no search)
- Shared types: `Source/Shared/types/workflow.ts`
- API contracts doc: `Source/Shared/api-contracts.md`

### Open Issues (P1/P2)

| ID | Severity | Status | Description |
|----|----------|--------|-------------|
| QO-001 | P1 | OPEN | `Specifications/dev-workflow-platform.md` FR-001–FR-069 have 0% source traceability — different product, not implemented |
| QO-002 | P1 | OPEN | `GET /api/search` (FR-dependency-search) is not wired in `app.ts` — test file documents this gap explicitly; tests will fail |
| QO-003 | P2 | OPEN | Traceability enforcer blind spot: only scans Plans/, ignores Specifications/ — false compliance signal |
| QO-004 | P2 | OPEN | `api-contracts.md` references FR-070 through FR-085 but these IDs exist in no specification file |
| QO-005 | P2 | OPEN | Duplicate frontend test files for WorkItemDetailPage and WorkItemListPage under both `tests/` and `tests/pages/` |

### Spec Coverage Trend

- **Plans FR-WF-001..013**: 100% (enforcer confirms)
- **FR-dependency-*** (minus search): ~92% traced, search endpoint unimplemented
- **Specifications FR-001..069**: 0% (different product domain, not in scope of current build)
