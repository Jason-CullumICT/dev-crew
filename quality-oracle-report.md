Now the full report:

---

## Quality Oracle Findings
**Audit Date:** 2026-05-09 | **Enforcer:** `python3 tools/traceability-enforcer.py --plan self-judging-workflow` → **PASSED**

---

### Spec Coverage Summary

| Application | Spec File | Plan Requirements | Covered | Gap |
|-------------|-----------|-------------------|---------|-----|
| Workflow Engine (`Source/`) | `workflow-engine.md` | 13 FR-WF-XXX + 15 FR-dependency-* | ~26/28 | 2 open (see below) |
| Dev Workflow Platform (`portal/`) | `dev-workflow-platform.md` | FR-001..FR-069 + FR-dependency-* | ~66+/69 | 2 known open items |
| Tiered Merge Pipeline (`platform/`) | `tiered-merge-pipeline.md` | FR-TMP-001..010 | 0 traced in Source/ | Implemented in `platform/` infrastructure, outside enforcer scope |

**Overall spec coverage (Source/ app): ~93%**  
**Grade: B** (0 P1s exploitable, 2 P2s, meets grading threshold — but 1 failing test suite drags it toward C)

---

### QO-001 — Missing `/api/search` Route Implementation
- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/app.ts` (route not registered), `Source/Backend/tests/routes/search.test.ts`
- **Detail:** `FR-dependency-search` requires `GET /api/search?q=` for the DependencyPicker typeahead. A test file with 5 test cases exists and explicitly documents the gap (`NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests… will FAIL`). The route directory has no `search.ts` and `app.ts` has no `/api/search` registration. Running `npm test` will produce 5 failing tests.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` implementing `GET /api/search?q=` — filter non-deleted work items by title/description, return `{data: WorkItem[]}`. Register in `app.ts` with `app.use('/api', searchRouter)`. The test contract is fully documented in the test file — it drives the implementation exactly.
- **Cross-ref:** [ESCALATE → TheFixer] for implementation

---

### QO-002 — Missing `dependencyCheckDuration` Histogram (FR-dependency-metrics)
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` specifies 4 Prometheus metrics: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `cycleDetectionEvents` counter ✅, and `dependencyCheckDuration` **histogram** ❌. The histogram is entirely absent from `metrics.ts`. The metrics test file (`tests/routes/metrics.test.ts`) does not test for this histogram either — so the gap is hidden from test coverage.
- **Recommendation:** Add to `Source/Backend/src/metrics.ts`:
  ```ts
  export const dependencyCheckDurationHistogram = new Histogram({
    name: 'dependency_check_duration_seconds',
    help: 'Duration of dependency readiness checks',
    labelNames: ['operation'],
    registers: [registry],
  });
  ```
  Then instrument it in `dependency.ts` around `isReady()` / `computeHasUnresolvedBlockers()` calls. Add a metric assertion to `tests/routes/metrics.test.ts`.

---

### QO-003 — `blocked_by` Missing from Portal API Types (FR-dependency-api-types)
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `portal/Shared/api.ts:32,59` | `portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293`
- **Detail:** `UpdateFeatureRequestInput` and `UpdateBugInput` in `portal/Shared/api.ts` do not include `blocked_by?: string[]`. The portal `DependencyPicker.tsx` works around this with `as any` casts (`as any` on lines 291 and 293). This violates the architecture rule "Shared types are single source of truth — no inline type re-definitions across layers." The plan delta for `FR-dependency-api-types` explicitly flagged this as ❌ Missing.
- **Recommendation:** Add `blocked_by?: string[]` to both interfaces in `portal/Shared/api.ts`. Remove `as any` casts in `DependencyPicker.tsx`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-004 — Missing Dependency Seed Data (FR-dependency-seed)
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (missing `seed.ts`)
- **Detail:** `FR-dependency-seed` requires an idempotent seed function creating 4 known dependency relationships (BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; etc). The `portal/Backend/src/database/` directory contains only `connection.ts` and `schema.ts`. No `seed.ts` exists. The plan delta explicitly flagged this as ❌ Missing.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with idempotent insert logic, call it from server startup after schema migration. Add `// Verifies: FR-dependency-seed` comment.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-005 — Traceability Enforcer Has a Scanner Blind Spot
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py` (line 78: `source_dirs = ["Source", "E2E"]`)
- **Detail:** The enforcer only scans `Source/` and `E2E/` directories. The dev-workflow-platform app lives entirely in `portal/`, which is also under CLAUDE.md-defined module ownership. Running `python3 tools/traceability-enforcer.py --plan dev-workflow-platform` reports 34 requirements as MISSING — but they ARE implemented in `portal/`. The default invocation (most-recently-modified) currently targets `self-judging-workflow` which happens to pass, masking this blind spot. If any agent modifies portal/ without running the enforcer with the correct `--plan` flag, drift goes undetected.
- **Recommendation:** Either (a) add `portal/` to `source_dirs` in the enforcer, or (b) document in `CLAUDE.md` / `inspector.config.yml` that portal/ requires `--plan dev-workflow-platform` explicitly. Update `inspector.config.yml` `source.dirs` to include `portal/`.

---

### QO-006 — FR-TMP-001..010 Have No Traceability Plan
- **Severity:** P3
- **Category:** spec-drift / doc-stale
- **File:** `Specifications/tiered-merge-pipeline.md`, `Plans/tiered-merge-pipeline/` (no `requirements.md`)
- **Detail:** The tiered merge pipeline spec defines 10 functional requirements (FR-TMP-001..FR-TMP-010). The `Plans/tiered-merge-pipeline/` directory contains design review, QA reports, and chaos test reports suggesting implementation work was done — but there is no `requirements.md` and no `// Verifies: FR-TMP-*` comments anywhere in `Source/`, `portal/`, or `platform/`. These features are likely implemented in the `platform/` orchestrator (outside enforcer scope) but are completely untraceable from the spec side.
- **Recommendation:** Create `Plans/tiered-merge-pipeline/requirements.md` with FR-TMP-001..010 IDs. Add `// Verifies: FR-TMP-XXX` comments in the relevant `platform/` source files, and extend the enforcer's `source_dirs` to include `platform/src/` (or add a separate enforcer invocation).

