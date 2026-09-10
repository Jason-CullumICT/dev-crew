# Quality Oracle Findings — 2026-09-10

**Auditor:** quality-oracle  
**Config:** `Teams/TheInspector/inspector.config.yml`  
**Scope:** Full audit — spec-drift, traceability, architecture, test quality, pattern enforcement  
**Grade (preliminary):** **C** — 2 P1s, 3 P2s; spec coverage 15%

---

## Spec Coverage Summary

| Spec File | FR IDs | Traced in Source | Coverage |
|-----------|--------|-----------------|----------|
| `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-001..013) | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` | 74 (FR-001..FR-069+) | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` | 10 (FR-TMP-001..010) | 0 | **0%** |

**Weighted overall coverage: ~13 / 97 = 13%** — well below the grade-A threshold of 80%.

> ℹ️ The traceability enforcer (`tools/traceability-enforcer.py`) only scans the **most recently modified `Plans/*/requirements.md`** file. It reports **PASSED** while leaving 84 spec-level FRs completely untraced. This is a coverage blind-spot, not a real pass.

---

## QO-001: Routes Bypass Service Layer for CRUD and Workflow State Changes

- **Severity:** P1
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/routes/workItems.ts` — lines 44, 73, 79, 89, 134, 142
  - `Source/Backend/src/routes/workflow.ts` — lines 44, 99, 119–125, 155, 175, 217, 269, 317, 359
  - `Source/Backend/src/routes/intake.ts` — lines 19, 42
- **Detail:**  
  All three route handlers directly import and call `workItemStore` methods (`store.createWorkItem`, `store.findById`, `store.findAll`, `store.updateWorkItem`, `store.softDelete`) instead of going through a service layer. This violates the explicit architecture rule:  
  > *"No direct DB calls from route handlers — use the service layer"*  
  
  Furthermore, the `approve`, `reject`, and `dispatch` actions in `workflow.ts` embed business logic (state transition validation, change-history entry construction, team assignment) directly inside the route handler bodies. The `router` and `assessment` services are correctly used for `/route` and `/assess` actions — but all other workflow verbs and all CRUD ops are unmediated.  

  No `workItemService.ts` or `intakeService.ts` exists in `Source/Backend/src/services/`.

- **Recommendation:**  
  1. Create `Source/Backend/src/services/workItemService.ts` wrapping all store CRUD calls.  
  2. Create `Source/Backend/src/services/workflowService.ts` (or extend router.ts) with `approveWorkItem`, `rejectWorkItem`, `dispatchWorkItem` functions containing the state-machine and change-history logic.  
  3. Route handlers become thin: validate request shape, call service, return result or error.
- **Cross-ref:** TheFixer — requires code changes across `routes/` and new `services/` files.

---

## QO-002: Traceability Enforcer Has a Blind Spot — 84 Spec FRs Untraced

- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:**  
  The enforcer scans only the most-recently-modified `Plans/*/requirements.md` file. At runtime it targets `Plans/self-judging-workflow/requirements.md` (13 FR-WF IDs) and reports "PASSED."  
  
  However, the domain source-of-truth lives in `Specifications/`:
  - `dev-workflow-platform.md` — **74 FRs** (FR-001 through FR-069 plus index refs) — **0% traced**
  - `tiered-merge-pipeline.md` — **10 FRs** (FR-TMP-001 through FR-TMP-010) — **0% traced**
  
  This means 84 specification-level requirements have no verifiable implementation references. The gate passes green while the vast majority of the spec is unimplemented or untraced. Teams relying on this gate for spec-compliance assurance receive a false signal.

- **Recommendation:**  
  Extend the enforcer to also scan `Specifications/` directory:  
  ```python
  # In tools/traceability-enforcer.py: add Specifications/ as additional source
  spec_files = list(Path("Specifications").glob("**/*.md"))
  fr_ids = extract_fr_ids_from_files(spec_files)
  ```  
  Or add a separate `Specifications/` mode and include it in the verification gate.
- **Cross-ref:** TheFixer — enforcer script change; also signals spec-drift work below.

---

## QO-003: Spec Drift — dev-workflow-platform.md Describes an Unimplemented Product

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:**  
  This specification describes a **feature-request / bug-report / development-cycle** platform with SQLite persistence, AI voting/triage, human approval gates, pipeline orchestration, and 7 subsystems. The current implementation (`Source/`) is a **work-item workflow engine** with an in-memory store — a completely different product.

  One of the following is true, and there is no documentation of which:
  - (a) `dev-workflow-platform.md` has been superseded by `workflow-engine.md` — in which case it should be marked deprecated and removed from `Specifications/`.
  - (b) The 74 FRs in `dev-workflow-platform.md` represent a planned but unstarted implementation — in which case the spec-coverage gap is 74 FRs behind.

  Without a decision record, any new agent reading `Specifications/` will treat these 74 FRs as current requirements and either implement conflicting functionality or ignore them with no guidance.

- **Recommendation:**  
  1. Add a `STATUS: SUPERSEDED` header to `dev-workflow-platform.md` if it has been replaced.  
  2. Or add a `Plans/dev-workflow-platform/` plan and track it as a backlog.  
  3. Add `// Verifies: FR-XXX` comments to any existing code that does cover parts of these FRs.
- **Cross-ref:** requirements-reviewer — spec ownership decision.

---

## QO-004: Spec Drift — tiered-merge-pipeline.md Unimplemented (E2E Suite Empty)

