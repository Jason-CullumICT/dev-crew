# Quality Oracle Audit — 2026-11-26

**Project:** dev-crew Source App (Work Item Workflow Management)
**Config:** `Teams/TheInspector/inspector.config.yml`
**Mode:** Full static audit — spec drift, traceability, architecture, pattern enforcement

---

## Spec Coverage Summary

| Scope | Requirements | Traced | Coverage |
|-------|-------------|--------|----------|
| `Plans/self-judging-workflow` (FR-WF-001–013) | 13 | 13 | **100%** |
| `Plans/dependency-linking` (FR-dependency-*) | 16 | 15 | **93.75%** |
| `Specifications/dev-workflow-platform.md` (FR-001–069) | 74 | 0 | **0%** |
| **Plans-level total** | **29** | **28** | **96.5%** |
| **All-scopes total** | **103** | **28** | **27.2%** |

> The enforcer reports "PASSED" but covers only the most-recently-modified plan. See QO-001 and QO-004.

---

## Findings

### QO-001: Traceability Enforcer Regex Excludes All Lowercase FR IDs
- **Severity:** P1
- **Category:** spec-drift / tool-defect
- **File:** `tools/traceability-enforcer.py` (line ~65 — `pattern = re.compile(r"FR-[A-Z0-9-]+")`)
- **Detail:** The enforcer regex `FR-[A-Z0-9-]+` only matches uppercase characters after `FR-`. All 16 requirements in `Plans/dependency-linking/requirements.md` use the `FR-dependency-*` naming scheme (lowercase). These IDs do NOT match the regex, so they are silently skipped. When the enforcer runs against that plan it instead picks up stale seed-data IDs (FR-0002, FR-0003 etc.) from prose descriptions, producing 7 false-positive "missing" reports and 0 true checks. Net effect: `python3 tools/traceability-enforcer.py --plan dependency-linking` exits with code 1 for the wrong reason, while the actual 16 FR-dependency-* requirements go completely unchecked.
- **Verification:** `python3 -c "import re; print(re.compile(r'FR-[A-Z0-9-]+').match('FR-dependency-service'))"` → `None`
- **Recommendation:** Change the regex on line ~65 to `FR-[A-Za-z0-9-]+` and add a test case covering lowercase FR IDs. Re-run against both plans to confirm both pass.
- **Cross-ref:** QO-002 (the missing search route would have been caught by the enforcer if this bug were fixed)

---

### QO-002: `GET /api/search` Route Not Registered — Tests Will Fail
- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/tests/routes/search.test.ts` (lines 1–7) + `Source/Backend/src/app.ts`
- **Detail:** `FR-dependency-search` requires a `GET /api/search` cross-entity typeahead endpoint. The test file `search.test.ts` explicitly documents the gap: *"As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* No `app.use('/api/search', ...)` or `searchRouter` exists in `app.ts`. Running `npm test` in `Source/Backend/` will produce failures for these tests.
- **Verification:** `grep -n "search" Source/Backend/src/app.ts` → no output
- **Recommendation:** Implement `Source/Backend/src/routes/search.ts` with `GET /api/search?q=` returning `{data: WorkItem[]}` matching title/description; register in `app.ts`; add `// Verifies: FR-dependency-search` comments.
- **Cross-ref:** QO-001 (enforcer would catch this once the regex bug is fixed)
- **Escalate → TheFixer**

---

