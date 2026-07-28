Now the full audit report:

---

## Quality Oracle Findings

### Spec Coverage

| Scope | Requirements | Traced to source | Coverage |
|---|---|---|---|
| `Plans/self-judging-workflow/` | 13 | 12 (FR-WF-013 unverified by tests) | **92.3%** |
| `Plans/dependency-linking/` | 16 | 15 (FR-dependency-seed missing) | **93.8%** |
| `Specifications/dev-workflow-platform.md` | 69 | 0 — different system entirely | **0%** ⚠️ |

**Traceability enforcer verdict:** PASSED (but only scans `Plans/self-judging-workflow/requirements.md`)

---

### QO-001: `Specifications/dev-workflow-platform.md` — 69 FRs have zero implementation
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:337–452`
- **Detail:** FR-001 through FR-069 describe a full product (Feature Requests, Bug Reports, Development Cycles, Pipeline Orchestration) backed by SQLite. The current `Source/` codebase implements an entirely different system — the Self-Judging Workflow Engine (Work Items, assessment pods, routing). Zero `// Verifies:` comments reference any FR-001…FR-069 in source. The spec was never retired or marked superseded.
- **Recommendation:** Formally retire `dev-workflow-platform.md` by adding a `## Status: Superseded` header pointing to `Specifications/workflow-engine.md`, OR open a plan to implement the missing FRs. Leaving 69 "live" requirements with 0% coverage breaks the project's own spec-as-source-of-truth rule.
- **Cross-ref:** The active spec for the current system is `Specifications/workflow-engine.md`; the traceability enforcer doesn't scan `Specifications/` at all.

---

