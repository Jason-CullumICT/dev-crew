---

## Quality Oracle Findings

### Spec Coverage: 24% total / 90% active scope
- **108** requirements across 4 spec files
- **26** traced to source code (within active implementation scope)
- **82** untraced (69 = dev-workflow-platform.md, 10 = tiered-merge-pipeline.md, 3 = dependency gaps)

The traceability enforcer reports **100% PASSED** — but only checks 13 of 108 requirements. That pass result is a false positive.

---

### QO-001 — `GET /api/search` not registered · **P1 · spec-drift**
**File:** `Source/Backend/src/app.ts` (missing route)

The endpoint is fully spec'd (FR-dependency-search), has a complete 5-case test suite (`tests/routes/search.test.ts` line 1: *"will FAIL until the route is implemented"*), and is called by the frontend `DependencyPicker`. The route simply does not exist in `app.ts`. The `DependencyPicker` modal is broken at runtime — every search attempt returns 404.

**Fix:** Create `src/routes/search.ts` filtering `store.getAllItems()` by title/description on `?q=`, register it in `app.ts`.

---

### QO-002 — `pending_dependencies` status missing · **P2 · spec-drift**
**File:** `Source/Shared/types/workflow.ts:5`, `Source/Backend/src/routes/workflow.ts:231`

`WorkItemStatus` has no `pending_dependencies` value. Both `FR-dependency-dispatch-gating` and `Source/Shared/api-contracts.md` say: unresolved blockers → set status to `pending_dependencies`. Instead the dispatch endpoint returns `400`. The cascade auto-dispatcher also misses items in this state.

---

### QO-003 — `dependencyCheckDuration` Prometheus histogram missing · **P2 · spec-drift**
**File:** `Source/Backend/src/metrics.ts`

`FR-dependency-metrics` requires 4 metrics. Only 3 are implemented — the `dependencyCheckDuration` Histogram for BFS and readiness check latency is absent. The metrics test doesn't assert it either, so the gap is invisible to CI.

---

### QO-004 — Traceability enforcer scope too narrow · **P2 · pattern-violation**
**File:** `tools/traceability-enforcer.py`

Enforcer only scans `Plans/self-judging-workflow/requirements.md` (13 FRs). `Specifications/dev-workflow-platform.md` (69 FRs) and `Specifications/tiered-merge-pipeline.md` (10 FRs) are invisible to it. Verdict is "PASSED" while true coverage is 24%.

**Fix:** Either expand enforcer to cover all spec files, or add `<!-- Status: ROADMAP -->` banners to inactive specs so the narrow scope is justified.

---

### QO-005 — Dual logger modules · **P2 · architecture-violation**
**Files:** `Source/Backend/src/logger.ts` (compat wrapper) + `Source/Backend/src/utils/logger.ts` (canonical)

Routes import `import logger from './logger'`; the store imports `import { logger } from '../utils/logger'`. Both resolve to the same underlying sink but via different interfaces. Consolidate to one module and one call style.

---

### QO-006 — `LOG_LEVEL` env var not respected · **P3**  
`utils/logger.ts` emits all levels unconditionally. Debug logs appear in production.

### QO-007 — No OpenTelemetry tracing · **P3 · architecture-violation**  
CLAUDE.md architecture rule + FR-021 require OTel. Zero `@opentelemetry/*` usage anywhere in `Source/Backend/`.

### QO-008 — No route latency histogram · **P3 · architecture-violation**  
CLAUDE.md: "Auto-collect route latency via middleware." `metrics.ts` has only Counters.

### QO-009 — `dev-workflow-platform.md` 69 FRs with 0 source refs · **P3 · spec-drift**  
Different product (SQLite, FRs/Bugs/Cycles) vs. the in-memory engine that is built. Needs a status banner or migration plan.

### QO-010 — `tiered-merge-pipeline.md` 10 FRs with 0 Source/ refs · **P3 · spec-drift**  
May live in `platform/` (unaudited). Needs a `<!-- Status: PLATFORM -->` banner.

### QO-011 — `api-contracts.md` references non-existent FR-070..FR-085 · **P3 · doc-stale**  
Orphaned requirement IDs in the changelog. Map them to actual FRs or create the spec entries.

### QO-012 — DependencyPicker swallows search errors without logging · **P4**  
`catch {}` at `DependencyPicker.tsx:56` is documented but silent — makes QO-001 debugging invisible.

### QO-013 — Two `eslint-disable` suppressions undocumented · **P4**  
Both are legitimate patterns but need a *why* comment.

---

**Grade: C** (1 P1 blocks Grade B which requires 0 P1s; 4 P2s; active-scope spec coverage 90%)

Report saved to `Teams/TheInspector/findings/audit-2026-04-21-C.md`. Learnings updated in `Teams/TheInspector/learnings/quality-oracle.md`.
