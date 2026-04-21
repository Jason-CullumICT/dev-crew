# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-04-21 | Grade: C

### Spec Coverage Snapshot

| Specification | Requirements | Implemented | Coverage |
|---|---|---|---|
| Plans/self-judging-workflow/requirements.md (FR-WF-*) | 13 | 13 | 100% |
| FR-dependency-* extension (workflow-engine scope) | 16 | 13 | 81% |
| Specifications/dev-workflow-platform.md (FR-001..069 + FR-dependency-* for SQLite app) | 69 | 0 | 0% |
| Specifications/tiered-merge-pipeline.md (FR-TMP-*) | 10 | 0 | 0% |
| **Total** | **108** | **26** | **24%** |

Active implementation scope (workflow-engine + dependency extension): 26/29 = **90%**

---

## Key Findings (for faster future audits)

### P1 — Must Fix
- **`GET /api/search` not wired in `app.ts`**: `Source/Backend/src/app.ts` has no search route. The test file `tests/routes/search.test.ts` confirms this is known and intentional but unresolved. `DependencyPicker.tsx` calls `workItemsApi.searchItems()` which hits `/api/search` — this is a runtime failure for the DependencyPicker typeahead. Route handler must be created and registered.

### P2 — High Priority
- **`pending_dependencies` status missing**: `WorkItemStatus` enum in `Source/Shared/types/workflow.ts` has no `pending_dependencies` value. The spec (`FR-dependency-dispatch-gating`) and `Source/Shared/api-contracts.md` both say blocked dispatch should set status to `pending_dependencies`, not return 400. Implementation returns 400 error instead.
- **`dependencyCheckDuration` Prometheus histogram missing**: `Source/Backend/src/metrics.ts` has 3 of 4 required metrics (`dependencyOperationsCounter`, `dispatchGatingEventsCounter`, `cycleDetectionEventsCounter`) but is missing the `dependencyCheckDuration` Histogram specified by `FR-dependency-metrics`.
- **Traceability enforcer scope too narrow**: `tools/traceability-enforcer.py` only checks 13 requirements from `Plans/self-judging-workflow/requirements.md`. It does not scan `Specifications/dev-workflow-platform.md` (69 FRs) or `Specifications/tiered-merge-pipeline.md` (10 FRs). False-positive "TRACEABILITY PASSED" with broad spec drift.
- **Dual logger modules**: `Source/Backend/src/logger.ts` is a compat wrapper over `Source/Backend/src/utils/logger.ts`. Routes use `import logger from './logger'` (default), store uses `import { logger } from '../utils/logger'` (named). Both work but inconsistent — consolidate to one path.

### P3 — Technical Debt
- **`LOG_LEVEL` env var not respected**: `Source/Backend/src/utils/logger.ts` always emits all levels; no filtering. CLAUDE.md says `LOG_LEVEL` controls verbosity.
- **No OpenTelemetry tracing**: CLAUDE.md architecture rule and `FR-021` require OTel tracing (trace/span IDs in logs, W3C `traceparent` header). Nothing in `Source/Backend/src/` uses `@opentelemetry/*`.
- **No route latency histogram**: CLAUDE.md says "Auto-collect route latency via middleware". `metrics.ts` has only counters, no Histogram for request duration.
- **`dev-workflow-platform.md` entirely unimplemented**: This is a different, larger product spec (SQLite, FRs/Bugs/Cycles/Pipelines) vs. the in-memory workflow engine that is actually built. The specs co-exist in `Specifications/` without a clear "active vs. future" marker.
- **`tiered-merge-pipeline.md` has no Source/ implementation**: FR-TMP-001 through FR-TMP-010 are not implemented in `Source/`. Implementation may exist in `platform/` orchestrator code.
- **`api-contracts.md` references FR-070..FR-085**: These IDs appear in no spec file. Orphaned references.

### P4 — Minor
- **DependencyPicker.tsx catch block suppresses search errors**: `src/components/DependencyPicker.tsx:57` catches search errors without logging. Comment explains the intent but debugging search failures is impossible without logging.
- **Two `eslint-disable-next-line` comments**: `useWorkItems.ts:63` and `DependencyPicker.tsx:82` suppress `react-hooks/exhaustive-deps`. Both are legitimate pattern uses but should be documented.

---

## Fast-Path File Map (for future audits)

| What to check | Where to look |
|---|---|
| All active FRs | `Plans/self-judging-workflow/requirements.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Shared types | `Source/Shared/types/workflow.ts` |
| Logger (canonical) | `Source/Backend/src/utils/logger.ts` |
| Logger (compat wrapper) | `Source/Backend/src/logger.ts` |
| Metrics | `Source/Backend/src/metrics.ts` |
| Route registration | `Source/Backend/src/app.ts` |
| Dependency service | `Source/Backend/src/services/dependency.ts` |
| Search gap evidence | `Source/Backend/tests/routes/search.test.ts` (line 1-6 note) |
| Dispatch gating gap | `Source/Shared/api-contracts.md` State Machine Rules section |

---

## Trend

- First audit run. No prior baseline.
- Active spec coverage: 90% (26/29 active requirements)
- Overall spec coverage: 24% (26/108 across all three spec files)
- Grade: **C** (1 P1 blocks Grade B which requires 0 P1s)
