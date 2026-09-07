---

## Quality Oracle — Full Audit Report

**Audit date:** 2026-09-07  
**Scope:** `Source/` (workflow engine + dependency linking)  
**Enforcer result:** PASSED for FR-WF-* (13/13) — but enforcer is blind to FR-dependency-* (see QO-003)  
**Effective coverage:** ~93%  
**Grade: C** (1×P1 prevents B or higher per grading config)

---

### Spec Coverage: 93%

| Requirement Family | Total | Covered | Gap |
|---|---|---|---|
| FR-WF-001–013 (workflow engine) | 13 | 13 | 0 ✅ |
| FR-dependency-* (workflow engine adaption) | ~16 | ~14 | **2 open** |
| FR-TMP-* (tiered merge pipeline) | 10 | 10 | 0 ✅ (lives in `platform/`) |
| FR-001–069 (dev-workflow-platform) | 69 | — | Out of scope — different app (`portal/`) |

---

### QO-001 · P1 · untested
**`GET /api/search` not registered in `app.ts` — 5 tests will fail, DependencyPicker broken at runtime**

`Source/Backend/tests/routes/search.test.ts` carries an explicit self-note: *"GET /api/search is NOT wired into app.ts. These tests will FAIL until the route is implemented."* The route handler never exists in `app.ts`. DependencyPicker's typeahead (`workItemsApi.searchItems`) hits a 404 at runtime.  
→ **Fix:** Create `src/routes/search.ts` (case-insensitive title+description filter, `{data:[]}` wrapper, exclude soft-deleted), register as `app.use('/api', searchRouter)`.  
→ **Route:** TheFixer

---

### QO-002 · P2 · spec-drift
**`dependencyCheckDuration` histogram missing from `metrics.ts`**

`FR-dependency-metrics` specifies 4 Prometheus observables. Three are present in `metrics.ts` (counters: `dependency_operations_total`, `dispatch_gating_events_total`, `cycle_detection_events_total`). The `dependencyCheckDuration` Histogram is absent — not imported, not defined, not instrumented in `dependency.ts`.  
→ **Fix:** Add `Histogram` to prom-client imports in `metrics.ts`, define with millisecond buckets, instrument `hasUnresolvedBlockers`/`isReady` calls in `dependency.ts`.  
→ **Route:** TheFixer

---

### QO-003 · P2 · architecture-violation
**Traceability enforcer blind to FR-dependency-* — gate gives false confidence**

Enforcer auto-selects the plan with the latest directory mtime. All plans share identical mtimes, so it always picks `self-judging-workflow` (FR-WF-001–013 only). The FR-dependency-* requirements (which include the broken search route QO-001) are **never enforced by the gate**. QO-001 would have been caught automatically if FR-dependency-search were in the enforced plan.  
→ **Fix:** Add all implemented FR-dependency-* IDs as rows to `Plans/self-judging-workflow/requirements.md`.  
→ **Route:** solo-session (Plans/ changes)

---

### QO-004 · P3 · architecture-violation
**OpenTelemetry tracing not implemented — CLAUDE.md architecture rule violated**

CLAUDE.md mandates OTel distributed tracing: HTTP auto-instrumentation, custom spans for critical paths, W3C `traceparent` propagation. Zero `@opentelemetry/*` packages exist in `Source/Backend/package.json`. No spans, no trace context. Structured logging ✅ and Prometheus metrics ✅ are the only two observability pillars present; the third is absent.  
→ **Fix:** Add `@opentelemetry/sdk-node` + `@opentelemetry/auto-instrumentations-node`; initialize in `app.ts` before route setup; add custom spans in `router.ts`, `assessment.ts`, `dependency.ts`.  
→ **Route:** TheATeam / TheFixer

---

### QO-005 · P3 · test-coverage
**Duplicate test files — diverged copies inflate test counts and create maintenance risk**

| Old (root) | Lines | New (pages/) | Lines |
|---|---|---|---|
| `tests/WorkItemDetailPage.test.tsx` | 368 | `tests/pages/WorkItemDetailPage.test.tsx` | 393 |
| `tests/WorkItemListPage.test.tsx` | 286 | `tests/pages/WorkItemListPage.test.tsx` | 262 |

Line count differences confirm the copies have diverged. CI runs both, creating inflated coverage and maintenance risk (a fix in one copy may silently miss the other).  
→ **Fix:** Remove old flat-root copies after confirming `tests/pages/` versions cover all scenarios.  
→ **Route:** TheFixer

---

### QO-006 · P3 · untested
**`Source/E2E/package.json` has broken test command — `npm test --workspaces` gate fails**

The E2E workspace has `"test": "echo \"Error: no test specified\" && exit 1"`. No `tests/` directory exists under `Source/E2E/`. `FR-TMP-002` specifies test files appear in `Source/E2E/tests/cycle-{run-id}/` (populated at runtime by QA agents). The broken test script causes the CLAUDE.md verification gate (`npm test --workspaces --if-present`) to exit non-zero even with no real test failures.  
→ **Fix:** Change to `"test": "npx playwright test --passOnNoTests 2>/dev/null || true"` or use `--if-present` (already in the gate) properly by removing the test key entirely.  
→ **Route:** solo-session (E2E package)

---

### QO-007 · P4 · pattern-violation
**`eslint-disable react-hooks/exhaustive-deps` without documented rationale**

- `Source/Frontend/src/components/DependencyPicker.tsx:82`
- `Source/Frontend/src/hooks/useWorkItems.ts:63`

Both suppress the exhaustive-deps rule with no comment explaining why. Could indicate stale closure bugs or be intentional. CLAUDE.md pattern rules implicitly require all suppressions to be documented.  
→ **Fix:** Audit each site; either add `// intentional: <reason>` or refactor to eliminate the suppression.

---

**Learnings file updated:** `Teams/TheInspector/learnings/quality-oracle.md`
