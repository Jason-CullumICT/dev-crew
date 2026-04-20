Now the full report:

---

## Quality Oracle Findings

**Audit date:** 2026-04-20  
**Project:** dev-crew Source App (Self-Judging Workflow Engine)  
**Config:** `Teams/TheInspector/inspector.config.yml`  
**Traceability enforcer target:** `Plans/self-judging-workflow/requirements.md` (FR-WF-001 – FR-WF-013)

---

### Spec Coverage Summary

| Scope | Requirements | Traced | Coverage |
|---|---|---|---|
| `Plans/self-judging-workflow` (enforcer target) | 13 | 13 | **100%** ✅ |
| `FR-dependency-*` (in Source) | ~16 | ~16 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` | 76 | 0 | **0%** ❌ |
| `Specifications/tiered-merge-pipeline.md` | 13 | 0 | **0%** ❌ |
| **All Specifications combined** | **~105** | **~29** | **~28%** |

The enforcer reports green because it only sees `Plans/` requirements. The full Specifications/ universe tells a very different story.

---

### QO-001: Traceability Enforcer Blind to Specifications/ Directory
- **Severity:** P1
- **Category:** spec-drift / governance-failure
- **File:** `tools/traceability-enforcer.py` (auto-detect logic, line ~30); `Specifications/dev-workflow-platform.md` (76 FRs); `Specifications/tiered-merge-pipeline.md` (13 FRs)
- **Detail:** The enforcer's auto-detect logic finds only the most recently modified `requirements.md` under `Plans/`. It never scans `Specifications/`. Running it manually against the actual specs confirms the scope:
  ```
  python3 tools/traceability-enforcer.py --file Specifications/dev-workflow-platform.md
  → TRACEABILITY FAILURE: 76 requirements lack implementation!  (FR-001 … FR-069)

  python3 tools/traceability-enforcer.py --file Specifications/tiered-merge-pipeline.md
  → TRACEABILITY FAILURE: 13 requirements lack implementation!  (FR-TMP-001 … FR-TMP-010)
  ```
  The built system implements the smaller *workflow engine* (FR-WF-001–013) from `Plans/`, not the larger *dev-workflow-platform* (FR-001–069) in `Specifications/`. This is a valid scope decision — but the verification gate is **structurally blind to it**, creating a false green signal in CI.
- **Recommendation:** Either (a) add a `Specifications/` scan mode to the enforcer with an explicit `NOT_STARTED` status for unimplemented specs, or (b) add a `status: not_started` marker to `Specifications/` docs indicating they are post-MVP. The gate must distinguish "not yet implemented" from "silently missing".
- **Cross-ref:** Affects all pipeline agents — any QA agent that trusts the enforcer's green exit code is misled.

---

### QO-002: Route Handlers Bypass Service Layer
- **Severity:** P2
- **Category:** architecture-violation
- **Files:** `Source/Backend/src/routes/workItems.ts` (lines 44, 73, 79, 89, 134, 142), `Source/Backend/src/routes/workflow.ts` (lines 44, 71, 99, 119, 155, 175, 217, 269, 317, 359), `Source/Backend/src/routes/intake.ts` (lines 19, 42)
- **Detail:** Architecture rule: *"No direct DB calls from route handlers — use the service layer."* Route handlers make 20+ direct calls to `store.*` (the data layer) without going through a service. Examples:
  - `workItems.ts:73` — `store.findAll()` directly in GET list handler
  - `workflow.ts:119` — `store.updateWorkItem()` directly in `/approve` handler
  - `intake.ts:19,42` — `store.createWorkItem()` directly
  
  Only `dashboard.ts` delegates cleanly to `dashboardService`. Business rules are entangled in route handlers, making unit testing routes harder and coupling HTTP concerns to storage concerns.
- **Recommendation:** Introduce thin service functions for CRUD operations in `workItemStore.ts` that route handlers call. The existing pattern in `assessment.ts` and `router.ts` is correct — apply it to CRUD paths too. Route to `TheFixer`.
- **Cross-ref:** QO-001 (FR-WF-002 covers CRUD but the architecture violation is structural)

---

### QO-003: `GET /api/search` Not Wired in App Entry Point
- **Severity:** P2
- **Category:** spec-drift (unimplemented endpoint)
- **File:** `Source/Backend/src/app.ts` (missing route mount); `Source/Frontend/src/api/client.ts:101` (`searchItems()`)
- **Detail:** `FR-dependency-search` requires `GET /api/search?q=` for the `DependencyPicker` typeahead. The test file `tests/routes/search.test.ts` explicitly documents the gap at line 6: *"the GET /api/search endpoint is NOT wired into app.ts"*. The frontend `workItemsApi.searchItems()` is fully implemented and will silently return 404 at runtime — the DependencyPicker search will never return results.
- **Recommendation:** Add a search route (either a new `routes/search.ts` or inline in `app.ts`) and mount it at `/api/search`. The contract is documented in `Source/Shared/api-contracts.md`. Route to `TheFixer`.

---

### QO-004: `dependencyCheckDuration` Histogram Missing from Metrics
- **Severity:** P2
- **Category:** spec-drift (missing metric)
- **File:** `Source/Backend/src/metrics.ts` (missing histogram); `Source/Backend/tests/routes/metrics.test.ts` (also missing coverage)
- **Detail:** `FR-dependency-metrics` specifies 4 Prometheus metrics: `dependencyOperations` counter ✅, `dispatchGatingEvents` counter ✅, `dependencyCheckDuration` **histogram** ❌, `cycleDetectionEvents` counter ✅. The `dependencyCheckDuration` histogram (timing readiness checks and BFS cycle detection) is absent from `metrics.ts` and from the metrics test suite — neither the code nor the tests enforce this requirement.
- **Recommendation:** Add a `Histogram` to `metrics.ts` named `dependency_check_duration_seconds` and instrument `isReady()` / `detectCycle()` calls in `dependency.ts`. Add a test asserting `dependency_check_duration_seconds` appears at `/metrics`. Route to `TheFixer`.

---

### QO-005: Logger Has No Production/Development Format Switch
- **Severity:** P3
- **Category:** architecture-violation (observability)
- **File:** `Source/Backend/src/utils/logger.ts` (all lines)
- **Detail:** CLAUDE.md rule: *"Use structured JSON logging in production, pretty-printing in development."* The logger always writes JSON via `process.stdout.write(JSON.stringify(entry) + '\n')` regardless of `NODE_ENV`. There is no conditional pretty-print path for local development, making the developer experience worse and violating the stated architecture rule.
- **Recommendation:** Add `NODE_ENV !== 'production'` branch that formats output as `[LEVEL] message {context}` for human readability. The production JSON path is correct; only the dev path is missing.

---

### QO-006: Duplicate Logger Abstraction Creates Inconsistent Logging Path
- **Severity:** P3
- **Category:** pattern-violation (technical debt)
- **Files:** `Source/Backend/src/logger.ts` (wrapper), `Source/Backend/src/store/workItemStore.ts:10` (imports `utils/logger` directly)
- **Detail:** Two logger files exist. `src/logger.ts` wraps `src/utils/logger.ts` with a normalization shim so callers can pass an object `{ msg, ...ctx }` rather than `(string, ctx)`. Everything imports from `src/logger.ts` **except** `workItemStore.ts`, which imports directly from `src/utils/logger`. This means store log entries bypass the normalization wrapper and use the raw API. If `utils/logger` ever changes signature, the store breaks silently.
- **Recommendation:** Update `workItemStore.ts:10` to import `logger` from `'../logger'` (the wrapper) for consistency. Long-term, collapse the two files into one logger that accepts both call styles natively.

---

### QO-007: `pending_dependencies` Status Specified but Not Implemented
- **Severity:** P3
- **Category:** spec-drift
- **Files:** `Source/Shared/types/workflow.ts:5–15` (`WorkItemStatus` enum), `Source/Backend/src/routes/workflow.ts:230–244` (dispatch gate)
- **Detail:** `FR-dependency-dispatch-gating` specifies: *"unresolved blockers → set to `pending_dependencies` instead"* when transitioning to `approved`. `api-contracts.md` confirms this behavior. However, `WorkItemStatus` has no `PendingDependencies` value, and the actual dispatch gate returns a `400` error rather than setting the item to a `pending_dependencies` state. The spec's state-machine intent (item enters a waiting state automatically) is not implemented — callers get a rejection instead of a transparent status transition.
- **Recommendation:** Add `PendingDependencies = 'pending_dependencies'` to `WorkItemStatus`, add it to `VALID_STATUS_TRANSITIONS`, and update the dispatch handler and `onItemResolved` cascade to set/clear this status. This is a shared-type change — coordinate across layers before editing (`api-contract` module owner). Route to `TheFixer`.

---

### QO-008: ESLint Hook Rule Suppressions Without Documented Reason
- **Severity:** P3
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` via `eslint-disable-next-line`. No comment explains the business reason for the suppression. This rule exists to prevent stale closures; silent suppressions mask potential bugs.
- **Recommendation:** Either fix the dependency arrays to satisfy the rule correctly, or add an explanatory comment (e.g., `// intentionally omitted: refetch on manual trigger only`) so reviewers can evaluate the risk.

