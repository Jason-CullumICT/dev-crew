## Quality Oracle Audit — 2026-07-31

**Grade: D** (2 P1s + 0% domain spec coverage; grading config requires max_p1:2 AND min_spec_coverage:40% for grade C)

---

### Spec Coverage

| Target | FRs | Traced | Coverage |
|--------|-----|--------|----------|
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | **100%** ✅ |
| `Plans/dependency-linking/requirements.md` | 16 | 16 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` | 76 | 0 | **0%** ❌ |
| `Specifications/tiered-merge-pipeline.md` | 13 | 0 | **0%** ❌ |
| `Specifications/workflow-engine.md` | 0 | N/A | No FR IDs |

The default enforcer run reports PASS — it never touches `Specifications/`. This is the root-cause of the 0% domain coverage going undetected.

---

### Findings (11 total)

| ID | Sev | Category | Finding |
|----|-----|----------|---------|
| **QO-001** | P1 | spec-drift | **Traceability enforcer scope gap** — `tools/traceability-enforcer.py:48` only targets `Plans/`; 76 domain FRs in `Specifications/dev-workflow-platform.md` have 0% trace coverage, yielding a false PASS in CI |
| **QO-002** | P1 | untested | **`/api/search` route not wired** — `Source/Backend/src/app.ts` never registers the route; `tests/routes/search.test.ts` self-documents the gap; 5 tests will fail; `DependencyPicker` typeahead is broken |
| **QO-003** | P2 | pattern-violation | **`dependencyCheckDuration` histogram absent** — `metrics.ts` has 3/4 required metrics; the Histogram for BFS cycle-detection latency is missing |
| **QO-004** | P2 | spec-drift | **`BlockedBadge` amber variant missing** — `FR-dependency-blocked-badge` requires amber for `status='pending_dependencies'`; component has no `status` prop |
| **QO-005** | P2 | spec-drift | **`pending_dependencies` missing from `WorkItemStatus` enum** — `FR-dependency-types` requires it; dispatch gating returns 400 instead of setting items to this status |
| **QO-006** | P2 | architecture-violation | **Route latency histogram absent** — CLAUDE.md and FR-004 require an `http_request_duration_seconds` histogram; middleware only logs, never measures |
| **QO-007** | P2 | architecture-violation | **OpenTelemetry tracing absent** — No `@opentelemetry` packages; no trace/span IDs in logs; no `traceparent` propagation |
| **QO-008** | P3 | pattern-violation | **Two logger modules** — `workItemStore.ts` imports `utils/logger` (named), all others import `logger.ts` (compat default); inconsistent call paths |
| **QO-009** | P3 | doc-stale | **Stale `portal/` paths in Plans** — `Plans/dependency-linking/requirements.md` references `portal/Backend/` and `portal/Frontend/` instead of `Source/` |
| **QO-010** | P3 | spec-drift | **`Specifications/workflow-engine.md` has no FR IDs** — domain spec for the current system cannot be enforced by the traceability tool |
| **QO-011** | P4 | pattern-violation | **`eslint-disable` without comment** — `useWorkItems.ts:63` silences exhaustive-deps with no rationale |

**Escalate to TheFixer:** QO-002, QO-003, QO-004, QO-005, QO-006, QO-007  
**Escalate to requirements-reviewer:** QO-001, QO-010  

Full report saved to: `Teams/TheInspector/findings/audit-2026-07-31-D.md`  
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
