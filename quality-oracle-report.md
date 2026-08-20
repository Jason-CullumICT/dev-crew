---

## Quality Oracle Findings

### Spec Coverage: ~21% (across all plans) / 100% (active plan only)

**131 total FR IDs across 8 plans** | **28 traced to source code** | **103 untraced**

> ⚠️ The traceability enforcer auto-selects only the most recently modified plan (`self-judging-workflow`). It silently passes while 6 other approved plans fail. Coverage of the active plan is 100%; coverage across the full spec inventory is ~21%.

---

### QO-001: Traceability Enforcer Has Single-Plan Blind Spot
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-selects the most-recently-modified `requirements.md` and checks **only that one plan**. It exits `TRACEABILITY PASSED` while silently ignoring 6 other approved plans. Running the enforcer against each plan individually reveals:

  | Plan | Result |
  |------|--------|
  | `self-judging-workflow` | ✅ PASS (13/13) |
  | `dependency-linking` | ❌ FAIL — FR-0007, FR-070, FR-085 missing |
  | `orchestrated-dev-cycles` | ❌ FAIL — FR-048, FR-049 missing |
  | `dev-cycle-traceability` | ❌ FAIL — FR-068, FR-069 missing |
  | `duplicate-deprecated-status` | ❌ FAIL — FR-DUP-11 through FR-DUP-13 missing |
  | `image-upload` | ❌ FAIL — FR-088, FR-089 missing |
  | `dev-workflow-platform` | ❌ FAIL — ALL 32 FRs missing |

- **Recommendation:** Update `traceability-enforcer.py` to scan **all** `Plans/*/requirements.md` files and report aggregate coverage. A single-plan mode can remain as `--plan` flag, but the default gate should validate all approved plans.
- **Cross-ref:** TheFixer (fix the enforcer script)

---

### QO-002: `dev-workflow-platform` Plan Fully Unimplemented (32 FRs)
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Plans/dev-workflow-platform/requirements.md`, `Specifications/dev-workflow-platform.md`
- **Detail:** The `dev-workflow-platform` plan (approved 2026-03-23) defines 32 functional requirements for a SQLite-backed platform: feature requests, bug reports, development cycles, tickets, learnings, and feature browser. **Zero** of these FRs are traced to any file in `Source/`. The current `Source/` implements the `self-judging-workflow` plan (in-memory Work Item engine) — a fundamentally different architecture and domain model. This is either a product pivot (the platform spec was superseded) or the platform is a build target that hasn't been started yet. Either way, **the spec-to-source gap is 32 FRs**.
- **Recommendation:** Explicitly mark `dev-workflow-platform` as either `[SUPERSEDED]` or `[PENDING]` in the plan document. If superseded by `self-judging-workflow`, update `Specifications/dev-workflow-platform.md` accordingly. If pending, create a Plans entry tracking its build status.
- **Cross-ref:** requirements-reviewer (spec clarification), TheFixer (if build is pending)

---

### QO-003: `GET /api/search` Route Unimplemented (FR-dependency-search)
- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `Source/Backend/tests/routes/search.test.ts:1`, `Source/Backend/src/app.ts`
- **Detail:** The search test file itself documents: *"the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* No search route file exists in `Source/Backend/src/routes/`, and `app.ts` does not mount any search handler. The `dependency-linking` plan requires `FR-dependency-search` for the dependency picker typeahead. Every test in `search.test.ts` will fail at runtime.
- **Recommendation:** Either (a) implement the `GET /api/search` route and wire it in `app.ts`, or (b) if intentionally deferred, mark the plan requirement as `[DEFERRED]` and move the test to a `__deferred__/` folder so it doesn't pollute CI results.
- **Cross-ref:** TheFixer (backend-coder)

---

### QO-004: Duplicate Frontend Test Files for Same Components
- **Severity:** P2
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/`
- **Detail:** Two pairs of test files cover the same pages with diverging content:
  - `tests/WorkItemDetailPage.test.tsx` (368 lines) AND `tests/pages/WorkItemDetailPage.test.tsx` (393 lines)
  - `tests/WorkItemListPage.test.tsx` (286 lines) AND `tests/pages/WorkItemListPage.test.tsx` (262 lines)
  
  Both files in each pair appear to test the same component but with different test cases (root versions appear older, `pages/` versions appear to be the updated replacements). When both run, they create overlapping assertions, duplicate test IDs, and a maintenance burden — fixing the component means updating two test files.
- **Recommendation:** Delete the root-level `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` if `tests/pages/` versions are the canonical replacements. Confirm no unique test cases exist only in the root versions first.
- **Cross-ref:** TheFixer (frontend-coder)

---

### QO-005: FR-048, FR-049 (Pipeline Backend/Frontend Tests) Not Traced
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Plans/orchestrated-dev-cycles/requirements.md`
- **Detail:** `FR-048` (backend tests for pipeline service and routes) and `FR-049` (frontend tests for PipelineStepper) from the `orchestrated-dev-cycles` plan have no `// Verifies: FR-048` or `// Verifies: FR-049` comments in any test file. The pipeline tests may exist but are unlinked — or they were never written.
- **Recommendation:** Locate or create the pipeline tests and add the appropriate `// Verifies:` traceability comment. If the orchestrated dev cycles feature is fully implemented, this is a traceability gap. If not yet built, update the plan to reflect its status.

---