---

### QO-009: `api-contracts.md` References Unspecified FR-070–FR-085
- **Severity:** P3  
- **Category:** doc-stale / spec-drift
- **File:** `Source/Shared/api-contracts.md` (header line: *"FR-070 through FR-085"*)
- **Detail:** The API contracts document refers to FR-070–FR-085 but these IDs appear in no spec file under `Specifications/` or `Plans/`. They are ghost references — either forward-planning IDs that were never formalized, or copy-paste artifacts. The traceability enforcer would flag any code trying to `// Verifies: FR-070` since the spec doesn't exist.
- **Recommendation:** Either create a `Specifications/` or `Plans/` document defining FR-070–FR-085, or remove the reference and use the correct `FR-dependency-*` IDs that actually exist.

---

### QO-010: Frontend `vite-env.d.ts` Lacks Traceability (Minor)
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/vite-env.d.ts`
- **Detail:** Only source file in `Source/Frontend/src/` with zero `// Verifies:` comments AND modified in the last 14 days. It's a TypeScript ambient declarations stub (no logic), so the risk is cosmetic.
- **Recommendation:** Add `// Verifies: FR-WF-001 (Vite TypeScript environment types)` or equivalent as a formality.

---

### Grade Assessment

Per `inspector.config.yml` grading:
- **P1 count:** 1  
- **P2 count:** 3  
- **Spec coverage (Plans/ scope):** 100%; **(Specifications/ scope):** ~28%

