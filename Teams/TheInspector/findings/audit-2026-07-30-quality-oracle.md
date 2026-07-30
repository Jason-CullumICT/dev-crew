# Quality Oracle Audit Report
**Date:** 2026-07-30  
**Auditor:** quality-oracle  
**Config:** Teams/TheInspector/inspector.config.yml  
**Mode:** Full audit — static analysis only

---

## Scope Clarification

The inspector config targets `source.dirs: ["Source/"]`. This audit covers the **self-judging workflow engine** (`Source/`). A separate application (`portal/`) implements the dev-workflow-platform spec (FR-001 to FR-095) and is outside the configured scan boundary — but its existence is documented as a finding (QO-002) because tooling is unaware of it.

---

## Spec Coverage: ~90% (Source scope) / ~12% (enforcer's actual gate)

| Requirement Set | FRs | Implemented | Coverage |
|-----------------|-----|-------------|----------|
| FR-WF-001 – FR-WF-013 (self-judging workflow) | 13 | 13 | **100%** |
| FR-dependency-* (dependency-linking plan) | 16 | 15 | **94%** ← 1 missing |
| FR-001 – FR-032 (dev-workflow-platform plan) | 32 | 0 in Source/ | N/A — in portal/ |
| FR-TMP-001 – FR-TMP-010 (tiered-merge-pipeline) | 10 | 0 in Source/ | N/A — in platform/ |
| **Enforcer gate covers** | **13** | **13** | **100% (false-green)** |

**The traceability enforcer reports PASS while covering only 13 of ~45 active requirement IDs in scope. The gate is structurally invalid.**

---

## Findings

### QO-001: Traceability enforcer produces a false-green gate
- **Severity:** P1
- **Category:** spec-drift / tooling
- **File:** `tools/traceability-enforcer.py`
- **Detail:** The enforcer auto-selects the **most recently modified** `requirements.md` in `Plans/`. Today that resolves to `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013, 13 FRs). This leaves the entire `Plans/dependency-linking/requirements.md` (FR-dependency-*, 16 FRs) and any other approved plans **completely unchecked**. The enforcer prints "TRACEABILITY PASSED" when it has only scanned 29% of the requirement surface for the Source/ app. For a "spec-first" project where the traceability gate is the primary quality mechanism, this is a critical tooling failure.
- **Reproduction:** Run `python3 tools/traceability-enforcer.py` — it prints `Targeting requirements from: Plans/self-judging-workflow/requirements.md`. FR-dependency-seed (which IS missing from source) goes undetected.
- **Recommendation:** Change enforcer to scan **all** `requirements.md` files in `Plans/`, or maintain an explicit list of active requirement files in `inspector.config.yml` (`specs.active_plans`). The `--plan` flag is manual-only; automated CI runs will always miss secondary plans.

---

### QO-002: `portal/` application is completely outside inspector scope
- **Severity:** P2
- **Category:** architecture-violation / spec-drift
- **File:** `Teams/TheInspector/inspector.config.yml` (line 42: `source.dirs: ["Source/"]`)
- **Detail:** `portal/` is a full-stack application (Backend + Frontend + Shared) implementing `Specifications/dev-workflow-platform.md` (FR-001 to FR-095). It has 95+ `// Verifies:` FR references, dedicated test suites (Dashboard, FeatureRequests, BugReports, DevelopmentCycle, Approvals, Learnings, PipelineStepper, DependencyPicker, OrchestratorCycles), and its own Dockerfile. The inspector config, traceability enforcer (which scans `["Source", "E2E"]`), and all quality gates are blind to this entire codebase. The CLAUDE.md describes portal/ as "Debug UI (embedded via iframe)" — this description is outdated and misleading.
- **Recommendation:** Add `portal/` to `source.dirs` and `source.test_dirs` in `inspector.config.yml`. Update CLAUDE.md to accurately describe portal/'s role. Add `Plans/dev-workflow-platform/requirements.md` to the enforcer's active plan list.

---

### QO-003: FR-dependency-seed confirmed missing from Source/
- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/` (no seed file exists)
- **Detail:** `Plans/dependency-linking/requirements.md` lists FR-dependency-seed as "❌ Missing" and the audit confirms it: no `seed.ts` or equivalent exists anywhere under `Source/Backend/src/`. The acceptance criteria require idempotent seeding of 8 known dependency relationships (BUG-0010 blocked by BUG-0003/0004/0005/0006/0007; FR-0004/0005/0007 by other FRs). Without this:
  - Known dependency cascade behavior is untestable in a fresh environment
  - `GET /api/work-items/{id}` for the seeded items returns no `blockedBy` data
  - The enforcement gate misses this because it scans `FR-dependency-seed` in the self-judging plan only if that FR-ID appeared there, and it doesn't — see QO-001.
- **Recommendation:** Create `Source/Backend/src/store/seed.ts` with idempotent dependency seeding; call on server startup after store initialization. Add `// Verifies: FR-dependency-seed` comment. Route to TheFixer.

