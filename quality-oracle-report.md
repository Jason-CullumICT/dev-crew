Now the full audit report:

---

## Quality Oracle Findings — 2026-09-13

### Spec Coverage Summary

| Scope | FRs | Traced | % |
|---|---|---|---|
| Active plan (FR-WF-001–013) | 13 | 13 | **100%** ✅ |
| `dev-workflow-platform.md` FR-001–069 | 69 | 0 | **0%** ⛔ |
| `dev-workflow-platform.md` FR-dependency-* | 15 | ~12 | **~80%** ⚠️ (model mismatch — see QO-004) |
| `tiered-merge-pipeline.md` FR-TMP-001–010 | 10 | 0 | **0%** ⛔ |
| **Overall (all Specifications/ named FRs)** | **107** | **13** | **12.1%** |

> **Context note:** The low overall number is not code rot — `dev-workflow-platform.md` describes an abandoned SQLite/feature-request system that was never built in `Source/`. The implemented system traces 100% of its own plan. The true risk is that the spec files are ambiguous about which system they describe, causing spec drift confusion.

**Enforcer verdict:** `TRACEABILITY PASSED` — but the enforcer only scans the most-recent plan, not `Specifications/`. It gives green on a 12% total trace rate.

**Estimated grade per config:** **D** (spec coverage < 40%; 1 P1 present; C requires max_p1 ≤ 2 *and* coverage ≥ 40%).

---

### QO-001 · GET /api/search missing — DependencyPicker typeahead broken at runtime
- **Severity:** P1
- **Category:** untested / spec-drift
- **Files:**
  - `Source/Backend/src/app.ts` — no `/api/search` route registered
  - `Source/Backend/tests/routes/search.test.ts:1` — file header self-documents the gap: *"NOT wired into app.ts … tests will FAIL until the route is implemented"*
  - `Source/Frontend/src/api/client.ts:101–104` — `searchItems()` calls `/search?q=`
  - `Source/Frontend/src/components/DependencyPicker.tsx:54` — calls `searchItems` on keystroke
- **Failure scenario:** User opens the DependencyPicker modal and types a search query. The frontend calls `GET /api/search?q=…`. The backend has no handler for that path and Express falls through to `errorHandler`, returning 404/500. The picker shows no results; users cannot set up dependency links via search. FR-dependency-search / FR-dependency-api-client are partially unimplemented.
- **Recommendation:** Add a search route in `Source/Backend/src/routes/workItems.ts` (or a new `search.ts`), wire it into `app.ts`, and confirm `Source/Backend/tests/routes/search.test.ts` goes green.
- **Cross-ref:** Route to TheFixer.

---

### QO-002 · Traceability enforcer is blind to Specifications/ — false-green coverage gate
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py` (entire file)
- **Detail:** The enforcer resolves its target by scanning `Plans/**/requirements.md` files, picking the most-recently-modified. It never reads `Specifications/`. This means FR-001 through FR-069 (`dev-workflow-platform.md`) and FR-TMP-001 through FR-TMP-010 (`tiered-merge-pipeline.md`) are never checked. The gate reports PASSED even though 94 of 107 named requirements in `Specifications/` have no source trace.
- **Failure scenario:** A developer reads "TRACEABILITY PASSED" in CI and assumes all spec requirements are covered. They are not. Requirements for a future feature (tiered merge pipeline) are silently absent from the build.
- **Recommendation:** Either (a) add a `--specs-dir` mode to the enforcer that also scans `Specifications/` for FR IDs and reports untraced ones, or (b) add a YAML frontmatter `status: deprecated|roadmap|active` field to each spec file so the enforcer can skip non-active specs intentionally.
- **Cross-ref:** Requires solo session edit of `tools/`.

---

### QO-003 · dev-workflow-platform.md describes an unbuilt system — 69 FRs with 0% trace
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:337–459`
- **Detail:** FR-001 through FR-069 specify a feature-request/bug-tracking platform with SQLite, AI voting, development cycles, pipeline runs, and React pages for approvals, learnings, and feature browsers. None of these entities, tables, or routes exist in `Source/`. The implemented system (`Source/`) is an in-memory work item workflow engine. The two systems share no code or data model.
- **Failure scenario:** An agent or developer assigned to implement FR-006 (duplicate detection with 80% title similarity) will look for SQLite tables that don't exist and feature-request routes that aren't present — causing significant wasted effort or incorrect scope.
- **Recommendation:** Add a `status: roadmap` banner to `dev-workflow-platform.md` (or move it to a `Specifications/Roadmap/` subdirectory) to signal it is aspirational, not the current implementation target.

---

### QO-004 · FR-dependency-* IDs used in two incompatible domain models
- **Severity:** P2
- **Category:** spec-drift
- **Files:**
  - `Specifications/dev-workflow-platform.md:461–482` — FR-dependency-* describe a *portal* system: `portal/Shared/types.ts`, SQLite junction table, `BugStatus`/`FeatureRequestStatus` enums
  - `Source/Backend/src/services/dependency.ts:1` — uses `// Verifies: FR-dependency-service` but implements against `WorkItemStatus` and in-memory store
  - `Source/Backend/tests/routes/dependencies.test.ts:1` — `// Verifies: FR-dependency-endpoints`
