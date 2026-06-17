# Quality Oracle Findings — 2026-06-17

**Auditor:** quality_oracle  
**Config:** Teams/TheInspector/inspector.config.yml  
**Specs scanned:** Specifications/dev-workflow-platform.md (FR-001–FR-069), Specifications/workflow-engine.md (FR-WF-001–FR-WF-013), Specifications/tiered-merge-pipeline.md (FR-TMP-001–FR-TMP-010)  
**Active plans scanned:** dev-workflow-platform, self-judging-workflow, dependency-linking, duplicate-deprecated-status  
**Enforcer run (default):** TRACEABILITY PASSED (Plans/self-judging-workflow — 13/13 FR-WF-*)  

---

## Spec Coverage Summary

| Domain | Spec IDs | Coverage | Location |
|--------|----------|----------|----------|
| Self-Judging Workflow Engine | FR-WF-001–FR-WF-013 (13) | **100%** | Source/ |
| Dev Workflow Platform | FR-001–FR-069 (69) | **~100%** | portal/ |
| Pipeline Orchestration + Traceability | FR-033–FR-069 (37) | **100%** | portal/ |
| Dependency Tracking | FR-dependency-* (16) | **81%** (13/16 — api-types, seed, frontend-tests open) | portal/ |
| Duplicate/Deprecated Status | FR-DUP-01–FR-DUP-13 (13) | **92%** (12/13 — FR-DUP-06 open) | portal/ |
| Tiered Merge Pipeline | FR-TMP-001–FR-TMP-010 (10) | **90%** (9/10 — FR-TMP-008 open) | platform/ |
| FR-070–FR-095 | Extended IDs in portal/ | **Spec gap** — implemented but not in any Specifications/ file | portal/ |

**Overall traceability references found:** 1,430+ (`// Verifies:` comments across Source/, portal/, platform/)

---

## Prior Findings Re-Verification

No prior P1/P2 findings on record (first audit run).

---

## Findings

### QO-001: Traceability Enforcer Is Blind to `portal/` and `platform/`

- **Severity:** P1
- **Category:** architecture-violation / spec-drift
- **File:** `tools/traceability-enforcer.py:78` (`source_dirs = ["Source", "E2E"]`)
- **Detail:** The enforcer hardcodes `["Source", "E2E"]` as its scan directories. The project has two additional implementation directories that are not scanned:
  - `portal/` — implements **FR-001–FR-095, FR-DUP-*, FR-dependency-*** (~1,018 `// Verifies:` comments)
  - `platform/` — implements **FR-TMP-001–FR-TMP-010** (57 `// Verifies:` comments)
  
  Consequences:
  - Running `python3 tools/traceability-enforcer.py --plan dev-workflow-platform` falsely reports 34 missing requirements (TRACEABILITY FAILURE) even though they are all implemented in portal/.
  - Running `python3 tools/traceability-enforcer.py --plan dependency-linking` falsely reports 7 failures.
  - Running `python3 tools/traceability-enforcer.py --plan duplicate-deprecated-status` falsely reports 15 failures.
  - The CLAUDE.md verification gate uses the default enforcer which happens to auto-select Plans/self-judging-workflow and passes — creating a **false all-green** signal that hides real open gaps in portal/ (3 open FR-dependency-* items).
  
- **Recommendation:** Add `portal` and `platform` to the `source_dirs` list in `check_traceability()`. Also consider making `source_dirs` configurable via CLI arg or the inspector.config.yml `source.dirs` field (already defined there as `["Source/"]` but not used by the tool).
- **Cross-ref:** QO-002, QO-003, QO-004, QO-005

---

### QO-002: Three FR-dependency-* Requirements Still Open (portal/)

- **Severity:** P2
- **Category:** spec-drift
- **Files:**
  - `portal/Shared/api.ts` — missing `blocked_by?: string[]` on `UpdateBugInput` and `UpdateFeatureRequestInput`
  - `portal/Backend/src/database/` — no `seed.ts` file
  - `portal/Frontend/tests/` — no `DependencySection.test.tsx` or `BlockedBadge.test.tsx`
