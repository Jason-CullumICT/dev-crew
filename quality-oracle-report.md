---

## Quality Oracle Findings

### Spec Coverage: 100% (primary plan) / ~95% (portal plan)

- **Primary plan** (`Plans/self-judging-workflow/` → FR-WF-001 … FR-WF-013): **13/13 requirements traced** ✅ — traceability enforcer passes
- **Portal plan** (`Plans/dependency-linking/` → FR-dependency-*): **2 of ~16 requirements unimplemented** (seed, api-types)
- **Tiered merge pipeline** (`Specifications/tiered-merge-pipeline.md`): implemented in `platform/` (excluded from enforcer scope — P4 note)

---

### QO-001: `portal/Backend/src/database/seed.ts` — FR-dependency-seed UNIMPLEMENTED
- **Severity:** P2
- **Category:** spec-drift
- **File:** `portal/Backend/src/database/` (file missing entirely)
- **Detail:** `FR-dependency-seed` requires an idempotent `seed.ts` that inserts 8 known dependency relationships on server startup (BUG-0010 blocked_by 5 bugs; 3 FRs with cross-FR blockers). The plan tracking (`Plans/dependency-linking/requirements.md`) confirms this as `❌ Missing`. Without this, the portal's dependency visualisation ships with no baseline demo data, and the acceptance criterion "GET /api/bugs/BUG-0010 returns 5 items in `blocked_by`" is unmet.
- **Recommendation:** Create `portal/Backend/src/database/seed.ts` with idempotent inserts guarded by an existence check; call it from `portal/Backend/src/index.ts` startup, after `initSchema()`.
- **Cross-ref:** Route to TheFixer. Dependencies test (`portal/Backend/tests/dependencies.test.ts`) already has a test case for seed data presence — it will pass once implemented.

---

### QO-002: `as any` type-safety bypass in `DependencyPicker` — FR-dependency-api-types incomplete
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `portal/Frontend/src/components/shared/DependencyPicker.tsx:291-293`
- **Detail:** `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts` (lines 32–67) both lack `blocked_by?: string[]`. The DependencyPicker works around this with `as any` casts when calling `bugs.update()` and `featureRequests.update()`, bypassing TypeScript's type checker on the entire PATCH payload. This silences errors that could catch misrouted payloads or API contract drift. `FR-dependency-api-types` acceptance criterion explicitly states: "no `as any` casts needed in frontend for dependency fields."
- **Recommendation:** Add `blocked_by?: string[]` to both `UpdateBugInput` and `UpdateFeatureRequestInput` in `portal/Shared/api.ts`, then remove the two `as any` casts from `DependencyPicker.tsx`.
- **Cross-ref:** Route to TheFixer. Touches `portal/Shared/` (api-contract ownership) + `portal/Frontend/` (frontend-coder removal of casts).

---

### QO-003: Spec drift — dispatch gating returns 400 instead of `pending_dependencies` status
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/routes/workflow.ts:231-244` and `Source/Shared/types/workflow.ts:5-15`
- **Detail:** `FR-dependency-dispatch-gating` (acceptance criterion): "PATCH to approved with unresolved blocker → 200 with status=`pending_dependencies`." The workflow engine instead returns `HTTP 400` with `{ error: "Cannot dispatch: work item has unresolved blocking dependencies" }` and never sets the item's status. The `WorkItemStatus` enum has **no `PendingDependencies` value**. The comment at `workflow.ts:230` claims to verify this requirement but the behavior deviates from the spec. Items with blockers remain in `approved` status, invisible as blocked until dispatch is attempted.
- **Recommendation:** Decide whether to (a) add `PendingDependencies = 'pending_dependencies'` to `WorkItemStatus`, update `VALID_STATUS_TRANSITIONS`, and change dispatch logic to set status instead of returning 400, or (b) update the spec to reflect the chosen 400-rejection approach. Either resolves the spec drift; coordinate with api-contract agent before touching shared types.
- **Cross-ref:** Route to TheFixer for implementation. Spec update goes to requirements-reviewer if approach (b) chosen.

---

### QO-004: `teamDispatches.ts` — recently-modified unlinked implementation (no Verifies comments)
- **Severity:** P2
- **Category:** spec-drift / untested
- **File:** `portal/Backend/src/routes/teamDispatches.ts:1-85`
- **Detail:** This file was modified in the last 14 days (confirmed via `git log`) and implements a team dispatch history API (`GET /api/team-dispatches`, `POST /api/team-dispatches`) but carries **zero `// Verifies:` traceability comments**. No requirement in any spec or plan claims this feature. It is an unlinked implementation — either scope creep or a feature whose requirement hasn't been written yet.
- **Recommendation:** Either (a) write a spec FR for the team dispatch history feature and add `// Verifies: FR-XXX` comments, or (b) if the feature is not spec-approved, remove it until the spec is written. The workflow is always Specs → Plans → Source.
- **Cross-ref:** Route to requirements-reviewer to determine spec status.