- **Detail:** The FR-dependency-* IDs were lifted from `dev-workflow-platform.md` and applied to a re-implementation in a completely different system. The spec says `DependencyLink` lives in `portal/Shared/types.ts`; the code puts it in `Source/Shared/types/workflow.ts`. The spec says blockers apply to `BugStatus`/`FeatureRequestStatus`; the code applies them to `WorkItemStatus`. A reader cross-referencing code to spec will find systematic mismatches.
- **Recommendation:** Either update `dev-workflow-platform.md` dependency section to reflect the actual implementation, or create a new canonical spec file `Specifications/dependency-tracking.md` that accurately describes the work-item-based implementation.

---

### QO-005 · tiered-merge-pipeline.md — 10 FR-TMP requirements with zero implementation
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md:15–134`
- **Detail:** FR-TMP-001 (risk classification), FR-TMP-002 (Playwright test generation), FR-TMP-003 (live E2E runner), FR-TMP-004 (auto-PR), FR-TMP-005 (AI PR review), FR-TMP-006 (auto-merge), FR-TMP-007 (configuration), FR-TMP-008 (worker prerequisites), FR-TMP-009 (run JSON extensions), FR-TMP-010 (error handling) — none of these are referenced anywhere in `Source/`.
- **Failure scenario:** Any agent assigned to "implement the tiered merge pipeline" would start from scratch with no existing code, but CI's traceability gate would show green, hiding the gap.
- **Recommendation:** Add `status: roadmap` frontmatter or move to `Specifications/Roadmap/`.

---

### QO-006 · Duplicate frontend test files for WorkItemDetailPage and WorkItemListPage
- **Severity:** P3
- **Category:** test-coverage
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines, 19 test cases)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines, 20 test cases)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (286 lines)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (262 lines)
- **Detail:** Both file pairs cover the same component. This means tests are running twice per CI run, masking any real coverage gap, and changes to the component must be kept in sync across two files. The `tests/pages/` variants appear to be newer (have `FR-WF-011` traceability comments); the root-level ones may be the older copy.
- **Recommendation:** Delete the root-level duplicates (`tests/WorkItemDetailPage.test.tsx`, `tests/WorkItemListPage.test.tsx`) after confirming the `tests/pages/` versions have equivalent or better coverage.

---

### QO-007 · eslint-disable-next-line react-hooks/exhaustive-deps in production code
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Silencing the exhaustive-deps rule without explanation can hide stale-closure bugs where a `useEffect` or `useCallback` captures an outdated value of a dependency. Neither suppression has a comment explaining why the omission is intentional.
- **Failure scenario:** A future change adds a new prop/state that the effect depends on; the suppressed lint rule means the omission won't be caught, causing subtle stale-data bugs.
- **Recommendation:** Either fix the dependency arrays to be exhaustive, or add an inline comment explaining why the specific dep is intentionally omitted (e.g., `// intentionally omit — fetchItems identity is stable`).

---

### QO-008 · search.test.ts in CI with self-documented failing tests
- **Severity:** P3
- **Category:** test-coverage
- **File:** `Source/Backend/tests/routes/search.test.ts:11–15`
- **Detail:** The file header explicitly states: *"As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented. This is intentional — the failing tests surface the implementation gap."* This is a useful "contract-first" pattern, but it means CI runs with known-failing tests, which normalizes red builds and can mask new failures.
- **Recommendation:** Either mark these tests with `test.todo()` (they still appear in output but don't fail the suite), or implement the route (see QO-001). If kept as-is, document in `CLAUDE.md` that `search.test.ts` is expected-fail.

---

### JSON Summary

```json
{
  "audit_date": "2026-09-13",
  "grade": "D",
  "spec_coverage": {
    "active_plan_pct": 100,
    "overall_specifications_pct": 12.1,
    "total_named_frs": 107,
    "traced_frs": 13
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "untested", "title": "GET /api/search not wired — DependencyPicker broken"},
    {"id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Traceability enforcer blind to Specifications/ directory"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "dev-workflow-platform.md FR-001–069 describe unbuilt system"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-* IDs used in two incompatible domain models"},
    {"id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "tiered-merge-pipeline.md 10 FR-TMP requirements with zero implementation"},
    {"id": "QO-006", "severity": "P3", "category": "test-coverage", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable in production hooks without explanation"},
    {"id": "QO-008", "severity": "P3", "category": "test-coverage", "title": "search.test.ts ships known-failing tests to CI"}
  ],
  "positive_signals": [
    "FR-WF-001 through FR-WF-013: 100% trace coverage on active plan",
    "No console.log in production backend source",
    "No empty catch blocks",
    "No hardcoded secrets found",
    "All catch blocks in routes re-throw or log with context",
    "No files exceeding 500 lines",
    "Structured JSON logging in place (FR-WF-013)",
    "Prometheus metrics for all domain operations",
    "Dependency cycle detection (BFS) implemented and tested"
  ],
  "route_to_team": {
    "QO-001": "TheFixer — implement GET /api/search route",
    "QO-002": "solo-session — extend tools/traceability-enforcer.py",
    "QO-003": "solo-session — add status frontmatter to spec file",
    "QO-004": "solo-session — align FR-dependency-* spec to implementation",
    "QO-005": "solo-session — add status frontmatter to tiered-merge-pipeline.md",
    "QO-006": "TheFixer — delete duplicate test files",
    "QO-007": "TheFixer — fix exhaustive-deps or document suppression",
    "QO-008": "TheFixer — convert to test.todo or implement route"
  }
}
```

---

**Positive signals:** The *active* codebase is in solid shape. No `console.log` in production source, no empty catch blocks, no hardcoded secrets, no files over 500 lines, Prometheus metrics and structured logging fully wired. The P1 (missing search route) and the spec-drift P2s are the only substantive blockers.
