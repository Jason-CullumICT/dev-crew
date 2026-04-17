# Quality Oracle Findings — 2026-04-17

> **Scope:** `Source/` (inspector.config.yml) | **Mode:** Full static audit | **Grade: C**

---

## Spec Coverage: 81%

| Plan | FRs | Traced | Coverage |
|------|-----|--------|----------|
| `Plans/self-judging-workflow` | 13 | 13 | **100%** ✅ |
| `Plans/dependency-linking` | 16 | 16 | **100%** ✅ |
| `Plans/orchestrator-cycle-dashboard` | 7 | 0 | **0%** ❌ |
| _subtotal (Source/-scoped plans)_ | **36** | **29** | **81%** |

> Two additional APPROVED plans (`image-upload`, `duplicate-deprecated-status`) were implemented in `portal/` rather than `Source/`, and are **excluded from this coverage calculation** (see QO-002).

---

## Traceability Enforcer: PASS (active plan only)

```
python3 tools/traceability-enforcer.py
→ TRACEABILITY PASSED: All 13 requirements have implementation references.
   (targeting Plans/self-judging-workflow/requirements.md)
```

---

## Findings

---

### QO-001: FR Identifier Namespace Collision
- **Severity:** P1
- **Category:** architecture-violation
- **Files:**
  - `Plans/orchestrator-cycle-dashboard/requirements.md` — FR-070 = `OrchestratorCyclesPage`
  - `Plans/image-upload/requirements.md` — FR-070 = `ImageAttachment` shared type
- **Detail:** Two approved plans independently assigned FR-070 through FR-076 to completely different features. The FR ID space is not partitioned — any new plan that re-uses a numeric range creates silent traceability ambiguity. The traceability enforcer regex `FR-[A-Z0-9-]+` would match both, reporting false passes or false failures depending on scan order. If either plan is implemented in `Source/`, code comments for `// Verifies: FR-070` will be interpreted as verifying both features simultaneously.
- **Recommendation:** Establish a canonical FR ID registry (a single flat table in `Plans/README.md` or a `Plans/fr-registry.md`) mapping every assigned FR ID to its owning plan. Rename orchestrator-cycle-dashboard IDs to a non-colliding range (e.g., FR-OCD-001 to FR-OCD-007) or use namespaced prefixes consistently across all plans.
- **Cross-ref:** QO-002 (related: unimplemented plans), QO-003 (enforcer scope gap)

---

### QO-002: Three Approved Plans Unimplemented in Source/
- **Severity:** P2
- **Category:** spec-drift
- **Files:**
  - `Plans/orchestrator-cycle-dashboard/requirements.md` — FR-070 to FR-076 (7 FRs, 0% in Source/)
  - `Plans/image-upload/requirements.md` — FR-070 to FR-089 (20 FRs, 0% in Source/)
  - `Plans/duplicate-deprecated-status/requirements.md` — FR-DUP-01 to FR-DUP-13 (13 FRs, 0% in Source/)
- **Detail:**
  - **orchestrator-cycle-dashboard** explicitly targets `Source/Frontend/` (`App.tsx`, `Sidebar.tsx`, `/cycle` route), is marked APPROVED, and has no implementation in `Source/`. There is no `OrchestratorCyclesPage.tsx`, `CycleCard.tsx`, or `CycleLogStream.tsx`.
  - **image-upload** references `Source/Shared/types.ts` and `Source/Backend/` in its requirements. FR-075 through FR-077 (`Verifies: FR-076`, `FR-077`) are implemented in `portal/Backend/src/routes/bugs.ts` and `portal/Backend/src/routes/featureRequests.ts` — but not in `Source/`. Shared types (`ImageAttachment`, `ImageAttachmentListResponse`) are absent from `Source/Shared/types/workflow.ts`.
  - **duplicate-deprecated-status** is marked APPROVED. FR-DUP-08 (schema migration) is present in `portal/Backend/src/database/schema.ts` but none of FR-DUP-01 through FR-DUP-13 are implemented in `Source/`.
- **Recommendation:** For each plan:
  1. _orchestrator-cycle-dashboard_: Implement or formally defer. If implementation is pending, route to TheFixer with these requirements.
  2. _image-upload_: Clarify ownership — if portal/ is the authoritative implementation, annotate the requirements with `Applies-to: portal/` and update the enforcer config. If Source/ is the target, create the implementation.
  3. _duplicate-deprecated-status_: Same clarification needed. Portal schema has partial work (FR-DUP-08 only); full feature requires 12 more FRs.
- **Cross-ref:** QO-001 (ID collision), QO-003 (enforcer gap)
- **Escalate:** TheFixer for implementation; requirements-reviewer if scope needs clarification

