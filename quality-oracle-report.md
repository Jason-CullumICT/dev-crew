---

## Quality Oracle Findings

### Spec Coverage: 100% (enforcer scope) / ~16% (full Specifications/ scope)

| Scope | Total FRs | Traced | % |
|-------|-----------|--------|---|
| Active plan (FR-WF-001–013) | 13 | 13 | **100%** |
| All Specifications/ FRs | ~82 | ~13 | **~16%** |

**Note:** The ~82 Specifications/ FRs mostly describe the `portal/` system (dev-workflow-platform.md targets `portal/Backend`, `portal/Shared`), **not** `Source/`. Only the self-judging workflow plan (FR-WF-\*) targets `Source/`. Spec coverage of Source/ is therefore **100% on its correct scope**.

---

### QO-001: FR-dependency-\* Traceability in Source/ Is Misattributed to the portal/ System Spec
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/services/dependency.ts:1`
- **Detail:** `Plans/dependency-linking/requirements.md` and `Specifications/dev-workflow-platform.md` both define FR-dependency-\* requirements for **`portal/Backend`** and **`portal/Shared`** (e.g., `portal/Backend/src/services/dependencyService.ts`). However, `Source/Backend/src/services/dependency.ts`, `Source/Shared/types/workflow.ts`, and their tests all claim `// Verifies: FR-dependency-service`, `FR-dependency-dispatch-gating`, `FR-dependency-types`, etc. The Source/ dependency subsystem has **no spec of its own** — it's an unspecified port of the portal/ feature that borrows the portal/ FR IDs, causing the traceability enforcer to report a false pass for those IDs.
- **Recommendation:** Either (a) add a new plan section under `Plans/dependency-linking/` that explicitly targets `Source/` paths and assign new FR IDs, or (b) add an explicit note in `Plans/dependency-linking/requirements.md` that FR-dependency-\* also apply to Source/ (with a scope clarification). Without this, the traceability enforcement for the dependency subsystem in Source/ is semantically meaningless.
- **Cross-ref:** Requirements Reviewer; TheFixer if spec authoring needed

---

### QO-002: Architecture Rule Violation — Route Handlers Directly Access workItemStore
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:12`, `routes/workflow.ts:15`, `routes/intake.ts:4`
- **Detail:** CLAUDE.md Architecture Rule: *"No direct DB calls from route handlers — use the service layer."* All three route files `import * as store from '../store/workItemStore'` and call `store.createWorkItem()`, `store.findAll()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()` directly. Business logic (pagination computation, field filtering, validation) is embedded in route handlers rather than in service functions. The store is the persistence layer; routes should only call service functions.
- **Recommendation:** Extract store interactions into service functions (e.g., `workItemService.ts`) and update route handlers to call `workItemService.create()`, `workItemService.list()`, etc. The `changeHistory` and `dependency` services already show the correct pattern.
- **Failure scenario:** Any route handler that validates input, interacts with the store, and emits a metric in the same function cannot be unit-tested without spinning up Express. A service function can be tested independently.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-003: Silent Error Suppression in Frontend API Client
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** The `request<T>()` helper contains `.catch(() => ({}))` — when `response.json()` fails (server returns HTML, truncated body, network error), the JSON parse error is silently discarded and replaced with an empty object `{}`. The thrown error then falls back to the generic `Request failed: ${response.status}` message. CLAUDE.md: *"Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."* This suppression has no comment explaining the intent.
- **Recommendation:** Add a comment: `// JSON parse may fail if server returns non-JSON (e.g., HTML error page); fall back to generic status message` and optionally log the original parse error at debug level.
- **Failure scenario:** Server returns a 503 with an HTML load-balancer error page. The catch silently discards the parse failure; the user sees "Request failed: 503" with no diagnostic detail.

---

