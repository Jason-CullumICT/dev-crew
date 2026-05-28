# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-05-28 — Full Audit (First Run)

### Spec Coverage

| Spec File | FR Count | Enforcer Visible? | Coverage |
|-----------|----------|-------------------|----------|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | ✅ | 100% |
| `Plans/dependency-linking/requirements.md` (FR-dependency-*) | ~16 | ❌ (regex blind) | ~81% |
| `Specifications/dev-workflow-platform.md` (FR-001–FR-069) | 69 | N/A | 0% (pivot) |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 10 | N/A | Platform only |

### Critical Learnings

1. **Enforcer regex is case-sensitive uppercase only** — Pattern `FR-[A-Z0-9-]+` silently skips all `FR-dependency-*` IDs (lowercase). The 16 dependency requirements are invisible to the enforcer. Fix: change regex to `FR-[A-Za-z0-9-]+`.

2. **Enforcer picks up incidental FR references** — The dependency-linking requirements.md references `FR-0002`, `FR-0003`, etc. in its seed data section, and `FR-070 — FR-085` in the spec reference. The enforcer treats these as requirement IDs to check, producing false failures on things like "FR-0002 has no Verifies comment."

3. **`GET /api/search` is not wired into `app.ts`** — The route handler doesn't exist in Source/ and it's not registered. `Source/Backend/tests/routes/search.test.ts` self-documents this gap ("These tests will FAIL until the route is implemented"). This is P1.

4. **Route handlers directly access the store** — `workItems.ts`, `workflow.ts`, `intake.ts` all `import * as store from '../store/workItemStore'`. The architecture rule says "no direct DB/store calls from route handlers" — they should go through a service layer. This is a systemic pattern, not isolated.

5. **`dependencyCheckDuration` histogram is missing** — FR-dependency-metrics specifies 4 metrics including a `dependencyCheckDuration` histogram. The `metrics.ts` has 3 counters (operations, gating events, cycle detection) but no histogram.

6. **Logger always emits JSON** — `utils/logger.ts` uses `process.stdout.write(JSON.stringify(entry))` unconditionally. FR-WF-013/FR-003 require pretty-printing in development (NODE_ENV=development). No env check present.

7. **In-memory store has no file persistence** — FR-WF-001 acceptance criteria states "CRUD operations on in-memory store with **file persistence**". The store uses a plain `Map<string, WorkItem>` — all data is lost on restart.

8. **`Plans/dependency-linking/requirements.md` targets wrong codebase** — The plan references `portal/Backend/src/`, `portal/Shared/types.ts`, etc. but the implementation was done in `Source/`. The delta table in that file shows items as "missing" that actually exist in `Source/`.

9. **`Specifications/dev-workflow-platform.md` is a dormant spec** — This describes a full dev-workflow platform (FR-001–FR-069) that was never built in Source/. The project pivoted to implement the workflow-engine spec instead. The spec file should either be archived or explicitly marked as future scope to avoid confusion.

### Useful File Paths

- Traceability enforcer: `tools/traceability-enforcer.py` (line 64: regex to fix)
- Metrics: `Source/Backend/src/metrics.ts` (add Histogram import + dependencyCheckDuration)
- App entry: `Source/Backend/src/app.ts` (missing search route registration)
- Logger: `Source/Backend/src/utils/logger.ts` (needs NODE_ENV switch)
- Route store imports: `Source/Backend/src/routes/workItems.ts:12`, `workflow.ts:15`, `intake.ts:4`

### Architecture Pattern Observed

The Source/ app is structured with routes → store directly, skipping a service layer for CRUD operations. Services exist for domain logic (router, assessment, dependency, changeHistory, dashboard) but CRUD endpoints bypass them. This is a consistent pattern across all three CRUD route files.