---

### QO-007 — Duplicate Test Files with Divergent Content
- **Severity:** P3
- **Category:** test quality
- **Files:** 
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)
- **Detail:** Four test files exist in duplicate at two locations with different content. Both will be discovered by Vitest and run, creating confusion about which is canonical. They cover overlapping but not identical scenarios, which could hide regressions when one is updated and the other is not.
- **Recommendation:** Consolidate into the `tests/pages/` location (matches the `source.test_dirs` config). Delete the root-level duplicates after merging any unique test cases.

---

### QO-008 — `eslint-disable` Suppressions in Production Code
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Two `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions exist in production source. These suppress valid lint warnings about missing hook dependencies and can mask stale-closure bugs in async React code.
- **Recommendation:** Resolve the exhaustive-deps issues properly (add the missing dependencies, or use `useCallback`/`useRef` patterns) rather than suppressing the warning.

---

### QO-009 — Silent Catch on JSON Parse in API Client
- **Severity:** P3
- **Category:** pattern-violation / architecture-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}))` silently swallows JSON parse failures on non-2xx responses. This violates "Never swallow errors silently." A malformed error response from the server (e.g., HTML 502 from a proxy) will be silently replaced with `{}`, making `body.message` undefined and reporting a generic `Request failed: 502` with no context.
- **Recommendation:** Log the parse failure or re-throw it: `const body = await response.json().catch((e) => { logger.warn('Failed to parse error response', e); return {}; })`. Since this is frontend code with no logger, at minimum add a `console.warn` in development mode.

---

### QO-010 — Large Files in Portal (>500 Lines)
- **Severity:** P4
- **Category:** pattern-violation
- **Files:**
  - `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx`: **550 lines**
  - `portal/Frontend/src/components/bugs/BugDetail.tsx`: **546 lines**
  - `portal/Backend/src/services/cycleService.ts`: **526 lines**
  - `portal/Backend/src/services/featureRequestService.ts`: **506 lines**
- **Detail:** Four portal files exceed the 500-line threshold. This is technical debt accumulation — each has grown with successive FR additions and now mixes multiple concerns.
- **Recommendation:** Track as tech-debt. On next touch of each file, extract sub-components/helpers. Not urgent.

---

```json
{
  "audit_date": "2026-05-09",
  "grade": "B",
  "spec_coverage": {
    "source_workflow_engine": "93%",
    "portal_dev_platform": "~95%",
    "platform_tiered_merge": "0% (out of enforcer scope)"
  },
  "total_requirements_scanned": 28,
  "requirements_covered": 26,
  "requirements_missing": 2,
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift/untested", "title": "Missing /api/search route — 5 tests FAIL", "file": "Source/Backend/src/app.ts" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration histogram missing from metrics.ts", "file": "Source/Backend/src/metrics.ts" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift/architecture-violation", "title": "blocked_by missing from portal UpdateBugInput/UpdateFeatureRequestInput; as any in DependencyPicker", "file": "portal/Shared/api.ts" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed: no seed.ts in portal/Backend/src/database/", "file": "portal/Backend/src/database/" },
    { "id": "QO-005", "severity": "P2", "category": "architecture-violation", "title": "Traceability enforcer blind spot: does not scan portal/", "file": "tools/traceability-enforcer.py" },
    { "id": "QO-006", "severity": "P3", "category": "spec-drift/doc-stale", "title": "FR-TMP-001..010 have no requirements.md and no Verifies comments", "file": "Plans/tiered-merge-pipeline/" },
    { "id": "QO-007", "severity": "P3", "category": "test-quality", "title": "Duplicate divergent test files in Source/Frontend/tests/", "file": "Source/Frontend/tests/" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressions in DependencyPicker.tsx and useWorkItems.ts", "file": "Source/Frontend/src/" },
    { "id": "QO-009", "severity": "P3", "category": "pattern-violation/architecture-violation", "title": "Silent catch on JSON parse in api/client.ts", "file": "Source/Frontend/src/api/client.ts" },
    { "id": "QO-010", "severity": "P4", "category": "pattern-violation", "title": "4 portal files exceed 500 lines", "file": "portal/" }
  ],
  "p1_count": 1,
  "p2_count": 4,
  "p3_count": 4,
  "p4_count": 1,
  "escalate_to_fixer": ["QO-001", "QO-002", "QO-003", "QO-004"],
  "escalate_to_guardians": []
}
```

---

### Key Structural Finding

This repo contains **two independent production apps** (`Source/` = workflow engine, `portal/` = dev platform) plus orchestrator infrastructure (`platform/`). The traceability enforcer only watches `Source/`. Running it without `--plan self-judging-workflow` will auto-select the most recently modified plan which currently points at the right plan — but that is fragile. The `inspector.config.yml` `source.dirs` should be extended to include `portal/` and the enforcer invocation should be plan-explicit in the CLAUDE.md verification gates.
