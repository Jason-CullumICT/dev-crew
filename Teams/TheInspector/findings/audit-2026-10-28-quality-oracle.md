# Quality Oracle Audit — 2026-10-28

## Spec Coverage Summary

| Spec Document | FRs Defined | FRs Traced to Source | Coverage |
|---|---|---|---|
| `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md` | 13 (FR-WF-001 – FR-WF-013) | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` (portal: FR-001 – FR-069 + FR-dependency-*) | ~85 | ~82 | **~96%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 – FR-TMP-010) | 10 | **0** | **0%** |
| **Overall** | **~108** | **~95** | **~88%** |

> **Enforcer blind spot**: `tools/traceability-enforcer.py` only validates the most-recently-modified plan (13 FR-WF-* items in `Source/`). It never scans `portal/` and never covers FR-001 – FR-069 or FR-TMP-*. The PASS result is misleading.

---

## Findings

### QO-001: Traceability Enforcer Scope Is Too Narrow — Gives False PASS
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py` + `Teams/TheInspector/inspector.config.yml`
- **Detail:** The enforcer auto-selects the *most recently modified* `requirements.md` (currently `Plans/self-judging-workflow/requirements.md`) and scans only `Source/` and `E2E/`. It never reads `Specifications/dev-workflow-platform.md` (FR-001 – FR-069), never scans `portal/`, and never covers `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 – FR-TMP-010). It reports **TRACEABILITY PASSED** while ~13 open requirements and an entire spec document have zero coverage checks. This gives the team a false signal that all specs are traced.
- **Recommendation:** Extend the enforcer to (a) accept multiple scan targets, (b) add `portal/` to the scan dirs list in `inspector.config.yml`, and (c) register `Specifications/dev-workflow-platform.md` and `Specifications/tiered-merge-pipeline.md` as additional requirement sources.
- **Cross-ref:** QO-004 (FR-TMP gap), QO-002 (api-types/seed/test gaps)

---

### QO-002: Three FR-dependency Requirements Still Open in `portal/`
- **Severity:** P2
- **Category:** spec-drift
- **Files:**
  - `portal/Backend/src/database/seed.ts` — does not exist
  - `portal/Frontend/src/components/shared/DependencyPicker.tsx:291-293` — uses `as any` cast
  - `portal/Frontend/tests/DependencySection.test.tsx` — does not exist
  - `portal/Frontend/tests/BlockedBadge.test.tsx` — does not exist
- **Detail:** `Plans/dependency-linking/requirements.md` itself documents three outstanding items as ❌:
  1. **FR-dependency-seed** — `portal/Backend/src/database/seed.ts` is absent; no idempotent seed for the 8 known dependency relationships (BUG-0010 blockers, FR-0004/-0005/-0007 blockers). Portal startup does not seed dependency data.
  2. **FR-dependency-api-types** — `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts` lack `blocked_by?: string[]`. The `DependencyPicker` works around this with `as any` casts at lines 291 and 293, making the PATCH call unsafe for TypeScript refactoring.
  3. **FR-dependency-frontend-tests** — `DependencySection.test.tsx` and `BlockedBadge.test.tsx` do not exist in `portal/Frontend/tests/`. Only `DependencyPicker.test.tsx` is present.
- **Recommendation:** Route to **TheFixer**: create `seed.ts`, add `blocked_by` to both input types (removes the `as any`), write the two missing test files. All are small-scope (S/M weight per the plan).
- **Cross-ref:** QO-001

---

### QO-003: Architecture Violation — Route Handlers Call Store Directly
- **Severity:** P2
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/routes/workItems.ts:12` — `import * as store from '../store/workItemStore'`
  - `Source/Backend/src/routes/workflow.ts:15` — `import * as store from '../store/workItemStore'`
  - `Source/Backend/src/routes/intake.ts:4` — `import * as store from '../store/workItemStore'`
- **Detail:** The architecture rule "No direct DB calls from route handlers — use the service layer" is violated by all three route files. They import and call `workItemStore` functions (`createWorkItem`, `findWorkItemById`, `updateWorkItem`, `deleteWorkItem`) directly without going through a service module. Business logic (e.g., input validation, status transitions, metric increments) is also scattered across route handlers instead of residing in services.
- **Recommendation:** Extract a `workItemService.ts` (and potentially an `intakeService.ts`) that mediates between routes and the store. Routes should only parse HTTP input, delegate to services, and serialize responses.
- **Cross-ref:** QO-001

---

