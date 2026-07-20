---

## Quality Oracle Findings

### Spec Coverage
**Plans-backed coverage (enforcer scope): 13/13 = 100%**
**Specifications/-backed coverage (true domain truth): 13/97 = 13.4%**

The enforcer reports "PASSED" but only measures Plans/. The `Specifications/` directory — which CLAUDE.md designates as "the most critical documents" — has **zero** source references for 84 of its 97 formal requirements.

---

### QO-001: Specification Abandoned — dev-workflow-platform.md Describes a Different Product
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** This spec defines 74 requirements (FR-001–FR-069) for a feature-request voting platform (AI voting, human approval gates, development cycles, bug reports, deployments). The actual implementation is a *work item workflow engine* (intake → routing → assessment → dispatch). Not a single FR-001–FR-069 ID appears anywhere in `Source/`. Either the project pivoted and this spec was never retired, or 74 requirements are fully unimplemented. CLAUDE.md's rule #1 is "Specs are source of truth — implementation traces to specs, never the other way around," but this spec has no implementation at all.
- **Recommendation:** Decision point required. If this spec is superseded, mark it `[SUPERSEDED by workflow-engine.md]` at the top and archive it. If it is still in-scope, it needs FR-WF-style plan requirements created and implementation begun.

---

### QO-002: Traceability Enforcer Scope Gap — Specifications/ Never Checked
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-selects the most recently modified `Plans/**/requirements.md` and scans only that file. It never looks at `Specifications/`. As a result, 74 FRs from `dev-workflow-platform.md` and 10 FR-TMPs from `tiered-merge-pipeline.md` are never validated. The "TRACEABILITY PASSED" banner is misleading — it only covers the 13 FR-WF requirements extracted into the Plan. CLAUDE.md says verification gates must pass before marking any task done; this gate has a blind spot covering 87% of declared requirements.
- **Recommendation:** Extend the enforcer with a `--specs` mode (or default behaviour) that also scans `Specifications/` for all `FR-[A-Z0-9-]+` IDs and reports them as untraceable unless referenced in source. At minimum, add a warning when `Specifications/` FRs are not in the scanned plan file.

---

### QO-003: Tiered Merge Pipeline Spec (FR-TMP-001–010) Has Zero Implementation
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** FR-TMP-001 through FR-TMP-010 specify risk classification, Playwright E2E generation, live E2E runner, auto-PR creation, AI PR review, auto-merge logic, configuration, worker prerequisites, run JSON extensions, and error handling. `grep -rn "FR-TMP-"` across `Source/` returns **0 matches**. The E2E directory exists but contains only Playwright config files — no cycle test directories. These represent significant pipeline infrastructure that has no implementation.
- **Recommendation:** If FR-TMP requirements are in-scope, create a plan in `Plans/tiered-merge-pipeline/requirements.md` that lists them as FR-TMP-XXX and begin implementation. If out-of-scope for current sprint, add `[STATUS: Deferred — Phase 2]` header to the spec.

---

### QO-004: Business Logic Embedded in Route Handlers — Architecture Rule Violated
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workflow.ts` (lines 93–141, 144–208)
- **Detail:** The `POST /approve` and `POST /reject` handlers in `workflow.ts` perform state-machine validation (`isValidTransition`), mutate the `changeHistory` array directly (`buildChangeEntry` + `item.changeHistory.push()`), and call `store.updateWorkItem()` inline. This is domain business logic that belongs in a service (`router.ts`-style). Compare with `POST /route` (line 57) and `POST /assess` (line 84), which correctly delegate to `routeWorkItem()` and `assessWorkItem()` services. Additionally, `intake.ts` and `workItems.ts` import `store/workItemStore` directly with no service intermediary. CLAUDE.md rule: "No direct DB calls from route handlers — use the service layer."
- **Recommendation:** Extract approve/reject state-transition logic into `services/router.ts` or a new `services/workflowActions.ts`. Route handlers should call the service and return the result — no store imports, no `buildChangeEntry` calls, no `changeHistory` mutation.
- **Cross-ref:** TheFixer (code quality fix)

---

### QO-005: GET /api/search Route Unimplemented — Tests Intentionally Fail
- **Severity:** P2
- **Category:** untested
- **File:** `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** The test file opens with an explicit comment: *"the GET /api/search endpoint is NOT wired into app.ts. These tests document the expected contract and will FAIL until the route is implemented."* This is a known, documented gap surfaced by failing tests — which is the correct practice. However it remains in-progress: the `FR-dependency-search` requirement has no implementation. The route file doesn't exist and `app.ts` has no `search` import or mount.
- **Recommendation:** Implement `Source/Backend/src/routes/search.ts` with `GET /api/search?q=<query>` returning `{data: WorkItem[]}`, wire it in `app.ts`, and add a `// Verifies: FR-dependency-search` traceability comment.

---