Using **Plans/ scope** (what the enforcer enforces): P1=1, P2=3 → **Grade: C** (max_p1=2, max_p2=15, min_coverage=40% threshold — but P1 presence prevents B)

Using **Specifications/ scope** (true domain coverage): coverage=28% < 40% → **Grade: D**

The discrepancy between these two grades is itself the primary finding.

---

```json
{
  "audit_date": "2026-04-20",
  "grade": "C (Plans scope) / D (Specifications scope)",
  "spec_coverage": {
    "plans_scope": "100%",
    "specifications_scope": "~28%",
    "untraced_spec_requirements": 89
  },
  "findings": [
    {
      "id": "QO-001",
      "title": "Traceability enforcer blind to Specifications/ directory",
      "severity": "P1",
      "category": "spec-drift",
      "file": "tools/traceability-enforcer.py"
    },
    {
      "id": "QO-002",
      "title": "Route handlers bypass service layer",
      "severity": "P2",
      "category": "architecture-violation",
      "files": ["Source/Backend/src/routes/workItems.ts", "Source/Backend/src/routes/workflow.ts", "Source/Backend/src/routes/intake.ts"]
    },
    {
      "id": "QO-003",
      "title": "GET /api/search not wired in app.ts",
      "severity": "P2",
      "category": "spec-drift",
      "file": "Source/Backend/src/app.ts"
    },
    {
      "id": "QO-004",
      "title": "dependencyCheckDuration histogram missing from metrics.ts",
      "severity": "P2",
      "category": "spec-drift",
      "file": "Source/Backend/src/metrics.ts"
    },
    {
      "id": "QO-005",
      "title": "Logger missing production/dev format switch",
      "severity": "P3",
      "category": "architecture-violation",
      "file": "Source/Backend/src/utils/logger.ts"
    },
    {
      "id": "QO-006",
      "title": "Duplicate logger abstraction with inconsistent import path",
      "severity": "P3",
      "category": "pattern-violation",
      "file": "Source/Backend/src/store/workItemStore.ts:10"
    },
    {
      "id": "QO-007",
      "title": "pending_dependencies status specified but not implemented",
      "severity": "P3",
      "category": "spec-drift",
      "file": "Source/Shared/types/workflow.ts"
    },
    {
      "id": "QO-008",
      "title": "ESLint hook suppressions without documented reason",
      "severity": "P3",
      "category": "pattern-violation",
      "files": ["Source/Frontend/src/components/DependencyPicker.tsx:82", "Source/Frontend/src/hooks/useWorkItems.ts:63"]
    },
    {
      "id": "QO-009",
      "title": "api-contracts.md references unspecified FR-070–FR-085",
      "severity": "P3",
      "category": "doc-stale",
      "file": "Source/Shared/api-contracts.md"
    },
    {
      "id": "QO-010",
      "title": "vite-env.d.ts lacks traceability comment",
      "severity": "P4",
      "category": "pattern-violation",
      "file": "Source/Frontend/src/vite-env.d.ts"
    }
  ],
  "summary": {
    "p1": 1,
    "p2": 3,
    "p3": 5,
    "p4": 1,
    "escalate_to_TheFixer": ["QO-002", "QO-003", "QO-004", "QO-005", "QO-006", "QO-007", "QO-008"],
    "escalate_to_requirements_reviewer": ["QO-001", "QO-009"]
  }
}
```

---

**Summary for the team:**

The enforcer is reporting a false green. The most actionable items in priority order:

1. **[P1 QO-001]** Fix the traceability enforcer to be aware of `Specifications/` — otherwise the verification gate is structurally misleading. This is a governance issue, not a code bug.
2. **[P2 QO-003]** Wire `GET /api/search` into `app.ts` — the DependencyPicker is broken at runtime today. Three lines to fix.
3. **[P2 QO-004]** Add the `dependencyCheckDuration` histogram to `metrics.ts` — a missing metric with an existing test that verifies 3 of the required 4.
4. **[P2 QO-002]** Service layer bypass in routes is the structural debt that will compound as the platform grows — worth a dedicated cleanup cycle.
5. **[P3 QO-007]** `pending_dependencies` status is a spec promise that the state machine doesn't keep — callers get a rejection error instead of a transparent waiting state.
