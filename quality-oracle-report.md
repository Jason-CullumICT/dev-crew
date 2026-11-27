---

## Quality Oracle Findings

### Spec Coverage

| Spec | Requirements | Traced | Coverage |
|------|-------------|--------|----------|
| `Specifications/dev-workflow-platform.md` (primary) | 76 | **0** | **0%** |
| `Plans/self-judging-workflow/requirements.md` | 13 | 13 | 100% |
| `Plans/dependency-linking/requirements.md` (FR-dependency-* IDs) | ~13 | ~13 | ~100% |

**Effective gate result: FALSE GREEN** — the enforcer always targets the plan-level spec and passes, while the primary domain spec has zero coverage.

---

### QO-001: Traceability Gate Gives False Green Against Primary Spec
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:49-57`
- **Detail:** `python3 tools/traceability-enforcer.py` (the CLAUDE.md verification gate) auto-selects the most recently modified `requirements.md` in `Plans/` — currently `Plans/self-judging-workflow/requirements.md` (13 FRs). Running it against the **primary domain spec** `Specifications/dev-workflow-platform.md` reveals **76/76 requirements untraced**, a 0% coverage failure. The gate passes every CI run while the primary spec has zero implementation traceability. CLAUDE.md architecture rule — *"Every FR needs a test with `// Verifies: FR-XXX`"* — is effectively unenforced against the spec that matters.
- **Recommendation:** Add an explicit check in the enforcer (or in a wrapper script) to also run against `Specifications/dev-workflow-platform.md`. Or, formally retire the primary spec in favour of the plan-level requirements and update `inspector.config.yml`'s `specs.dir` accordingly.
- **Cross-ref:** QO-002 (root cause), QO-003 (enforcer regex bug)

---

### QO-002: Primary Domain Spec Completely Orphaned from Implementation
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The primary spec describes a full development lifecycle platform — Feature Request APIs (FR-005–FR-012), Bug Reports (FR-013), Development Cycles (FR-014–FR-016), SQLite backend (FR-002), Pipeline Orchestration (FR-033–FR-049), and 7 frontend pages (FR-022–FR-030). The actual implementation is a **work item workflow engine** with an in-memory store, 4 workflow actions, and dependency tracking. Not a single FR from FR-001 to FR-069 has a `// Verifies:` comment in the codebase. The implemented product matches `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md`. Either the primary spec is an unbuilt roadmap (and should be clearly labelled as such), or the implementation is in severe non-compliance.
- **Recommendation:** Decision required: (a) mark `dev-workflow-platform.md` as `Status: PLANNED / NOT YET IMPLEMENTED` and update `inspector.config.yml` to point to `Specifications/workflow-engine.md` as the active spec, OR (b) treat the primary spec as the authoritative backlog and open work items to close the gap.
- **Cross-ref:** QO-001

---

### QO-003: Enforcer Regex Over-Matches Prose Cross-References as Requirement IDs
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py:63`
- **Detail:** The enforcer's extraction regex `FR-[A-Z0-9-]+` matches any occurrence of that pattern in the requirements file — including **prose spec cross-references** like `"Spec reference: FR-070 — FR-085"` or seed data IDs like `FR-0002`, `FR-0003`. Running the enforcer against `Plans/dependency-linking/requirements.md` produces 7 false failures (FR-0002, FR-0003, FR-0004, FR-0005, FR-0007, FR-070, FR-085) — IDs mentioned in document prose, not actual requirement IDs. This would block the CI gate with spurious failures if that plan were ever targeted.
- **Failure scenario:** `python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md` exits 1 citing 7 "missing" requirements that are spec cross-references, not implementable FRs.
- **Recommendation:** Restrict extraction to table rows that define requirements (e.g., require the ID to appear in `| FR-... |` markdown table syntax), or add a prefix convention (`REQ-`) to distinguish cross-references from requirement IDs.

---

### QO-004: Non-Deterministic Enforcer Target When Plan mtimes Tie
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py:57`
- **Detail:** `max(req_files, key=os.path.getmtime)` is non-deterministic when multiple files share the same mtime. All 8 `requirements.md` files in `Plans/` have identical timestamps (`Nov 27 10:43`). Python's built-in `max()` is stable (returns the first max found) but filesystem ordering is not guaranteed across OS/CI environments. Different CI agents may select different plans, producing inconsistent gate results.
- **Failure scenario:** On a fresh clone (all mtimes identical), one CI runner targets `self-judging-workflow` (passes), another targets `dev-workflow-platform` (fails 76 FRs), producing non-reproducible pipeline results.
- **Recommendation:** Require `--plan` or `--file` to be specified explicitly in CLAUDE.md's verification gate command. Remove silent auto-detection as the default for CI contexts.

---

