---

## Quality Oracle Findings

### Spec Coverage Summary

| Spec Domain | Requirements | Traced in Source | Coverage |
|---|---|---|---|
| `Plans/self-judging-workflow` (FR-WF-*) | 13 | 13 | **100%** ✅ |
| `Specifications/dev-workflow-platform.md` (FR-001–069) | 69 | 0 | **0%** ❌ |
| `FR-dependency-*` (all subtypes) | 15 | 14 | **93%** ⚠️ |

**Effective spec coverage (enforcer-validated domain): 100%**
**Specifications/ directory coverage: 0%** ← critical structural issue

---

### QO-001: Specifications/ Describes an Unimplemented Product
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-001 through FR-069)
- **Detail:** `Specifications/` is declared the "most critical documents" and "Domain truth" in CLAUDE.md. However, `dev-workflow-platform.md` documents FR-001–FR-069 for a completely different product (feature request management, bug tracking, dev cycles, pipeline orchestration, frontend pages). The actual implemented product is the **Self-Judging Workflow Engine**, documented in `Specifications/workflow-engine.md` and `Plans/self-judging-workflow/requirements.md`. Zero of the 69 requirements in `dev-workflow-platform.md` have any `// Verifies: FR-XXX` comment in `Source/`. Every agent that reads CLAUDE.md and opens `Specifications/` will be misled about what this codebase builds.
- **Recommendation:** Either (a) move `dev-workflow-platform.md` to `docs/archive/` with a header noting it is a future/unrelated product spec, or (b) add a prominent `README.md` to `Specifications/` clarifying that `workflow-engine.md` is the active implementation spec and `dev-workflow-platform.md` is a roadmap/future spec not yet implemented.
- **Cross-ref:** TheFixer for CLAUDE.md update; requirements-reviewer for Specifications housekeeping.

---

### QO-002: `GET /api/search` Route Not Wired — FR-dependency-search Unimplemented
- **Severity:** P1
- **Category:** spec-drift / untested (failing tests)
- **File:** `Source/Backend/src/app.ts`, `Source/Backend/tests/routes/search.test.ts`
- **Detail:** `FR-dependency-search` requires a `GET /api/search?q=` cross-entity typeahead endpoint. The test file `tests/routes/search.test.ts` explicitly documents: *"As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* Confirmed: `app.ts` registers no search route; no `src/routes/search.ts` exists. The `DependencyPicker` component depends on this endpoint. CI test suite for this file will fail.
- **Recommendation:** Implement `Source/Backend/src/routes/search.ts` with cross-entity search and wire it in `app.ts` as `app.use('/api', searchRouter)`. Add `// Verifies: FR-dependency-search` traceability.
- **Cross-ref:** Route to TheFixer (backend-coder).

---

