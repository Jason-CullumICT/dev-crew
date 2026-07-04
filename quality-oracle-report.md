Now the full audit report:

---

## Quality Oracle Findings — 2026-07-04

### Spec Coverage: ~97%
- **40 total requirements** across 3 spec files (FR-WF-*, FR-dependency-*, FR-TMP-*)
- **38–39 traced** to source (FR-dependency-search is traced but route not wired; FR-TMP-008 is untraced)
- **Enforcer gate covers only 13/40 requirements** — false confidence in CI

---

### QO-001: `GET /api/search` endpoint not registered in app.ts
- **Severity:** P1
- **Category:** spec-drift / untested at runtime
- **File:** `Source/Backend/src/app.ts:1–54` (route is absent)
- **Detail:** `FR-dependency-search` requires `GET /api/search?q=` for DependencyPicker typeahead. The route is fully tested in `Source/Backend/tests/routes/search.test.ts`, but the test file itself contains a block comment on lines 3–6 explicitly stating: *"the GET /api/search endpoint is NOT wired into app.ts… these tests will FAIL until the route is implemented."* At runtime, `workItemsApi.searchItems()` in the frontend calls `/api/search` and gets a 404 — the DependencyPicker search is entirely broken in production.
- **Recommendation:** Add the `/api/search` router to `app.ts` (pattern: mount it with `app.use('/api/search', searchRouter)`). The handler logic (title/description match, `{data: T[]}` wrapper, soft-delete exclusion) is already defined in the test contract.
- **Cross-ref:** TheFixer (implementation); FR-dependency-search

---

### QO-002: Route handlers import store directly, bypassing service layer
- **Severity:** P2
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/routes/workItems.ts:12` — `import * as store from '../store/workItemStore'`
  - `Source/Backend/src/routes/workflow.ts:15` — same
  - `Source/Backend/src/routes/intake.ts:4` — same
- **Detail:** CLAUDE.md architecture rule: *"No direct DB calls from route handlers — use the service layer."* The `workItemStore` module is the data persistence layer (even if in-memory). Route handlers should interact only with service-layer functions. `services/dependency.ts`, `services/router.ts`, and `services/assessment.ts` correctly own their domain operations; store access in routes short-circuits this pattern.
- **Recommendation:** Create thin service wrappers (e.g., `services/workItem.ts`) that proxy store CRUD. Route handlers call the service, not the store.

---

### QO-003: Traceability enforcer only covers 32.5% of spec requirements
- **Severity:** P2
- **Category:** pattern-violation / test-coverage
- **File:** `tools/traceability-enforcer.py:55–75` (`get_active_requirements` selects by most-recently-modified mtime)
- **Detail:** The enforcer auto-selects `Plans/self-judging-workflow/requirements.md` (13 FR-WF-* requirements) but silently ignores:
  - `Specifications/tiered-merge-pipeline.md` — 10 FR-TMP-* requirements
  - `Specifications/dev-workflow-platform.md` — 17 FR-dependency-* requirements
  
  The CI gate reports `TRACEABILITY PASSED` while 27 of 40 requirements go unchecked. Any regression in dependency or pipeline traceability is invisible to the gate.
- **Recommendation:** Either (a) add a `--all-specs` flag that scans all `Specifications/*.md` and `Plans/*/requirements.md` files, or (b) document in CLAUDE.md that the enforcer must be run three times with explicit `--file` flags for full coverage.

---

### QO-004: FR-TMP-008 untraced — Worker Container Prerequisites
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md` — FR-TMP-008 section
- **Detail:** FR-TMP-008 (Worker Container Prerequisites) has **0** `// Verifies: FR-TMP-008` references anywhere in `platform/`, `Source/`, or `tools/`. All other FR-TMP-* requirements have ≥4 references. This requirement may be unimplemented, or the implementation exists without traceability marking.
- **Recommendation:** Locate the implementation in `platform/orchestrator/lib/workflow-engine.js` or Dockerfile and add `// Verifies: FR-TMP-008` comments, or confirm with the platform team that it was intentionally deferred.

---

