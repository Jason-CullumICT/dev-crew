Now let me compile the full structured report:

---

## Quality Oracle Findings — 2026-06-23

### Spec Coverage: **88%** (96/109 FRs across all three specification documents)

| Spec Document | FRs | Covered | % |
|---|---|---|---|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-\*) | 13 | 13¹ | ~100% |
| `Specifications/dev-workflow-platform.md` (FR-001–FR-069 + FR-dependency-\*) | 86 | 83 | 97% |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | **0** | **0%** |
| **Combined** | **109** | **96** | **88%** |

¹ FR-dependency-search is traced but the route is not implemented — enforcer false positive.

---

### QO-001: `/api/search` Route Not Wired Into Source/Backend App
- **Severity:** P1
- **Category:** untested / spec-drift
- **File:** `Source/Backend/src/app.ts`, `Source/Backend/tests/routes/search.test.ts:3–6`
- **Detail:** `FR-dependency-search` requires a `GET /api/search` cross-entity typeahead endpoint in the Source/Backend. The test file `search.test.ts` opens with an explicit comment: *"GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* The route is defined and wired in `portal/Backend` but not in `Source/Backend`. The traceability enforcer reports **PASSED** because the comment `// Verifies: FR-dependency-search` exists in the test file — this is a **false positive** from the enforcer.
- **Recommendation:** Implement `GET /api/search` in `Source/Backend/src/routes/` and register it in `app.ts`, or remove the test if this backend is intentionally out of scope.
- **Cross-ref:** QO-006 (enforcer gap)

---

