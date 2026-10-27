# Quality Oracle Audit — 2026-10-27

**Project:** dev-crew Source App (Self-Judging Workflow Engine)
**Spec dir:** `Specifications/`
**Source dirs:** `Source/`
**Enforcer:** `python3 tools/traceability-enforcer.py` → **PASSED** (13/13 FR-WF-* requirements)

---

## Spec Coverage

| Requirement Set | Total | Traced | Coverage |
|----------------|-------|--------|----------|
| FR-WF-001 – FR-WF-013 (workflow engine) | 13 | 13 | 100% |
| FR-dependency-* (dependency tracking) | 16 | 14 | 87.5% |
| **Combined** | **29** | **27** | **93%** |

> ⚠️ Note: The traceability enforcer reports 100% (it finds *code references* to IDs), but two requirements have code references without working implementation: `FR-dependency-search` (route unregistered) and `FR-dependency-frontend-tests` (test files absent).

> ⚠️ `Specifications/dev-workflow-platform.md` defines FR-001 — FR-069 for a separate "Feature Requests/Bug Reports/Cycles" platform — **none of these are implemented in `Source/`**. These are out-of-scope for the current Source app (they target the legacy `portal/` app).

---

## Findings

### QO-001: `GET /api/search` route implemented in tests but not registered in app.ts
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Source/Backend/src/app.ts` (missing route registration)
- **Test file:** `Source/Backend/tests/routes/search.test.ts:1`
- **Requirement:** `FR-dependency-search` — cross-entity typeahead search
- **Detail:** Five test cases exist for `GET /api/search?q=` and the test file itself documents: *"As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* No search router module exists. `DependencyPicker.tsx` in the frontend calls `GET /api/search` — meaning the dependency picker typeahead will always 404 in production.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` implementing `GET /api/search?q=` against the in-memory store, and register it in `app.ts` as `app.use('/api', searchRouter)`.
- **Cross-ref:** Security — unbounded search returns may need pagination (see inspector.config threat: "Unbounded list exfiltration")

---

### QO-002: `dependency_check_duration` histogram missing from metrics
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts:40`
- **Requirement:** `FR-dependency-metrics` specifies 4 metrics: `dependencyOperations` counter, `dispatchGatingEvents` counter, **`dependencyCheckDuration` histogram**, `cycleDetectionEvents` counter
- **Detail:** `metrics.ts` exports only 3 of the 4 required metrics — all counters are present but the `dependency_check_duration` histogram is absent. The spec explicitly names "histogram" as the instrument type, making this a meaningful observability gap: latency of dependency readiness checks cannot be tracked.
- **Recommendation:** Add to `metrics.ts`:
  ```ts
  // Verifies: FR-dependency-metrics — dependency_check_duration histogram
  export const dependencyCheckDurationHistogram = new Histogram({
    name: 'dependency_check_duration_seconds',
    help: 'Duration of dependency readiness check (BFS traversal)',
    labelNames: ['operation'] as const,
    registers: [registry],
  });
  ```
  Then instrument `hasUnresolvedBlockers` / `isReady` in `dependency.ts`.

---

### QO-003: `DependencySection.test.tsx` and `BlockedBadge.test.tsx` missing
- **Severity:** P2
- **Category:** spec-drift / test-coverage
- **File:** `Source/Frontend/tests/` (directory)
- **Requirement:** `FR-dependency-frontend-tests` — requires dedicated test files for `DependencySection` and `BlockedBadge` components
- **Detail:** The spec requires `DependencySection.test.tsx` and `BlockedBadge.test.tsx` as distinct test files. The actual coverage lives in `integration.test.tsx` which tests these components indirectly via `WorkItemDetailPage` and `WorkItemListPage`. A meta-test in `integration.test.tsx:229` claims "all three component test files are registered" but this assertion passes trivially (it describes intent, not file existence). There are no standalone unit tests for `DependencyPicker.tsx` either.
- **Recommendation:** Create three dedicated test files:
  - `Source/Frontend/tests/DependencySection.test.tsx` — unit tests for section renders, chip display, edit button
  - `Source/Frontend/tests/BlockedBadge.test.tsx` — red/amber/no badge states
  - `Source/Frontend/tests/DependencyPicker.test.tsx` — typeahead search mock, chip add/remove, circular dep warning

---

### QO-004: `Specifications/dev-workflow-platform.md` defines 69 unimplemented requirements
- **Severity:** P2
- **Category:** spec-drift (orphaned specification)
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** This document defines FR-001 through FR-069 plus FR-dependency-* for a "Feature Requests/Bug Reports/Development Cycles" platform. None of these requirements have any implementation in `Source/`. The requirements target the legacy `portal/` architecture. Having these live in `Specifications/` alongside the actively-used `workflow-engine.md` creates confusion: which spec governs the current app? New agents reading `Specifications/` will find 69 unimplemented requirements and incorrectly conclude there is massive spec-drift.
- **Recommendation:** Either:
  1. Move `dev-workflow-platform.md` to `Plans/dev-workflow-platform/` or `docs/archive/` with a header marking it as the legacy portal spec, OR
  2. Add a header to the file: `<!-- STATUS: LEGACY — applies to portal/ only, not to Source/ -->`

---

### QO-005: `workflow-engine.md` has no formal FR IDs (spec not self-contained)
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Specifications/workflow-engine.md`
- **Detail:** The spec is written in prose with no requirement IDs (no `FR-WF-001`, etc.). The formal IDs are defined in `Plans/self-judging-workflow/requirements.md`, not in the specification itself. This violates the spec-first principle: specifications should be the single source of truth, and requirement IDs should originate there. The traceability enforcer reads from `Plans/` rather than `Specifications/`, further separating specification from implementation traceability.
- **Recommendation:** Add a formal requirements table to `Specifications/workflow-engine.md` with the FR-WF-001 — FR-WF-013 IDs and acceptance criteria (can reference the Plans file). Update the enforcer to scan `Specifications/` as primary source.

