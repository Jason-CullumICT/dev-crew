---

## Quality Oracle Findings

### Spec Coverage: ~58% (effective)

| Spec source | FR IDs defined | Source traces | Coverage |
|---|---|---|---|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` (FR-dependency-*) | 14 | 14 | **100%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 10 | 0 | **0%** |
| `Specifications/dev-workflow-platform.md` (FR-001–069) | 69 | 0 | **0% — different product** |
| `Specifications/workflow-engine.md` | 0 (narrative) | — | **unmeasurable** |

---

### QO-001: GET /api/search Endpoint Missing from Route Registration
- **Severity:** P1
- **Category:** unimplemented-requirement
- **File:** `Source/Backend/src/app.ts` + `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** `FR-dependency-search` is fully spec'd in `Specifications/dev-workflow-platform.md` and has a complete test suite in `tests/routes/search.test.ts`. The test file's own header says: *"NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* No `searchRouter` is imported or mounted in `app.ts`. Any request to `GET /api/search` returns 404, breaking the `DependencyPicker` typeahead feature.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts`, implement the handler (cross-entity work-item search by title/description, `{data: [...]}` wrapper), wire it into `app.ts` with `app.use('/api/search', searchRouter)`, then confirm the test suite passes.
- **Cross-ref:** TheFixer (implementation), security review for unbounded search payload

---

### QO-002: Spec-Plan Inversion — FR-WF-* Requirements Live in Plans/, Not Specifications/
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `Plans/self-judging-workflow/requirements.md` vs `Specifications/workflow-engine.md`
- **Detail:** CLAUDE.md declares *"Every decision and line of code must trace back to a specification"* and *"Specifications/ = Domain truth."* But `Specifications/workflow-engine.md` is a **narrative-only** document with zero numbered `FR-*` IDs. The actual requirement IDs that all source `// Verifies:` comments point to (FR-WF-001–013) are defined in a **Plan** document, not a Spec. This means the fundamental architecture rule ("implementation traces to specs") is structurally impossible to satisfy for the workflow engine — there is no spec to trace to. The traceability chain is: source → plan → (no spec). Additionally, `Specifications/` currently contains 69 FR-IDs (FR-001–069) for a completely different application (portal, SQLite, feature-request voting) that is not in `Source/` at all.
- **Recommendation:** Either (a) add a numbered requirements table to `Specifications/workflow-engine.md` that formalises FR-WF-001–013 as the canonical spec-level IDs, retiring the Plan version as the source of truth, or (b) update CLAUDE.md to explicitly acknowledge that Plans carry spec authority for this project. Also archive or section-label FR-001–069 in `dev-workflow-platform.md` as "portal subsystem — not in Source/."
- **Cross-ref:** Requirements reviewer, team leads

---

### QO-003: Stale Specs for a Different Product Pollute the Specifications Directory
- **Severity:** P2
- **Category:** spec-drift / doc-stale
- **File:** `Specifications/dev-workflow-platform.md` lines 341–459
- **Detail:** FR-001 through FR-069 describe a portal application with SQLite database, feature-request voting, development cycles, learnings tables, pipeline stages, feedback models — none of which exist in `Source/`. These are 69 formally numbered requirements with 0 source traces. They appear to be the specification for the legacy portal product. Their presence in `Specifications/` causes every coverage metric to show catastrophically low numbers (0%) and confuses automated analysis. They also make it appear the current application is massively under-specified.
- **Recommendation:** Add a clear header block at the top of the section: `## Portal Subsystem (legacy — lives in portal/, not Source/)`. Or move this content to `docs/portal-specs.md`. Either way, the enforcer should be taught to exclude them when scanning Source/.
- **Cross-ref:** Requirements reviewer

---

### QO-004: FR-TMP-001–010 Have Zero Source Traces
- **Severity:** P2
- **Category:** spec-drift / unimplemented-requirement
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** Ten requirements (FR-TMP-001: Risk Classification, FR-TMP-002: Playwright E2E Generation, FR-TMP-003: Live E2E Runner, FR-TMP-004: Auto-PR, FR-TMP-005: AI PR Review, FR-TMP-006: Auto-Merge, FR-TMP-007: Configuration, FR-TMP-008: Worker Prerequisites, FR-TMP-009: Run JSON Extensions, FR-TMP-010: Error Handling) have no `// Verifies: FR-TMP-*` comments anywhere in `Source/` or `E2E/`. These features may live in `platform/` (which pipeline agents cannot inspect by policy), or they may be unimplemented. There is no status indicator in the spec.
- **Recommendation:** Add a **Status** column to the spec table for each FR-TMP-* ID: `not-started`, `implemented-in-platform`, or `deferred`. If implemented in `platform/`, add a pointer comment. If deferred, note the backlog target.
- **Cross-ref:** Platform engineer (solo session)

---