### QO-005: Duplicate Test Files for WorkItemDetailPage and WorkItemListPage
- **Severity:** P2
- **Category:** test-coverage / pattern-violation
- **File:** `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines) + `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines)
- **Detail:** Vitest's default glob picks up all `*.test.tsx` files recursively. Both `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` run in CI — covering the same component with slightly different test sets. Same for `WorkItemListPage.test.tsx` (286 lines vs 262 lines). The two versions are not identical; the `pages/` versions appear to be newer, more complete iterations. The older versions remain active, introducing test duplication and potential coverage confusion.
- **Failure scenario:** A change to `WorkItemDetailPage.tsx` may pass the older test file but fail the newer one (or vice versa), creating ambiguous CI results.
- **Recommendation:** Consolidate to `tests/pages/` (the more complete version) and delete the top-level duplicates `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx`.

---

### QO-006: Implementation Delta Table in dependency-linking Plan Is Stale
- **Severity:** P3
- **Category:** doc-stale
- **File:** `Plans/dependency-linking/requirements.md` (Implementation Delta section)
- **Detail:** The delta table marks `FR-dependency-api-types` as `❌ Missing`. In reality, `Source/Backend/tests/services/types.test.ts:1` carries `// Verifies: FR-dependency-types, FR-dependency-schema, FR-dependency-api-types` and tests cover `setDependencies` with `blocked_by` arrays. `Source/Shared/api-contracts.md` also references `FR-dependency-api-types`. The plan document is stale and misrepresents the current state.
- **Recommendation:** Update the delta table to mark `FR-dependency-api-types` as `✅ Done`.

---

### QO-007: `eslint-disable` Suppressions in Production Frontend
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two `// eslint-disable-next-line react-hooks/exhaustive-deps` suppressions exist in production source (not tests). These disable valid React hooks dependency warnings and may mask stale closure bugs — specifically, callbacks or effects that depend on values not in their dependency arrays.
- **Recommendation:** Fix the underlying dependency array issues. If genuinely intentional (e.g., fire-once effect), add an inline comment explaining why the omission is deliberate; don't just suppress the rule.

---

### QO-008: `workflow.ts` Route File at 374 Lines (8 Endpoints)
- **Severity:** P3
- **Category:** simplification
- **File:** `Source/Backend/src/routes/workflow.ts`
- **Detail:** 374 lines handling 8 distinct endpoints (route, assess, approve, reject, dispatch, add-dependency, remove-dependency, check-ready). The file is approaching the 500-line threshold noted in CLAUDE.md and mixing workflow state machine actions with dependency management endpoints.
- **Recommendation:** Split into `workflow-actions.ts` (route/assess/approve/reject/dispatch) and `dependency-routes.ts` (dependency CRUD + readiness check).

---

### QO-009: Core Workflow Prometheus Counters Not Independently Tested
- **Severity:** P4
- **Category:** test-coverage
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `workflow_items_created_total`, `workflow_items_routed_total`, `workflow_items_assessed_total`, `workflow_items_dispatched_total` are defined in `metrics.ts` and incremented in route handlers. `Source/Backend/tests/routes/metrics.test.ts` covers only the **dependency** metrics counters (FR-dependency-metrics). No test asserts that the core WF counters increment after create/route/assess/dispatch operations.
- **Recommendation:** Extend `metrics.test.ts` (or add a `workflow-metrics.test.ts`) with tests that POST a work item and assert `workflow_items_created_total` increments. Carry `// Verifies: FR-WF-013`.

---

```json
{
  "audit_date": "2026-11-27",
  "spec_coverage": {
    "primary_spec": {
      "file": "Specifications/dev-workflow-platform.md",
      "total_frs": 76,
      "traced": 0,
      "coverage_pct": 0
    },
    "active_plan_spec": {
      "file": "Plans/self-judging-workflow/requirements.md",
      "total_frs": 13,
      "traced": 13,
      "coverage_pct": 100
    }
  },
  "grade": "D",
  "grade_rationale": "2 P1 findings; primary domain spec at 0% coverage fails min_spec_coverage=80 threshold",
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "status": "OPEN" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "status": "OPEN" },
    { "id": "QO-003", "severity": "P2", "category": "pattern-violation", "status": "OPEN" },
    { "id": "QO-004", "severity": "P2", "category": "pattern-violation", "status": "OPEN" },
    { "id": "QO-005", "severity": "P2", "category": "test-coverage", "status": "OPEN" },
    { "id": "QO-006", "severity": "P3", "category": "doc-stale", "status": "OPEN" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "status": "OPEN" },
    { "id": "QO-008", "severity": "P3", "category": "simplification", "status": "OPEN" },
    { "id": "QO-009", "severity": "P4", "category": "test-coverage", "status": "OPEN" }
  ],
  "positives": [
    "No console.log in production source",
    "No hardcoded secrets found",
    "No empty catch blocks (all catch blocks log + return error response)",
    "Plan-level traceability 100% (FR-WF-* and FR-dependency-* all traced)",
    "No test.skip / test.todo found",
    "eslint-disable usage is minimal (2 occurrences, both documented)",
    "Shared types properly single-sourced in Source/Shared/types/workflow.ts"
  ]
}
```

---

**Learnings file updated** at `Teams/TheInspector/learnings/quality-oracle.md` with all P1/P2 findings, the two-tier spec system discovery, and fast-path file locations for future runs.