### QO-006: FR-068, FR-069 (BugDetail, Frontend Tests) Not Traced
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Plans/dev-cycle-traceability/requirements.md`
- **Detail:** `FR-068` (Update BugDetail with related work item and cycle links) and `FR-069` (Frontend tests for FeedbackLog, ConsideredFixesList, TraceabilityReport, BugDetail) from `dev-cycle-traceability` plan have no source references. These are the final two frontend requirements of a 20-FR plan where 18 others are traced.
- **Recommendation:** Implement or trace FR-068 and FR-069. Given 18/20 are done, these are likely close to completion.

---

### QO-007: FR-DUP-11 through FR-DUP-13 Not Traced
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Plans/duplicate-deprecated-status/requirements.md`
- **Detail:** Three requirements from the `duplicate-deprecated-status` plan (FR-DUP-11, FR-DUP-12, FR-DUP-13) lack `// Verifies:` comments. 12 of 15 FRs in this plan are traced. The missing three likely represent the end of a partially-completed plan.
- **Recommendation:** Check if FR-DUP-11..13 are implemented but unlabeled, or genuinely missing. Add traceability comments or implement.

---

### QO-008: `eslint-disable` Suppressing Hooks Dependency Warnings
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two `eslint-disable-next-line react-hooks/exhaustive-deps` comments suppress React hook dependency warnings in production code. While not inherently incorrect, this pattern often masks stale-closure bugs where a callback references outdated state. Both suppressions are in dependency array positions for `useCallback` hooks.
- **Recommendation:** Review whether these suppressions are necessary or whether the hooks can be refactored to satisfy the lint rule (e.g., using `useRef` for stable callbacks, or adding the missing dependency). If the suppression is deliberate, document the reasoning inline.

---

### QO-009: Health Check Route Has No Traceability
- **Severity:** P3
- **Category:** implementation-hygiene
- **File:** `Source/Backend/src/app.ts:42`
- **Detail:** The `GET /health` route has no `// Verifies:` comment. While a health endpoint is infrastructure-level and may not need a formal FR, no spec or NFR mentions it. This is a minor unlinked implementation in a recently modified file.
- **Recommendation:** Either add a `// Health check — infrastructure, no FR` comment to acknowledge the intentional lack of traceability, or add a brief NFR to `Specifications/workflow-engine.md` covering health/liveness endpoints.

---

### QO-010: `orchestrator-cycle-dashboard` Plan Has 0% Traceability
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Plans/orchestrator-cycle-dashboard/requirements.md`
- **Detail:** 7 requirements (FR-070 through FR-076) in the `orchestrator-cycle-dashboard` plan have zero source traces. Unlike `dev-workflow-platform` (which represents a different app), these FRs may overlap with FR-070..076 from `image-upload`. The plan status is unclear.
- **Recommendation:** Check if this plan was superseded by `image-upload` (which also starts at FR-070). Mark as `[SUPERSEDED]` or implement the missing requirements.

---

```json
{
  "audit_date": "2026-08-20",
  "spec_coverage": {
    "active_plan_pct": 100,
    "active_plan_name": "self-judging-workflow",
    "all_plans_total_frs": 131,
    "all_plans_traced": 28,
    "all_plans_pct": 21.4
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer single-plan blind spot"},
    {"id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "dev-workflow-platform plan 32 FRs unimplemented"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "GET /api/search route unimplemented (FR-dependency-search)"},
    {"id": "QO-004", "severity": "P2", "category": "test-coverage", "title": "Duplicate frontend test files for WorkItemDetailPage and WorkItemListPage"},
    {"id": "QO-005", "severity": "P2", "category": "spec-drift", "title": "FR-048, FR-049 pipeline tests untraced"},
    {"id": "QO-006", "severity": "P2", "category": "spec-drift", "title": "FR-068, FR-069 BugDetail/frontend tests untraced"},
    {"id": "QO-007", "severity": "P2", "category": "spec-drift", "title": "FR-DUP-11 through FR-DUP-13 untraced"},
    {"id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable on react-hooks/exhaustive-deps in 2 production files"},
    {"id": "QO-009", "severity": "P3", "category": "implementation-hygiene", "title": "Health check route has no traceability comment"},
    {"id": "QO-010", "severity": "P3", "category": "spec-drift", "title": "orchestrator-cycle-dashboard plan 0% traced (possibly superseded)"}
  ],
  "p1_count": 2,
  "p2_count": 5,
  "p3_count": 3,
  "grade": "D",
  "grade_note": "Active-plan traceability is A-grade (100%), but aggregate spec coverage across all approved plans is 21% — below the C-grade threshold of 40%. Grade reflects repo-wide spec integrity.",
  "architecture_violations": [],
  "console_log_violations": 0,
  "hardcoded_secrets": 0,
  "empty_catch_blocks": 0,
  "recently_modified_files_without_verifies": 0
}
```

---

**Grade Summary:** Active plan `self-judging-workflow` is **A-grade** (100% coverage, 0 P1/P2 open within its scope). Repository-wide across all 8 approved plans: **D-grade** (21% aggregate spec coverage, 2 P1s).

**Escalations:** None to TheGuardians — no auth bypasses, injection risks, or hardcoded secrets found.

**Route to TheFixer:** QO-003 (search route), QO-004 (duplicate tests), QO-001 (enforcer script). QO-002 requires product/requirements clarification before any code work begins.
