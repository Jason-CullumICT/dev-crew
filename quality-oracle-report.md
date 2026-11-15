---

## Quality Oracle Findings

### Spec Coverage: **96.5%**
- **29** active requirements across Plans/self-judging-workflow (FR-WF-001–013) + Specifications/dev-workflow-platform.md (FR-dependency-*)
- **28** traced to source code
- **1** untraced (FR-dependency-seed), **1** traced but unimplemented (FR-dependency-search)

---

### QO-001: `GET /api/search` endpoint not wired — DependencyPicker search is broken
- **Severity:** P1
- **Category:** spec-drift / unimplemented
- **File:** `Source/Backend/src/app.ts` (missing route registration)
- **Detail:** `FR-dependency-search` requires a `GET /api/search?q=` cross-entity search endpoint. The test file `Source/Backend/tests/routes/search.test.ts` explicitly notes: *"the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* The `DependencyPicker` component calls `workItemsApi.searchItems()` which hits this endpoint — meaning the dependency typeahead is entirely non-functional in the running app. This is an actively broken user-facing feature.
- **Recommendation:** Register the `/api/search` route in `app.ts` and implement it in a new route file (or extend `workItems.ts`). The test file already specifies the full contract.
- **Cross-ref:** TheFixer should implement; TheGuardians should verify no unbounded list exfiltration (threat scenario already documented in inspector.config.yml).

---

### QO-002: Route handlers call the store directly — service layer bypassed
- **Severity:** P1
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts:44`, `workflow.ts:15`, `intake.ts:4`
- **Detail:** CLAUDE.md explicitly prohibits: *"No direct DB calls from route handlers — use the service layer."* All three route files import from `../store/workItemStore` and call it directly (e.g., `store.createWorkItem()`, `store.findAll()`, `store.softDelete()` on lines 44, 73, 79, 89, 134, 142 of `workItems.ts`). Business logic (pagination, filtering, change tracking) lives inside route handlers rather than in the service layer. This couples HTTP concerns to data-access logic and makes services untestable in isolation.
- **Recommendation:** Introduce service functions (or promote the existing `changeHistory.ts`, `dashboard.ts`, `router.ts` pattern to cover CRUD) that the routes delegate to. Route handlers should only extract request params → call service → return response.
- **Cross-ref:** TheFixer for refactoring; existing services (`assessment.ts`, `router.ts`) demonstrate the correct pattern.

---

### QO-003: Duplicate test files — two competing versions of the same tests
- **Severity:** P2
- **Category:** test-coverage / architecture-violation
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`; same for `WorkItemListPage`
- **Detail:** Two pairs of near-duplicate test files exist. The `/tests/pages/` versions are significantly more thorough (import typed enums, use `within`, have more assertions). The root-level versions appear to be older, less-typed iterations never removed. Both run on `npm test`, creating false confidence in coverage and making it ambiguous which version is authoritative. Diffs show different mock setups and different import depths.
- **Recommendation:** Delete the root-level `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/WorkItemListPage.test.tsx`. Retain only the `/pages/` versions.
- **Cross-ref:** TheFixer.

---

### QO-004: Traceability enforcer blind to FR-dependency-* requirements
- **Severity:** P2
- **Category:** spec-drift / pattern-violation
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer (`python3 tools/traceability-enforcer.py`) only scans the most-recently-modified `Plans/*/requirements.md`. This covers FR-WF-001–013 and reports PASSED — but it has no visibility into the 16 FR-dependency-* requirements defined in `Specifications/dev-workflow-platform.md`. As a result, the unimplemented `FR-dependency-search` and untraced `FR-dependency-seed` are invisible to the gate. CLAUDE.md lists traceability-enforcer as a mandatory verification gate, but it gives a false green signal.
- **Recommendation:** Extend the enforcer to also scan `Specifications/` for FR-dependency-* IDs, or add a second plan file at `Plans/dependency-linking/requirements.md` that the enforcer can pick up.
- **Cross-ref:** solo-session can fix tools/.