---

### QO-004: Dependency features duplicated across `Source/` and `portal/` with incompatible ID schemes
- **Severity:** P2
- **Category:** architecture-violation / spec-drift
- **Files:** `Source/Backend/src/services/dependency.ts`, `portal/Backend/tests/dependencies.test.ts`
- **Detail:** FR-dependency-* requirements were designed for `portal/` (the dev-workflow-platform) but are also implemented in `Source/` (the workflow engine). Both codebases have independent dependency tracking implementations:
  - `Source/` uses IDs: `FR-dependency-service`, `FR-dependency-dispatch-gating`, `FR-dependency-endpoints`, `FR-dependency-metrics`
  - `portal/` uses IDs: `FR-dependency-linking`, `FR-dependency-dispatch-gating`, `FR-dependency-cycle-detection`, `FR-dependency-ready-check`
  Same abstract feature, two incompatible implementations, two ID namespaces, no shared code. The `Plans/dependency-linking/requirements.md` says "Spec reference: Specifications/dev-workflow-platform.md (FR-070 — FR-085)" — this means the spec refers to the portal app, but the Source app also got the feature. Cross-module scope creep with no reconciliation.
- **Recommendation:** Audit whether dependency tracking is intentionally in both codebases or if Source/ received it by error. If intentional, document rationale. If accidental, remove from Source/ and update Verifies comments. Route to TheATeam for architectural decision.
- **Cross-ref:** ESCALATE → TheATeam (architectural decision needed)

---

### QO-005: `Plans/dependency-linking/requirements.md` implementation delta is materially wrong
- **Severity:** P3
- **Category:** doc-stale
- **File:** `Plans/dependency-linking/requirements.md` (lines 39–53)
- **Detail:** The plan's implementation delta table is outdated and wrong in two ways:
  1. It marks `FR-dependency-frontend-tests` as "❌ Missing" citing "DependencySection.test.tsx and BlockedBadge.test.tsx do not exist" — both files **do exist** at `Source/Frontend/tests/components/DependencySection.test.tsx` and `Source/Frontend/tests/components/BlockedBadge.test.tsx` with correct Verifies comments.
  2. All file paths reference `portal/` (e.g., `portal/Backend/src/database/seed.ts`, `portal/Frontend/src/components/shared/DependencyPicker.tsx`) but the actual implementation is in `Source/` paths. The plan was written for portal/ but implemented in Source/.
  A team reading this plan to understand current state will have incorrect information about both what's missing and where things live.
- **Recommendation:** Update the implementation delta table to reflect actual Source/ paths and correct completion status. Mark FR-dependency-api-types as done (blockedBy is in UpdateWorkItemRequest). Mark FR-dependency-frontend-tests as done. Keep FR-dependency-seed as ❌ Missing.

---

### QO-006: Logger never pretty-prints in development; `LOG_LEVEL` not respected
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Backend/src/utils/logger.ts` (line 24)
- **Detail:** The architecture rule states: "Use structured JSON logging in production, pretty-printing in development." The `LOG_LEVEL` env var is supposed to control verbosity. `utils/logger.ts` unconditionally writes JSON to stdout via `process.stdout.write(JSON.stringify(entry) + '\n')` — no `NODE_ENV` check, no `LOG_LEVEL` check, no pretty-printing path. The FR-WF-013 acceptance criterion "pretty-printing in development" is unmet. Additionally, two logger files exist (`src/logger.ts` and `src/utils/logger.ts`) — the outer one wraps the inner with a normalize adapter to unify call signatures, which is an unnecessary abstraction layer.
- **Recommendation:** In `utils/logger.ts`, check `process.env.NODE_ENV !== 'production'` to switch to formatted output. Respect `LOG_LEVEL` for filtering. Consider eliminating the `src/logger.ts` wrapper by aligning call signatures across the codebase.

---

### QO-007: Route handlers call store directly, bypassing service layer
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts` (lines 44, 73, 79, 134)
- **Detail:** Architecture rule: "No direct DB calls from route handlers — use the service layer." `workItems.ts` calls `store.createWorkItem()`, `store.findAll()`, `store.findById()`, `store.updateWorkItem()`, `store.softDelete()` directly from route handlers. While this is an in-memory store (not a DB), the principle is identical — routes should orchestrate through services, which handle business logic isolation. Currently, business logic such as metric tracking (`itemsCreatedCounter.inc(...)`) and change tracking (`trackUpdates(...)`) lives inline in route handlers. This makes the route file harder to test in isolation and harder to swap persistence backends.
- **Recommendation:** Create `Source/Backend/src/services/workItemService.ts` exposing `createItem()`, `listItems()`, `getItem()`, `updateItem()`, `deleteItem()`. Move inline logic there. Route handlers become thin dispatch layers.

