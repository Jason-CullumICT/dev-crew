---

## Quality Oracle Findings

### Spec Coverage: ~14% (enforcer-visible: 100%)

| Scope | FR IDs | Traced | Coverage |
|-------|--------|--------|----------|
| Plans/self-judging-workflow *(enforcer target)* | 13 | 13 | 100% |
| Plans/dependency-linking | 16 | ~12 | ~75% |
| **Specifications/dev-workflow-platform.md** | **74** | **0** | **0%** |
| **Total across all formal specs** | **~103** | **~25** | **~24%** |

> The traceability enforcer reports PASS because it only sees `Plans/self-judging-workflow`. True coverage across `Specifications/` = **0%**.

---

### QO-001: Specification Directory Has Zero Implementation Coverage

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** This file defines **74 unique functional requirements** (FR-001 through FR-069, plus FR-dependency-\* series) describing a comprehensive development platform: Feature Requests with AI voting, Bug Reports, Development Cycles, Tickets, Approvals, Learnings, Features, and a full frontend. **Not a single one of these 74 FRs has a `// Verifies:` comment anywhere in `Source/`**. The current implementation (the self-judging workflow engine) has 13 FR-WF-\* traces from a completely separate plan document and a different entity model. The primary project spec is entirely disconnected from the codebase.
- **Recommendation:** Determine if `dev-workflow-platform.md` is aspirational (future product) or active (current build target). If aspirational — mark it explicitly with a status header (e.g., `Status: PLANNED - not yet implemented`). If active — open a plan for each subsystem and begin implementation or update it to match what's actually been built. Either way, the spec needs a declared relationship to the code.
- **Cross-ref:** [ESCALATE → TheFixer] for gap closure; requirements-reviewer owns Specifications/

---

### QO-002: Traceability Enforcer Scope Does Not Cover Specifications/

- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-discovers the most recently modified `Plans/*/requirements.md` and stops there. The `inspector.config.yml` explicitly sets `specs.dir: "Specifications/"` but the enforcer never reads this config — it uses its own internal Plans-only discovery. As a result, the 74 FR IDs in `Specifications/dev-workflow-platform.md` and 3 in `Specifications/tiered-merge-pipeline.md` are invisible to the tool. The enforcer gives a false green signal while the spec layer has 0% coverage.
- **Recommendation:** Extend `tools/traceability-enforcer.py` to also scan `Specifications/*.md` for FR IDs and cross-reference them against Source/. Add an explicit `--all-specs` mode or consume the config's `specs.dir` setting.

---

### QO-003: Architecture Violation — Direct Store Calls in Route Handlers

- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:44`, `Source/Backend/src/routes/workflow.ts:44`, `Source/Backend/src/routes/intake.ts:19`
- **Detail:** The architecture rule states *"No direct DB calls from route handlers — use the service layer."* All three route files call `store.*` functions directly from Express handlers: `store.createWorkItem()`, `store.findAll()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()`. Business services DO exist (`assessment.ts`, `changeHistory.ts`, `dependency.ts`, `router.ts`, `dashboard.ts`) but basic CRUD bypasses them entirely. This tightly couples HTTP layer to persistence layer, making testing and future persistence changes harder.
- **Failure scenario:** Adding pagination logic or audit requirements to `findAll` requires touching route files; rule says route handlers must not own that logic.
- **Recommendation:** Extract a `WorkItemService` that wraps store calls. Routes call service methods only. Existing services already follow this pattern — extend it to CRUD.
- **Cross-ref:** [ESCALATE → TheFixer] backend-coder owns `Source/Backend/`

---

### QO-004: Known Failing Test Suite — `GET /api/search` Not Implemented

- **Severity:** P2
- **Category:** untested / spec-drift
- **File:** `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** The test file opens with an explicit comment: *"NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* Five test cases cover FR-dependency-search (cross-entity typeahead). The route is absent from `app.ts`. The test suite runs against a missing endpoint and will return 404s, failing all assertions. The `Plans/dependency-linking/requirements.md` tracker shows `FR-dependency-search` as ✅ Done — but that refers to `portal/Backend/src/routes/search.ts`, a different application.
- **Failure scenario:** Running `npm test` in `Source/Backend` produces 5 failures against the search endpoint with no signal in the enforcer output.
- **Recommendation:** Implement `Source/Backend/src/routes/search.ts` and register it in `app.ts`. Implementation should query `store.findAll()` across title/description and return `{data: WorkItem[]}`.
- **Cross-ref:** [ESCALATE → TheFixer] backend-coder; FR-dependency-search exists in both Specifications/ and Plans/dependency-linking/

