# Quality Oracle Audit — 2026-08-29

## Spec Coverage Summary

| Scope | Total FR-IDs | Traced to Source/ | Coverage |
|-------|-------------|-------------------|----------|
| Plans/self-judging-workflow (FR-WF-001..013) | 13 | 13 | **100%** |
| Specifications/dev-workflow-platform.md (FR-001..069 + FR-dependency-*) | 89 | 0 | **0%** |
| Specifications/tiered-merge-pipeline.md (FR-TMP-001..010) | 10 | 0 | **0%** |
| **Full corpus** | **112** | **~23** | **~20%** |

The traceability enforcer reports 100% coverage because it only validates the most-recently-modified `Plans/` requirements file (13 requirements). The broader Specifications corpus of 99 additional requirements has zero implementation traceability.

---

## QO-001: Traceability Config Pattern Doesn't Match Any Implementation IDs

- **Severity:** P1
- **Category:** spec-drift / pattern-violation
- **File:** `Teams/TheInspector/inspector.config.yml:37`
- **Detail:** The config defines `traceability: "FR-\\d+"` — matching only `FR-001`, `FR-022`, etc. But every `Verifies:` comment in `Source/` uses `FR-WF-001`, `FR-dependency-service`, `FR-TMP-001`, etc. — none of which match `FR-\d+`. The enforcer's regex therefore cannot verify implementation coverage of the actual IDs used. The "TRACEABILITY PASSED" result is a false positive for the spec corpus as a whole.
- **Recommendation:** Update the config pattern to a union that covers all active ID schemes:
  ```yaml
  traceability: "FR-(?:WF|TMP|dependency)-[\\w-]+"
  ```
  Or use the enforcer's `--file` argument to also validate each spec file in `Specifications/`.
- **Evidence:** `grep -oP "FR-WF-\d+" Source/ ... → 80+ matches`; `grep -oP "FR-\d+" Source/ ... → 0 matches`

---

## QO-002: Main Specification (FR-001..069) Completely Unimplemented

- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The canonical domain spec defines 74 numbered requirements (FR-001 through FR-069) for a **Feature Request / Bug Report / Development Cycle** system with SQLite persistence. `Source/` instead implements a **Work Item workflow engine** (FR-WF-001..013) with an in-memory store — a completely different domain model. No `// Verifies: FR-XXX` comment in `Source/` references any of these 74 IDs. The specification and the implementation describe different products.
  - FR-001..030: Feature requests, bug reports, cycles, dashboard, learnings, features — all **unimplemented**
  - FR-031..049: Pipeline integration (PipelineRun, stages) — all **unimplemented**
  - FR-050..069: Cycle feedback, CycleFeedback table — all **unimplemented**
- **Recommendation:** Either (a) mark `Specifications/dev-workflow-platform.md` as **superseded** by `Specifications/workflow-engine.md` with a clear header comment, or (b) open a backlog item to reconcile which spec is active. This is the highest-priority doc debt in the project.
- **Cross-ref:** The `Plans/self-judging-workflow/requirements.md` is what actually drove the implementation. It should be promoted as the canonical spec, or its FRs should be back-ported into the Specifications layer.

---

## QO-003: Tiered-Merge-Pipeline Spec Entirely Unimplemented

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** 10 functional requirements (FR-TMP-001 through FR-TMP-010) define risk classification, E2E test generation, live Playwright runner, auto-PR, AI PR review, and auto-merge logic. Zero source files in `Source/` reference these IDs. The spec itself indicates this was planned but Phase 1 and Phase 2 have not been started.
- **Recommendation:** Add explicit "Status: Planned / Not Started" frontmatter to this spec so reviewers know it's backlogged, not abandoned. Alternatively, create a Plan with `requirements.md` so the enforcer can gate it.

---

## QO-004: Architecture Violation — Routes Import Store Directly

