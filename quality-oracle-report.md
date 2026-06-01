---

## Quality Oracle Findings — Full Audit

**Grade: C** _(1 P1 finding, 3 P2 findings, ~93% spec coverage)_

---

### Spec Coverage: 93%
| Requirement set | Checked | Traced | Gap |
|---|---|---|---|
| Self-judging workflow (FR-WF-001—013) | 13 | 13 | 0 |
| Dependency FRs (FR-dependency-*) | 16 | 14 | 2 partial |
| **Totals** | **29** | **27** | **2** |

> ⚠️ The default traceability enforcer (`python3 tools/traceability-enforcer.py`) reports **PASSED** — but only validates `Plans/self-judging-workflow/requirements.md`. Running it against `Plans/dependency-linking/requirements.md` reports 7 failures. The verification gate provides a false-green signal.

---

### QO-001 · P1 · spec-drift / untested
**`GET /api/search` endpoint unimplemented — 5 tests fail**
- **File:** `Source/Backend/src/app.ts` (missing route mount) + `Source/Backend/tests/routes/search.test.ts`
- **Detail:** `FR-dependency-search` requires a cross-entity search endpoint used by the `DependencyPicker` typeahead. The test file explicitly states: *"the GET /api/search endpoint is NOT wired into app.ts. These tests will FAIL until the route is implemented."* The frontend `workItemsApi.searchItems()` already calls `/search?q=...` — every DependencyPicker search silently fails in production. This is the only confirmed broken-test path in the codebase.
- **Fix:** Implement and mount a `/api/search` route filtering non-deleted items by `title`/`description`.
- **Escalate → TheFixer**

---

### QO-002 · P2 · spec-drift
**Missing `dependencyCheckDuration` Prometheus histogram**
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` specifies 4 metrics. Only 3 counters exist — the `dependencyCheckDuration` histogram is absent. This is the most diagnostically useful metric (latency of every dependency readiness check), measured against the spec acceptance criterion that *"All four metrics visible at GET /metrics."*
- **Fix:** Add `new Histogram({ name: 'dependency_check_duration_seconds', ... })` and instrument `isReady()` / `computeHasUnresolvedBlockers()`.

---

### QO-003 · P2 · spec-drift
**`pending_dependencies` status missing — dispatch gating deviates from spec**
- **File:** `Source/Shared/types/workflow.ts` + `Source/Backend/src/routes/workflow.ts:230`
- **Detail:** `FR-dependency-dispatch-gating` acceptance criterion: *"PATCH to approved with unresolved blocker → 200 with status=`pending_dependencies`."* The `WorkItemStatus` enum has no `pending_dependencies` value (despite a comment claiming to support it). The implementation returns HTTP 400 at dispatch instead of parking the item in a `pending_dependencies` state. Any client polling for `status === 'pending_dependencies'` will never match.
- **Fix:** Add `PendingDependencies = 'pending_dependencies'` to the enum + transitions, update dispatch to set the state rather than reject, update `onItemResolved` cascade to advance from `PendingDependencies → InProgress`.

---

### QO-004 · P2 · architecture-violation
**OpenTelemetry tracing absent — architecture rule violated**
- **File:** `Source/Backend/src/` (no OTel files exist)
- **Detail:** CLAUDE.md architecture rule (non-negotiable): *"Use OpenTelemetry for distributed tracing… propagate W3C `traceparent` header across service boundaries."* Also `workflow-engine.md` NFR: *"OpenTelemetry tracing for critical paths."* Zero OTel instrumentation exists. Logs do not include trace/span IDs. The traceparent header is not propagated.
- **Fix:** Add `@opentelemetry/sdk-node` + auto-instrumentation init in `app.ts`; inject trace context into logger calls.

---

### QO-005 · P2 · architecture-violation
**Traceability enforcer validates only one plan at a time — multi-plan blind spot**
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-selects the most-recently-modified `requirements.md`. With multiple active plans, only one is validated per gate run. Running against `Plans/dependency-linking/requirements.md` surfaces 7 untraced IDs. The CLAUDE.md verification gate (`python3 tools/traceability-enforcer.py`) gives false green.
- **Fix:** Add `--all` flag to scan all `requirements.md` files, or enumerate plans explicitly in the gate command.

---

### QO-006 · P3 · pattern-violation
**Dual logger import paths — `workItemStore.ts` uses raw logger, all others use shim**
- **File:** `Source/Backend/src/store/workItemStore.ts:10`
- **Detail:** `workItemStore.ts` imports `{ logger }` from `../utils/logger` (string-arg API). All other 8 modules import from `../logger` (object-arg shim). No functional bug, but violates single-source-of-truth and creates a hidden API contract difference.
- **Fix:** Migrate `workItemStore.ts` to import from `../logger` and update log call sites to object style.

---

### QO-007 · P3 · architecture-violation
**Silent `.catch(() => ({}))` in API client lacks required documentation comment**
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** Architecture rule: *"every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."* The empty catch here is functionally reasonable (degrade gracefully on malformed error body) but has no comment.
- **Fix:** Add `// Intentional: JSON parse failure on error body is non-fatal; fall back to generic status message`.

---

### QO-008 · P4 · pattern-violation
**Two undocumented `eslint-disable` suppressions**
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both suppress `react-hooks/exhaustive-deps` without an inline justification comment explaining the deliberate choice.
- **Fix:** Add explanatory comments at each suppression site.

---

**Learnings file updated:** `Teams/TheInspector/learnings/quality-oracle.md`