- **Detail:** Per `Plans/dependency-linking/requirements.md` (Implementation Delta section), three items remain unimplemented:
  1. **FR-dependency-api-types** — `UpdateBugInput`/`UpdateFeatureRequestInput` lack `blocked_by?: string[]` in `portal/Shared/api.ts`. Frontend DependencyPicker.tsx still uses `as any` casts. TypeScript type-safety is broken end-to-end for this path.
  2. **FR-dependency-seed** — `portal/Backend/src/database/seed.ts` does not exist. The 4 known dependency relationships (BUG-0010 blocked_by BUG-0003/0004/0005/0006/0007 etc.) are never seeded on startup.
  3. **FR-dependency-frontend-tests** — `DependencySection.test.tsx` and `BlockedBadge.test.tsx` are absent from `portal/Frontend/tests/`. DependencyPicker.test.tsx exists (245 lines) but the other two are missing entirely.
- **Recommendation:** Route to TheFixer. The dependency-linking plan dispatch-plan.md already has the exact implementation instructions for all three items.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: FR-TMP-008 Has No Implementation Traces

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md` (FR-TMP-008), `platform/` (no references)
- **Detail:** FR-TMP-008 specifies Worker Container Prerequisites: `gh` CLI installed in `Dockerfile.worker`, Playwright installable on demand, `GITHUB_TOKEN` passed to workers. Every other FR-TMP-* has 2–8 implementation references in `platform/`, but FR-TMP-008 has **zero**. Either the requirement was silently skipped, or it was implemented without traceability comments.
- **Recommendation:** Search `platform/Dockerfile.worker` and worker scripts for gh CLI installation. If present, add `// Verifies: FR-TMP-008` comments. If absent, implement per spec (FR-TMP-004 auto-PR and FR-TMP-006 auto-merge both depend on `gh` being available).
- **Cross-ref:** QO-001

---

### QO-004: Three Open FR-dependency-* Items Missing from Default Enforcer Run

- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `tools/traceability-enforcer.py` (auto-selects self-judging-workflow), `Plans/dependency-linking/requirements.md`
- **Detail:** Because the enforcer auto-selects the most recently modified `requirements.md` (self-judging-workflow, which passes 13/13), the three open dependency-linking gaps (QO-002) are **never surfaced by the verification gate** that CLAUDE.md mandates before marking tasks done. Developers running the required gate get a green signal that masks real open work.
- **Recommendation:** Fix the enforcer scan dirs (QO-001) AND update the CLAUDE.md verification gate to run `python3 tools/traceability-enforcer.py --plan dependency-linking` explicitly, or better yet scan all plans automatically.
- **Cross-ref:** QO-001, QO-002

---

### QO-005: FR-DUP-06 Has No Traceability Comment

- **Severity:** P2
- **Category:** untested
- **File:** `portal/Backend/src/routes/bugs.ts`, `portal/Backend/src/routes/featureRequests.ts`
- **Detail:** FR-DUP-06 requires that detail endpoints (`GET /api/bugs/:id`, `GET /api/feature-requests/:id`) always return the full item regardless of status (even for duplicate/deprecated items). All other FR-DUP-01 through FR-DUP-13 are traced (12/13), but FR-DUP-06 has no `// Verifies: FR-DUP-06` comment in the routes or tests. Functionality may be present but is unverified by traceability.
- **Recommendation:** Add `// Verifies: FR-DUP-06` to the GET `/:id` handlers and confirm no filter excludes duplicate/deprecated items on detail lookup.
- **Cross-ref:** QO-001

---

### QO-006: Malformed Traceability IDs (`FR-0001`)

- **Severity:** P2
- **Category:** spec-drift
- **Files:**
  - `portal/Frontend/src/components/shared/DependencySection.tsx` (lines 1, 24, 29, 44)
  - `portal/Frontend/src/api/client.ts` (line 227)
- **Detail:** These files carry `// Verifies: FR-0001` — a four-zero-padded ID that does not correspond to any requirement in any spec or plan file. The pattern matcher in the traceability enforcer would never match this against a real requirement, and the 29 occurrences would never count as coverage for any tracked FR. The correct IDs should be `FR-dependency-section`, `FR-dependency-api-client`, or another valid FR-dependency-* ID.
- **Recommendation:** Replace `FR-0001` with the correct FR IDs. DependencySection.tsx → `FR-dependency-section`. `client.ts` line 227 (general search) → `FR-dependency-search`.
- **Cross-ref:** QO-001

---

### QO-007: FR-070–FR-095 Implemented but Not in Any Specification File

- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (ends at FR-069 + FR-dependency-*)
- **Detail:** The portal/ codebase contains traceability comments for FR-070 through FR-095 (26 requirements). These IDs don't appear in any file under `Specifications/`. They were added during incremental pipeline work (FR-033–FR-049 pipeline orchestration, FR-050–FR-069 dev cycle traceability, and the FR-07x–FR-09x image upload, tiered pipeline, chaos-invariants, etc.). The specification file was never extended to document these requirements. Per the project rule "Every decision and line of code must trace back to a specification", these are **unanchored implementations**.
- **Recommendation:** Extend `Specifications/dev-workflow-platform.md` to add FR-070–FR-095 definitions (or create a supplemental spec file). Alternatively, reconcile the ID numbering scheme. The Plans/ directories have design docs for these features but no canonical spec exists.
- **Cross-ref:** QO-001

---

### QO-008: No `requirements.md` for Tiered Merge Pipeline Plan

- **Severity:** P3
- **Category:** spec-drift / architecture-violation
- **File:** `Plans/tiered-merge-pipeline/` (directory exists, no requirements.md)
- **Detail:** The tiered-merge-pipeline plan directory contains only a `dispatch-plan.md` but no `requirements.md`. The enforcer's `--plan tiered-merge-pipeline` flag fails with "No requirements.md found". FR-TMP-* requirements are specified in `Specifications/tiered-merge-pipeline.md` but have no corresponding plan-level requirements file for enforcement. This means the verification gate can never be targeted at this spec.
- **Recommendation:** Create `Plans/tiered-merge-pipeline/requirements.md` with the FR-TMP-001 through FR-TMP-010 items. This enables `python3 tools/traceability-enforcer.py --plan tiered-merge-pipeline` to verify coverage in platform/.

---

### QO-009: Four Source/Frontend Components Lack Tests

- **Severity:** P2
- **Category:** untested
- **Files:**
  - `Source/Frontend/src/components/Layout.tsx` (no test)
  - `Source/Frontend/src/components/PriorityBadge.tsx` (no test)
  - `Source/Frontend/src/components/StatusBadge.tsx` (no test)
  - `Source/Frontend/src/components/TypeBadge.tsx` (no test)
- **Detail:** All four components were recently modified (within 14 days, per git log) and have no corresponding test files in `Source/Frontend/tests/components/`. The `DependencyPicker.test.tsx`, `DependencySection.test.tsx`, and `BlockedBadge.test.tsx` tests exist for those components, but the core badge/layout components have zero test coverage.
- **Recommendation:** Add Vitest/RTL tests for each component. StatusBadge, TypeBadge, and PriorityBadge are pure display components — snapshot + prop-variation tests would achieve quick coverage. Each test must include `// Verifies: FR-WF-009` or the appropriate FR.
- **Cross-ref:** FR-032 (frontend test coverage requirement)

---

### QO-010: Five Portal Files Exceed 500-Line Threshold

- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx` — 550 lines
  - `portal/Frontend/src/components/bugs/BugDetail.tsx` — 546 lines
  - `portal/Backend/src/services/cycleService.ts` — 526 lines
  - `portal/Frontend/src/api/client.ts` — 525 lines
  - `portal/Backend/src/services/featureRequestService.ts` — 506 lines
- **Detail:** Project architecture rules flag files >500 lines as candidates for splitting. The two detail components (FeatureRequestDetail, BugDetail) are approaching 550 lines with DependencySection integration. CycleService mixes cycle creation, phase advancement, pipeline integration, and CI/CD simulation — clear split candidates.
- **Recommendation:** P3 — address at next refactor opportunity. CycleService is the highest-priority split: extract `pipelineIntegration.ts` and `cicdSimulation.ts` as separate services. The detail components could extract `DependencySection` integration into a sub-component.

---

### QO-011: `eslint-disable-next-line` in Three Production Files

- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
  - `portal/Frontend/src/hooks/useApi.ts:35`
- **Detail:** All three suppress `react-hooks/exhaustive-deps`. The rule flags dependency arrays that may cause stale closures. While these are often intentional, each should have an explicit code comment explaining **why** the lint suppression is safe (e.g., "intentionally omit X to avoid re-running on every render"). Currently they are undocumented suppressions.
- **Recommendation:** Add a comment on the same line explaining the rationale (e.g., `// stable ref — onMount only`). This is CLAUDE.md's "explicitly document why the error is intentionally suppressed" rule applied to lint, not errors.

---

### QO-012: `spec-drift-report.json` Artifact at Repo Root