### QO-005: Traceability Enforcer Scope Is Dangerously Narrow
- **Severity:** P2
- **Category:** test-coverage / pattern-violation
- **File:** `tools/traceability-enforcer.py` (runtime behaviour)
- **Detail:** Running `python3 tools/traceability-enforcer.py` reports **"TRACEABILITY PASSED: All requirements have implementation references"** — but it only scans 13 requirements from `Plans/self-judging-workflow/requirements.md`. The 83 FR IDs in `Specifications/` (FR-dependency-*, FR-TMP-*, FR-001–069) are not scanned at all. This creates **false confidence** in traceability completeness. CLAUDE.md lists this enforcer as a mandatory verification gate, so agents completing work will run it, see PASSED, and conclude they've satisfied the traceability rule — when in fact 84% of spec-level requirements are unchecked.
- **Recommendation:** Extend the enforcer to also scan `Specifications/dev-workflow-platform.md` for FR-dependency-* IDs (which are correctly implemented) and FR-TMP-* IDs (which are unimplemented). Consider a config parameter in `inspector.config.yml` under `specs.additional_files`. At minimum, add a footer to the enforcer output: *"NOTE: Only Plans/self-judging-workflow/requirements.md was scanned. Specifications/ was not checked."*
- **Cross-ref:** TheFixer

---

### QO-006: `eslint-disable` Suppressing Hook Dependency Warnings
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two `// eslint-disable-next-line react-hooks/exhaustive-deps` comments suppress the `react-hooks/exhaustive-deps` rule. This rule exists to prevent stale closures in `useEffect`/`useCallback`. Suppressing it without a documented reason means future changes to the dependencies could introduce subtle bugs (e.g., `useWorkItems` polling with stale pagination state). CLAUDE.md flags disabled linting rules as a code smell.
- **Recommendation:** Either fix the hooks to correctly declare all dependencies (often by extracting stable refs or using `useCallback`), or add an inline comment explaining *why* the suppression is intentional (e.g., `// intentional: filters is used as a trigger not a closure dep`). The second option satisfies the "explicitly document why" exception from the architecture rules.
- **Cross-ref:** TheFixer

---

### QO-007: `workflow-engine.md` Lacks Numbered Requirements — Formal Traceability Impossible at Spec Layer
- **Severity:** P3
- **Category:** architecture-violation / doc-stale
- **File:** `Specifications/workflow-engine.md`
- **Detail:** The canonical spec for the Source/ application is entirely narrative — it defines the domain model, status lifecycle, API surface, and routing rules in prose and tables, but contains **zero `FR-*` numbered requirement IDs**. This means there is no formal spec-level traceability target for any implementation, which violates the project rule "implementation traces to specs." Any `// Verifies: FR-WF-*` comment traces to a Plan, not a Spec.
- **Recommendation:** Retrofit numbered requirement IDs into `workflow-engine.md` (aligned with FR-WF-001–013 from the plan), making the spec the authoritative source and the plan the derivative document.
- **Cross-ref:** Requirements reviewer

---

### Overall Grade: **C**

| Criterion | Threshold | Actual |
|---|---|---|
| P1 findings | ≤ 2 for C | **2** (QO-001, QO-002) |
| P2 findings | ≤ 15 for C | **3** (QO-003, QO-004, QO-005) |
| Spec coverage (Source-relevant) | ≥ 40% for C | **~58%** (14/24 applicable spec FR IDs) |

**What's working well:**
- FR-WF-001–013: 100% traced with `// Verifies:` comments in both source and tests ✓  
- FR-dependency-*: 100% traced across backend and frontend ✓  
- No `console.log` in production code — logger abstraction used uniformly ✓  
- No hardcoded secrets or credentials ✓  
- No empty catch blocks ✓  
- No files exceeding 500 lines ✓  
- Test files carry `// Verifies:` headers across all backend and frontend test suites ✓  

**Biggest risk:** The GET /api/search gap (QO-001) means `DependencyPicker` typeahead is broken in production. All other findings are structural/process issues that don't affect runtime correctness.

---

```json
{
  "audit_date": "2026-08-21",
  "grade": "C",
  "spec_coverage_pct": 58,
  "p1_count": 2,
  "p2_count": 3,
  "p3_count": 2,
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "unimplemented-requirement", "title": "GET /api/search not wired into app.ts" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "FR-WF-* live in Plans/ not Specifications/" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "Stale portal specs (FR-001-069) in Specifications/" },
    { "id": "QO-004", "severity": "P2", "category": "unimplemented-requirement", "title": "FR-TMP-001-010 have zero source traces" },
    { "id": "QO-005", "severity": "P2", "category": "pattern-violation", "title": "Traceability enforcer false-passing on narrow scope" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable suppressing hook dependency warnings" },
    { "id": "QO-007", "severity": "P3", "category": "architecture-violation", "title": "workflow-engine.md has no numbered requirements" }
  ],
  "escalations": [],
  "route_to_fixer": ["QO-001", "QO-005", "QO-006"]
}
```
