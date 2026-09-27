---

## Quality Oracle Findings

**Audit Date:** 2026-09-27  
**Scope:** Full audit — Specifications/, Source/, portal/ (static analysis)  
**Config:** `Teams/TheInspector/inspector.config.yml`

---

### Spec Coverage Summary

| Layer | Spec | Requirements | Traced | Coverage |
|-------|------|-------------|--------|----------|
| `Source/` | workflow-engine plan (FR-WF-*) | 13 | 13 | **100%** ✅ |
| `Source/` | FR-dependency-* | ~14 | ~13 | **~93%** ⚠️ (search route missing) |
| `portal/` | dev-workflow-platform (FR-001–FR-069) | 76 | *not scanned* | **N/A** — enforcer blind spot |
| `platform/` | tiered-merge-pipeline (FR-TMP-*) | 13 | *not scanned* | **N/A** — enforcer blind spot |

---

### QO-001: GET /api/search route not wired into Source/Backend app — intentionally failing tests
- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/app.ts` (route never registered) / `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** `FR-dependency-search` requires a cross-entity search endpoint for the `DependencyPicker` typeahead. The test file `Source/Backend/tests/routes/search.test.ts` explicitly documents: *"As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented. This is intentional."* This means running the full test suite will produce known failures — violating the "zero regressions" rule and confusing the baseline.
- **Recommendation:** Either implement the search route (wire it into `app.ts` and add the handler to `workItems.ts` or a new `search.ts` route file), or formally defer FR-dependency-search and mark the tests as `test.skip` with a tracking comment to prevent false baseline failures.
- **Cross-ref:** TheFixer (code), requirements-reviewer (should the search route be deferred to a later plan?)

---

### QO-002: `dependencyCheckDuration` Histogram missing from Source/Backend metrics — FR-dependency-metrics partially unimplemented
- **Severity:** P2
- **Category:** spec-drift / pattern-violation
- **File:** `Source/Backend/src/metrics.ts:1`
- **Detail:** `FR-dependency-metrics` specifies 4 Prometheus metrics: `dependencyOperations` counter, `dispatchGatingEvents` counter, `dependencyCheckDuration` histogram, `cycleDetectionEvents` counter. `Source/Backend/src/metrics.ts` contains only 3 — the `dependencyCheckDuration` histogram is absent. By contrast, `portal/Backend/src/metrics.ts:23` correctly implements it. The metrics test (`Source/Backend/tests/routes/metrics.test.ts`) does not assert for this histogram either, so the gap is untested.
- **Recommendation:** Add `dependencyCheckDuration` as a `Histogram` to `Source/Backend/src/metrics.ts` mirroring the `portal/Backend/src/metrics.ts` implementation; add a corresponding test assertion in `Source/Backend/tests/routes/metrics.test.ts` with `// Verifies: FR-dependency-metrics`.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-003: Traceability Enforcer scope excludes `portal/` and `platform/` — silent coverage gap for 89 requirements
- **Severity:** P2
- **Category:** architecture-violation / spec-drift
- **File:** `tools/traceability-enforcer.py` / `Teams/TheInspector/inspector.config.yml:41`
- **Detail:** The enforcer scans only `['Source', 'E2E']`. The `portal/` directory implements 76 FR-001–FR-069 requirements from `Specifications/dev-workflow-platform.md`, and `platform/` implements 13 FR-TMP-* requirements from `Specifications/tiered-merge-pipeline.md`. Running the enforcer against those spec files against Source/ produces 89 false failures — and conversely, running it against the plan file produces a misleading "PASSED" while portal/ traceability is entirely unaudited. The current default run (`Plans/self-judging-workflow/requirements.md`) covers only the FR-WF-* layer.
- **Recommendation:** Update `inspector.config.yml` to include `portal/` and `platform/orchestrator/` in `source.dirs` for future audits, OR add a multi-target enforcement script. At minimum, document the scope boundary explicitly so agents don't interpret the green enforcer result as full-project coverage.
- **Cross-ref:** requirements-reviewer (spec ownership), solo-session (config change)

---

### QO-004: OpenTelemetry not instrumented in Source/Backend — CLAUDE.md architecture rule violated
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/app.ts:1`
- **Detail:** `CLAUDE.md` states *"Use OpenTelemetry for distributed tracing — auto-instrument HTTP, database, and framework calls… Propagate W3C `traceparent` header across service boundaries."* This is listed as a non-negotiable architecture rule. `Source/Backend/` has zero OTel imports, no tracer setup, and no `traceparent` propagation. There is no `@opentelemetry` dependency in the backend package. While FR-WF-013 (per the plan) covers only Prometheus metrics and structured logging, the CLAUDE.md rule applies to all new code.
- **Recommendation:** Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node` to the backend, initialise the SDK in `src/app.ts` before routes, add custom spans for `routeWorkItem`, `assessWorkItem`, `dispatchWorkItem`. Create `// Verifies: FR-WF-013` traceability. **[ESCALATE → route to TheFixer as a P2 backlog item]**

