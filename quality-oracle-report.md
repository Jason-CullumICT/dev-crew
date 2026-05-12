---

## Quality Oracle Findings — 2026-05-12

**Grade: B** | **Spec Coverage (Source/): 93%** (27 of 29 Plans-scoped requirements traced)

---

### Spec Coverage Breakdown

| Requirement Set | Total | Traced | Coverage |
|---|---|---|---|
| FR-WF-001 – FR-WF-013 (workflow engine) | 13 | 13 | **100%** |
| FR-dependency-* (dependency tracking) | 16 | 14 | **87.5%** |
| FR-001 – FR-069 (dev-workflow-platform) | 69 | — | N/A — maps to `portal/`, not `Source/` |
| FR-TMP-001 – FR-TMP-010 (tiered-merge) | 10 | — | N/A — maps to `platform/`, not `Source/` |

---

### Findings

#### QO-001 — Specification directory ↔ Source/ mapping undocumented [P1 · spec-drift]
`Specifications/workflow-engine.md` has **no FR IDs**, so the traceability enforcer cannot check it. The other two spec files (`dev-workflow-platform.md` FR-001–FR-069, `tiered-merge-pipeline.md` FR-TMP-001–010) describe `portal/` and `platform/` respectively — not `Source/`. Any agent reading `Specifications/` sees 79 formal requirements with zero Verifies hits in Source/, which *looks* like catastrophic drift but is actually an undocumented mapping problem. **Fix:** Add spec→directory cross-links in the documents; add FR-WF-* IDs directly into `workflow-engine.md`.

#### QO-002 — `GET /api/search` unregistered — 6 tests will fail [P1 · spec-drift]
`FR-dependency-search` requires a cross-entity search endpoint used by the `DependencyPicker` typeahead. The test file `search.test.ts` explicitly documents: *"these tests will FAIL until the route is implemented."* No `search.ts` route file exists; the route is absent from `app.ts`. The DependencyPicker returns no results at runtime. **Fix:** Create `Source/Backend/src/routes/search.ts` and register it in `app.ts`.
[ESCALATE → TheFixer]

#### QO-003 — Routes call store directly, bypassing service layer [P2 · architecture-violation]
`workItems.ts`, `workflow.ts`, and `intake.ts` all `import * as store from '../store/workItemStore'` and call `store.createWorkItem()`, `store.findById()`, `store.updateWorkItem()`, etc. directly. CLAUDE.md rule: *"No direct DB calls from route handlers — use the service layer."* The store is the data layer; services like `router.ts` and `assessment.ts` demonstrate the correct pattern but CRUD handlers bypass it.
[ESCALATE → TheFixer]

#### QO-004 — OpenTelemetry tracing entirely absent [P2 · architecture-violation]
CLAUDE.md mandates OTel tracing with trace/span IDs in logs and W3C `traceparent` propagation. Zero OTel code exists in `Source/`. No `@opentelemetry/*` imports, no span creation, no traceparent header handling. The logger never injects trace context.
[ESCALATE → TheFixer]

#### QO-005 — `dependencyCheckDuration` histogram missing [P2 · spec-drift]
`FR-dependency-metrics` requires **4** Prometheus instruments; `metrics.ts` defines only **3** (3 counters). The `dependency_check_duration_seconds` histogram (measuring `isReady()` and `computeHasUnresolvedBlockers()` latency) is absent.
[ESCALATE → TheFixer]

#### QO-006 — Traceability enforcer never checks `Specifications/`; non-deterministic plan selection [P2 · pattern-violation]
`tools/traceability-enforcer.py` only scans `Plans/*/requirements.md`. All Specifications/ FRs are invisible to it. When timestamps are equal (git clone), the "most recently modified" fallback is non-deterministic — CI may check a different plan than local runs. False failures occur when running against `dependency-linking/requirements.md` (FR-0002, FR-0003, etc. are body cross-references, not enforcement targets).
[ESCALATE → TheFixer]

#### QO-007 — Duplicate test files [P3 · pattern-violation]
`tests/WorkItemDetailPage.test.tsx` (368 lines) and `tests/pages/WorkItemDetailPage.test.tsx` (393 lines) are near-duplicates. Same for `WorkItemListPage.test.tsx` (286 vs 262 lines). Both execute on every test run, inflating counts and creating ambiguity about canonical coverage.

#### QO-008 — Logger never pretty-prints in development [P3 · spec-drift]
`utils/logger.ts` always emits JSON regardless of `NODE_ENV`. CLAUDE.md requires pretty-printing in development.

#### QO-009 — FR-dependency-seed unimplemented [P3 · spec-drift]
No seed data populates the in-memory store at startup. No `Verifies: FR-dependency-seed` comment anywhere in Source/.

#### QO-010 — Two coexisting logger abstractions [P3 · pattern-violation]
`src/utils/logger.ts` (implementation) and `src/logger.ts` (compatibility shim) both exist. Routes use the shim; the store uses the implementation. The shim's `normalize()` function can silently drop context if `msg` is absent.

---

### Passed Checks (no issues)
✅ No `console.log` in production source  
✅ No hardcoded secrets  
✅ No empty catch blocks (all catch blocks log + re-throw or respond)  
✅ No `eslint-disable` / `@ts-ignore` suppressions  
✅ No files over 500 lines  
✅ No `test.skip` / `xit` in test suites  
✅ FR-WF-001 – FR-WF-013: 100% traced  

Full report saved to `Teams/TheInspector/findings/quality-oracle-2026-05-12.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
