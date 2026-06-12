Now the full report:

---

## Quality Oracle Findings — 2026-06-12

### Spec Coverage: 69% (Source/ scope)

| Namespace | Spec | Implemented | Coverage |
|-----------|------|-------------|----------|
| FR-WF-001 — FR-WF-013 | `workflow-engine.md` | 13/13 | **100%** ✅ |
| FR-dependency-* | `workflow-engine.md` + deps plan | 14/16 | **87%** ⚠️ |
| FR-TMP-001 — FR-TMP-010 | `tiered-merge-pipeline.md` | 0/10 | **0%** ❌ |
| FR-001 — FR-069 | `dev-workflow-platform.md` | 0/69 in Source/ | ✅ **Correct** — lives in `portal/` |

**Enforcer gate:** PASSES (13/13 FR-WF-* all have `// Verifies:` in source). The enforcer scope is intentionally narrow (Plans/ not Specifications/) so the pass is valid but not comprehensive.

---

### QO-001: `GET /api/search` missing from app.ts
- **Severity:** P2
- **Category:** spec-drift / untested (route exists in tests but not in application)
- **File:** `Source/Backend/src/app.ts` — no `/api/search` registration
- **Detail:** FR-dependency-search requires `GET /api/search?q=` cross-entity typeahead used by the `DependencyPicker` frontend component. The route is fully specified in `Source/Backend/tests/routes/search.test.ts` — that file even includes an explicit comment: _"NOTE: the GET /api/search endpoint is NOT wired into app.ts. These tests … will FAIL until the route is implemented."_ The frontend `searchItems()` API client function calls this endpoint, making `DependencyPicker` broken at runtime.
- **Recommendation:** Add a `/api/search` route file to `Source/Backend/src/routes/` and register it in `app.ts` as `app.use('/api/search', searchRouter)`. Implementation: filter `getAllItems()` by `q` against `title` and `description`, return `{data: WorkItem[]}`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-002: `dependencyCheckDuration` Histogram absent from metrics
- **Severity:** P2
- **Category:** spec-drift (FR-dependency-metrics)
- **File:** `Source/Backend/src/metrics.ts` — 3 of 4 required metrics present; Histogram missing
- **Detail:** FR-dependency-metrics explicitly requires four Prometheus metrics: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `cycleDetectionEvents` counter ✅, and `dependencyCheckDuration` **Histogram ❌**. The histogram is absent. `GET /metrics` will not emit it. The spec requires this for latency profiling of readiness checks and BFS cycle detection.
- **Recommendation:** Add to `metrics.ts`:
  ```ts
  export const dependencyCheckDurationHistogram = new Histogram({
    name: 'dependency_check_duration_seconds',
    help: 'Duration of dependency readiness and cycle detection checks',
    labelNames: ['operation'] as const,
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
    registers: [registry],
  });
  ```
  Then instrument `isReady()` and `detectCycle()` in `dependency.ts`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: Route handlers call store directly — service layer bypassed
- **Severity:** P2
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/routes/workItems.ts:44,73,79,89,134,142` · `Source/Backend/src/routes/workflow.ts:44,71,99,119,155,175` · `Source/Backend/src/routes/intake.ts:19,42`
- **Detail:** CLAUDE.md architecture rule: _"No direct DB calls from route handlers — use the service layer."_ All three route files import `workItemStore` directly and call `store.createWorkItem()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()` without going through a service intermediary. Only assessment, routing, and dependency operations are properly wrapped in services. This creates untestable coupling and violates the project's layering contract.
- **Recommendation:** Extract a `workItemService.ts` that wraps the store operations used by routes, matching the pattern established by `router.ts`, `assessment.ts`, and `dependency.ts`. Routes should import from the service, not the store.
- **Cross-ref:** [ESCALATE → TheFixer for refactor]

---

### QO-004: Tiered Merge Pipeline spec entirely unimplemented
- **Severity:** P2
- **Category:** spec-drift (10 requirements, 0% coverage)
- **File:** `Specifications/tiered-merge-pipeline.md` — FR-TMP-001 through FR-TMP-010
- **Detail:** The tiered-merge-pipeline spec (risk classification, Playwright E2E generation, auto-PR, AI PR review, auto-merge logic) has **zero implementation references** in `Source/`. The `Source/E2E/` directory contains only two config files — no actual test files and no cycle runner. The `Plans/tiered-merge-pipeline/` directory contains design/QA/chaos reports but no `requirements.md`, which means the traceability enforcer never checks this spec. Deferred or not yet started.
- **Recommendation:** If this spec is in-scope, create `Plans/tiered-merge-pipeline/requirements.md` with FR-TMP-* IDs so the enforcer gate will catch further drift. If it is deferred intentionally, document that status in the spec header.
- **Cross-ref:** Assign to TheATeam if active

---

### QO-005: FR-dependency-seed not implemented
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/src/` — no seed data found
- **Detail:** FR-dependency-seed requires idempotent seed data establishing specific blocking relationships (BUG-0010 blocked by BUG-0003/0004/0005/0006/0007; FR-0004 blocked by FR-0003; etc.). Zero references to seed data or seeding logic exist in the Source/Backend codebase. Without seed data, the dependency graph has no demo state on fresh startup, and integration tests that depend on known relationships cannot function.
- **Recommendation:** Create `Source/Backend/src/seed.ts` with idempotent seeding logic called at app startup (guarded by `process.env.SEED_DATA !== 'false'`). Add `// Verifies: FR-dependency-seed` comments.

