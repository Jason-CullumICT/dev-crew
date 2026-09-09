---

## Quality Oracle Findings

### Spec Coverage: ~13%
- `Specifications/dev-workflow-platform.md`: ~84 FRs (FR-001–FR-069 + FR-dependency-*) — **0 implemented** with those IDs
- `Specifications/tiered-merge-pipeline.md`: FR-TMP-001+ — **0 implemented**
- `Plans/self-judging-workflow/requirements.md`: 13 FRs — **13 implemented (100%)**
- Enforcer verdict: **PASSED** (misleading — it targets Plans/, not Specifications/)

---

### QO-001: Traceability Enforcer Targets the Wrong Document
- **Severity:** P1
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py` (config) / `Plans/self-judging-workflow/requirements.md`
- **Detail:** The verification gate (`python3 tools/traceability-enforcer.py`) scans only `Plans/self-judging-workflow/requirements.md` — 13 FR-WF-* requirements. The inspector config declares `specs.dir: "Specifications/"` which contains 84+ formal FR-XXX requirements in `dev-workflow-platform.md` and FR-TMP-* requirements in `tiered-merge-pipeline.md`. The gate reports "TRACEABILITY PASSED" but has never checked the canonical specification documents. Every agent team runs this gate and gets false confidence.
- **Recommendation:** Update `traceability-enforcer.py` to also scan `Specifications/dev-workflow-platform.md` for FR-XXX IDs, or (if the project has formally pivoted) add a deprecation/superseded notice to the three unimplemented specs and document the canonical requirements source.
- **Cross-ref:** QO-002 (root cause of the mismatch)

---

### QO-002: `Specifications/dev-workflow-platform.md` Describes an Unbuilt System
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (lines 337–482)
- **Detail:** The spec defines 69 numbered requirements (FR-001–FR-069) for a SQLite-backed platform with feature requests, bug reports, development cycles, pipeline runs, and a multi-page React UI. The actual `Source/` codebase implements a completely different product — an in-memory work-item workflow engine with FR-WF-001–FR-013 IDs. Zero source files contain `// Verifies: FR-001` through `// Verifies: FR-069`. This is not "work in progress" — the schema (SQLite, cycle_feedback, pipeline_runs tables), the domain entities (FeatureRequest, BugReport, DevelopmentCycle, Ticket, Vote), and all corresponding UI pages (7 pages from Approvals to Feature Browser) have no implementation. The codebase pivoted to a different architecture without archiving or superseding this spec.
- **Failure scenario:** Any new agent reading `Specifications/dev-workflow-platform.md` as truth (per CLAUDE.md: "Specs are source of truth") will implement against it — creating a parallel codebase conflicting with Source/.
- **Recommendation:** Either (a) mark `dev-workflow-platform.md` as `status: SUPERSEDED` and note the pivot, or (b) if the platform is still the target product, create a Plan to implement it and stop building the workflow engine. The ambiguity is the most dangerous risk in this repo.

---

### QO-003: `tiered-merge-pipeline.md` Has Zero Implementation
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** This spec defines FR-TMP-001 through FR-TMP-009+ (risk classification, Playwright E2E generation, live E2E runner, auto-PR, AI review, auto-merge). The `Source/E2E/` directory contains only two Playwright config files (`playwright.config.ts`, `playwright.pipeline.config.ts`) — no `tests/` directory, no generated test files, no FR-TMP-* traceability in any source file. The spec declares "Phase 1 scope (this implementation)" but no implementation exists.
- **Failure scenario:** CI gates that depend on E2E test coverage will silently pass with no tests. The pipeline config references a tests directory that doesn't exist.
- **Recommendation:** Either create a Plan and implementation for FR-TMP-001+, or mark the spec as `status: PLANNED` with a target milestone. Create `Source/E2E/tests/.gitkeep` with a TODO to prevent the empty-directory confusion.

---

