---

## Quality Oracle Findings

### Spec Coverage

| Spec | FRs | Traced | Coverage |
|------|-----|--------|----------|
| `workflow-engine.md` — FR-WF-001–013 | 13 | 13 | **100%** ✅ |
| `tiered-merge-pipeline.md` — FR-TMP-001–010 | 10 | 10 (in `platform/`) | 100%\* |
| `dev-workflow-platform.md` — FR-dependency-\* | 16 | 13 | **81%** ⚠️ |

\* Implemented in `platform/orchestrator/lib/`, confirmed by QA reports and test file; not covered by the automated enforcer scan.

**Enforcer gate result:** `python3 tools/traceability-enforcer.py` → **PASS** (13/13 FR-WF-* requirements)

---

### QO-001 — Direct Store Access from Route Handlers
- **Severity:** P2
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/intake.ts`
- **Detail:** All three route files `import * as store from '../store/workItemStore'` and call store functions (`createWorkItem`, `findAll`, `findById`, `updateWorkItem`, `softDelete`) directly from request handlers. CLAUDE.md rule: **"No direct DB calls from route handlers — use the service layer."** `workItems.ts` does this for *all* its operations with no service intermediary whatsoever. `workflow.ts` mixes service calls with direct store reads/writes. `intake.ts` creates work items directly via store.
- **Failure scenario:** Any future addition of cross-cutting logic (caching, validation, audit) at the service layer won't apply to these routes because they bypass it entirely. Technical debt accumulates silently.
- **Recommendation:** Extract a `workItemService.ts` (or promote `workItemStore` to a service module) that all routes call. Route handlers should only handle HTTP concerns.
- **Cross-ref:** TheFixer

---

### QO-002 — FR-dependency-api-types: `as any` Casts + Missing `blocked_by` in API Types
- **Severity:** P2
- **Category:** spec-drift
- **Files:** `portal/Shared/api.ts` (line 32–38 `UpdateFeatureRequestInput`, line 59–67 `UpdateBugInput`); `portal/Frontend/src/components/shared/DependencyPicker.tsx` (lines 291, 293)
- **Detail:** The dependency-linking plan (FR-dependency-api-types) requires `blocked_by?: string[]` to be added to `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts`. Neither interface has this field today. As a result, `DependencyPicker.tsx` resorts to `as any` casts on lines 291/293 to satisfy TypeScript. The plan's own implementation-delta table marks this **❌ Missing**.
- **Failure scenario:** A future type-check pass will not catch invalid `blocked_by` payloads because the type is suppressed. Any refactor of the PATCH body will silently break the picker.
- **Recommendation:** Add `blocked_by?: string[]` to both `UpdateFeatureRequestInput` and `UpdateBugInput`; remove both `as any` casts.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003 — FR-dependency-seed: No Seed File in portal/Backend
- **Severity:** P2
- **Category:** spec-drift
- **Files:** `portal/Backend/src/database/` (file `seed.ts` missing entirely)
- **Detail:** FR-dependency-seed requires an idempotent seed function at `portal/Backend/src/database/seed.ts` that inserts 4 known dependency relationships (BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003). The `portal/Backend/src/database/` directory contains only `connection.ts` and `schema.ts`. Plan delta marks this **❌ Missing**.
- **Failure scenario:** On fresh DB setup the dependency graph is empty; the demo data documented in specs is absent; manual QA and any demo walkthrough will not show the intended blocked relationships.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` per spec; wire into `portal/Backend/src/index.ts` startup.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-004 — FR-dependency-frontend-tests: Missing Component Tests in Portal
- **Severity:** P2
- **Category:** untested
- **Files:** `portal/Frontend/tests/` (missing `DependencySection.test.tsx`, `BlockedBadge.test.tsx`)
- **Detail:** FR-dependency-frontend-tests requires both `DependencySection.test.tsx` and `BlockedBadge.test.tsx`. Only `DependencyPicker.test.tsx` exists. These two components (`portal/Frontend/src/components/shared/DependencySection.tsx`, `BlockedBadge.tsx`) have **zero test coverage**. Plan delta marks this **❌ Missing**.
- **Failure scenario:** Regressions in the DependencySection or BlockedBadge components will go undetected until UI testing. The `pending_dependencies` highlight logic and badge color decisions are completely unverified.
- **Recommendation:** Create the two test files with `// Verifies:` comments per plan assignment.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-005 — Tiered Merge Pipeline FRs Not Covered by Enforcer Automation
- **Severity:** P3
- **Category:** spec-drift
- **Files:** `Specifications/tiered-merge-pipeline.md`, `tools/traceability-enforcer.py`
- **Detail:** FR-TMP-001 through FR-TMP-010 are implemented in `platform/orchestrator/lib/workflow-engine.js` with `// Verifies: FR-TMP-XXX` comments confirmed in `platform/orchestrator/lib/workflow-engine.test.js`. However, the traceability enforcer auto-selects `Plans/self-judging-workflow/requirements.md` (most recently modified) and **never scans `platform/`**. The enforcer's source dirs config is `['Source', 'E2E']` — it cannot see platform/. There is no `Plans/tiered-merge-pipeline/requirements.md` for the enforcer to target.
- **Failure scenario:** If a TMP feature is deleted or refactored out of platform/, the enforcer will not catch the regression. A future audit relying solely on the green enforcer output will miss this blind spot.
- **Recommendation:** Either (a) add a `Plans/tiered-merge-pipeline/requirements.md` and extend the enforcer's scan dirs to include `platform/`, or (b) add a `Makefile` target that runs the enforcer against each plan explicitly.
- **Cross-ref:** [ESCALATE → TheFixer for enforcer config]