### QO-002: Architecture Violation — Route Handlers Call Store Directly
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts` (lines 44, 73, 79, 134, 142), `Source/Backend/src/routes/workflow.ts` (lines 44, 72, 99, 175, 270–273)
- **Detail:** CLAUDE.md rule: *"No direct DB calls from route handlers — use the service layer."* Both route files call `store.*` directly: `store.findAll()`, `store.findById()`, `store.createWorkItem()`, `store.updateWorkItem()`, `store.softDelete()`. The store IS the in-memory data layer (equivalent of a DB). Only `router.ts` and `assessment.ts` have a true service layer. `workItems.ts` has no service intermediary at all for CRUD operations.
- **Recommendation:** Extract store access from route handlers into a `workItemService.ts`. Routes should call service functions; services call the store.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-003: FR-TMP-001–010 (Tiered Merge Pipeline) — Zero Implementation Coverage
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/tiered-merge-pipeline.md`
- **Detail:** The tiered-merge-pipeline spec defines 10 functional requirements covering: risk classification (FR-TMP-001), Playwright E2E test generation (FR-TMP-002), live E2E runner as merge gate (FR-TMP-003), auto-PR creation (FR-TMP-004), AI PR review (FR-TMP-005), risk-tiered auto-merge (FR-TMP-006), configuration env vars (FR-TMP-007), worker container prerequisites (FR-TMP-008), run JSON extensions (FR-TMP-009), and error handling (FR-TMP-010). **None** of these are implemented in `Source/`, `portal/`, or `platform/`. The only artefact is a display-only `riskLevel?: string` field in `portal/Frontend/src/components/orchestrator/types.ts` — no classification logic, no E2E runner, no PR creation, no merge automation.
- **Recommendation:** Either open a plan to implement these FRs incrementally (starting with FR-TMP-001 risk classification as it's the prerequisite), or explicitly mark the spec as deferred/future-scope in the spec document itself.

---

### QO-004: `FR-dependency-api-types` — `blocked_by` Missing from Shared API Types, Forces `as any`
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `portal/Shared/api.ts:32–38, 59–67`, `portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293`
- **Detail:** `FR-dependency-api-types` requires `blocked_by?: string[]` on `UpdateBugInput` and `UpdateFeatureRequestInput`. Both interfaces in `portal/Shared/api.ts` lack this field. `DependencyPicker.tsx` works around this with `as any` casts (lines 291, 293): `await bugs.update(itemId, { blocked_by: blockerIds } as any)`. This breaks the "Shared types are single source of truth — no inline type re-definitions across layers" rule and causes TypeScript to silently lose type safety on the PATCH body.
- **Recommendation:** Add `blocked_by?: string[]` to `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts`, then remove the `as any` casts in `DependencyPicker.tsx`.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-005: Dual Logger in portal/Backend — Dependency Service Loses OTel Trace Context
- **Severity:** P2
- **Category:** architecture-violation / spec-drift (FR-021)
- **File:** `portal/Backend/src/services/dependencyService.ts:10`, `portal/Backend/src/logger.ts`, `portal/Backend/src/lib/logger.ts`
- **Detail:** Two logger implementations coexist in `portal/Backend/`: `portal/Backend/src/lib/logger.ts` (full OTel-instrumented logger, `// Verifies: FR-003`, used by all routes, middleware, and services) and `portal/Backend/src/logger.ts` (bare pino wrapper, `// Verifies: FR-dependency-linking`, no OTel injection). `dependencyService.ts` is the sole module importing from `'../logger'` instead of `'../lib/logger'`. Consequence: dependency service operations (add, remove, cycle detection, cascade dispatch) emit log entries with no `trace_id` or `span_id` — violating FR-021's requirement that trace/span IDs appear in logs.
- **Recommendation:** Change `dependencyService.ts` line 10 from `import { logger } from '../logger'` to `import { logger } from '../lib/logger'`. Then delete `portal/Backend/src/logger.ts` (or add a deprecation comment) to prevent future accidental imports.
- **Cross-ref:** [ESCALATE → TheFixer]

---

### QO-006: Traceability Enforcer Blind to `portal/` and FR-TMP-*
- **Severity:** P2
- **Category:** spec-drift / pattern-violation
- **File:** `tools/traceability-enforcer.py`, `Teams/TheInspector/inspector.config.yml`
- **Detail:** The enforcer auto-selects the most-recently-modified `Plans/*/requirements.md` and scans only `Source/` for `// Verifies:` comments. This creates two blind spots: (a) The entire `portal/` codebase — which implements 86 FRs from `Specifications/dev-workflow-platform.md` — is never scanned. (b) `Specifications/tiered-merge-pipeline.md` (FR-TMP-\*) is never evaluated. The enforcer reports "PASSED" while FR-TMP-001–010 have 0% coverage and `FR-dependency-search` has a wired test but no implementation. The `inspector.config.yml` `specs.patterns.enforcer` entry should be extended.
- **Recommendation:** Extend the enforcer (or add a second enforcer invocation) to: (1) scan `portal/` in addition to `Source/`, (2) accept `Specifications/*.md` directly as requirement sources alongside `Plans/*/requirements.md`. Update `inspector.config.yml` with a `portal/` source dir entry.

---

### QO-007: FR-dependency-seed — No Seed File Implemented
- **Severity:** P3
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (missing `seed.ts`)
- **Detail:** `FR-dependency-seed` requires an idempotent seeding function that inserts 8 known dependency relationships (BUG-0010 blocked by 5 bugs; 3 FR cross-dependencies) on server startup. `portal/Backend/src/database/` contains only `connection.ts` and `schema.ts` — no `seed.ts`. The plan's own implementation delta table confirms this as `❌ Missing`. The acceptance criterion (`GET /api/bugs/BUG-0010` returns 5 items in `blocked_by`) cannot be met without this file.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` per the plan spec and call it from `portal/Backend/src/index.ts` after schema initialisation.

---

### QO-008: FR-dependency-frontend-tests — DependencySection and BlockedBadge Tests Missing in portal
- **Severity:** P3
- **Category:** untested
- **File:** `portal/Frontend/tests/` (missing `DependencySection.test.tsx`, `BlockedBadge.test.tsx`)
- **Detail:** `FR-dependency-frontend-tests` requires both `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx`. Only `DependencyPicker.test.tsx` exists. `DependencySection.tsx` (226 lines) and `BlockedBadge.tsx` are shipped without test coverage. The one dependency test that exists (`DependencyPicker.test.tsx`) traces to `FR-0001`, not `FR-dependency-frontend-tests`.
- **Recommendation:** Add `DependencySection.test.tsx` and `BlockedBadge.test.tsx` per the plan spec, each with `// Verifies: FR-dependency-section` / `FR-dependency-blocked-badge` traceability comments.

---

### QO-009: Unspecced FRs in portal/ — FR-070 through FR-095 (Scope Creep)
- **Severity:** P3
- **Category:** spec-drift
- **File:** `portal/Backend/src/middleware/upload.ts`, `portal/Backend/src/services/imageService.ts`, `portal/Backend/src/routes/featureRequests.ts`, `portal/Backend/src/routes/bugs.ts`, `portal/Backend/src/index.ts`
- **Detail:** `portal/` code carries `// Verifies: FR-073`, `FR-074`, `FR-075`, `FR-076`, `FR-077`, `FR-078`, `FR-079`, `FR-088`—and other FRs up to `FR-095`. `Specifications/dev-workflow-platform.md` only defines requirements through `FR-069` + `FR-dependency-*`. Image upload, orchestrator proxy, and team dispatches were implemented without a specification entry. CLAUDE.md: *"If the spec doesn't cover it, write the spec first."*
- **Recommendation:** Back-fill specification entries for FR-070 through FR-095 in `Specifications/dev-workflow-platform.md` with proper acceptance criteria, or create a new spec file (e.g., `Specifications/image-upload.md`) and link from the main spec.

---

### QO-010: Two eslint-disable Suppressions in Recently Added Code
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps`. Both are in the dependency-tracking feature (recently added). `exhaustive-deps` violations can silently cause stale-closure bugs where effects or callbacks see outdated state. These are in production hook/component logic, not test utilities.
- **Recommendation:** Refactor to satisfy the deps rule correctly (use `useCallback` with correct deps, or `useRef` for stable references), then remove the suppressions.

---

### QO-011: Hardcoded Fallback URL in DebugPortalPage
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:5`
- **Detail:** `const portalUrl = import.meta.env.VITE_PORTAL_URL || 'http://localhost:4200'` — the fallback `'http://localhost:4200'` is hardcoded. Not a production secret, but violates the "No hardcoded secrets or URLs" rule and will silently fail in CI/staging environments where port 4200 is unavailable.
- **Recommendation:** Remove the hardcoded fallback or make it a clearly-named build-time constant with a warning log when the env var is absent.

---

### JSON Summary

```json
{
  "run_date": "2026-06-23",
  "grade": "C",
  "spec_coverage_pct": 88,
  "spec_coverage_detail": {
    "workflow_engine_fr_wf": { "total": 13, "covered": 13, "pct": 100, "note": "FR-dependency-search traced but not implemented — enforcer false positive" },
    "dev_workflow_platform": { "total": 86, "covered": 83, "pct": 97 },
    "tiered_merge_pipeline": { "total": 10, "covered": 0, "pct": 0 }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "untested", "title": "/api/search not wired — tests explicitly fail", "file": "Source/Backend/src/app.ts" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "Routes call store directly, bypassing service layer", "files": ["Source/Backend/src/routes/workItems.ts", "Source/Backend/src/routes/workflow.ts"] },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-001–010 tiered-merge-pipeline: 0% implemented", "file": "Specifications/tiered-merge-pipeline.md" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "blocked_by missing from UpdateBugInput/UpdateFRInput — forces as any cast", "file": "portal/Shared/api.ts" },
    { "id": "QO-005", "severity": "P2", "category": "architecture-violation", "title": "dependencyService imports pino logger — no OTel trace context in dependency ops", "file": "portal/Backend/src/services/dependencyService.ts" },
    { "id": "QO-006", "severity": "P2", "category": "spec-drift", "title": "Traceability enforcer blind to portal/ and FR-TMP-* — false PASSED", "file": "tools/traceability-enforcer.py" },
    { "id": "QO-007", "severity": "P3", "category": "spec-drift", "title": "FR-dependency-seed: seed.ts not implemented", "file": "portal/Backend/src/database/" },
    { "id": "QO-008", "severity": "P3", "category": "untested", "title": "DependencySection and BlockedBadge tests missing in portal/Frontend/tests/", "file": "portal/Frontend/tests/" },
    { "id": "QO-009", "severity": "P3", "category": "spec-drift", "title": "FR-070–095 implemented without spec entries (scope creep)", "file": "Specifications/dev-workflow-platform.md" },
    { "id": "QO-010", "severity": "P3", "category": "pattern-violation", "title": "Two eslint-disable exhaustive-deps suppressions in dependency feature code", "files": ["Source/Frontend/src/components/DependencyPicker.tsx:82", "Source/Frontend/src/hooks/useWorkItems.ts:63"] },
    { "id": "QO-011", "severity": "P4", "category": "pattern-violation", "title": "Hardcoded fallback URL localhost:4200 in DebugPortalPage", "file": "Source/Frontend/src/pages/DebugPortalPage.tsx:5" }
  ],
  "totals": { "P1": 1, "P2": 5, "P3": 4, "P4": 1 },
  "grading_threshold": { "A": "max_p1=0 max_p2=3 coverage≥80", "B": "max_p1=0 max_p2=8 coverage≥60", "C": "max_p1=2 max_p2=15 coverage≥40" },
  "grade_rationale": "1 P1 (fails A and B threshold), 5 P2s, spec coverage 88% — qualifies for C grade"
}
```

---

### Escalation Summary

| Finding | Route |
|---|---|
| QO-001 (search endpoint missing) | [ESCALATE → TheFixer] |
| QO-002 (routes bypass service layer) | [ESCALATE → TheFixer] |
| QO-003 (FR-TMP unimplemented) | [ESCALATE → TheATeam — new feature work] |
| QO-004 (blocked_by missing from API types) | [ESCALATE → TheFixer] |
| QO-005 (wrong logger in dependencyService) | [ESCALATE → TheFixer — 1-line fix] |
| QO-006 (enforcer scope gap) | [Solo-session fix — tools/ is solo-session only] |
