Now the full findings report:

---

## Quality Oracle Findings — 2026-07-05

### Spec Coverage

| Scope | FR IDs | Covered | % |
|-------|--------|---------|---|
| `Specifications/workflow-engine.md` (active) | 13 | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` | 76 | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` | 13 | 0 | **0%** |
| `Plans/dependency-linking` (FR-dependency-*) | 16 | 16 | **100%** |
| **Totals across all Specifications/** | **102** | **13** | **~13%** |

**Active implementation spec coverage: ~90%** (FR-WF-* all covered; FR-dependency-* minus 2 open gaps)

---

### QO-001 — Missing `GET /api/search` Route Registration
- **Severity:** P1
- **Category:** spec-drift / correctness
- **File:** `Source/Backend/src/app.ts` (no `/api/search` mount)
- **Cross-ref:** `Source/Backend/tests/routes/search.test.ts:1–6` (tests document the gap intentionally)
- **Detail:** `FR-dependency-search` requires `GET /api/search?q=` for the `DependencyPicker` typeahead. The route is tested but never registered in `app.ts`. At runtime every `searchItems()` call from the frontend returns 404, silently breaking dependency management for all users.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` implementing the search handler, then add `app.use('/api/search', searchRouter)` in `app.ts`. All 5 tests in `search.test.ts` should pass immediately after.

---

### QO-002 — Traceability Enforcer Blind Spot Produces False PASSED
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:57` (fallback selects most-recently-modified `requirements.md`)
- **Detail:** Running `python3 tools/traceability-enforcer.py` with no arguments always selects `Plans/self-judging-workflow/requirements.md` (13 FR-WF-* IDs) and reports **PASSED**. This masks:
  - `Specifications/dev-workflow-platform.md`: 76 FR IDs, **0% coverage**
  - `Specifications/tiered-merge-pipeline.md`: 13 FR-TMP-* IDs, **0% coverage**
  
  The CI gate passes while two full specification documents are completely untraced. CLAUDE.md mandates that **every FR needs a test with `// Verifies: FR-XXX`** but the enforcer doesn't check `Specifications/` by default.
- **Recommendation:** Either (a) add a `--all-specs` flag that scans all files in `Specifications/`, or (b) update the CLAUDE.md verification gate to run the enforcer against each spec file explicitly: `python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md`.

---

### QO-003 — Architecture Violation: 3 Route Files Bypass Service Layer
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/workflow.ts:15`, `Source/Backend/src/routes/intake.ts:4`
- **Detail:** All three route files import `* as store from '../store/workItemStore'` and call `store.createWorkItem`, `store.findAll`, `store.findById`, `store.updateWorkItem`, `store.softDelete` directly from request handlers. CLAUDE.md Rule: *"No direct DB calls from route handlers — use the service layer."* The in-memory store is the persistence layer; the rule applies to it. Service files already exist for router/assessment/dashboard/dependency — CRUD and intake have no analogous service.
- **Recommendation:** Create `Source/Backend/src/services/workItemService.ts` wrapping the store operations. Route handlers should call service functions. This decouples persistence from HTTP concerns and makes the store mockable in unit tests.

---

### QO-004 — `Specifications/tiered-merge-pipeline.md` — 13/13 Requirements Unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** All 10 functional requirements (FR-TMP-001 through FR-TMP-010) and 3 NFRs have zero source coverage. Covers: risk classification, Playwright E2E test generation, live E2E runner phase, auto-PR creation, AI PR review, auto-merge logic, env configuration, worker prerequisites, run JSON extensions, error handling. The `Source/E2E/` directory exists (playwright.config.ts present) but contains no cycle-test directories, no PR automation, no risk-level logic.
- **Recommendation:** Open a Plan in `Plans/tiered-merge-pipeline/` with requirements mapped to the FR-TMP-* IDs. Until then, the spec should be marked `[Status: Planned — not yet started]` in its header to avoid appearing as active specification debt.

---

### QO-005 — `Specifications/dev-workflow-platform.md` — FR-001–FR-069 Unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The primary domain specification (Feature Requests, Bug Reports, Development Cycles, Pipeline Orchestration, Traceability) has 76 FR IDs with zero source coverage. The codebase implements `Specifications/workflow-engine.md` (a different, simpler product — the Self-Judging Workflow Engine). The two specs describe different systems: dev-workflow-platform includes SQLite DB, voting, approval workflows, CI/CD simulation; workflow-engine uses an in-memory store with routing/assessment pods. Source maps to FR-WF-* not FR-XXX IDs.
- **Recommendation:** Clarify spec status. If dev-workflow-platform.md is the long-term target and workflow-engine.md is a stepping stone, document that relationship. If dev-workflow-platform.md is aspirational, tag it `[Status: Future]` and remove it from the default enforcer scope to prevent perpetual false drift.

---

### QO-006 — Missing `dependencyCheckDuration` Histogram (FR-dependency-metrics Partial)
- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` requires 4 Prometheus instruments. Three are present (`dependencyOperations`, `dispatchGatingEvents`, `cycleDetectionEvents`). The `dependencyCheckDuration` **Histogram** is absent — it was specified to measure BFS cycle-detection latency. No `Histogram` import exists in the file. The dependency service's `detectCycle()` method runs BFS but records no duration.
- **Recommendation:** Add `import { ..., Histogram } from 'prom-client'` and define `export const dependencyCheckDurationHistogram = new Histogram({ name: 'dependency_check_duration_seconds', ... })` in `metrics.ts`. Instrument the BFS call in `dependency.ts`.

---

### QO-007 — Duplicate Frontend Test Files with Divergent Coverage
- **Severity:** P2
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`; same pair for `WorkItemListPage`
- **Detail:** Both `tests/` (root) and `tests/pages/` versions exist. The `pages/` versions import `WorkItemStatus`, `WorkItemType`, `WorkItemPriority` etc. from `Shared/types/workflow` and use `within()` for scoped queries — more robust tests. The root-level versions use simpler relative imports and fewer test utilities. Both carry `// Verifies: FR-WF-011`/`FR-WF-010` traceability comments. Vitest's default glob likely runs both, potentially duplicating test IDs or hiding failures.
- **Recommendation:** Delete the root-level `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `WorkItemListPage.test.tsx`; keep the `pages/` variants as canonical. Verify the vitest config glob to confirm both are currently being exercised.

---

### QO-008 — Missing Seed File for Dependency Data (FR-dependency-seed)
- **Severity:** P2  
- **Category:** spec-drift
- **File:** `Source/Backend/src/` (no `seed.ts` anywhere)
- **Detail:** `FR-dependency-seed` requires an idempotent seed function creating known dependency relationships (BUG-0010 blocked_by BUG-0003…0007; FR-0004 blocked_by FR-0003 etc.). No seed file exists in `Source/Backend/src/`. The dependency service and store are functional, but a fresh server start has no seed data for the dependency features to demonstrate correctly.
- **Recommendation:** Create `Source/Backend/src/seed.ts` with idempotent seeding. Wire into the startup path in `app.ts` or an `index.ts` entry point with `if (process.env.SEED_DATA === 'true')` guard.

---

### QO-009 — Two `eslint-disable` Suppressing `react-hooks/exhaustive-deps`
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress the `react-hooks/exhaustive-deps` lint rule. This warning fires when a `useEffect`/`useCallback` dependency array is incomplete, which can cause stale closures reading old values. Suppressing it without justification comments hides potential correctness bugs — for instance, `DependencyPicker`'s search debounce or `useWorkItems`'s filter application could be reading stale state.
- **Recommendation:** Replace each `eslint-disable` with a documented explanation of why the dep is intentionally excluded, or fix the dependency arrays. Use `useCallback` + `useMemo` correctly rather than suppressing the warning.

---

### QO-010 — `DebugPortalPage.tsx` Has No FR-Backed Spec
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** Comment reads `// Verifies: dev-crew debug portal — embedded container-test viewer` — not an FR-XXX traceability reference. No specification in `Specifications/` or `Plans/` describes a "debug portal page." This is an unlinked implementation: code that exists with no traceable spec requirement.
- **Recommendation:** Either add a minimal spec entry for this utility page (FR-WF-014 or similar) and update the Verifies comment, or clearly document it as a dev-tooling page outside the spec scope (e.g., `// Dev tooling only — not part of the product spec`).

---

### QO-011 — `Plans/dependency-linking/requirements.md` Documents `portal/` Paths, Not `Source/`
- **Severity:** P3
- **Category:** doc-stale
- **File:** `Plans/dependency-linking/requirements.md:15–29` (all implementation descriptions reference `portal/Backend/`, `portal/Frontend/`, `portal/Shared/`)
- **Detail:** The requirements and implementation delta table point to a `portal/` module structure that doesn't match the actual implementation in `Source/`. This creates confusion: new developers reading the plan would look in `portal/` for the implementation. The implementation delta table also shows items as ❌ Missing that are actually implemented in `Source/`.
- **Recommendation:** Update the requirements.md to replace all `portal/Backend/` → `Source/Backend/`, `portal/Frontend/` → `Source/Frontend/`, `portal/Shared/` → `Source/Shared/` paths, and re-audit the implementation delta table against actual `Source/` contents.

---

### Grade: **C**

| Criterion | Threshold | Actual | Pass? |
|-----------|-----------|--------|-------|
| P1 findings | ≤ 0 (A/B) / ≤ 2 (C) | 2 | C ✓ |
| P2 findings | ≤ 3 (A) / ≤ 8 (B) / ≤ 15 (C) | 6 | C ✓ |
| Active spec coverage | ≥ 80% (A) / ≥ 60% (B) / ≥ 40% (C) | ~90% | A ✓ |

Active spec (FR-WF-* + FR-dependency-*) is in good shape. Grade bottlenecks on two P1s: the missing search route (runtime breakage) and the enforcer blind spot (false green CI gate). Fix those two and address the direct-store architecture pattern to reach Grade B.

---

### JSON Summary

```json
{
  "audit_date": "2026-07-05",
  "grade": "C",
  "active_spec_coverage_pct": 90,
  "total_spec_coverage_pct": 13,
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "GET /api/search not registered in app.ts", "file": "Source/Backend/src/app.ts" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer only checks most-recent requirements.md — false PASSED", "file": "tools/traceability-enforcer.py" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "3 route files bypass service layer with direct store calls", "files": ["Source/Backend/src/routes/workItems.ts", "Source/Backend/src/routes/workflow.ts", "Source/Backend/src/routes/intake.ts"] },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "Tiered merge pipeline — 13 FR-TMP-* IDs unimplemented", "file": "Specifications/tiered-merge-pipeline.md" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "dev-workflow-platform.md — 76 FR-XXX IDs unimplemented", "file": "Specifications/dev-workflow-platform.md" },
    { "id": "QO-006", "severity": "P2", "category": "spec-drift", "title": "dependencyCheckDuration histogram missing from metrics.ts", "file": "Source/Backend/src/metrics.ts" },
    { "id": "QO-007", "severity": "P2", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage", "files": ["Source/Frontend/tests/WorkItemDetailPage.test.tsx", "Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx"] },
    { "id": "QO-008", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed: no seed.ts file", "file": "Source/Backend/src/" },
    { "id": "QO-009", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable react-hooks/exhaustive-deps in 2 files", "files": ["Source/Frontend/src/components/DependencyPicker.tsx", "Source/Frontend/src/hooks/useWorkItems.ts"] },
    { "id": "QO-010", "severity": "P3", "category": "spec-drift", "title": "DebugPortalPage has no FR-backed spec", "file": "Source/Frontend/src/pages/DebugPortalPage.tsx" },
    { "id": "QO-011", "severity": "P3", "category": "doc-stale", "title": "dependency-linking requirements.md references portal/ paths instead of Source/", "file": "Plans/dependency-linking/requirements.md" }
  ],
  "escalations": [],
  "enforcer_status": "PASSED (misleading — only checks Plans/self-judging-workflow/requirements.md)"
}
```
