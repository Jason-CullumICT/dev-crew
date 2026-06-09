# Quality Oracle Audit — 2026-06-09

**Grade: C** (P1: 1 · P2: 3 · P3: 4 · P4: 3 · spec-coverage: see below)

---

## Repository Structure (Context)

This project contains **two separate applications**:

| App | Directory | Spec | Plans |
|-----|-----------|------|-------|
| Workflow Engine | `Source/` | `Specifications/workflow-engine.md` | `Plans/self-judging-workflow/` |
| Dev Workflow Platform | `portal/` | `Specifications/dev-workflow-platform.md` | `Plans/orchestrated-dev-cycles/`, `Plans/dev-cycle-traceability/`, `Plans/dependency-linking/`, `Plans/duplicate-deprecated-status/` |

The traceability enforcer (`tools/traceability-enforcer.py`) hardcodes `source_dirs = ["Source", "E2E"]` — it is **blind to `portal/`**. All plan coverage numbers below reflect this critical limitation.

---

## Spec Coverage

| Namespace | Source | Total FRs | Traced in code | Coverage |
|-----------|--------|-----------|----------------|----------|
| FR-WF-001…013 | `Plans/self-judging-workflow/requirements.md` | 13 | 13 (`Source/`) | **100%** ✅ |
| FR-dependency-XXX | `Plans/dependency-linking/requirements.md` | ~10 distinct | ~10 (`Source/` + `portal/`) | ~100% (see QO-003) |
| FR-033…049 | `Plans/orchestrated-dev-cycles/requirements.md` | 18 | 18 (`portal/`) | **0% to enforcer** ❌ |
| FR-050…069 | `Plans/dev-cycle-traceability/requirements.md` | 21 | 21 (`portal/`) | **0% to enforcer** ❌ |
| FR-DUP-01…13 | `Plans/duplicate-deprecated-status/requirements.md` | 13 | 0 in `Source/` | **0% to enforcer** ❌ |
| FR-001…069 | `Specifications/dev-workflow-platform.md` | 81 | never scanned by enforcer | **not tracked** |

**Default enforcer result:** passes (checks only self-judging-workflow). Running it against any portal-targeting plan produces a false 100% failure.

---

## Findings

