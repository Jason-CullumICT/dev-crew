---

## Quality Oracle Findings

### Spec Coverage Summary

| Spec Family | FRs in Spec | Traced in Source | Coverage |
|---|---|---|---|
| FR-WF-\* (self-judging-workflow plan) | 13 | 13 | **100%** ✅ |
| FR-TMP-\* (tiered-merge-pipeline spec) | 10 | 0 | **0%** ❌ |
| FR-dependency-\* (dependency-linking plan) | ~13 | 13 | **100%** ✅ |
| FR-001–FR-069 (dev-workflow-platform) | 85 | 0\* | — (superseded system) |

\*The dev-workflow-platform FRs belong to a previous, now-replaced system. The current Source/ implements the self-judging-workflow engine instead.

**Effective active-spec coverage: 26/36 = 72%** (gating on FR-TMP-* unimplemented)

---

### QO-001: Traceability Enforcer Is Blind to `Specifications/tiered-merge-pipeline.md`
- **Severity:** P1
- **Category:** spec-drift / tool-gap
- **File:** `tools/traceability-enforcer.py` + `Specifications/tiered-merge-pipeline.md`
- **Detail:** The enforcer auto-selects the most-recently-modified `requirements.md` inside `Plans/`, which is currently `Plans/self-judging-workflow/requirements.md`. This means `Specifications/tiered-merge-pipeline.md` — which defines 10 functional requirements (FR-TMP-001 through FR-TMP-010) — is completely outside the enforcer's scope. Running `python3 tools/traceability-enforcer.py` reports **PASSED** while 10 spec requirements have zero implementation and zero `// Verifies:` comments anywhere in Source/. The gate gives a false green.
- **Recommendation:** Add multi-spec support to the enforcer (scan all `*.md` in `Specifications/` for FR patterns) OR document that tiered-merge-pipeline is "planned but not yet in implementation scope" by adding a `status: deferred` flag in the spec header. Either way, the CLAUDE.md verification gate (`python3 tools/traceability-enforcer.py`) must not silently skip active specs.
- **Cross-ref:** Route to TheFixer for enforcer fix, or requirements-reviewer to mark spec status.

---

### QO-002: FR-TMP-001 through FR-TMP-010 — Zero Implementation
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** Ten functional requirements exist in the tiered-merge-pipeline spec with no corresponding source code:
  - FR-TMP-001 Risk Classification
  - FR-TMP-002 through FR-TMP-010 (E2E generation, Playwright runner, auto-PR, AI review, auto-merge, post-merge chrome validation, auto-revert, bug ticket creation, dashboard PR status)
  
  `Plans/tiered-merge-pipeline/` has design documents, QA reports, and security reports — but **no `requirements.md`** and no corresponding source files in `Source/`. No `// Verifies: FR-TMP-*` comment exists anywhere in the codebase. It is unclear whether this was intended as Phase 2 scope or was abandoned mid-implementation.
- **Recommendation:** Either: (a) create `Plans/tiered-merge-pipeline/requirements.md` to formally track implementation, or (b) add `## Status: Deferred — Phase 2` to the spec so audits can correctly classify it as out-of-scope. Check `Plans/tiered-merge-pipeline/design.md` to determine which FRs were Phase 1 vs Phase 2.
- **Cross-ref:** [ESCALATE → requirements-reviewer] to clarify spec status.

---

### QO-003: Route Handlers Access Store Directly — Service Layer Bypassed
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts` (6 calls), `Source/Backend/src/routes/workflow.ts` (10 calls)
- **Detail:** Both route files call `store.*` functions directly (`store.findById`, `store.createWorkItem`, `store.updateWorkItem`, `store.softDelete`). The CLAUDE.md architecture rule states: **"No direct DB calls from route handlers — use the service layer."** While this is an in-memory store rather than a SQL database, the principle is identical — routes should delegate to a service, not reach into the data layer. The existing services (`assessment.ts`, `router.ts`, `dependency.ts`, `dashboard.ts`) correctly abstract domain logic, but there is no `workItemService.ts` for basic CRUD. All store access from routes is unmediated.
- **Recommendation:** Extract a `Source/Backend/src/services/workItem.ts` service that wraps the store calls. Route handlers become thin: validate input → call service → return response. This enables future DB migration, testability, and policy enforcement without touching routes.
- **Cross-ref:** [ESCALATE → TheFixer / backend-coder] for refactoring.

---

### QO-004: E2E Test Harness Is a Stub With Zero Tests
- **Severity:** P2
- **Category:** test-coverage
- **File:** `Source/E2E/package.json`, `Source/E2E/playwright.config.ts`
- **Detail:** The `Source/E2E/` directory contains Playwright config files (`playwright.config.ts`, `playwright.pipeline.config.ts`) but **no test files**. The `package.json` test script is `"echo \"Error: no test specified\" && exit 1"`. Playwright is configured to find tests in `tests/` but that directory does not exist inside E2E/. The CLAUDE.md verification gate includes `npm test --workspaces --if-present` — the E2E workspace will fail this gate if executed as a named workspace. Multiple Plan reports (`Plans/tiered-merge-pipeline/qa-report-playwright.md`) reference Playwright testing, suggesting this was meant to be functional.
- **Recommendation:** Either implement at least smoke-test E2E specs (navigation to dashboard, work item list, create form), or remove `Source/E2E/` from the workspace to stop it failing gates. Do not leave a broken test harness stub.
- **Cross-ref:** [ESCALATE → TheFixer / frontend-coder] to implement or remove.

---

### QO-005: Silent `.catch(() => ({}))` Swallows Error Context
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** 
  ```ts
  const body = await response.json().catch(() => ({}));
  ```
  When `response.json()` fails (non-JSON error body), the parse exception is silently discarded and replaced with an empty object. This violates CLAUDE.md: *"every `catch` block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."* The intent is defensive (tolerate non-JSON error responses), which is reasonable — but it is undocumented.
- **Recommendation:** Add an inline comment: `// Intentionally silent: error body may not be JSON (e.g., HTML 502 gateway error)`. The error is non-actionable at this layer so suppression is acceptable **if documented**.
- **Cross-ref:** P3, low urgency.