---

### QO-006 — eslint-disable Suppression in Production Hook
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** `// eslint-disable-next-line react-hooks/exhaustive-deps` suppresses the exhaustive-deps rule in the `useCallback` dependency array. The surrounding code explicitly lists individual filter fields rather than the whole `filters` object — this is a deliberate optimization to avoid re-renders, but the suppression comment provides no documentation of why the rule is intentionally violated.
- **Recommendation:** Add an inline comment explaining the intent (e.g. `// Deliberately omitting 'filters' object identity — only primitive filter values matter`) so future maintainers don't accidentally add a dependency that reintroduces the stale-closure problem.

---

### JSON Summary

```json
{
  "audit_date": "2026-09-20",
  "grade": "B",
  "spec_coverage": {
    "workflow_engine": "100%",
    "tiered_merge_pipeline": "100% (not enforced by tool)",
    "dependency_linking": "81%"
  },
  "enforcer_result": "PASS",
  "findings": [
    {"id": "QO-001", "severity": "P2", "category": "architecture-violation", "status": "OPEN"},
    {"id": "QO-002", "severity": "P2", "category": "spec-drift", "status": "OPEN"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "status": "OPEN"},
    {"id": "QO-004", "severity": "P2", "category": "untested", "status": "OPEN"},
    {"id": "QO-005", "severity": "P3", "category": "spec-drift", "status": "OPEN"},
    {"id": "QO-006", "severity": "P4", "category": "pattern-violation", "status": "OPEN"}
  ],
  "p1_count": 0,
  "p2_count": 4,
  "p3_count": 1,
  "p4_count": 1,
  "positives": [
    "No console.log in production source",
    "No hardcoded secrets",
    "No empty catch blocks",
    "No files > 500 lines",
    "Enforcer PASS on current active plan",
    "Structured logging and Prometheus metrics present throughout Source/"
  ]
}
```

---

**Grade: B** — 0 P1s, 4 P2s, within the B-band threshold (≤8 P2s). Spec coverage for the active Source/ codebase is 100%. The four P2s are all in the portal/ codebase's dependency-linking backlog, confirmed open by the plan's own implementation-delta table. The architecture violation (QO-001) is the most actionable item for the next TheFixer cycle.