- **Severity:** P2
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/routes/workItems.ts:12`
  - `Source/Backend/src/routes/intake.ts:4`
  - `Source/Backend/src/routes/workflow.ts:15`
- **Detail:** CLAUDE.md explicitly states: *"No direct DB calls from route handlers — use the service layer."* All three route files import `* as store from '../store/workItemStore'` and call `store.createWorkItem()`, `store.findWorkItem()`, `store.updateWorkItem()`, `store.deleteWorkItem()` directly. The service layer exists (`assessment.ts`, `changeHistory.ts`, `dashboard.ts`, `dependency.ts`, `router.ts`) but CRUD operations bypass it entirely.
- **Recommendation:** Extract a `WorkItemService` that wraps the store CRUD and expose it through the service layer. Route handlers should call `workItemService.create()` not `store.createWorkItem()`.
- **Cross-ref:** [ESCALATE → TheFixer] — refactor task. Routes can be updated incrementally without breaking tests.

---

## QO-005: Search Endpoint Not Wired — Tests Expected to Fail

- **Severity:** P2
- **Category:** untested / spec-drift
- **File:** `Source/Backend/tests/routes/search.test.ts:1-10`
- **Detail:** `FR-dependency-search` requires `GET /api/search` (cross-entity typeahead). The test file explicitly documents: *"NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* The endpoint is absent from `app.ts`. Having production test files that are authored to fail is an anti-pattern — it pollutes the test suite's signal. The test runner will mark this as a regression even though it's a known gap.
- **Recommendation:** Either (a) implement the route (a simple `workItemStore.findAll()` filter on `q` string), or (b) wrap the entire describe block in `describe.skip(...)` with a ticket reference until it's built.
- **Cross-ref:** [ESCALATE → TheFixer] — low-complexity route to add.

---

## QO-006: FR-dependency-* Requirements Not Reachable by Enforcer

- **Severity:** P2
- **Category:** spec-drift / traceability
- **File:** `Specifications/dev-workflow-platform.md:461-482`
- **Detail:** 15 `FR-dependency-*` requirements (FR-dependency-service, FR-dependency-dispatch-gating, etc.) are defined in the main spec. Source code does reference these in `Verifies:` comments (`Source/Backend/src/services/dependency.ts`, `Source/Frontend/src/api/client.ts`, etc.) — so implementation exists. However:
  1. The enforcer's `FR-\d+` pattern won't match `FR-dependency-*` (alphanumeric suffix, no trailing digits).
  2. These requirements are in `Specifications/`, not in a `Plans/*/requirements.md` file that the enforcer scans.
  
  Result: 15 requirements are partially implemented but entirely invisible to the traceability gate.
- **Recommendation:** Create `Plans/dependency-linking/requirements.md` that mirrors the 15 FR-dependency-* IDs so the enforcer can validate them. Or extend the enforcer to also scan `Specifications/` files.

---

## QO-007: eslint-disable Suppressions Without Documentation

- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` without any comment explaining why the omission is safe. This rule exists to prevent stale-closure bugs; suppressing it without rationale is technical debt.
- **Recommendation:** Add a brief inline comment explaining the dependency omission:
  ```ts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Intentionally omit `filter` to avoid infinite re-fetch loop; filter changes reset page via separate effect
  ```

---

## QO-008: Traceability Enforcer Only Audits Most-Recent Plan

- **Severity:** P3
- **Category:** spec-drift / pattern-violation
- **File:** `tools/traceability-enforcer.py:38-55`
- **Detail:** Without `--plan` or `--file` arguments, the enforcer auto-selects the most-recently-modified `Plans/*/requirements.md`. With 19 plan directories present, this means 18 plans are silently ignored on every verification gate run. CLAUDE.md's verification gate (`python3 tools/traceability-enforcer.py`) gives the illusion of full coverage but only validates 13 of 112+ tracked requirements.
- **Recommendation:** Update the `CLAUDE.md` verification gate command to enumerate all active specs explicitly, or update the enforcer to accept `--all-plans` flag that aggregates all `Plans/*/requirements.md` files.

---

## Pattern Enforcement Results (clean)

| Check | Result |
|-------|--------|
| `console.log` in production source | ✅ None found — logger abstraction used |
| Hardcoded secrets | ✅ None found |
| Empty `catch` blocks | ✅ None found |
| `@ts-ignore` / `@ts-nocheck` | ✅ None found |
| Files > 500 lines | ✅ None found |
| Skipped/todo tests | ✅ None found (but see QO-005) |

---

## Spec Coverage by Enforcer Scope

```
Enforcer reports:  100% (13/13 FR-WF-001..013)  ← narrow scope
Full corpus audit:  ~20% (~23/112 across all Specifications/)
```

**Effective grade against inspector.config.yml grading criteria:**
- `min_spec_coverage: 80` (grade A) → **FAIL**  
- `min_spec_coverage: 60` (grade B) → **FAIL**  
- `min_spec_coverage: 40` (grade C) → **FAIL**  
- Grade **D** applies: P1 findings present (QO-001, QO-002)

---

## JSON Summary

```json
{
  "audit_date": "2026-08-29",
  "grade": "D",
  "spec_coverage_enforcer": "100%",
  "spec_coverage_full_corpus": "~20%",
  "total_requirements_in_specs": 112,
  "requirements_traced_to_source": 23,
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "pattern-violation", "title": "Traceability config regex matches no actual IDs in source" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "FR-001..069 (74 requirements) completely unimplemented in Source/" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-001..010 (10 requirements) entirely unimplemented" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "3 route files import store directly, bypassing service layer" },
    { "id": "QO-005", "severity": "P2", "category": "untested", "title": "GET /api/search not wired; tests authored to fail in CI" },
    { "id": "QO-006", "severity": "P2", "category": "traceability", "title": "FR-dependency-* (15 requirements) invisible to enforcer" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable without rationale in 2 Frontend files" },
    { "id": "QO-008", "severity": "P3", "category": "spec-drift", "title": "Enforcer auto-selects most-recent plan only, silently ignores 18 others" }
  ],
  "escalations": [
    { "finding": "QO-004", "team": "TheFixer", "reason": "Service layer refactor needed for route handlers" },
    { "finding": "QO-005", "team": "TheFixer", "reason": "Missing search route implementation" }
  ]
}
```