---

### QO-005: Dual logger import paths in `Source/Backend`
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Backend/src/store/workItemStore.ts:10`
- **Detail:** The store imports `{ logger }` from `'../utils/logger'` directly (named export, raw interface). Every other production module imports `logger` (default) from `'../logger'` (wrapper that normalises object-first calls). The two interfaces differ: the raw interface takes `(msg: string, ctx?)` while the wrapper accepts `(msgOrObj: string | Record<string, unknown>, ctx?)`. If structured object calls are ever made from the store, they will silently fail or produce unexpected output. Additionally, this splits the logging abstraction surface, making future changes harder.
- **Recommendation:** Update `workItemStore.ts:10` to `import logger from '../logger'` (default import from wrapper), matching all other modules.
- **Cross-ref:** TheFixer (single-line fix, backend-coder module).

---

### QO-006: Traceability enforcer doesn't cover `portal/` — portal FRs have no automated gate
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `tools/traceability-enforcer.py` (source scan dirs) and `Teams/TheInspector/inspector.config.yml:42-44`
- **Detail:** The inspector config defines `source.dirs: ["Source/"]` only. The enforcer scans Source/ and E2E/ for `// Verifies:` references but not `portal/`. Running `python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md` reports 7 MISSING (FR-0002 through FR-0007, FR-070, FR-085) because all portal implementations live outside the scan path. The portal has 60+ functional requirements (dev-workflow-platform.md) with no automated enforcement.
- **Recommendation:** Add `"portal/"` to `source.dirs` in `inspector.config.yml` and add it as a scan directory in the traceability enforcer (or pass as a `--source` flag). This would immediately surface any portal requirements that lack traceability.
- **Cross-ref:** Solo session or tools maintainer.

---

### QO-007: `eslint-disable` suppression without documented rationale
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx:82`, `Source/Frontend/src/hooks/useWorkItems.ts:63`
- **Detail:** Both files suppress `react-hooks/exhaustive-deps` without a comment explaining why the lint rule is intentionally violated. The suppressions exist in recently-modified files. Undocumented hook dependency suppressions are a common source of stale-closure bugs: if a dependency is omitted from the array by accident (not by design), the lint disable hides the mistake permanently.
- **Recommendation:** Add a one-line comment above each `eslint-disable` explaining which dependency is intentionally excluded and why (e.g., `// refreshKey is a trigger, not a value dependency — including it would cause infinite re-fetches`). If the omission is genuinely unsafe, fix the hook logic instead.

---

### JSON Summary

```json
{
  "audit_date": "2026-10-11",
  "auditor": "quality-oracle",
  "primary_plan": "Plans/self-judging-workflow/requirements.md",
  "spec_coverage": {
    "self_judging_workflow": { "total": 13, "covered": 13, "pct": 100 },
    "portal_dependency_linking": { "total": 16, "missing": 2, "pct": 87 },
    "tiered_merge_pipeline": { "scope": "platform/", "excluded_from_enforcer": true }
  },
  "findings": [
    { "id": "QO-001", "severity": "P2", "category": "spec-drift", "status": "OPEN", "route_to": "TheFixer" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "status": "OPEN", "route_to": "TheFixer" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "status": "OPEN", "route_to": "TheFixer" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "status": "OPEN", "route_to": "requirements-reviewer" },
    { "id": "QO-005", "severity": "P3", "category": "pattern-violation", "status": "OPEN", "route_to": "TheFixer" },
    { "id": "QO-006", "severity": "P3", "category": "architecture-violation", "status": "OPEN", "route_to": "solo-session" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "status": "OPEN", "route_to": "TheFixer" }
  ],
  "grade": "B",
  "grade_rationale": "0 P1 findings, 4 P2 findings (threshold for A is ≤3 P2). Primary plan 100% coverage; portal plan ~87%."
}
```

---

**Grade: B** — 0 P1s, 4 P2s (A requires ≤3 P2), primary spec 100% covered, portal plan at ~87%.

**Positive signals:** No `console.log` in production code anywhere, clean separation of service layer from routes, comprehensive test traceability in both Source/ and portal/, no hardcoded secrets, correct `{data: T[]}` wrapping on all list endpoints, full FR-WF-* traceability with 412 `// Verifies:` comments across the codebase.

**Highest-priority fix:** QO-001 (`seed.ts` missing) and QO-002 (`blocked_by` types + `as any` removal) are both small, contained changes that unblock acceptance criteria. QO-003 (dispatch-gating spec drift) needs a deliberate design decision before implementation.