### QO-001: Traceability enforcer blind to `portal/` — verification gate is broken
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py` lines 24–26 (`source_dirs = ["Source", "E2E"]`)
- **Detail:** The enforcer hardcodes `source_dirs = ["Source", "E2E"]`. The `portal/` directory contains 300 Verifies comments covering FR-033 to FR-069, FR-DUP-01 to FR-DUP-13, and FR-dependency-XXX IDs. When any team runs `python3 tools/traceability-enforcer.py --file Plans/orchestrated-dev-cycles/requirements.md`, it reports **18 MISSING** even though every FR is traced in `portal/`. Likewise for `dev-cycle-traceability` (21 MISSING) and `duplicate-deprecated-status` (15 MISSING). The enforcer's PASS/FAIL output cannot be trusted for portal-targeting plans.
- **Recommendation:** Add `"portal"` to `source_dirs` alongside `"Source"` and `"E2E"`:
  ```python
  source_dirs = ["Source", "E2E", "portal"]
  ```
  Then re-run all four failing plans to confirm true coverage.
- **Cross-ref:** TheFixer (one-line code change + re-run verification gates)

---

### QO-002: Enforcer is single-plan — 7 of 8 active plans never checked in CI default run
- **Severity:** P2
- **Category:** spec-drift
- **File:** `tools/traceability-enforcer.py` (auto-discovery logic), `CLAUDE.md` verification gates section
- **Detail:** The enforcer auto-selects the **most recently modified** `Plans/*/requirements.md`. Only `Plans/self-judging-workflow/requirements.md` passes in the default run. The other 7 plans — including all portal-targeting plans — are silently skipped. CLAUDE.md's verification gate (`python3 tools/traceability-enforcer.py`) passes even when 52+ plan requirements are unverified.
- **Recommendation:** Either (a) add a `--all-plans` flag that iterates every `Plans/*/requirements.md` and reports each, or (b) update `CLAUDE.md`'s verification gate to explicitly loop:
  ```bash
  for f in Plans/*/requirements.md; do
    python3 tools/traceability-enforcer.py --file "$f" || exit 1
  done
  ```
- **Cross-ref:** Fix QO-001 first (add `portal/` to source_dirs), then update CI gate.

---

### QO-003: FR-dependency ID mismatch — plan uses different IDs than implementation
- **Severity:** P2
- **Category:** spec-drift
- **Detail:** `Plans/dependency-linking/requirements.md` defines requirement IDs like `FR-dependency-types`, `FR-dependency-api-types`, `FR-dependency-schema`, `FR-dependency-service`, `FR-dependency-metrics`, etc. The `Source/` implementation traces to IDs like `FR-dependency-service`, `FR-dependency-endpoints`, `FR-dependency-dispatch-gating`, `FR-dependency-api-client`, `FR-dependency-blocked-badge`, `FR-dependency-section`, `FR-dependency-picker`. The `portal/` implementation uses yet another set: `FR-dependency-linking`, `FR-dependency-ready-check`, `FR-dependency-cycle-detection`. None of the three sets is fully consistent. The enforcer running against this plan picks up `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007` (seeded *data* IDs in the plan's prose, not code requirement IDs) as if they were implementation FRs, producing false failures.
- **Recommendation:** Reconcile the plan's FR IDs with what's actually in the code comments. Either update the plan to match the code's IDs, or normalise the code comments to match the plan. Separately, the enforcer's regex `FR-[A-Z0-9-]+` should be scoped to exclude short numeric IDs that appear in prose (like `FR-0002`) rather than being `Verifies:` targets.

---

### QO-004: Duplicate frontend test files — two copies of WorkItemDetailPage and WorkItemListPage tests
- **Severity:** P2
- **Category:** untested (false test coverage)
- **Files:**
  - `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (root)
  - `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (pages/)
  - `Source/Frontend/tests/WorkItemListPage.test.tsx` (root)
  - `Source/Frontend/tests/pages/WorkItemListPage.test.tsx` (pages/)
- **Detail:** Both root-level and `pages/` subdirectory tests exist for the same components. The root-level copies appear to be older; the `pages/` copies are the canonical post-refactor versions. If both run, they may conflict or create confusing duplicate results. If only one set runs (depending on Jest's glob config), the other provides false coverage assurance.
- **Recommendation:** Check `jest.config.js` to confirm which glob is used. Delete the stale root-level copies (`tests/WorkItemDetailPage.test.tsx`, `tests/WorkItemListPage.test.tsx`) and keep only `tests/pages/`. Run tests to confirm no regressions.

---

### QO-005: `portal/Backend/src/routes/teamDispatches.ts` — unlinked production implementation
- **Severity:** P3
- **Category:** untested (unlinked implementation)
- **File:** `portal/Backend/src/routes/teamDispatches.ts`
- **Detail:** This production route file has **zero `Verifies:` comments** and was modified within the last 14 days. It represents a recently-added feature with no traceability link to any plan requirement. No corresponding test file was found.
- **Recommendation:** Identify which plan requirement this route implements and add `// Verifies: FR-XXX` comments. If it is unspecced work, write the spec first per the project's spec-first rule.

---

### QO-006: `portal/Frontend/src/pages/TeamsPage.tsx` — unlinked production implementation
- **Severity:** P3
- **Category:** untested (unlinked implementation)
- **File:** `portal/Frontend/src/pages/TeamsPage.tsx`
- **Detail:** This production page has **zero `Verifies:` comments** and was recently modified. It is untraced to any plan requirement.
- **Recommendation:** Same as QO-005 — either link to an existing FR or write the spec first.

---

### QO-007: `WorkItemDetailPage.tsx` approaching 500-line threshold
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/pages/WorkItemDetailPage.tsx` (426 lines)
- **Detail:** At 426 lines, this file is within 15% of the project's 500-line split threshold. It renders the full detail view, action buttons, assessment cards, and change history timeline in a single file. The complexity will grow as more workflow states are added.
- **Recommendation:** Extract `AssessmentCard` and `ChangeHistoryTimeline` into separate component files now, before the next feature addition pushes it over 500 lines.

---

### QO-008: Two `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions
- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Both suppress the React hooks exhaustive-deps lint rule without an explanatory comment for why the dependency is intentionally omitted. This pattern can hide stale-closure bugs.
- **Recommendation:** Add a one-line inline comment explaining the intentional omission (e.g., `// intentional: we only want to re-run on itemId change, not on callback identity`). This documents the decision and prevents future contributors from re-adding the dependency accidentally.

---

### QO-009: `Specifications/dev-workflow-platform.md` FR-001…069 are never directly verified by the enforcer
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The canonical domain spec has 81 FR IDs (FR-001 to FR-069 plus special IDs). The enforcer only checks Plans-level FRs, not Spec-level FRs. A requirement could be removed from a plan but still exist in the spec — the enforcer would never catch the gap. The spec is the "source of truth" per CLAUDE.md but it is never programmatically validated.
- **Recommendation:** Either (a) mark each spec FR as satisfied by a corresponding plan FR in a traceability matrix, or (b) extend the enforcer to accept `--spec` mode that reads from `Specifications/` directly. This is a longer-term hygiene item but is the root of the two-namespace problem.

---

### QO-010: `DebugPortalPage.tsx` uses free-text instead of FR ID
- **Severity:** P4
- **Category:** spec-drift
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** Comment reads `// Verifies: dev-crew debug portal — embedded container-test viewer` — this is a free-text description, not a traceable FR ID. The enforcer's regex `FR-[A-Z0-9-]+` won't match it.
- **Recommendation:** If this page is specced (and it is referenced in CLAUDE.md as the Portal/Debug UI), assign it an FR ID (e.g., `FR-WF-009` since it's part of the frontend app, or a new ID). If it's considered infrastructure, document that explicitly.

---

### QO-011: `vite-env.d.ts` has no Verifies comment — minor
- **Severity:** P4
- **Category:** spec-drift
- **File:** `Source/Frontend/src/vite-env.d.ts`
- **Detail:** This is a generated Vite type declaration file. It contains no runtime logic and traceability is not applicable.
- **Recommendation:** No action needed — exclude `vite-env.d.ts` from the enforcer's file scan (or simply accept it as infrastructure).

---

### QO-012: `portal/Frontend/src/components/common/RepoSelector.tsx` — no Verifies, no test
- **Severity:** P4
- **Category:** untested
- **File:** `portal/Frontend/src/components/common/RepoSelector.tsx`
- **Detail:** Production component with zero traceability comments and no corresponding test file found. Scope and ownership unclear.
- **Recommendation:** Identify which requirement this implements and add traceability, or remove if unused.

---

## Architecture Rule Compliance

| Rule | Status | Notes |
|------|--------|-------|
| Specs are source of truth | ⚠️ PARTIAL | `Specifications/` FRs are never enforced; plan FRs are enforced only in Source/ |
| No direct DB calls from route handlers | ✅ PASS | Source/ uses in-memory store via service layer; portal/ uses service layer |
| Shared types are single source of truth | ✅ PASS | Source/Shared/types/workflow.ts; portal/Shared/types.ts |
| Every FR needs a test with `// Verifies:` | ⚠️ PARTIAL | Self-judging-workflow 100%; portal-targeting plans not validated by enforcer |
| No hardcoded secrets | ✅ PASS | No secrets found; env vars used |
| All list endpoints return `{data: T[]}` | ✅ PASS | Confirmed in routes |
| New routes must have observability | ✅ PASS for Source/ | `portal/Backend/src/routes/teamDispatches.ts` needs verification |
| Business logic has no framework imports | ✅ PASS | Services are clean |
| Never swallow errors silently | ⚠️ ONE INSTANCE | `api/client.ts:26`: `.catch(() => ({}))` suppresses JSON parse errors without logging; comment explains intent but no structured log |
| No `console.log` in production | ✅ PASS | Logger abstraction in place |

---

## JSON Summary

```json
{
  "audit_date": "2026-06-09",
  "grade": "C",
  "spec_coverage": {
    "self_judging_workflow_plan": "100%",
    "portal_plans_reported_by_enforcer": "0% (false: enforcer blind to portal/)",
    "portal_plans_actual": "~95%+ (portal/ has 300 Verifies comments)",
    "specifications_dev_workflow_platform": "not tracked (81 FRs, never enforced)"
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer excludes portal/ — verification gate broken"},
    {"id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "Enforcer single-plan by default — 7 of 8 plans never checked"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "FR-dependency ID mismatch between plan, Source/, and portal/"},
    {"id": "QO-004", "severity": "P2", "category": "untested", "title": "Duplicate frontend test files for WorkItemDetailPage and WorkItemListPage"},
    {"id": "QO-005", "severity": "P3", "category": "untested", "title": "portal/Backend/src/routes/teamDispatches.ts — zero Verifies comments"},
    {"id": "QO-006", "severity": "P3", "category": "untested", "title": "portal/Frontend/src/pages/TeamsPage.tsx — zero Verifies comments"},
    {"id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "WorkItemDetailPage.tsx at 426 lines, approaching 500-line threshold"},
    {"id": "QO-008", "severity": "P3", "category": "pattern-violation", "title": "Two eslint-disable-next-line react-hooks/exhaustive-deps without explanation"},
    {"id": "QO-009", "severity": "P3", "category": "spec-drift", "title": "Specifications/ FR-001..069 never directly verified by enforcer"},
    {"id": "QO-010", "severity": "P4", "category": "spec-drift", "title": "DebugPortalPage.tsx uses free-text Verifies comment instead of FR ID"},
    {"id": "QO-011", "severity": "P4", "category": "spec-drift", "title": "vite-env.d.ts has no Verifies comment (generated file, acceptable)"},
    {"id": "QO-012", "severity": "P4", "category": "untested", "title": "portal/Frontend/src/components/common/RepoSelector.tsx — no Verifies, no test"}
  ],
  "counts": {"P1": 1, "P2": 3, "P3": 4, "P4": 3},
  "escalations": []
}
```
