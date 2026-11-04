---

## Quality Oracle Findings

### Spec Coverage: ~13% (enforcer gate: 100% for active plan only)

| Source | FRs | Implemented | Coverage |
|--------|-----|-------------|----------|
| `Specifications/dev-workflow-platform.md` | 76 | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` | 13 | 0 | **0%** |
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | **100%** |
| `FR-dependency-*` in source (unanchored) | 27 | — | **unverifiable** |

---

### QO-001: Specification Folder Superseded but Not Archived — P1

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (76 FRs: FR-001 through FR-049+)
- **Detail:** `Specifications/` describes a Feature Request / Bug Report / Development Cycle platform. The actual implementation is a Self-Judging Workflow Engine (`Plans/self-judging-workflow`). Zero source files contain `// Verifies: FR-001` through `// Verifies: FR-049`. Running the enforcer against this file: `TRACEABILITY FAILURE: 76 requirements lack implementation`. The old spec was never archived, superseded, or updated.
- **Recommendation:** Either (a) archive `dev-workflow-platform.md` with an `[SUPERSEDED]` header and date, or (b) if it represents future work, create a plan for it and move all FRs into `Plans/`. Stale specs mislead every team member about system state.
- **Cross-ref:** TheATeam (spec authoring), requirements-reviewer

---

### QO-002: 27 `FR-dependency-*` Traceability IDs Are Unanchored — P1

- **Severity:** P1
- **Category:** spec-drift
- **File:** Multiple — `Source/Backend/src/metrics.ts`, `Source/Frontend/src/api/client.ts`, `Source/Frontend/src/components/*.tsx`
- **Detail:** Source code contains 27 unique `// Verifies: FR-dependency-*` IDs (e.g. `FR-dependency-service`, `FR-dependency-picker`, `FR-dependency-dispatch-gating`). These IDs exist in **no spec file and no plan requirements.md**. The traceability enforcer cannot validate them. These are ghost references — untestable and unauditable.
- **Recommendation:** Create `Plans/dependency-linking/requirements.md` (or similar) with formal FR entries for every `FR-dependency-*` ID. Run the enforcer against it. This converts ghost references into verifiable traceability.
- **Cross-ref:** TheFixer (code alignment)

---

### QO-003: Traceability Enforcer Scope Mismatch — P2

- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer resolves the most-recently-modified `Plans/*/requirements.md` file. It **never scans** `Specifications/`. The CI verification gate (`python3 tools/traceability-enforcer.py`) passes green while 76 spec requirements have zero coverage. `CLAUDE.md` says "Verification gates" include this enforcer, creating a false sense of traceability compliance.
- **Recommendation:** Extend the enforcer to also scan all `Specifications/*.md` files, OR document clearly in `CLAUDE.md` that the enforcer is plan-scoped (not spec-scoped) so agents don't conflate them.
- **Cross-ref:** TheFixer

---

### QO-004: Route Handlers Access Store Directly — P2

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `Source/Backend/src/routes/workflow.ts:15`, `Source/Backend/src/routes/intake.ts:4`
- **Detail:** All three route files `import * as store from '../store/workItemStore'` and call store methods directly (e.g. `store.createWorkItem(...)`, `store.findById(...)`, `store.softDelete(...)`). CLAUDE.md architecture rule: **"No direct DB calls from route handlers — use the service layer."** There is no service-layer intermediary for CRUD operations — only `workflow.ts` partially delegates to `router.ts` and `assessment.ts` services.
- **Recommendation:** Create a `WorkItemService` module in `Source/Backend/src/services/workItemService.ts` that wraps store operations, and update route handlers to call it. Route handlers should contain only HTTP concern logic (request parsing, response formatting, status codes).
- **Cross-ref:** TheFixer → backend-coder

---

### QO-005: `Specifications/tiered-merge-pipeline.md` FRs Have Zero Implementation — P2

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 through FR-TMP-010 + FR-1, FR-2, FR-3)
- **Detail:** This spec defines 13 requirements for a tiered merge pipeline (risk classification, Playwright E2E generation, auto-PR creation, AI PR review, auto-merge). Running the enforcer: `TRACEABILITY FAILURE: 13 requirements lack implementation`. Unlike `dev-workflow-platform.md`, this appears to be active pipeline work, not a legacy spec.
- **Recommendation:** Determine if this spec is active work-in-progress or future-planned. If active, create a plan in `Plans/tiered-merge-pipeline/` with a `requirements.md` to bring it under enforcer coverage. If planned-future, add an `[ACTIVE - IN PROGRESS]` / `[FUTURE]` header.
- **Cross-ref:** TheATeam