### QO-003: Traceability Enforcer Has a Blind Spot on `Specifications/`
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py`, `Teams/TheInspector/inspector.config.yml`
- **Detail:** The enforcer auto-detects and scans only `Plans/*/requirements.md` files. The `inspector.config.yml` configures `specs.dir: "Specifications/"` but the enforcer never reads this configuration — it ignores `Specifications/` entirely. CLAUDE.md's verification gate (`python3 tools/traceability-enforcer.py`) always passes as long as Plans-level FRs are traced, creating a false green signal. The 69 requirements in `Specifications/dev-workflow-platform.md` and all NFRs in other specs are unchecked. The stated architecture rule "Every FR needs a test with `// Verifies: FR-XXX`" cannot be enforced at scale.
- **Recommendation:** Update `traceability-enforcer.py` to also accept a `--specs` flag scanning `Specifications/` for requirement IDs, or at minimum warn when `specs.dir` in config contains requirements that are not traced.
- **Cross-ref:** solo-session for `tools/` update.

---

### QO-004: Orphaned Requirement IDs FR-070 through FR-085
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Shared/api-contracts.md:5`, `Source/Shared/api-contracts.md:456`
- **Detail:** `api-contracts.md` declares its scope as "dependency tracking feature [FR-070 through FR-085]". These IDs (FR-070, FR-085) appear in no specification file — `dev-workflow-platform.md` ends at FR-069, and `workflow-engine.md` and `tiered-merge-pipeline.md` use different namespaces. No `Specifications/` document defines what FR-070 through FR-085 mean. This violates the architecture rule "Specs are source of truth — implementation traces to specs, never the other way around."
- **Recommendation:** Create a spec entry for FR-070–FR-085 in `Specifications/` (or the relevant Plan's requirements.md), or update `api-contracts.md` to reference the correct FR-dependency-* IDs that are defined.

---

### QO-005: Duplicate Frontend Test Files — Ambiguous Canonical Location
- **Severity:** P2
- **Category:** test-coverage
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)
- **Detail:** Both `tests/` root-level and `tests/pages/` sub-directory contain test files for the same pages with different line counts, implying different or overlapping test suites. Duplicate test files create ambiguity for agents about which file is the canonical suite to extend, may cause silent gaps (a failing test in the wrong file goes unnoticed), and inflate apparent coverage.
- **Recommendation:** Decide on one canonical location (`tests/pages/` is semantically cleaner). Merge any unique tests from the root-level files into the pages sub-directory, then delete the root-level duplicates.
- **Cross-ref:** TheFixer (frontend-coder).

---

### QO-006: `eslint-disable` Without Rationale Comments
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` without explaining *why* the dependency is intentionally excluded. This is a lint bypass that may mask stale-closure bugs. The spirit of the architecture rule "Never swallow errors silently" extends to linting: bypasses should document the invariant that makes them safe.
- **Recommendation:** Add a comment above each `eslint-disable` explaining the invariant, e.g. `// Intentionally excluding 'fetchItems' — it's a stable ref defined outside effect scope`.

---

### QO-007: `DebugPortalPage` Uses Non-Standard Verifies Comment
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** File opens with `// Verifies: dev-crew debug portal — embedded container-test viewer`. This is not an `FR-XXX`-formatted requirement ID and will never be matched by the traceability enforcer. The page has no traceable spec backing.
- **Recommendation:** If this is infrastructure/scaffolding with no formal requirement, replace the comment with `// Infrastructure: debug portal iframe — not spec-traced` to clarify intentional status.

---

### JSON Summary

```json
{
  "audit_date": "2026-11-07",
  "grade": "C",
  "spec_coverage": {
    "plans_fr_wf": "100%",
    "specifications_fr_001_069": "0%",
    "fr_dependency": "93%"
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Specifications/ describes unimplemented product (FR-001–069 have 0% source coverage)"},
    {"id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "GET /api/search not wired — FR-dependency-search unimplemented, tests fail"},
    {"id": "QO-003", "severity": "P2", "category": "pattern-violation", "title": "Traceability enforcer ignores Specifications/ — false green gate"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-070–FR-085 referenced in api-contracts.md but defined in no spec"},
    {"id": "QO-005", "severity": "P2", "category": "test-coverage", "title": "Duplicate frontend test files for WorkItemDetailPage and WorkItemListPage"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable without rationale in useWorkItems.ts and DependencyPicker.tsx"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "DebugPortalPage uses non-standard Verifies comment"}
  ],
  "p1_count": 2,
  "p2_count": 3,
  "p3_count": 2,
  "escalations": []
}
```

---

**Grade: C** (2 P1s, 3 P2s — within C-band thresholds per grading config)

**Positive observations:**
- All backend and frontend source files modified in the last 14 days carry `// Verifies:` comments
- No `console.log` in production source (only structured logger used)
- No hardcoded secrets or credentials found
- No empty `catch` blocks — all errors are logged with context and re-surfaced
- All catch blocks pass errors to structured logger before responding
- Backend tests have solid Verifies coverage (3–20 comments per test file)
- Shared types are centralized in `Source/Shared/types/workflow.ts` (no inline re-definitions found)

**Routing:**
- QO-001, QO-004: requirements-reviewer (Specifications housekeeping)
- QO-002: TheFixer → backend-coder (implement search route)
- QO-003: solo-session (tools/ update)
- QO-005: TheFixer → frontend-coder (merge duplicate tests)
- QO-006, QO-007: TheFixer → frontend-coder (lint hygiene)