- **Severity:** P2
- **Category:** spec-drift
- **Files:**
  - `Specifications/tiered-merge-pipeline.md` — FR-TMP-001 through FR-TMP-010
  - `Source/E2E/package.json` — `"test": "echo \"Error: no test specified\" && exit 1"`
- **Detail:**  
  FR-TMP-001 (risk classification), FR-TMP-002 (Playwright E2E test generation), FR-TMP-003 through FR-TMP-010 (auto-merge, AI review, PR creation, etc.) have zero implementation in `Source/`. The Playwright E2E configuration files exist (`playwright.config.ts`, `playwright.pipeline.config.ts`) but the test package has no runnable test command.  
  
  Running the verification gate `npm test --workspaces` will fail silently on the E2E workspace (the `echo` command exits 1, but `--if-present` skips it).

- **Recommendation:**  
  1. Add a `Plans/tiered-merge-pipeline/` plan to track implementation status.  
  2. Either implement the E2E scaffold with placeholder tests, or update the spec status to indicate Phase 1 is not yet started.
- **Cross-ref:** TheFixer (E2E scaffold), requirements-reviewer (spec status).

---

## QO-005: eslint-disable Suppressions Without Justification

- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:**  
  Both files suppress `react-hooks/exhaustive-deps` without documenting *why* the dependency array intentionally omits a value. The rule exists to prevent stale-closure bugs. A suppression without a comment explaining the intentional omission is technical debt that can mask real bugs during future refactoring.

- **Recommendation:**  
  Replace each bare `// eslint-disable-next-line` with a comment explaining the omission, e.g.:
  ```ts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // fetchItems is stable (useCallback with empty deps); adding it causes infinite loop
  ```
- **Cross-ref:** None — safe local fix.

---

## QO-006: Hardcoded Fallback localhost URL in Production Component

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:5`
- **Detail:**  
  ```ts
  const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200';
  ```  
  The hardcoded fallback `http://localhost:4200` will silently fail in any deployment where this env var is not set and port 4200 is not running. The CLAUDE.md architecture rule states "No hardcoded secrets" — this extends to hardcoded environment-specific URLs.  
  
  While this is a debug page, the pattern leaks into production builds.

- **Recommendation:**  
  Remove the fallback or guard the component:  
  ```ts
  const portalUrl = import.meta.env.VITE_PORTAL_URL;
  if (!portalUrl) return <p>Portal URL not configured (set VITE_PORTAL_URL)</p>;
  ```

---

## QO-007: No Backend Test Verifies FR-WF-013 Prometheus Metrics

- **Severity:** P4
- **Category:** test-coverage
- **File:** `Source/Backend/tests/routes/metrics.test.ts`
- **Detail:**  
  The metrics test file carries `// Verifies: FR-dependency-metrics` but has no assertion covering the four FR-WF-013 counters:
  - `workflow_items_created_total`
  - `workflow_items_routed_total`
  - `workflow_items_assessed_total`
  - `workflow_items_dispatched_total`
  
  The counters are defined in `Source/Backend/src/metrics.ts` and incremented in services, but no test verifies they appear at `GET /metrics` or that they increment on workflow operations.

- **Recommendation:**  
  Add test cases to `metrics.test.ts`:
  ```ts
  // Verifies: FR-WF-013 — workflow_items_created_total increments on POST /api/work-items
  it('increments workflow_items_created_total on create', async () => { ... })
  ```

---

## Architecture Rules Compliance Summary

| Rule | Status |
|------|--------|
| Specs are source of truth | ⚠️ Partial — Plans traced; Specifications/ not traced |
| No direct store calls from route handlers | ❌ Violated — 3 route files call store directly |
| Shared types are single source of truth | ✅ Pass — types imported from `Source/Shared/` |
| Every FR needs a `// Verifies:` test | ⚠️ Partial — Plans FRs covered; Spec FRs uncovered |
| No hardcoded secrets/URLs | ⚠️ Minor — debug page fallback localhost URL |
| All list endpoints return `{data: T[]}` | ✅ Pass — checked workItems and dashboard routes |
| New routes have observability | ✅ Pass — structured logging via `logger` in all routes |
| Business logic has no framework imports | ❌ Partial — approve/reject/dispatch in route handlers |
| Never swallow errors silently | ✅ Pass — all catch blocks log or re-throw; DependencyPicker intentional suppression is documented |

---

## JSON Summary

```json
{
  "audit_date": "2026-09-10",
  "auditor": "quality-oracle",
  "spec_coverage_percent": 13,
  "spec_coverage_detail": {
    "plans_self_judging_workflow": "13/13 (100%)",
    "specifications_dev_workflow_platform": "0/74 (0%)",
    "specifications_tiered_merge_pipeline": "0/10 (0%)"
  },
  "grade": "C",
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "Routes bypass service layer for CRUD and workflow state changes"},
    {"id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer blind spot — 84 spec FRs untraced"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "dev-workflow-platform.md describes unimplemented product (74 FRs untraced)"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "tiered-merge-pipeline.md unimplemented, E2E suite empty"},
    {"id": "QO-005", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressions without justification"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "Hardcoded fallback localhost URL in production component"},
    {"id": "QO-007", "severity": "P4", "category": "test-coverage", "title": "No backend test verifies FR-WF-013 Prometheus workflow metrics"}
  ],
  "p1_count": 2,
  "p2_count": 2,
  "p3_count": 2,
  "p4_count": 1,
  "escalations": []
}
```