### QO-006: Duplicate Test Files for Same Components
- **Severity:** P3
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`
- **Detail:** Both `tests/WorkItemDetailPage.test.tsx` and `tests/pages/WorkItemDetailPage.test.tsx` test `WorkItemDetailPage`. Same pattern for `WorkItemListPage`. The `pages/` variants are more complete (import typed `WorkItem`, test more edge cases, use `within()`). The top-level variants appear to be earlier, shallower versions that were never cleaned up. Both run in the test suite, so the weaker file adds noise without adding coverage.
- **Recommendation:** Delete the top-level `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` (keep the `tests/pages/` versions). Verify test count is unchanged or improved.

---

### QO-007: Silently Swallowed JSON Parse Error in API Client
- **Severity:** P3
- **Category:** correctness
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}))` — when the server returns a non-JSON error body (e.g., an HTML 502 from a proxy, or a plain-text 429), the JSON parse throws but is silently caught and replaced with `{}`. `body.message` is then `undefined`, producing the unhelpful message "Request failed: 502" with no diagnostic content. CLAUDE.md: "Never swallow errors silently — every `catch` block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed." There is no comment explaining the suppression.
- **Failure scenario:** Backend goes down → proxy returns HTML 502 → `.catch(() => ({}))` swallows parse error → user sees "Request failed: 502" instead of "upstream connect error" or similar detail.
- **Recommendation:** Add a comment, or change to `body.message ?? body.error ?? response.statusText ?? `Request failed: ${response.status}`` to degrade gracefully while preserving as much context as possible.

---

### QO-008: eslint-disable Without Rationale (react-hooks/exhaustive-deps)
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with no comment explaining why the dep is intentionally omitted. These suppressions can hide stale-closure bugs. CLAUDE.md lists `eslint-disable` as a pattern to flag.
- **Recommendation:** Add an inline comment: `// intentionally omitted: <reason> — re-running on X would cause Y`. If the suppression is no longer needed after a refactor, remove it.

---

### QO-009: Hardcoded Fallback Localhost URL in Production Component
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:5`
- **Detail:** `const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200'` — the `http://localhost:4200` fallback is a hardcoded URL. CLAUDE.md: "No hardcoded secrets" — this extends to hardcoded service addresses. In any non-local environment where `VITE_PORTAL_URL` is not set, the component silently points to localhost.
- **Recommendation:** Remove the localhost fallback and require the env var. Or if the fallback is intentional for dev-only usage, add a `console.warn` or a visible in-component warning when `VITE_PORTAL_URL` is missing.

---

```json
{
  "audit_date": "2026-07-20",
  "grade": "D",
  "grade_note": "Spec coverage 13.4% across all Specifications/ FRs, failing the 40% minimum for grade C. Plans-backed coverage (enforcer scope) is 100% — grade would be B if measured there alone.",
  "spec_coverage": {
    "plans_backed": "100% (13/13)",
    "specifications_backed": "13.4% (13/97)",
    "gap_driver": "dev-workflow-platform.md (74 FRs, 0% covered) + tiered-merge-pipeline.md (10 FRs, 0% covered)"
  },
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "spec-drift",            "title": "dev-workflow-platform.md describes a different product — 74 FRs unimplemented" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift",            "title": "Traceability enforcer never scans Specifications/ — 84 FRs invisible to gate" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift",            "title": "tiered-merge-pipeline.md FR-TMP-001–010 have zero source coverage" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation","title": "Approve/reject business logic in route handler; direct store imports in 3 routes" },
    { "id": "QO-005", "severity": "P2", "category": "untested",              "title": "GET /api/search not implemented — search.test.ts intentionally fails" },
    { "id": "QO-006", "severity": "P3", "category": "test-coverage",         "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-007", "severity": "P3", "category": "correctness",           "title": "Silently swallowed JSON parse error in api/client.ts" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation",     "title": "eslint-disable react-hooks/exhaustive-deps without explanation (2 files)" },
    { "id": "QO-009", "severity": "P3", "category": "pattern-violation",     "title": "Hardcoded localhost:4200 fallback in DebugPortalPage" }
  ],
  "p1_count": 0,
  "p2_count": 5,
  "p3_count": 4,
  "escalations": [],
  "fix_team": "TheFixer",
  "enforcer_result": "PASSED (Plans scope only)"
}
```

---

**Key call-to-action for the team:** The grade is dragged to D almost entirely by the spec/reality mismatch in `Specifications/dev-workflow-platform.md`. A single decision — archive that document or mark it superseded — combined with noting FR-TMP requirements as deferred would lift coverage to ~100% and remove QO-001 through QO-003. The remaining P2s (QO-004, QO-005) are implementation gaps that TheFixer can address. The enforcer scope fix (QO-002) is low-effort, high-value: extend `tools/traceability-enforcer.py` to also scan `Specifications/` so the gate actually guards the declared source of truth.