- **Severity:** P4
- **Category:** doc-stale
- **File:** `/spec-drift-report.json` (repo root)
- **Detail:** A `spec-drift-report.json` exists at the repo root, outside the designated report output directory (`Teams/TheInspector/findings/`). Its content shows 0% coverage for FR-TMP-001–FR-TMP-010 and 13 "untracked" FR-WF-* IDs. This is an orphaned artifact from a prior analysis run. The `quality-oracle-report.md` at root is also empty (1 line).
- **Recommendation:** Move to `Teams/TheInspector/findings/` or delete. These are transient report artifacts and should not persist at the repo root.

---

## Architecture Rule Compliance

| Rule | Status | Notes |
|------|--------|-------|
| No direct DB calls from route handlers | ✅ Clean | All portal/ routes delegate to service layer |
| No `console.log` in production | ✅ Clean | No violations in Source/, portal/, or platform/ production code |
| Structured logging | ✅ Clean | Both backends use logger abstractions (winston/pino patterns) |
| No hardcoded secrets | ✅ Clean | No credential literals found |
| All list endpoints return `{data: T[]}` | ✅ Clean | Verified on sampled endpoints |
| Business logic has no framework imports | ✅ Clean | Services do not import Express |
| Never swallow errors silently | ✅ Clean | No empty catch blocks found |
| Shared types single source of truth | ✅ Clean | Source uses Source/Shared/; portal uses portal/Shared/ |

---

## Grade Assessment

Using grading config:
- **P1 findings:** 1 (QO-001 — enforcer blind spot)
- **P2 findings:** 5 (QO-002, QO-003, QO-004, QO-005, QO-006, QO-009)
- **Spec coverage:** ~95% across all tracked requirements

Per grading: P1=1 → **Grade: C** (max_p1: 2, but QO-001 is systemic — it corrupts all downstream traceability signals)

> Note: If QO-001 (enforcer fix) were addressed, the remaining P2s drop to 5, pushing toward **Grade: B** (max_p1: 0, max_p2: 8, min_spec_coverage: 60).

---

## JSON Summary

```json
{
  "audit_date": "2026-06-17",
  "grade": "C",
  "spec_coverage_pct": 95,
  "p1_count": 1,
  "p2_count": 6,
  "p3_count": 4,
  "p4_count": 1,
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "Traceability enforcer blind to portal/ and platform/", "file": "tools/traceability-enforcer.py:78" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "3 FR-dependency-* items still open: api-types, seed, frontend-tests", "file": "portal/Shared/api.ts, portal/Backend/src/database/, portal/Frontend/tests/" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-008 has zero implementation traces", "file": "platform/" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "Default enforcer masks open gaps in portal/", "file": "tools/traceability-enforcer.py" },
    { "id": "QO-005", "severity": "P2", "category": "untested", "title": "FR-DUP-06 has no traceability comment", "file": "portal/Backend/src/routes/bugs.ts" },
    { "id": "QO-006", "severity": "P2", "category": "spec-drift", "title": "Malformed FR-0001 traceability IDs (29 occurrences)", "file": "portal/Frontend/src/components/shared/DependencySection.tsx" },
    { "id": "QO-007", "severity": "P3", "category": "spec-drift", "title": "FR-070–FR-095 implemented but not in any Specifications/ file", "file": "Specifications/dev-workflow-platform.md" },
    { "id": "QO-008", "severity": "P3", "category": "spec-drift", "title": "No requirements.md for tiered-merge-pipeline plan", "file": "Plans/tiered-merge-pipeline/" },
    { "id": "QO-009", "severity": "P2", "category": "untested", "title": "4 Source/Frontend components lack tests", "file": "Source/Frontend/src/components/{Layout,PriorityBadge,StatusBadge,TypeBadge}.tsx" },
    { "id": "QO-010", "severity": "P3", "category": "pattern-violation", "title": "5 portal/ files exceed 500-line threshold", "file": "portal/Frontend/src/components/feature-requests/FeatureRequestDetail.tsx" },
    { "id": "QO-011", "severity": "P3", "category": "pattern-violation", "title": "3 eslint-disable suppressions without rationale comments", "file": "Source/Frontend/src/hooks/useWorkItems.ts:63" },
    { "id": "QO-012", "severity": "P4", "category": "doc-stale", "title": "spec-drift-report.json orphan at repo root", "file": "spec-drift-report.json" }
  ],
  "open_spec_gaps": {
    "FR-dependency-api-types": "open",
    "FR-dependency-seed": "open",
    "FR-dependency-frontend-tests": "open",
    "FR-TMP-008": "unverified",
    "FR-DUP-06": "untraced"
  }
}
```