### QO-002: Traceability enforcer scope is a single auto-picked plan file
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:36-38`
- **Detail:** The enforcer auto-selects the *most-recently-modified* `requirements.md` under `Plans/`. On this run it only checked `Plans/self-judging-workflow/requirements.md`. Eight other plan requirements files (dependency-linking, dev-workflow-platform, image-upload, orchestrated-dev-cycles, etc.) are **never scanned**. Running `python3 tools/traceability-enforcer.py` and seeing PASSED gives false confidence — 7 plans are silently skipped.
- **Recommendation:** Add a multi-plan mode or CI step that runs the enforcer against every `Plans/*/requirements.md`. At minimum, the `CLAUDE.md` gate command should explicitly list both active plans: `python3 tools/traceability-enforcer.py --file Plans/self-judging-workflow/requirements.md && python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md`.

---

### QO-003: FR-WF-013 (Observability) has no test coverage
- **Severity:** P2
- **Category:** untested
- **File:** `Source/Backend/src/metrics.ts:1`, `Source/Backend/src/utils/logger.ts:1`
- **Detail:** FR-WF-013 requires "structured JSON logging for all workflow transitions; Prometheus metrics for items created/routed/assessed/dispatched." The implementation exists (logger, metrics counters, errorHandler middleware) and carries `// Verifies: FR-WF-013` in production source. But **no test file** carries `// Verifies: FR-WF-013`. The only metrics test (`tests/routes/metrics.test.ts`) verifies only `FR-dependency-metrics`. Workflow counters (`workflow_items_created_total`, `workflow_items_routed_total`, `workflow_items_assessed_total`, `workflow_items_dispatched_total`) are untested. CLAUDE.md rule: "Every FR needs a test with `// Verifies: FR-XXX`".
- **Recommendation:** Add `Source/Backend/tests/routes/workflow-metrics.test.ts` covering all four workflow Prometheus counters and verifying structured log output shape, tagged `// Verifies: FR-WF-013`.

---

### QO-004: Route handlers import store directly — service layer bypassed
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/intake.ts:4`, `Source/Backend/src/routes/workflow.ts:15`
- **Detail:** Three route files `import * as store from '../store/workItemStore'` and call `store.createWorkItem()`, `store.findAll()`, `store.softDelete()`, etc. directly in request handlers. CLAUDE.md architecture rule: *"No direct DB calls from route handlers — use the service layer."* Although the store is in-memory (not a DB), the architectural concern is the same: business logic and persistence are entangled in the HTTP layer, making it harder to test, mock, or swap the store.
- **Recommendation:** Introduce thin service modules (e.g. `workItemService.ts`) wrapping store operations, or document explicitly in `Specifications/workflow-engine.md` that the in-memory store is exempt from the service-layer rule. Without documentation, this is an active violation that will confuse future agents following CLAUDE.md.

---

### QO-005: FR-dependency-seed — no implementation, no test
- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `Plans/dependency-linking/requirements.md:46`
- **Detail:** `FR-dependency-seed` requires idempotent seed data (BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; etc.). The plan's own implementation delta marks it ❌ Missing. No file in `Source/` seeds this data, and no test carries `// Verifies: FR-dependency-seed`. The dependency-linking plan's enforcer run will also fail to catch this — `FR-dependency-seed` is referenced in `Plans/dependency-linking/requirements.md` but the enforcer never scans that file.
- **Recommendation:** Create the seed function/test and ensure `Plans/dependency-linking/requirements.md` is added to the enforcer's CI command.

---

### QO-006: Duplicate test files for WorkItemDetailPage and WorkItemListPage
- **Severity:** P3
- **Category:** test-coverage / simplification
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (13.5 KB) vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (13.7 KB)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (9.4 KB) vs `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (8.1 KB)
- **Detail:** Both `tests/` (top-level) and `tests/pages/` copies exist and both carry `// Verifies: FR-WF-011` / `FR-WF-010` tags. The top-level files appear to be superseded by the `pages/` versions. Running the test suite executes both, doubling execution time for these suites and risking divergence if one copy is updated but not the other.
- **Recommendation:** Delete the top-level copies (`tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx`), keeping the `tests/pages/` versions as canonical.

---

### QO-007: `eslint-disable` suppresses exhaustive-deps warnings in two hooks
- **Severity:** P4
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with inline `eslint-disable-next-line` comments. CLAUDE.md instructs agents never to swallow errors silently; the same discipline applies to lint suppressions. In `useWorkItems.ts` the suppression is marginal (dep array is explicit and correct), but the pattern is still a code smell that can mask stale-closure bugs in future edits.
- **Recommendation:** Refactor to satisfy the lint rule (e.g., `useCallback`-wrap the fetch function) and remove both suppressions.

---

### Overall Grade: **C**

| Criterion | Threshold (C) | Actual |
|---|---|---|
| P1 findings | ≤ 2 | **1** ✓ |
| P2 findings | ≤ 15 | **3** ✓ |
| Spec coverage (enforcer-scoped) | ≥ 40% | **~93%** ✓ |
| Spec coverage (Specifications/) | — | **0%** ⚠️ |

Grade is C rather than B/A due to the P1 spec-drift (69 live FRs in Specifications/ with 0 implementation) pulling overall spec coverage to 0% at the domain specification level. Enforcer-scoped plan coverage is healthy at ~93%.

---

```json
{
  "run_date": "2026-07-28",
  "grade": "C",
  "spec_coverage": {
    "self_judging_workflow_plan": "92.3%",
    "dependency_linking_plan": "93.8%",
    "dev_workflow_platform_spec": "0%"
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift",           "title": "Specifications/dev-workflow-platform.md — 69 FRs unimplemented" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift",           "title": "Traceability enforcer only scans one plan file" },
    { "id": "QO-003", "severity": "P2", "category": "untested",             "title": "FR-WF-013 observability has no test coverage" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation","title": "Route handlers import store directly, bypassing service layer" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift/untested",  "title": "FR-dependency-seed — no implementation or test" },
    { "id": "QO-006", "severity": "P3", "category": "test-coverage",        "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-007", "severity": "P4", "category": "pattern-violation",    "title": "eslint-disable suppresses exhaustive-deps in two hooks" }
  ],
  "p1_count": 1,
  "p2_count": 3,
  "p3_count": 1,
  "p4_count": 1,
  "route_to": {
    "TheFixer": ["QO-003", "QO-005", "QO-006", "QO-007"],
    "TheATeam_or_solo": ["QO-001", "QO-002", "QO-004"]
  }
}
```