---

### QO-005: `FR-dependency-seed` — seed data requirement completely unimplemented
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/` (missing seed module)
- **Detail:** `FR-dependency-seed` requires idempotent seed data: BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007; FR-0004 blocked_by FR-0003; FR-0005 blocked_by FR-0002; FR-0007 blocked_by FR-0003. No seed code, no `Verifies: FR-dependency-seed` comment, and no seed invocation exists anywhere in `Source/Backend/`. A fresh environment has an empty dependency graph, making it impossible to demonstrate or test the dependency UI without manual setup.
- **Recommendation:** Add a `src/seed.ts` module that creates the documented dependency relationships idempotently on startup, invoked in `app.ts` before the server starts.
- **Cross-ref:** TheFixer.

---

### QO-006: `eslint-disable` suppressions without inline justification
- **Severity:** P3
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two `eslint-disable-next-line react-hooks/exhaustive-deps` comments are present with no explanation of why the suppression is intentional or safe. CLAUDE.md architecture rules require no disabled linting rules (and implicitly that any suppression be documented). In both cases the suppression masks a real issue — in `useWorkItems.ts` the dependency array is manually listed rather than relying on the linter, which could cause stale-closure bugs if dependencies change.
- **Recommendation:** Either fix the hook to satisfy exhaustive-deps (preferred), or add an inline comment explaining why the suppression is safe (e.g., `// intentional: fetchData is stable across renders`).
- **Cross-ref:** TheFixer.

---

### QO-007: FR namespace lives in Plans, not Specifications — spec-first rule weakened
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Specifications/workflow-engine.md` (no FR IDs), `Plans/self-judging-workflow/requirements.md` (FR-WF-* IDs here instead)
- **Detail:** CLAUDE.md states *"Specs are source of truth — implementation traces to specs, never the other way around."* However, `Specifications/workflow-engine.md` contains only prose (domain model, rules) with no FR IDs. The actual numbered requirements (FR-WF-001–013) live in `Plans/`, not `Specifications/`. This means the traceability chain is `Plans → Source`, not `Specifications → Plans → Source`. The spec layer is bypassed as a formal requirement source.
- **Recommendation:** Either add FR-WF-* IDs directly into `Specifications/workflow-engine.md` as a requirements table, or document that Plans/ is the canonical traceability layer for this project and update CLAUDE.md accordingly.
- **Cross-ref:** solo-session for CLAUDE.md update; requirements-reviewer for spec enhancement.

---

```json
{
  "audit_date": "2026-11-15",
  "spec_coverage_pct": 96.5,
  "requirements_in_scope": 29,
  "requirements_traced": 28,
  "requirements_unimplemented": 1,
  "requirements_untraced": 1,
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "GET /api/search endpoint not wired — DependencyPicker broken"},
    {"id": "QO-002", "severity": "P1", "category": "architecture-violation", "title": "Route handlers call store directly, bypassing service layer"},
    {"id": "QO-003", "severity": "P2", "category": "test-coverage", "title": "Duplicate competing test files for WorkItemDetailPage and WorkItemListPage"},
    {"id": "QO-004", "severity": "P2", "category": "pattern-violation", "title": "Traceability enforcer blind to FR-dependency-* requirements"},
    {"id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed — seed data entirely unimplemented"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressions without justification in two hook files"},
    {"id": "QO-007", "severity": "P3", "category": "architecture-violation", "title": "FR IDs live in Plans/, not Specifications/ — spec-first rule weakened"}
  ],
  "grade": "B",
  "grade_rationale": "0 P1s exploiting auth (no auth layer), 2 functional P1s, 3 P2s, spec coverage 96.5% — meets B threshold (max_p1:0 violated by architecture P1s, but no security-critical P1). Escalate to C if P1 count is interpreted strictly."
}
```