---

### QO-005: Two `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions in production components
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both suppressions silence the exhaustive-deps rule on `useCallback`/`useEffect` dependency arrays. In `DependencyPicker.tsx`, the callback omits `selectedIdSet` from the dependency array while using it; in `useWorkItems.ts`, the effect omits the `fetchWorkItems` callback reference. Both can produce stale closure bugs under React's concurrent rendering — the component reads an outdated snapshot of state on re-render. This also violates CLAUDE.md's implied pattern: "Business logic has no framework imports — keep domain logic in pure functions."
- **Recommendation:** Resolve the underlying dependency array issues (use `useRef` for stable references, or restructure the effect) rather than suppressing the lint rule.

---

### QO-006: Duplicate test files for WorkItemDetailPage and WorkItemListPage
- **Severity:** P3
- **Category:** test-coverage / simplification
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- **Detail:** Two test files exist for the same components: one at the root `tests/` level and one in `tests/pages/`. Same for `WorkItemListPage`. This creates redundant coverage, potential false confidence (both could pass while covering different subsets), and maintenance overhead. The `tests/pages/` versions appear to be the more complete ones (they carry richer `// Verifies:` comments).
- **Recommendation:** Consolidate into `Source/Frontend/tests/pages/` (the canonical location) and delete the root-level duplicates. Confirm all assertions are preserved after merge.

---

### Architecture Rule Compliance Summary

| Rule | Status |
|------|--------|
| No `console.log` in production source | ✅ PASS — logger abstraction used throughout |
| No hardcoded secrets | ✅ PASS — no credentials found |
| Every FR needs a `// Verifies:` comment | ✅ PASS (Source/ scope only) |
| All list endpoints return `{data: T[]}` | ✅ PASS — confirmed in routes |
| No direct DB calls from route handlers | ✅ PASS — service layer used (in-memory store) |
| Prometheus metrics at `/metrics` | ✅ PASS — but histogram gap (QO-002) |
| OpenTelemetry tracing | ❌ FAIL — not instrumented (QO-004) |
| Shared types single source of truth | ✅ PASS — `Source/Shared/types/workflow.ts` |
| No empty catch blocks | ✅ PASS — all catch blocks log and respond |
| No files > 500 lines | ✅ PASS — largest file is 426 lines |

---

### JSON Summary

```json
{
  "audit_date": "2026-09-27",
  "enforcer_result": {
    "active_plan": "Plans/self-judging-workflow/requirements.md",
    "requirements_scanned": 13,
    "passed": true,
    "coverage_pct": 100
  },
  "spec_coverage_overall": {
    "source_workflow_engine": "100%",
    "source_dependency_spec": "93%",
    "portal_dev_platform": "not_scanned",
    "platform_tiered_merge": "not_scanned"
  },
  "findings": [
    {
      "id": "QO-001",
      "severity": "P1",
      "category": "spec-drift",
      "title": "FR-dependency-search route not wired — intentionally failing tests",
      "file": "Source/Backend/src/app.ts"
    },
    {
      "id": "QO-002",
      "severity": "P2",
      "category": "spec-drift",
      "title": "dependencyCheckDuration histogram missing from Source/Backend metrics",
      "file": "Source/Backend/src/metrics.ts"
    },
    {
      "id": "QO-003",
      "severity": "P2",
      "category": "architecture-violation",
      "title": "Traceability enforcer excludes portal/ and platform/ — 89 requirements unaudited",
      "file": "tools/traceability-enforcer.py"
    },
    {
      "id": "QO-004",
      "severity": "P2",
      "category": "architecture-violation",
      "title": "OpenTelemetry not instrumented in Source/Backend",
      "file": "Source/Backend/src/app.ts"
    },
    {
      "id": "QO-005",
      "severity": "P3",
      "category": "pattern-violation",
      "title": "eslint-disable suppressions for react-hooks/exhaustive-deps",
      "files": ["Source/Frontend/src/components/DependencyPicker.tsx", "Source/Frontend/src/hooks/useWorkItems.ts"]
    },
    {
      "id": "QO-006",
      "severity": "P3",
      "category": "simplification",
      "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage",
      "files": ["Source/Frontend/tests/WorkItemDetailPage.test.tsx", "Source/Frontend/tests/WorkItemListPage.test.tsx"]
    }
  ],
  "grade": "B"
}
```

---

**Overall Grade: B** — No P1 exploitable issues, but QO-001 (intentionally failing search tests contaminating the test baseline) is close to a P1 operational problem. Zero new P2s exceed the A-grade threshold (max 3), but there are 3 P2s here. The codebase shows strong traceability discipline within its audited scope, clean observability (minus OTel), and no silent error swallowing.

**Learnings updated** at `Teams/TheInspector/learnings/quality-oracle.md`.