---

### QO-008: `eslint-disable-next-line` suppressing exhaustive-deps in production code
- **Severity:** P4
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` with inline disable comments. These suppressions indicate dependency arrays that are intentionally incomplete — which can cause stale closure bugs if dependencies change. Architecture note: suppressing lint is a technical debt marker, not a solution.
- **Recommendation:** Refactor the affected hooks/effects to use `useCallback` on dependencies or restructure to avoid the missing dependency. Remove the eslint-disable comments.

---

### QO-009: Silent JSON parse swallow in API error path
- **Severity:** P4
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}));` — if the server returns a non-JSON body on error (e.g., a raw 502 HTML page from a proxy), the catch silently returns `{}`. The caller receives an empty object instead of a meaningful error. Architecture rule: "Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed." No such documentation exists here.
- **Recommendation:** Log the parse failure or explicitly comment why `{}` is an acceptable fallback. Consider returning `{ error: 'Failed to parse server response' }` to provide a meaningful signal.

---

### QO-010: `FR-dependency-dispatch-gating` spec says `pending_dependencies` status, code blocks at HTTP 400
- **Severity:** P4
- **Category:** spec-drift
- **File:** `Source/Backend/src/routes/workflow.ts:240`, `Source/Shared/types/workflow.ts`
- **Detail:** `Plans/dependency-linking/requirements.md` FR-dependency-dispatch-gating states: "unresolved blockers → set to `pending_dependencies` instead." However:
  - `WorkItemStatus` enum has no `PendingDependencies` value
  - The dispatch endpoint returns HTTP 400 with `{ error: 'Cannot dispatch: work item has unresolved blocking dependencies' }` rather than transitioning the item to a `pending_dependencies` status
  The acceptance criteria test expects: "PATCH to approved with unresolved blocker → response status is `pending_dependencies`." The actual behavior is a 400 on dispatch, not a status field change. The spec and implementation are diverged.
- **Note:** The implementation behavior (blocking dispatch with 400) is functionally safer than a status transition, but it diverges from the written spec. Verify with spec author whether this was intentional.

---

## Summary JSON

```json
{
  "audit_date": "2026-07-30",
  "auditor": "quality-oracle",
  "spec_coverage": {
    "enforcer_scope": { "requirements": 13, "covered": 13, "pct": 100 },
    "source_scope": { "requirements": 29, "covered": 28, "pct": 97 },
    "note": "Enforcer covers only 13 of ~45 active FRs; gate is structurally false-green"
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift/tooling", "title": "Traceability enforcer false-green gate" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "portal/ app outside all inspector scope" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-dependency-seed missing" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "Dependency features duplicated in Source/ and portal/ with incompatible IDs" },
    { "id": "QO-005", "severity": "P3", "category": "doc-stale", "title": "Plans/dependency-linking implementation delta is wrong" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "Logger never pretty-prints in dev; LOG_LEVEL ignored" },
    { "id": "QO-007", "severity": "P3", "category": "architecture-violation", "title": "Route handlers bypass service layer" },
    { "id": "QO-008", "severity": "P4", "category": "pattern-violation", "title": "eslint-disable in production hooks" },
    { "id": "QO-009", "severity": "P4", "category": "pattern-violation", "title": "Silent JSON parse swallow in API client" },
    { "id": "QO-010", "severity": "P4", "category": "spec-drift", "title": "pending_dependencies status not in WorkItemStatus enum" }
  ],
  "p1_count": 1,
  "p2_count": 3,
  "p3_count": 3,
  "p4_count": 3,
  "grade": "D",
  "grade_rationale": "1 P1 (false-green traceability gate) disqualifies B or higher per grading config (max_p1: 0 for A/B/C)"
}
```

---

## Escalations

| Finding | Route To | Reason |
|---------|----------|--------|
| QO-001 | **solo-session** | Tooling fix to `traceability-enforcer.py`; modifies `tools/` which solo sessions may edit freely |
| QO-002 | **solo-session** | Config fix to `inspector.config.yml`; updates `CLAUDE.md` description of portal/ |
| QO-003 | **TheFixer** | New source file in Source/Backend — pipeline required |
| QO-004 | **TheATeam** | Architectural decision on dual-app dependency duplication |
| QO-007 | **TheFixer** | Refactor routes to use service layer |