---

### QO-005: Phantom FR IDs — Two-Plan Confusion (portal/ vs Source/)

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Plans/dependency-linking/requirements.md:38-53`
- **Detail:** The `Plans/dependency-linking/requirements.md` status tracker was written for `portal/Backend/` and `portal/Frontend/` paths. The actual dependency implementation lives in `Source/Backend/` and `Source/Frontend/`. The tracker marks three items as ❌ Missing that actually exist in Source/ (e.g., `FR-dependency-frontend-tests` — `Source/Frontend/tests/components/BlockedBadge.test.tsx` and `DependencySection.test.tsx` both exist). Additionally, the tracker references `portal/Backend/src/routes/search.ts` as ✅ Done, but this is absent from `Source/Backend/`. The plan is factually incorrect relative to the active codebase.
- **Recommendation:** Update `Plans/dependency-linking/requirements.md` to reflect Source/ paths. Reconcile the status column to the current state. This is the second plan in this repo — establish a convention for which codebase each plan targets.

---

### QO-006: eslint-disable Without Documented Justification

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line` but provide no explanation of *why* the rule is intentionally broken. In `useWorkItems.ts` the deps array explicitly flattens filter properties to avoid object identity re-renders — a valid technique, but undocumented. In `DependencyPicker.tsx` the `useCallback` deliberately omits `allItems` to prevent render churn. Suppressions without rationale are indistinguishable from mistakes.
- **Recommendation:** Add a one-line comment above each disable explaining the architectural reason, e.g.: `// Intentional: spreading filter fields avoids re-render on object identity change`.

---

### QO-007: Silent Error Swallow in API Client

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}));` silently drops JSON parse failures. If the server returns a non-JSON error body (HTML, plain text, or truncated JSON), the error is swallowed and an empty object is used, causing the downstream `body.message` access to return `undefined` and the thrown error to become `"Request failed: 500"` with no body context. The architecture rule states: *"Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."*
- **Recommendation:** Add a log or comment: `// Intentionally silent: non-JSON response bodies fall back to empty object; status code is preserved in the thrown Error above`. Or log with a debug-level logger call.

---

```json
{
  "audit_date": "2026-09-14",
  "tool": "quality-oracle",
  "spec_coverage": {
    "enforcer_visible_pct": 100,
    "true_all_specs_pct": 24,
    "specifications_dir_pct": 0,
    "total_fr_ids_in_specs": 103,
    "traced_in_source": 25
  },
  "findings": [
    {"id":"QO-001","severity":"P1","category":"spec-drift","title":"Specifications/ directory has 0% implementation coverage — 74 FR IDs untraced"},
    {"id":"QO-002","severity":"P2","category":"spec-drift","title":"Traceability enforcer scope does not cover Specifications/"},
    {"id":"QO-003","severity":"P2","category":"architecture-violation","title":"Direct store calls in route handlers violate service-layer rule"},
    {"id":"QO-004","severity":"P2","category":"untested","title":"GET /api/search not implemented; 5 test cases will fail"},
    {"id":"QO-005","severity":"P2","category":"spec-drift","title":"Plans/dependency-linking tracker is stale — wrong paths, wrong status"},
    {"id":"QO-006","severity":"P3","category":"pattern-violation","title":"eslint-disable-next-line without documented justification in 2 files"},
    {"id":"QO-007","severity":"P3","category":"pattern-violation","title":"Silent error swallow in api/client.ts catch block"}
  ],
  "grade": "D",
  "grade_rationale": "1 P1 + 4 P2 findings. Grade D threshold: any P1. True spec coverage (24%) is below the 40% minimum for grade C."
}
```

---

**Grade: D**

One P1 (primary specification directory has zero coverage in the enforcer and zero Verifies traces in source) plus four P2s drive this below grade C. The self-judging workflow engine itself is well-traced against its own plan (100%) — the grade reflects the structural gap between the full `Specifications/` corpus and the implementation, and the unimplemented search route that will cause test failures.

**Escalation routing:**
- QO-001, QO-002, QO-005 → requirements-reviewer to reconcile spec/plan intent
- QO-003, QO-004 → TheFixer / backend-coder to implement service layer and search route
- QO-006, QO-007 → TheFixer / frontend/backend-coder for inline fixes