### QO-004: Missing Test Files for 4 Production Frontend Components
- **Severity:** P3
- **Category:** test-coverage
- **File:** `Source/Frontend/src/components/PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `Source/Frontend/src/pages/DebugPortalPage.tsx`
- **Detail:** All four files were modified in the last 14 days and have zero corresponding test files. The test directory has coverage for `BlockedBadge`, `DependencyPicker`, `DependencySection` (components) and `WorkItemDetailPage`, `WorkItemListPage` (pages), but the three badge components and the DebugPortalPage are untested. FR-WF-011 (detail page) indirectly depends on PriorityBadge/StatusBadge/TypeBadge rendering correctly.
- **Recommendation:** Add `Source/Frontend/tests/components/PriorityBadge.test.tsx`, `StatusBadge.test.tsx`, `TypeBadge.test.tsx` with snapshot or value-to-label render tests; add a smoke test for `DebugPortalPage.tsx`. Each test should carry a `// Verifies: FR-WF-011` or similar comment.

---

### QO-005: Disabled Lint Rules in Production Source (react-hooks/exhaustive-deps)
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two `eslint-disable-next-line react-hooks/exhaustive-deps` comments suppress hook dependency exhaustiveness checks in production code. These are often correct suppressions (e.g., when a callback intentionally closes over a stable ref), but without an explanatory comment the reader cannot determine whether the suppression is safe or masks a stale-closure bug.
- **Recommendation:** Add a comment on each disabled line explaining *why* the dependency is intentionally excluded. Example: `// eslint-disable-next-line react-hooks/exhaustive-deps -- fetchFn is stable; re-running on every render would cause infinite loop`.

---

### QO-006: Traceability Enforcer Has No Visibility Into Specifications/ Directory
- **Severity:** P3
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-selects the most recently modified `requirements.md` under `Plans/`. It never reads `Specifications/`. This means if a Specification is updated with new FRs targeting Source/ (not portal/), those FRs will never be validated by the enforcer unless a corresponding plan file exists. Currently this is acceptable (all Source/-targeted FRs are in Plans/self-judging-workflow/), but the gap will widen as the platform grows.
- **Recommendation:** Add a comment in the enforcer's header documenting this scope limitation. Consider a `--spec-dir` flag that scans `Specifications/` for FRs labeled `[backend]` or `[frontend]` targeting Source/.

---

### JSON Summary

```json
{
  "audit_date": "2026-10-21",
  "grade": "A",
  "spec_coverage": {
    "active_plan_frs": 13,
    "active_plan_traced": 13,
    "active_plan_pct": 100,
    "note": "FR-dependency-* traceability in Source/ is misattributed (P2); portal/ FRs are out of Source/ scope"
  },
  "findings": [
    {
      "id": "QO-001",
      "severity": "P2",
      "category": "spec-drift",
      "title": "FR-dependency-* in Source/ misattributes portal/ system spec IDs",
      "file": "Source/Backend/src/services/dependency.ts"
    },
    {
      "id": "QO-002",
      "severity": "P2",
      "category": "architecture-violation",
      "title": "Route handlers directly import and call workItemStore (bypasses service layer)",
      "files": ["Source/Backend/src/routes/workItems.ts", "routes/workflow.ts", "routes/intake.ts"]
    },
    {
      "id": "QO-003",
      "severity": "P2",
      "category": "architecture-violation",
      "title": "Silent JSON parse error suppression in api/client.ts",
      "file": "Source/Frontend/src/api/client.ts:26"
    },
    {
      "id": "QO-004",
      "severity": "P3",
      "category": "test-coverage",
      "title": "4 production frontend components have no test files",
      "files": ["PriorityBadge.tsx", "StatusBadge.tsx", "TypeBadge.tsx", "DebugPortalPage.tsx"]
    },
    {
      "id": "QO-005",
      "severity": "P3",
      "category": "pattern-violation",
      "title": "eslint-disable-next-line without explanatory comments in production source",
      "files": ["useWorkItems.ts:63", "DependencyPicker.tsx:82"]
    },
    {
      "id": "QO-006",
      "severity": "P3",
      "category": "spec-drift",
      "title": "Traceability enforcer does not scan Specifications/ directory",
      "file": "tools/traceability-enforcer.py"
    }
  ],
  "p1_count": 0,
  "p2_count": 3,
  "p3_count": 3,
  "p4_count": 0
}
```

---

**Grade: A** — 0 P1s, 3 P2s (≤3 threshold), 100% active-plan spec coverage (≥80% threshold).

The three P2s are worth routing to **TheFixer** (QO-002, QO-003) and the **Requirements Reviewer** (QO-001) as near-term work items. The P3s can be backlogged.