---

### QO-006: OpenTelemetry Tracing Not Implemented — P2

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/app.ts` (entry point)
- **Detail:** CLAUDE.md architecture rule: *"Use OpenTelemetry for distributed tracing; auto-instrument HTTP, database, and framework calls; propagate W3C `traceparent` header across service boundaries."* Zero OpenTelemetry code exists in `Source/`. The app has Prometheus metrics and structured logging but no distributed tracing.
- **Recommendation:** Install `@opentelemetry/sdk-node` and instrument `app.ts` with auto-instrumentation for HTTP routes. Add traceparent header propagation middleware. This is a mandatory architecture rule.
- **Cross-ref:** TheFixer → backend-coder

---

### QO-007: Missing Tests for 4 Frontend Components — P3

- **Severity:** P3
- **Category:** untested
- **Files:** `Source/Frontend/src/components/Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`
- **Detail:** `Source/Frontend/tests/components/` only contains `BlockedBadge.test.tsx`, `DependencyPicker.test.tsx`, `DependencySection.test.tsx`. Four components have no corresponding tests. All four were modified within the last 14 days.
- **Recommendation:** Add unit tests for each component. At minimum test rendering with different prop values and that badge text/classes match expected output.
- **Cross-ref:** TheFixer → frontend-coder

---

### QO-008: `eslint-disable` Suppressions in Production Code — P3

- **Severity:** P3
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both suppress `react-hooks/exhaustive-deps`. Disabling this rule without explanation can mask stale-closure bugs where effect callbacks don't re-run when their dependencies change.
- **Recommendation:** Audit each suppression — either fix the effect to properly declare dependencies (using `useCallback` or restructuring), or add an inline comment explaining why suppression is intentional (and safe).
- **Cross-ref:** TheFixer → frontend-coder

---

### JSON Summary

```json
{
  "audit_date": "2026-11-04",
  "grade": "D",
  "spec_coverage": {
    "active_plan_pct": 100,
    "specifications_pct": 0,
    "overall_pct": 13,
    "total_spec_frs": 89,
    "unanchored_fr_ids": 27
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Specifications/ folder superseded but not archived", "file": "Specifications/dev-workflow-platform.md" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "27 FR-dependency-* IDs unanchored in any spec or plan", "file": "Source/Backend/src/metrics.ts" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "Traceability enforcer scope mismatch (plan-only, not spec-aware)", "file": "tools/traceability-enforcer.py" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "Route handlers call workItemStore directly (no service layer)", "file": "Source/Backend/src/routes/workItems.ts:12" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "tiered-merge-pipeline.md 13 FRs unimplemented", "file": "Specifications/tiered-merge-pipeline.md" },
    { "id": "QO-006", "severity": "P2", "category": "architecture-violation", "title": "OpenTelemetry tracing absent (architecture rule)", "file": "Source/Backend/src/app.ts" },
    { "id": "QO-007", "severity": "P3", "category": "untested", "title": "4 frontend components lack any test file", "file": "Source/Frontend/src/components/Layout.tsx" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressions in production source", "file": "Source/Frontend/src/hooks/useWorkItems.ts:63" }
  ],
  "p1_count": 2,
  "p2_count": 4,
  "p3_count": 2,
  "escalations": [],
  "enforcer_result": "PASS (plan-scoped) / FAIL (spec-scoped: 76+13 missing)"
}
```

---

**Overall Grade: D** — 2 P1s and spec coverage at 13% (threshold for C is max 2 P1s AND 40% coverage; spec coverage fails).

> **Context note:** The P1s are documentation/tooling debt, not runtime failures. The active plan (FR-WF-001–013) is 100% traced and passing. Grade would be **B** if the stale Specifications/ files are properly archived and the FR-dependency-* IDs are anchored to a plan.