### QO-004: FR-TMP-001 – FR-TMP-010 Have Zero Implementation Traceability
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** The tiered-merge-pipeline spec defines 10 functional requirements (FR-TMP-001: Risk Classification, FR-TMP-002: Playwright E2E Test Generation, FR-TMP-003: Live Playwright E2E Runner, FR-TMP-004: Auto-PR Creation, FR-TMP-005: AI PR Review, FR-TMP-006: Auto-Merge Logic, FR-TMP-007: Configuration, FR-TMP-008: Worker Container Prerequisites, FR-TMP-009: Run JSON Extensions, FR-TMP-010: Error Handling). A search across all source directories (`Source/`, `portal/`, `platform/`, `tools/`) returns zero `// Verifies: FR-TMP-*` references. It is unclear whether these requirements are intentionally deferred (no implementation planned yet) or silently abandoned.
- **Recommendation:** Triage this spec: either (a) mark it as `status: deferred` in the document header and add a note to CLAUDE.md, or (b) create a Plan entry for it to begin tracing. If any FR-TMP items are already implemented in `platform/`, add traceability comments and register the scan dir with the enforcer.
- **Cross-ref:** QO-001

---

### QO-005: Traceability Comment Naming Inconsistency in `portal/Backend/tests/`
- **Severity:** P3
- **Category:** spec-drift / test-coverage
- **File:** `portal/Backend/tests/dependencies.test.ts`
- **Detail:** The portal dependency tests use non-canonical FR identifiers:
  - `FR-dependency-cycle-detection` (not in any spec — closest is `FR-dependency-service`)
  - `FR-dependency-linking` (not in spec — should be `FR-dependency-endpoints` or `FR-dependency-service`)
  - `FR-dependency-ready-check` (not in spec — should be `FR-dependency-endpoints`)
  These non-canonical IDs will not match spec requirement lookups and break traceability cross-referencing.
- **Recommendation:** Standardize all `// Verifies:` comments to the canonical IDs defined in `Specifications/dev-workflow-platform.md` and `Plans/dependency-linking/requirements.md`. Replace `FR-dependency-cycle-detection` → `FR-dependency-service`, `FR-dependency-linking` → `FR-dependency-service`, `FR-dependency-ready-check` → `FR-dependency-endpoints`.
- **Cross-ref:** QO-001

---

### QO-006: `eslint-disable` Suppressing React Hook Dependency Warning
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** The `useEffect` hook uses `// eslint-disable-next-line react-hooks/exhaustive-deps` to suppress a linting rule. The disable is intentional (the array manually enumerates specific filter fields to avoid re-running on every object identity change), and the implementation is technically correct. However, the suppress is undocumented — there is no comment explaining why the object reference isn't used directly. Future refactoring that adds a new field to `WorkItemFilters` without updating the dependency array would silently miss re-fetches.
- **Recommendation:** Add an inline comment above the disable explaining the deliberate pattern (e.g., `// Manual dep list: filters object identity changes on every render; enumerate fields to avoid infinite loop`). Consider using `useDeepCompareEffect` from a utility package as a cleaner alternative.

---

### QO-007: Duplicate Test File for WorkItemDetailPage
- **Severity:** P3
- **Category:** test-coverage
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx`
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- **Detail:** Two separate test files cover the same component (`WorkItemDetailPage`). Both carry `// Verifies: FR-WF-011` traceability. The root-level file has 21 test cases; the `pages/` subdirectory file has 18 test cases. There is significant overlap (loading state, header fields, action buttons, assessments, history). Duplicate tests increase maintenance burden and can mask regressions when one version is updated but not the other.
- **Recommendation:** Merge into a single authoritative test file at `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (the more organized location). Verify there are no unique cases in the root-level file before deleting it.

---

## JSON Summary

```json
{
  "audit_date": "2026-10-28",
  "auditor": "quality-oracle",
  "spec_coverage": {
    "workflow_engine": { "total": 13, "traced": 13, "pct": 100 },
    "dev_workflow_platform": { "total": 85, "traced": 82, "pct": 96 },
    "tiered_merge_pipeline": { "total": 10, "traced": 0, "pct": 0 },
    "overall": { "total": 108, "traced": 95, "pct": 88 }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Enforcer scope too narrow — false PASS" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "3 FR-dependency items open in portal/" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Route handlers import store directly" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-001–010 have zero traceability" },
    { "id": "QO-005", "severity": "P3", "category": "spec-drift", "title": "Non-canonical FR IDs in portal/Backend/tests/dependencies.test.ts" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "Undocumented eslint-disable in useWorkItems.ts" },
    { "id": "QO-007", "severity": "P3", "category": "test-coverage", "title": "Duplicate WorkItemDetailPage test files" }
  ],
  "grade": "B",
  "p1_count": 1,
  "p2_count": 3,
  "p3_count": 3,
  "escalations": []
}
```
