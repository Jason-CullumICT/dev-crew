# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-05-12 — Full Audit

### Architecture Snapshot

Source/ implements the **Self-Judging Workflow Engine** (`Specifications/workflow-engine.md`).  
FR IDs used: `FR-WF-001` – `FR-WF-013` (from `Plans/self-judging-workflow/requirements.md`)  
       plus `FR-dependency-*` (from `Plans/dependency-linking/requirements.md`).

`Specifications/dev-workflow-platform.md` (FR-001 to FR-069) and  
`Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010) describe  
the **portal/** app and **platform/** orchestrator respectively — NOT Source/.  
Do NOT expect Verifies comments for these IDs in Source/.

### Spec Coverage (Plans-based — what Source/ actually implements)
- FR-WF-001 to FR-WF-013: **13/13 covered** (100%)
- FR-dependency-* (16 total): **14/16 covered** — MISSING: `FR-dependency-search` (no route registered), `FR-dependency-seed` (no implementation)
- **Overall Source/ coverage: 27/29 = 93%**

### Key File Paths for Fast Future Audits
- Backend routes: `Source/Backend/src/routes/{workItems,workflow,intake,dashboard}.ts`
- Backend services: `Source/Backend/src/services/{router,assessment,dependency,changeHistory,dashboard}.ts`
- Store (data layer): `Source/Backend/src/store/workItemStore.ts`
- Metrics: `Source/Backend/src/metrics.ts`
- Logger (primary): `Source/Backend/src/utils/logger.ts` (re-exported via `src/logger.ts`)
- Shared types: `Source/Shared/types/workflow.ts`
- Frontend tests: `Source/Frontend/tests/` (root) and `Source/Frontend/tests/{pages,components}/`
- Backend tests: `Source/Backend/tests/routes/` and `Source/Backend/tests/services/`
- Plans with requirements.md: `Plans/self-judging-workflow/`, `Plans/dependency-linking/`
- Traceability enforcer: `tools/traceability-enforcer.py` (targets most-recently-modified Plans/*/requirements.md)

### Standing Issues (Open as of 2026-05-12)

| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| QO-001 | P1 | OPEN | Specification-implementation namespace mismatch |
| QO-002 | P1 | OPEN | Search route (FR-dependency-search) unregistered in app.ts |
| QO-003 | P2 | OPEN | Architecture violation: direct store calls from route handlers |
| QO-004 | P2 | OPEN | OpenTelemetry not implemented |
| QO-005 | P2 | OPEN | `dependencyCheckDuration` histogram missing from metrics.ts |
| QO-006 | P2 | OPEN | Traceability enforcer never checks Specifications/ |
| QO-007 | P3 | OPEN | Duplicate frontend test files (WorkItemDetailPage, WorkItemListPage) |
| QO-008 | P3 | OPEN | Logger has no dev/prod pretty-print switching |
| QO-009 | P3 | OPEN | FR-dependency-seed unimplemented in Source/ |
| QO-010 | P3 | OPEN | Two logger abstractions (src/logger.ts + src/utils/logger.ts) |

### Pattern Violations Commonly Found
- Routes importing directly from `store/workItemStore` (bypass service layer)
- OTel entirely absent — no spans, no traceparent propagation
- process.stdout.write always emits JSON (no NODE_ENV check for dev pretty-print)

### Traceability Enforcer Behaviour
- Auto-picks most-recently-modified Plans/*/requirements.md
- When all timestamps are equal (git clone), picks alphabetically first → currently picks `Plans/self-judging-workflow/requirements.md`
- Does NOT scan `Specifications/` — this is by design for the Plans-scoped enforcer
- FR-0002, FR-0003, FR-0004, FR-0005, FR-0007, FR-070, FR-085 flagged by enforcer when running dependency-linking requirements — these are cross-references in the document body, not actual enforcement targets