---

### QO-006: Duplicate Test Files for Two Frontend Pages
- **Severity:** P3
- **Category:** test-coverage / hygiene
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (19 tests) AND `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (20 tests); same for `WorkItemListPage.test.tsx` (16 vs 12 tests)
- **Detail:** Two test files cover the same component in different directories. This results in ~35 duplicate tests executing on every test run, slows CI, creates maintenance confusion about which is canonical, and risks divergence over time. The `tests/pages/` variant appears to be the newer, more complete location; the root-level files appear to be from initial scaffolding.
- **Recommendation:** Remove the root-level `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` once confirming the `tests/pages/` versions cover all cases. Update jest config if needed.
- **Cross-ref:** [ESCALATE → TheFixer / frontend-coder] to clean up.

---

### QO-007: `eslint-disable` Suppressions Without Rationale Comments
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both suppress `react-hooks/exhaustive-deps` without an inline explanation. The suppressions appear intentional (stable primitive deps in `useEffect`, stable set references in `useCallback`), but the absence of a rationale comment makes it impossible to distinguish deliberate decisions from mistakes or laziness.
- **Recommendation:** Add: `// intentional: [reason deps are stable / why re-running would cause infinite loops]` adjacent to each disable comment.

---

### JSON Summary

```json
{
  "audit_date": "2026-10-01",
  "spec_coverage": {
    "FR-WF-series": { "total": 13, "traced": 13, "pct": 100 },
    "FR-TMP-series": { "total": 10, "traced": 0, "pct": 0 },
    "FR-dependency-series": { "total": 13, "traced": 13, "pct": 100 },
    "overall_active": { "total": 36, "traced": 26, "pct": 72 }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift/tool-gap", "file": "tools/traceability-enforcer.py", "summary": "Enforcer blind to Specifications/tiered-merge-pipeline.md — reports false PASSED" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "file": "Specifications/tiered-merge-pipeline.md", "summary": "FR-TMP-001 through FR-TMP-010: 0/10 implemented" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "file": "Source/Backend/src/routes/workItems.ts+workflow.ts", "summary": "Route handlers call store directly, bypassing service layer" },
    { "id": "QO-004", "severity": "P2", "category": "test-coverage", "file": "Source/E2E/package.json", "summary": "E2E harness is a stub — zero test files, test command fails" },
    { "id": "QO-005", "severity": "P3", "category": "pattern-violation", "file": "Source/Frontend/src/api/client.ts:26", "summary": "Silent catch swallows JSON parse error without documentation" },
    { "id": "QO-006", "severity": "P3", "category": "test-coverage/hygiene", "file": "Source/Frontend/tests/", "summary": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "file": "Source/Frontend/src/hooks/useWorkItems.ts:63+DependencyPicker.tsx:82", "summary": "eslint-disable suppressions lack rationale comments" }
  ],
  "grade": "C",
  "grade_rationale": "1 P1 + 3 P2 findings; spec coverage 72% (below 80% threshold for B). No hardcoded secrets, no console.log violations, catch blocks properly handled in backend routes.",
  "escalations": [
    { "finding": "QO-001", "team": "TheFixer", "reason": "enforcer tool fix needed" },
    { "finding": "QO-002", "team": "requirements-reviewer", "reason": "spec status clarification" },
    { "finding": "QO-003", "team": "TheFixer/backend-coder", "reason": "service layer refactor" },
    { "finding": "QO-004", "team": "TheFixer/frontend-coder", "reason": "E2E tests or harness removal" }
  ]
}
```

---

**Grade: C** — 1 P1 (enforcer blind spot giving false confidence), 3 P2s (unimplemented spec, architecture violation, empty E2E harness), 3 P3s. Spec coverage for active requirements sits at 72%, below the B-grade threshold of 80%. No critical security/observability failures; backend catch blocks, logging, and metrics are solid. Fix QO-001 and QO-002 first — the enforcer falsely signals all-clear while 10 spec requirements are unimplemented.