### QO-005: Spec drift — `dev-workflow-platform.md` references deleted `portal/` paths
- **Severity:** P3
- **Category:** doc-stale / spec-drift
- **File:** `Specifications/dev-workflow-platform.md:467–482`
- **Detail:** The dependency feature spec (FR-dependency-*) references concrete implementation paths from the old `portal/` codebase: `portal/Shared/types.ts`, `portal/Shared/api.ts`, `portal/Backend schema`, `portal/Frontend/tests/`. The dependency feature was re-implemented in `Source/Backend` and `Source/Frontend`, but the spec was never updated. A developer reading the spec will look in `portal/` for the authoritative implementation and find a different (older) system.
- **Recommendation:** Update the implementation column in the FR-dependency-* table to reference `Source/Backend/src/services/dependency.ts`, `Source/Shared/types/workflow.ts`, etc.

---

### QO-006: Dual logger abstractions — technical debt
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Backend/src/logger.ts` — compatibility shim (default export, used by routes/services)
  - `Source/Backend/src/utils/logger.ts` — canonical implementation (named export)
  - `Source/Backend/src/store/workItemStore.ts:10` — imports directly from `utils/logger`
- **Detail:** Two logger abstractions coexist with different call signatures. The shim exists because different pipeline coders imported from different paths. The store (`workItemStore`) uses `{ logger }` from `utils/logger` with 2-arg call signature; all routes/services use the default `logger` from the shim. This is inconsistent and makes adding log enrichment (e.g., trace IDs) require changes in two places.
- **Recommendation:** Consolidate to one logger. Delete `src/logger.ts`; update all imports to `../utils/logger`. Update the shim's comment ("Backend-coder-2's workflow routes") is now obsolete.

---

### QO-007: Duplicate test files for WorkItemDetailPage and WorkItemListPage
- **Severity:** P3
- **Category:** test-coverage
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (13,484 bytes)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (13,652 bytes) — newer, uses `within()`, imports types
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (9,348 bytes)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (8,047 bytes) — newer path structure
- **Detail:** Two test files cover the same component for both pages. They are not identical — the `pages/` versions are more complete but use relative paths (e.g., `'../../src/pages/WorkItemDetailPage'`) while the root-level versions use `'../src/...'`. Both currently run as separate test suites, potentially producing redundant or contradictory results.
- **Recommendation:** Delete the root-level versions (`tests/WorkItemDetailPage.test.tsx`, `tests/WorkItemListPage.test.tsx`) once confirming the `tests/pages/` versions have equivalent or better coverage.

---

### QO-008: `eslint-disable-next-line react-hooks/exhaustive-deps` × 2
- **Severity:** P4
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` — `handleAdd` deps exclude `selectedRefs`
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` — `useEffect` deps are manually expanded from `filters` object
- **Detail:** Both suppressions appear to be intentional (stale object reference avoidance). However, suppressing the rule without a comment explaining *why* makes future refactors risky — a change to `selectedRefs` update logic in `DependencyPicker` could silently create a stale closure.
- **Recommendation:** Add a `// Reason: ...` inline comment beside each disable explaining the specific stale-closure scenario being avoided. This preserves the intent without opening the door to future subtle bugs.

---

### JSON Summary

```json
{
  "audit_date": "2026-07-04",
  "grade": "C",
  "spec_coverage_percent": 97,
  "enforcer_coverage_percent": 32,
  "requirements_total": 40,
  "requirements_traced": 39,
  "requirements_implemented": 38,
  "findings": {
    "p1": 1,
    "p2": 3,
    "p3": 3,
    "p4": 1
  },
  "open_p1": ["QO-001: GET /api/search not registered"],
  "open_p2": [
    "QO-002: Routes bypass service layer (3 files)",
    "QO-003: Traceability enforcer covers 13/40 requirements",
    "QO-004: FR-TMP-008 untraced"
  ],
  "clean": {
    "console_log_in_prod": false,
    "hardcoded_secrets": false,
    "disabled_tests": false,
    "empty_catch_blocks": false,
    "large_files_over_500_lines": false,
    "todo_fixme_comments": false
  },
  "escalate": []
}
```

---

**Grading rationale (per `inspector.config.yml`):**  
Grade A requires 0 P1 — eliminated by QO-001.  
Grade B requires 0 P1 — eliminated.  
Grade C requires ≤2 P1, ≤15 P2, ≥40% spec coverage — satisfied: 1 P1, 3 P2, 97% coverage.  
**Result: C**