### QO-004: Duplicate Test Files with Diverged Content
- **Severity:** P2
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` and `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx`; same for `WorkItemListPage`
- **Detail:** Two versions of each test file exist: the root-level versions (e.g., `tests/WorkItemDetailPage.test.tsx`) are older stubs with fewer mocks and no typed fixtures. The `tests/pages/` versions are more complete — they import typed fixtures, use `within()`, and have correct relative paths. Both are picked up by Vitest's glob patterns, running duplicate/conflicting tests. The root-level versions mock fewer API methods (they omit `list`, `create`, `assess`, etc.) which means some test scenarios run against an incomplete mock.
- **Failure scenario:** A new test assertion added to `tests/pages/WorkItemDetailPage.test.tsx` could be contradicted by a passing-but-stale assertion in `tests/WorkItemDetailPage.test.tsx`. CI reports green when only the weaker tests pass.
- **Recommendation:** Delete the root-level stubs (`tests/WorkItemDetailPage.test.tsx`, `tests/WorkItemListPage.test.tsx`) — the `tests/pages/` versions are the canonical, more complete files.

---

### QO-005: `eslint-disable` Suppression of Hook Dependency Rule
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82` and `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both recently-modified files suppress `react-hooks/exhaustive-deps` via `// eslint-disable-next-line`. This rule guards against stale closures in `useEffect`/`useCallback` hooks — suppressing it without documentation is a P3 hygiene violation per CLAUDE.md architecture rules ("Disabled linting rules"). `useWorkItems.ts` uses an explicit dependency array which suggests the suppression is intentional (preventing re-fetch loops), but no comment explains the rationale.
- **Recommendation:** Add an inline comment explaining *why* the dependency is intentionally omitted (e.g., `// intentionally omit 'fetchWorkItems' to prevent re-fetch loop — stable via useCallback`). This converts an unexplained suppression to documented intent.

---

### QO-006: portal/ Specification vs. Source/ Implementation Path Mismatch
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Specifications/dev-workflow-platform.md:467` / `portal/` directory
- **Detail:** The FR-dependency-* requirements in `dev-workflow-platform.md` explicitly reference `portal/Shared/types.ts` as the implementation path. The actual implementation lives in `Source/Shared/types/workflow.ts` and `Source/Frontend/src/components/`. The `portal/` directory exists with its own `Backend/`, `Frontend/`, `Shared/` structure but the dependency feature was built in `Source/` instead. This means `portal/Shared/` is either a stub or a separate product — currently unclear.
- **Recommendation:** Clarify `portal/`'s purpose in CLAUDE.md Key Domain Concepts (currently blank). If portal/ is the debug UI embed (as CLAUDE.md layout suggests), document that the FR-dependency-types reference in the spec was superseded by the Source/ implementation.

---

### QO-007: `Source/Backend/src/routes/workflow.ts` Approaching Size Threshold
- **Severity:** P4
- **Category:** simplification
- **File:** `Source/Backend/src/routes/workflow.ts:374`
- **Detail:** At 374 lines this file is approaching the 500-line threshold. It handles route/assess/approve/reject/dispatch actions — five distinct workflow operations that each contain significant logic. Splitting into per-action route modules would improve readability and align with the service-layer architecture.
- **Recommendation:** Not urgent. Flag for refactor when next touching this file.

---

### Summary JSON

```json
{
  "audit_date": "2026-09-09",
  "spec_coverage": {
    "specifications_dir_frs": 84,
    "implemented_frs": 0,
    "plans_frs": 13,
    "plans_implemented": 13,
    "enforcer_verdict": "PASSED (targets Plans/, not Specifications/)",
    "true_coverage_pct": 13
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer targets Plans/ not Specifications/" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "dev-workflow-platform.md describes 84 unimplemented FRs" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "tiered-merge-pipeline.md has zero implementation" },
    { "id": "QO-004", "severity": "P2", "category": "test-coverage", "title": "Duplicate test files with diverged content" },
    { "id": "QO-005", "severity": "P3", "category": "pattern-violation", "title": "Undocumented eslint-disable in 2 recently-modified files" },
    { "id": "QO-006", "severity": "P3", "category": "architecture-violation", "title": "portal/ spec path vs Source/ implementation mismatch" },
    { "id": "QO-007", "severity": "P4", "category": "simplification", "title": "workflow.ts approaching 500-line threshold" }
  ],
  "grade": "D",
  "grade_rationale": "P1 count=2 exceeds A/B/C gates; spec_coverage=13% below all thresholds except D"
}
```

---

**Grade: D**

The gate thresholds (per `grading` config) require spec coverage ≥ 40% even for a C. True Specifications/ coverage is ~13%, and there are 2 P1 findings. The workflow engine implementation itself is clean — traceability enforcer passes, no `console.log`, no empty catch blocks, architecture rules followed for the FR-WF-* requirements. The D grade is driven entirely by the spec ecosystem mismatch: three specs in `Specifications/` describing systems that were either never built or superseded, while the enforcer checks a fourth document (in Plans/) that isn't under `Specifications/`. Resolving QO-001 and QO-002 (archiving the superseded specs or updating the enforcer) would lift this to a B.