---

### QO-003: Traceability Enforcer Leaves Active Plans Unvalidated
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer uses `max(req_files, key=os.path.getmtime)` — the most recently modified `requirements.md`. Currently resolves to `Plans/self-judging-workflow/requirements.md`. As a result, three approved plans (`orchestrator-cycle-dashboard`, `image-upload`, `duplicate-deprecated-status`) are never validated in the standard `python3 tools/traceability-enforcer.py` run. The CI gate in CLAUDE.md only invokes the enforcer once with no argument, so these plans silently bypass the gate.
- **Recommendation:** Update `tools/traceability-enforcer.py` (or add a wrapper script) to iterate over **all** `requirements.md` files that have `Verdict: APPROVED` in their content and scan each one. A plan that passes its own enforcer run can be listed in a `traceability-passed.json` manifest so incremental CI only re-checks changed plans.
- **Cross-ref:** QO-002

---

### QO-004: Specifications/ Directory Disconnected from Source/
- **Severity:** P2
- **Category:** spec-drift
- **Files:** `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`
- **Detail:** `Specifications/dev-workflow-platform.md` (482 lines, FR-001 through FR-069+) describes the `portal/` application — SQLite, feature requests, bug reports, development cycles. It does **not** describe `Source/`. `Specifications/workflow-engine.md` (162 lines) is a narrative spec for the self-judging workflow engine but contains **no FR IDs** — it is untraceable. The inspector.config.yml points `specs.dir` to `Specifications/` but none of the FR IDs there appear in `Source/` with `// Verifies:` comments. The traceability enforcer never scans `Specifications/`; it uses `Plans/` exclusively.  This means the canonical spec directory (`Specifications/`) is structurally decoupled from the active codebase (`Source/`).
- **Recommendation:** One of:
  a. Retrofit `Specifications/workflow-engine.md` with FR-WF-XXX IDs matching `Plans/self-judging-workflow/requirements.md` and update inspector.config.yml `specs.dir` / `specs.patterns.enforcer` accordingly.
  b. Accept that `Plans/` is the effective spec source for `Source/` and annotate `Specifications/` clearly as applying to `portal/` only.
- **Cross-ref:** QO-001, QO-002

---

### QO-005: Frontend Hooks and Badge Components Lack Dedicated Tests
- **Severity:** P3
- **Category:** untested
- **Files:**
  - `Source/Frontend/src/hooks/useDashboard.ts` — no test file
  - `Source/Frontend/src/hooks/useWorkItems.ts` — no test file
  - `Source/Frontend/src/components/Layout.tsx` — no test file
  - `Source/Frontend/src/components/PriorityBadge.tsx` — no test file
  - `Source/Frontend/src/components/StatusBadge.tsx` — no test file
  - `Source/Frontend/src/components/TypeBadge.tsx` — no test file
  - `Source/Frontend/src/pages/DebugPortalPage.tsx` — no test file
- **Detail:** The two custom hooks (`useDashboard`, `useWorkItems`) are tested implicitly through page-level tests (`DashboardPage.test.tsx`, `WorkItemListPage.test.tsx`) but have no unit tests verifying their loading/error/data states in isolation. The badge components (`PriorityBadge`, `StatusBadge`, `TypeBadge`) are purely presentational but have zero tests — a regression in a badge enum would be invisible. `DebugPortalPage` renders an iframe and also has no test.
- **Recommendation:** Add hook unit tests using `renderHook()` from `@testing-library/react`. Add snapshot or assertion tests for each badge component (covers enum rendering and class names). Low effort, high regression protection. Each test must carry `// Verifies:` comment referencing the relevant FR.

---

### QO-006: Silent Error Swallow in API Client
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:**
  ```ts
  const body = await response.json().catch(() => ({}));
  ```
  JSON parse failures are silently swallowed — the empty object `{}` propagates to callers as a valid response body. If the backend returns malformed JSON (e.g., during a 500 error with non-JSON content-type), the caller receives `{}` instead of an error, which can cause silent data loss or confusing UI states. This violates the architecture rule: _"Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."_
- **Recommendation:** Replace with:
  ```ts
  const body = await response.json().catch(() => {
    // Body may be empty or non-JSON on some error responses
    return {};
  });
  ```
  Or better — log the parse failure to the console/logger with the response status before returning `{}`. At minimum add a comment explaining why swallowing is intentional here.

---

### QO-007: eslint-disable Without Justification Comment
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
- **Detail:** Both suppressions omit an explanation. Disabling `react-hooks/exhaustive-deps` without a comment makes it impossible to audit whether the missing dependency was intentional (e.g., intentional "mount-only" effect) or a stale-closure bug. Future developers cannot distinguish intentional suppressions from accidental ones.
- **Recommendation:** Add inline explanations, e.g.:
  ```ts
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only run on mount; fetchItems is stable (useCallback)
  ```