---

### QO-006: Duplicate logger abstraction
- **Severity:** P3
- **Category:** architecture-violation / technical-debt
- **Files:** `Source/Backend/src/logger.ts` · `Source/Backend/src/utils/logger.ts`
- **Detail:** Two logger modules co-exist. `src/logger.ts` is a compatibility shim that wraps `src/utils/logger.ts` to provide a `default` export with a different call signature. CLAUDE.md says _"Use the project's logger abstraction, never `console.log`"_ but doesn't say which of the two to use. Some routes use `import logger from '../logger'` (the shim), while the store uses `import { logger } from '../utils/logger'` (the canonical one). This dual-abstraction creates confusion for new agents.
- **Recommendation:** Designate `utils/logger.ts` as the canonical logger. Migrate all import sites to use it directly (`import { logger } from '../utils/logger'`). Delete `src/logger.ts` once all callers are migrated.

---

### QO-007: `playwright.pipeline.config.ts` contains hardcoded cycle-run artifact path
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/E2E/playwright.pipeline.config.ts:3`
- **Detail:** The file contains `testDir: "./tests/cycle-run-1774659927912-8dd3ac77"` — a specific generated run directory that will not exist in any fresh checkout. This appears to be a generated artifact accidentally committed. It also lacks a `// Verifies:` traceability comment. Running Playwright with this config will fail immediately with "directory not found."
- **Recommendation:** Replace the hardcoded `testDir` with a dynamic value via an environment variable: `testDir: process.env.E2E_TEST_DIR ?? './tests'`. Add a `// Verifies: FR-TMP-003` comment once the tiered merge pipeline is in scope.
- **Cross-ref:** QO-004

---

### QO-008: Two `eslint-disable` suppressions without justification
- **Severity:** P4
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/components/DependencyPicker.tsx:82` · `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both suppress `react-hooks/exhaustive-deps` without a comment explaining why the dep is intentionally omitted. CLAUDE.md says _"Never swallow errors silently"_ — the same principle extends to suppressed lint rules. Stale closures caused by missing deps are a known React bug category.
- **Recommendation:** Add inline justification comment for each suppression, or remove the suppression and fix the exhaustive-deps warning correctly.

---

### Summary JSON

```json
{
  "grade": "B",
  "run_date": "2026-06-12",
  "enforcer_result": "PASS",
  "enforcer_coverage": "13/13 (100%)",
  "true_coverage_source": "27/39 (69%)",
  "findings": [
    {"id": "QO-001", "severity": "P2", "category": "spec-drift", "title": "GET /api/search missing from app.ts"},
    {"id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration Histogram absent"},
    {"id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Route handlers bypass service layer"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "Tiered merge pipeline 0% implemented"},
    {"id": "QO-005", "severity": "P3", "category": "spec-drift", "title": "FR-dependency-seed not implemented"},
    {"id": "QO-006", "severity": "P3", "category": "architecture-violation", "title": "Duplicate logger abstraction"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "Hardcoded cycle-run path in playwright config"},
    {"id": "QO-008", "severity": "P4", "category": "pattern-violation", "title": "eslint-disable without justification"}
  ],
  "p1_count": 0,
  "p2_count": 4,
  "p3_count": 3,
  "p4_count": 1,
  "escalate_to_TheFixer": ["QO-001", "QO-002", "QO-003"],
  "escalate_to_TheATeam": ["QO-004"]
}
```

---

**Grading rationale:** 0 P1s, 4 P2s, enforcer-visible spec coverage 100%. Per `grading.yml`: Grade **B** (max_p2: 8, min_spec_coverage: 60 — both satisfied). Would reach **A** by closing QO-001 and QO-002 (two of the four P2s are quick fixes that bring P2 count to ≤ 3).

**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