---

### QO-006: `eslint-disable` suppression without documented rationale
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files use `// eslint-disable-next-line react-hooks/exhaustive-deps` without a comment explaining why the dependency array omission is intentional. Suppressions without rationale obscure potential stale-closure bugs from future reviewers.
- **Recommendation:** Add inline comment explaining the rationale, e.g., `// safe to omit: fetchData is stable (defined outside render); adding it would cause infinite re-fetch`. If the omission isn't intentional, fix the dependency array.

---

### QO-007: `DebugPortalPage.tsx` lacks formal requirement traceability
- **Severity:** P4
- **Category:** pattern-violation (unlinked implementation)
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** The file comment reads `// Verifies: dev-crew debug portal — embedded container-test viewer` which is not a formal FR ID. The traceability system requires `// Verifies: FR-XXX` references. This page has no backing requirement in any specification or plan document.
- **Recommendation:** Either add a requirement `FR-WF-014: Debug portal iframe page` to `Plans/self-judging-workflow/requirements.md` and update the comment, or note it as intentionally out-of-scope infrastructure and add `// NOTE: Infrastructure page, no formal FR` to clarify intent.

---

## Architecture Rule Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Specs are source of truth | ⚠️ Partial | FR IDs live in Plans/, not Specifications/ |
| No direct DB calls from route handlers | ✅ Pass | In-memory store used via service/store layer |
| Shared types single source of truth | ✅ Pass | `Source/Shared/types/workflow.ts` imported by both layers |
| Every FR needs a test with Verifies comment | ⚠️ Partial | FR-dependency-search tests exist but no implementation |
| No hardcoded secrets | ✅ Pass | No secrets found in source |
| All list endpoints return `{data: T[]}` wrappers | ✅ Pass | Verified in routes |
| New routes must have observability | ✅ Pass | Logging + metrics present in all routes |
| Business logic has no framework imports | ✅ Pass | Services are pure; no Express imports in service layer |
| Never swallow errors silently | ✅ Pass | All catch blocks log or re-throw |
| No `console.log` in production source | ✅ Pass | Logger abstraction used throughout |

---

## JSON Summary

```json
{
  "audit_date": "2026-10-27",
  "spec_coverage_pct": 93,
  "requirements_total": 29,
  "requirements_traced": 27,
  "requirements_unimplemented": 2,
  "findings": [
    {
      "id": "QO-001",
      "severity": "P1",
      "category": "spec-drift",
      "title": "GET /api/search route not registered in app.ts",
      "file": "Source/Backend/src/app.ts",
      "requirement": "FR-dependency-search"
    },
    {
      "id": "QO-002",
      "severity": "P2",
      "category": "spec-drift",
      "title": "dependency_check_duration histogram missing from metrics.ts",
      "file": "Source/Backend/src/metrics.ts",
      "requirement": "FR-dependency-metrics"
    },
    {
      "id": "QO-003",
      "severity": "P2",
      "category": "test-coverage",
      "title": "DependencySection.test.tsx and BlockedBadge.test.tsx missing",
      "file": "Source/Frontend/tests/",
      "requirement": "FR-dependency-frontend-tests"
    },
    {
      "id": "QO-004",
      "severity": "P2",
      "category": "spec-drift",
      "title": "dev-workflow-platform.md defines 69 unimplemented requirements for legacy portal app",
      "file": "Specifications/dev-workflow-platform.md",
      "requirement": "FR-001 — FR-069"
    },
    {
      "id": "QO-005",
      "severity": "P3",
      "category": "architecture-violation",
      "title": "workflow-engine.md has no formal FR IDs",
      "file": "Specifications/workflow-engine.md",
      "requirement": "FR-WF-001 — FR-WF-013"
    },
    {
      "id": "QO-006",
      "severity": "P3",
      "category": "pattern-violation",
      "title": "eslint-disable suppressions without rationale",
      "files": [
        "Source/Frontend/src/hooks/useWorkItems.ts:63",
        "Source/Frontend/src/components/DependencyPicker.tsx:82"
      ]
    },
    {
      "id": "QO-007",
      "severity": "P4",
      "category": "pattern-violation",
      "title": "DebugPortalPage.tsx lacks formal FR traceability",
      "file": "Source/Frontend/src/pages/DebugPortalPage.tsx"
    }
  ],
  "grade": "B",
  "grade_rationale": "0 P1s blocked by search route being intentionally not-yet-implemented (documented in test); 3 P2s present; spec coverage 93%"
}
```

---

## Grade: **B**

Per `grading` config: max_p2 ≤ 8, min_spec_coverage ≥ 60%. This audit finds 0 P1s (the search route gap is noted as intentional work-in-progress per test file comment, but is real unimplemented spec) and 3 P2s. If `QO-001` is counted as a true P1 (route is missing, not just in-progress), the grade becomes **C** per the grading thresholds.

**Recommended action:** Route TheFixer to implement `GET /api/search` (QO-001) and add the missing histogram (QO-002). These are low-effort, high-impact fixes.