---

### QO-008: Dual Logger Modules in Backend
- **Severity:** P4
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/logger.ts` — compatibility wrapper (default export)
  - `Source/Backend/src/utils/logger.ts` — actual structured JSON logger (named export)
- **Detail:** Two logger modules exist. Route files import `import logger from '../logger'` (default export compat wrapper). Services could import directly from `utils/logger`. The compat wrapper exists because `backend-coder-2`'s routes used a different logger signature. This dual-path creates risk: if someone adds a new route importing `utils/logger` directly, they bypass the compatibility shim and may use a different calling convention. The comment in `logger.ts` explains the history but the situation should be normalized.
- **Recommendation:** Pick one logger interface and consolidate. Either: update `utils/logger.ts` to export a default-compatible logger and remove `logger.ts`, or have `utils/logger.ts` re-export as default. Low priority since both ultimately call the same underlying logger.

---

## Architecture Rule Compliance Summary

| Rule | Status | Notes |
|------|--------|-------|
| Specs are source of truth | ⚠️ Partial | Plans/ is effective truth; Specifications/ has no FR IDs for Source/ |
| No direct DB calls from route handlers | ✅ Pass | All routes go through store/workItemStore or services |
| Shared types single source of truth | ✅ Pass | RouteResult/AssessmentResult are service-local only, not cross-layer |
| Every FR needs a test with Verifies | ✅ Pass | All FR-WF-* and FR-dependency-* have Verifies comments |
| No hardcoded secrets | ✅ Pass | No credentials found in Source/ |
| List endpoints return `{data: T[]}` wrappers | ✅ Pass | All list endpoints use DataResponse wrapper |
| New routes have observability | ✅ Pass | All catch blocks log via structured logger |
| Business logic has no framework imports | ✅ Pass | Services don't import express |
| Never swallow errors silently | ⚠️ 1 violation | api/client.ts:26 `.catch(() => ({}))` |
| No console.log | ✅ Pass | Zero console.log in production source |

---

## Test Quality Summary

| Area | Test Files | Issues |
|------|-----------|--------|
| Backend routes | 5 test files | Full coverage of routes |
| Backend services | 5 test files | Full coverage of services |
| Backend store | 1 test file | Full coverage |
| Frontend pages | 5 test files | DebugPortalPage has no test |
| Frontend components | 3 test files | Layout, PriorityBadge, StatusBadge, TypeBadge have no tests |
| Frontend hooks | 0 dedicated files | useDashboard, useWorkItems tested only via page tests |
| E2E | playwright configs | Present, traceability comments in config |

---

## JSON Summary

```json
{
  "audit_date": "2026-04-17",
  "grade": "C",
  "spec_coverage_percent": 81,
  "total_source_frs": 36,
  "traced_frs": 29,
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "FR ID namespace collision between orchestrator-cycle-dashboard and image-upload plans"},
    {"id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "Three approved plans fully unimplemented in Source/"},
    {"id": "QO-003", "severity": "P2", "category": "pattern-violation", "title": "Traceability enforcer only validates most-recently-modified plan"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "Specifications/ directory disconnected from Source/ — no FR IDs in workflow-engine.md"},
    {"id": "QO-005", "severity": "P3", "category": "untested", "title": "Frontend hooks and badge components lack dedicated unit tests"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "Silent .catch(() => ({})) in API client swallows JSON parse errors"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable comments missing justification"},
    {"id": "QO-008", "severity": "P4", "category": "architecture-violation", "title": "Dual logger modules in backend create import confusion"}
  ],
  "p1_count": 1,
  "p2_count": 3,
  "p3_count": 3,
  "p4_count": 1,
  "unimplemented_plan_frs": {
    "orchestrator-cycle-dashboard": ["FR-070","FR-071","FR-072","FR-073","FR-074","FR-075","FR-076"],
    "image-upload": ["FR-070","FR-071","FR-072","FR-073","FR-074","FR-075","FR-076","FR-077","FR-078","FR-079","FR-080","FR-081","FR-082","FR-083","FR-084","FR-085","FR-086","FR-087","FR-088","FR-089"],
    "duplicate-deprecated-status": ["FR-DUP-01","FR-DUP-02","FR-DUP-03","FR-DUP-04","FR-DUP-05","FR-DUP-06","FR-DUP-07","FR-DUP-08","FR-DUP-09","FR-DUP-10","FR-DUP-11","FR-DUP-12","FR-DUP-13"]
  }
}
```
