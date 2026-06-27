# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-06-27

### Project Layout (critical context for future audits)

This project has **three separate application roots**, not one:

| Directory | Specification | FR IDs | Status |
|-----------|---------------|--------|--------|
| `Source/` | `Specifications/workflow-engine.md` → `Plans/self-judging-workflow/requirements.md` | FR-WF-001 to FR-WF-013 | 100% traced |
| `portal/` | `Specifications/dev-workflow-platform.md` | FR-001 to FR-069, FR-DUP-*, FR-dependency-*, FR-070 to FR-089 | 97% traced in portal/ |
| `platform/` | `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 to FR-TMP-010 | 0% traced in Source/ or portal/ — belongs to orchestrator infra |

### Enforcer Scope Gap (P1 — OPEN)

The `inspector.config.yml` lists only `Source/` as the source directory.
The `traceability-enforcer.py` scans `['Source', 'E2E']` only.
Running `python3 tools/traceability-enforcer.py` (default) picks `Plans/self-judging-workflow/requirements.md` (most recently modified), which covers FR-WF-* only.

- `Specifications/dev-workflow-platform.md` is NEVER checked by the enforcer against `portal/`
- `Specifications/tiered-merge-pipeline.md` is NEVER checked anywhere

To audit portal: `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md` — but this would scan Source/ not portal/, giving wrong results anyway. The enforcer needs a `--source-dir` flag to be useful for multi-root projects.

### Architecture Violation: Route Handlers Access Store Directly (P2 — OPEN)

`Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `intake.ts` call `store.*` directly in route handlers. No service layer exists for these routes. The `assessment.ts`, `router.ts`, `dependency.ts`, `changeHistory.ts` services exist, but routes don't route through a data-access service for CRUD.

### OpenTelemetry Not Implemented in Source/ (P2 — OPEN)

No `@opentelemetry` packages or spans in `Source/Backend/`. Prometheus metrics are present but OTel tracing is absent. The `portal/Backend/src/lib/tracing.ts` provides OTel for portal but the Source/ app has no equivalent.

### Missing Histogram Metric (P2 — OPEN)

`FR-dependency-metrics` requires a `dependency_check_duration` histogram. `Source/Backend/src/metrics.ts` has the 3 counters but the histogram is missing.

### Portal teamDispatches Direct DB Access (P3 — OPEN)

`portal/Backend/src/routes/teamDispatches.ts` calls `db.prepare()` directly in the route handler. This is an architecture violation per the no-direct-DB-from-routes rule.

### Duplicate Logger Abstraction (P3 — OPEN)

`Source/Backend/src/logger.ts` is a compatibility wrapper around `Source/Backend/src/utils/logger.ts`. Two files for the same concern with the outer one just normalizing the inner API.

### False-Positive FR IDs in Spec Regex (P4 — OPEN)

`dev-workflow-platform.md` uses "FR-0004" and "FR-0007" as data entity IDs in the seed data description, not as spec requirement IDs. The enforcer regex `FR-[A-Z0-9-]+` matches these, causing false missing-requirement reports.

---

## Useful File Paths for Future Audits

| Path | What to check |
|------|---------------|
| `Source/Backend/src/metrics.ts` | All Prometheus metrics — check against FR-dependency-metrics |
| `Source/Backend/src/routes/workItems.ts` | Direct store calls (arch violation) |
| `Source/Backend/src/routes/workflow.ts` | Direct store calls (arch violation) |
| `Source/Backend/src/routes/intake.ts` | Direct store calls (arch violation) |
| `portal/Backend/src/routes/teamDispatches.ts` | Direct DB calls (arch violation) |
| `Source/Backend/src/logger.ts` | Wrapper logger (compat shim) |
| `Source/Backend/src/utils/logger.ts` | Actual logger implementation |
| `Plans/self-judging-workflow/requirements.md` | FR-WF-001 to FR-WF-013 — what enforcer actually checks |
| `Specifications/dev-workflow-platform.md` | FR-001 to FR-069 — NOT checked by default enforcer |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001 to FR-TMP-010 — NOT checked anywhere |

## Spec Coverage Trend

| Run | Source/ enforced FRs | portal/ FRs | Overall |
|-----|----------------------|-------------|---------|
| 2026-06-27 | 13/13 (100%) | 72/74 (97%) | 87% across all 3 specs |