### QO-003: Architecture Violation — Route Handlers Call Store Directly (Bypass Service Layer)
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workItems.ts`, `Source/Backend/src/routes/workflow.ts`, `Source/Backend/src/routes/intake.ts`
- **Detail:** CLAUDE.md architecture rule: *"No direct DB calls from route handlers — use the service layer."* All three route files import and call `store.*` functions directly (e.g., `store.createWorkItem`, `store.findById`, `store.updateWorkItem`, `store.softDelete`). The service layer pattern IS used correctly in `assessment.ts`, `router.ts`, `dashboard.ts`, `dependency.ts`, and `changeHistory.ts`. The inconsistency means CRUD operations have no service-layer boundary, making them harder to test in isolation, instrument, or extend.
  - `workItems.ts` lines 44, 73, 79, 89, 134, 142: direct store calls
  - `workflow.ts` lines 44, 71, 99, 119, 155, 175, 217, 269, 317, 359: direct store calls
  - `intake.ts` lines 19, 42: direct store calls
- **Recommendation:** Extract CRUD and state-mutation logic from routes into a `WorkItemService` (or expand the existing service files). Route handlers should delegate to `workItemService.create()`, `workItemService.findById()`, etc.
- **Escalate → TheFixer**

---

### QO-004: `Specifications/` FRs Entirely Untraced — 74 Requirements at 0% Coverage
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md` (FR-001 through FR-069, plus FR-TMP-* in `tiered-merge-pipeline.md`)
- **Detail:** The domain specifications in `Specifications/dev-workflow-platform.md` define 74 functional requirements (FR-001 to FR-069) covering feature requests, bug reports, development cycles, pipeline orchestration, SQLite database, and a full 7-page React frontend. Zero of these FRs appear in any `// Verifies:` comment in `Source/`. The traceability enforcer never targets `Specifications/` — it only reads from `Plans/`. Two possible states:
  1. **Stale spec:** The Specifications/ document was written for a prior product concept that was replaced by the current Work Item Workflow system (FR-WF-*). If so, the spec needs to be updated to reflect the current domain.
  2. **Unstarted work:** The Specifications/ FRs represent unstarted future work. If so, the Plans/ pipeline must eventually trace back to them.
  Either way, the gap is invisible to the enforcer and creates false confidence in coverage.
- **Recommendation:** Determine whether Specifications/dev-workflow-platform.md is current truth or superseded. If superseded, archive it and document the replacement spec. If current, create a plan with traceability to it. Add a note to `tools/traceability-enforcer.py` about which specs are authoritative.

---

### QO-005: `eslint-disable` Suppressing Dependency Array Warnings in Production Hooks
- **Severity:** P2
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`
- **Detail:** Two locations suppress `react-hooks/exhaustive-deps` with `// eslint-disable-next-line` comments. This lint rule exists to prevent stale closure bugs — suppressing it without an explicit justification comment risks subtle reactivity bugs (e.g., a callback capturing a stale value of a function prop or state variable). CLAUDE.md prohibits suppressing linting rules.
- **Recommendation:** Audit both suppressed hook calls. If the suppression is genuinely intentional (e.g., a stable ref that changes identity each render), add an explicit justification comment explaining why the dep is intentionally excluded. If not intentional, fix the dependency array.
- **Escalate → TheFixer**

---

### QO-006: Silent JSON Parse Failure in API Client
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}));` — a `.catch(() => ({}))` swallows JSON parse errors silently. If the backend returns a non-JSON error body (e.g., an HTML 502 from a proxy), the error is lost and the thrown `Error` will have message `undefined` (since `body.message` will be undefined on `{}`). This violates the architecture rule: *"Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."*
- **Recommendation:** Replace with `catch((e) => { logger.warn('Failed to parse error response body', e); return {}; })` or accept that error messages may be lost and document the intent.

---

### QO-007: `Plans/dependency-linking/requirements.md` Status Table References Stale `portal/` Paths
- **Severity:** P3
- **Category:** doc-stale
- **File:** `Plans/dependency-linking/requirements.md` (lines 38–53)
- **Detail:** The status table in this plan marks `FR-dependency-frontend-tests` as ❌ Missing, stating "DependencySection.test.tsx and BlockedBadge.test.tsx do not exist." However, both files DO exist in `Source/Frontend/tests/components/` (confirmed via directory listing). The plan was written for the old `portal/` paths and not updated after the migration to `Source/`. The stale ❌ markers may cause confusion and block the plan from being marked complete.
- **Recommendation:** Update the dependency-linking status table to reflect current `Source/` paths. Mark `FR-dependency-frontend-tests` ✅ Done.

---

### QO-008: Traceability Enforcer is Single-Plan — Multi-Plan Projects Lose Coverage Silently
- **Severity:** P3
- **Category:** spec-drift / tool-defect
- **File:** `tools/traceability-enforcer.py` (lines 36–40 — `max(req_files, key=os.path.getmtime)`)
- **Detail:** When run without arguments, the enforcer selects the most-recently-modified `requirements.md` from `Plans/`. With 19 plans in the repo, only ONE plan's requirements are checked at a time. As soon as a new plan is created, the previous plan's requirements silently drop out of the default enforcement gate. The CLAUDE.md verification gate (`python3 tools/traceability-enforcer.py`) therefore gives false coverage confidence for older plans.
- **Recommendation:** Extend the enforcer to scan ALL `Plans/*/requirements.md` files in one pass (unless `--plan` is specified), then aggregate results. This provides true multi-plan coverage with a single gate command.

---

## Pattern Enforcement Scan

| Check | Result |
|-------|--------|
| `console.log` in production backend | ✅ None found |
| `console.log` in production frontend | ✅ None found |
| Hardcoded secrets/credentials | ✅ None found |
| Empty `catch` blocks (excluding api/client.ts) | ✅ None found |
| `eslint-disable` suppression | ⚠️ 2 occurrences (QO-005) |
| Files > 500 lines | ✅ None (WorkItemDetailPage: 426 lines; workflow.ts: 374 lines) |
| `test.skip` / `xit` / `xdescribe` | ✅ None found |
| Logger abstraction used (not console.log) | ✅ Confirmed — `src/utils/logger.ts` and `src/logger.ts` used consistently |
| Structured JSON logging | ✅ Confirmed |
| Prometheus metrics exposed | ✅ `GET /metrics` wired in `app.ts` |

---

## Architecture Rule Compliance

| Rule | Status |
|------|--------|
| Specs are source of truth | ⚠️ Partial — Plans/ traced, Specifications/ not (QO-004) |
| No direct DB calls from route handlers | ❌ Violated in 3 route files (QO-003) |
| Shared types are single source of truth | ✅ `Source/Shared/types/workflow.ts` imported by both layers |
| Every FR needs a test with `// Verifies:` | ✅ For Plans-level FRs; ❌ for Specifications/-level FRs |
| No hardcoded secrets | ✅ |
| All list endpoints return `{data: T[]}` | ✅ Confirmed |
| New routes must have observability | ✅ Logger and metrics used in routes |
| Business logic has no framework imports | ✅ Services are framework-free |
| Never swallow errors silently | ⚠️ One violation in api/client.ts (QO-006) |

---

## Grade

**B** — 0 P1s exploitable in production (search route is test-only failure), but the enforcer regex bug (QO-001) is a P1 tool failure that creates systemic false confidence.  
Revised with tool finding: **C** — The enforcer can't do its job for lowercase FR IDs (QO-001), the search route will fail CI tests (QO-002), and the architecture service-layer rule is broadly violated (QO-003).

---

```json
{
  "audit_date": "2026-11-26",
  "grade": "C",
  "spec_coverage": {
    "plans_level_pct": 96.5,
    "specifications_level_pct": 0,
    "combined_pct": 27.2
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "tool-defect", "title": "Traceability enforcer regex excludes all lowercase FR IDs (FR-dependency-*)"},
    {"id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "GET /api/search not registered in app.ts — tests will fail"},
    {"id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Route handlers call store directly, bypassing service layer"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift", "title": "74 Specifications/ FRs have 0% source code traceability"},
    {"id": "QO-005", "severity": "P2", "category": "pattern-violation", "title": "eslint-disable suppresses react-hooks/exhaustive-deps in 2 production hooks"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "Silent JSON parse failure swallowed in api/client.ts"},
    {"id": "QO-007", "severity": "P3", "category": "doc-stale", "title": "dependency-linking status table references stale portal/ paths"},
    {"id": "QO-008", "severity": "P3", "category": "tool-defect", "title": "Enforcer is single-plan — multi-plan coverage silently drops"}
  ],
  "p1_count": 2,
  "p2_count": 3,
  "p3_count": 3,
  "escalate_to_fixer": ["QO-002", "QO-003", "QO-005"]
}
```
