# Quality Oracle Findings — 2026-09-23

**Auditor:** Quality Oracle  
**Scope:** Full audit — spec drift, traceability, architecture rules, test coverage, pattern enforcement  
**Config:** `Teams/TheInspector/inspector.config.yml`  
**Traceability enforcer (active plan):** PASS (self-judging-workflow — 13/13 FRs covered)

---

## Spec Coverage Summary

| Plan | FRs Scanned | Covered | Missing | Pass? |
|------|------------|---------|---------|-------|
| self-judging-workflow | 13 | 13 | 0 | ✅ PASS |
| dependency-linking | 7† | 0 | 7 | ❌ FAIL |
| dev-workflow-platform | 34 | 0 | 34 | ❌ FAIL |

† The dependency-linking plan's `requirements.md` contains 7 stale FR IDs (FR-0002, FR-0003, FR-0004, FR-0005, FR-0007, FR-070, FR-085) that reference the `portal/` codebase — a separate/superseded implementation. The actual dependency feature ships under `FR-dependency-*` IDs, which passes the self-judging-workflow enforcer.

**Active plan coverage: 100% (self-judging-workflow)**  
**Cross-plan coverage: ~30% (1 of 3 plans passing)**

---

## Findings

### QO-001: Traceability enforcer only gates the most-recently-modified plan

- **Severity:** P1  
- **Category:** architecture-violation / spec-drift  
- **File:** `tools/traceability-enforcer.py` (fallback selection logic, line ~45)  
- **Detail:** The enforcer's default (no `--plan` flag) selects the `requirements.md` with the latest mtime — currently `Plans/self-judging-workflow/requirements.md`. The CLAUDE.md verification gate (`python3 tools/traceability-enforcer.py`) therefore passes while two other plans **silently fail**: `dev-workflow-platform` (34 unimplemented FRs) and `dependency-linking` (7 stale FR IDs never updated to match Source). Any agent following CLAUDE.md gates will believe traceability is clean when it is not.  
- **Recommendation:** Either (a) run the enforcer against all plans: `for plan in Plans/*/requirements.md; do python3 tools/traceability-enforcer.py --file "$plan" || exit 1; done`, or (b) add an explicit `--plan self-judging-workflow` flag to CLAUDE.md's gate, and document that other plans are intentionally excluded. Update CLAUDE.md's verification gate section accordingly.  
- **Cross-ref:** Affects all pipeline agents that follow CLAUDE.md gates.

---

### QO-002: dev-workflow-platform spec (FR-001 — FR-032) is entirely unimplemented

- **Severity:** P1  
- **Category:** spec-drift  
- **File:** `Specifications/dev-workflow-platform.md`, `Plans/dev-workflow-platform/requirements.md`  
- **Detail:** The `dev-workflow-platform.md` spec defines 69 FRs (FR-001 to FR-069 in the spec; 34 reviewed in the plan's `requirements.md`). Zero are traced to `Source/`. Git history shows only one commit (`44bb35c` — Inspector audit: initialize), so this is not a regression — it was never implemented. The current `Source/` directory implements the **self-judging workflow engine** (FR-WF-001 to FR-WF-013), which is a completely different domain (work item routing/assessment pipeline) from the dev-workflow-platform (feature request management + development cycle + bug tracking with SQLite backend). The `Plans/dev-workflow-platform/dispatch-plan.md` was approved in run-1774234977 but never dispatched to a coder team.  
- **Recommendation:** Decision required: (a) mark dev-workflow-platform as superseded / archived if it was replaced by the self-judging workflow, or (b) dispatch an implementation team. If abandoned, move the spec to `Specifications/archived/` and update the plan status in `Plans/dev-workflow-platform/` to reflect that. The current state misleads future agents into thinking the feature is planned but pending.  
- **Cross-ref:** QO-001 (enforcer blind spot hides this); [ESCALATE → TheFixer if implementation decision = proceed]

---

### QO-003: dependency-linking plan requirements.md uses stale FR IDs from a portal/ codebase

- **Severity:** P2  
- **Category:** spec-drift / doc-stale  
- **File:** `Plans/dependency-linking/requirements.md` (FR-0002, FR-0003, FR-0004, FR-0005, FR-0007, FR-070, FR-085)  
- **Detail:** The plan's Implementation Delta table contains FR IDs (e.g. `FR-0002`, `FR-070`, `FR-085`) that reference `portal/Shared/types.ts` — a codebase no longer in `Source/`. The actual dependency feature was implemented in `Source/` using the `FR-dependency-*` naming convention, which the self-judging-workflow enforcer covers. Running `python3 tools/traceability-enforcer.py --plan dependency-linking` reports 7 failures. The plan's `requirements.md` was never updated to reflect which IDs moved to `Source/` and under what new names.  
- **Recommendation:** Update `Plans/dependency-linking/requirements.md` to (a) replace the 7 stale FR IDs with their `FR-dependency-*` equivalents (or mark them N/A), and (b) add `FR-dependency-api-client`, `FR-dependency-api-types`, `FR-dependency-picker`, `FR-dependency-section`, `FR-dependency-integration`, `FR-dependency-frontend-tests` which are implemented but not tracked in this plan file.  
- **Cross-ref:** QO-001

---

### QO-004: Silent JSON-parse suppression in API client

- **Severity:** P2  
- **Category:** architecture-violation (never swallow errors silently)  
- **File:** `Source/Frontend/src/api/client.ts:26`  
- **Detail:** `.catch(() => ({}))` silently swallows JSON parse errors when a non-2xx response body cannot be decoded. CLAUDE.md rule: "every `catch` block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed." No suppression rationale is documented. When a server returns an error with a malformed body (e.g., HTML 502 from a proxy), the error thrown to the caller will be `Request failed: 502` with no context about the parse failure.  
- **Recommendation:** Replace with a logged suppression or documented intentional suppression:
  ```ts
  const body = await response.json().catch((_parseErr) => {
    // Intentionally suppressed: non-JSON error bodies (proxy 502s etc.) fall back to status code
    return {};
  });
  ```
  Or log the parse error at debug level if a logger is available in the frontend.

---

### QO-005: Duplicate logger module — wrapper re-export is unexplained

- **Severity:** P3  
- **Category:** architecture-violation (shared types / single source of truth)  
- **File:** `Source/Backend/src/logger.ts` and `Source/Backend/src/utils/logger.ts`  
- **Detail:** Two logger files exist. `src/utils/logger.ts` is the canonical structured logger implementation. `src/logger.ts` is a re-export wrapper that exists "because Backend-coder-2's workflow routes import `logger` as default from this module." This is a layering workaround: two modules export the same logger, risk of diverging if `utils/logger.ts` is updated but not the wrapper, and confusing to agents that discover two loggers and don't know which to use. The CLAUDE.md rule "Shared types are single source of truth — no inline type re-definitions across layers" applies analogously to singleton services.  
- **Recommendation:** Consolidate all imports to `../utils/logger` (or a canonical path) and delete the wrapper `logger.ts`. Update the two route files that import from the wrapper to import from `utils/logger` directly.

---

### QO-006: eslint-disable suppresses react-hooks/exhaustive-deps in useWorkItems

- **Severity:** P3  
- **Category:** pattern-violation  
- **File:** `Source/Frontend/src/hooks/useWorkItems.ts:63`  
- **Detail:** `// eslint-disable-next-line react-hooks/exhaustive-deps` suppresses a hook dependency warning. The CLAUDE.md pattern enforcement flags suppressed linting rules as technical debt. The hook's dependency array explicitly lists `filters.status`, `filters.type`, `filters.priority`, `filters.source`, `filters.page`, `filters.limit` rather than the `filters` object — this is a valid pattern to avoid triggering on reference changes, but the suppression should be documented with a rationale comment.  
- **Recommendation:** Add a rationale comment:
  ```ts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Intentional: we depend on individual filter primitives, not the filters object reference,
  // to avoid re-fetching when the parent reconstructs the object with identical values.
  ```

---

### QO-007: Frontend components without test coverage (Layout, PriorityBadge, StatusBadge, TypeBadge, DebugPortalPage)

- **Severity:** P3  
- **Category:** untested  
- **Files:** `Source/Frontend/src/components/Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `Source/Frontend/src/pages/DebugPortalPage.tsx`  
- **Detail:** No test files exist for these components. Each has at least one `Verifies:` comment (so they are traced), but there are no unit or integration tests exercising their rendering or behavior. The CLAUDE.md testing rule: "Every FR needs a test with `// Verifies: FR-XXX`."  
- **Recommendation:** Add lightweight render tests for each (RTL + Vitest). These are UI primitives; snapshot tests or simple render + assertion are sufficient. DebugPortalPage can be tested for iframe URL rendering.

---

### QO-008: workflow.ts route handlers log errors but do not call next(err)

- **Severity:** P3  
- **Category:** architecture-violation  
- **File:** `Source/Backend/src/routes/workflow.ts` (all catch blocks)  
- **Detail:** All 7 catch blocks in `workflow.ts` log the error with `logger.error(...)` and return `res.status(500).json(...)` directly — bypassing the Express centralized error handler middleware (`middleware/errorHandler.ts`) defined in FR-WF-013 / FR-004. This creates two error response paths that can diverge. The centralized handler is never exercised for workflow errors. FR-004 acceptance criterion: "error handler returns consistent shape."  
- **Recommendation:** Remove inline `res.status(500).json(...)` in catch blocks and replace with `next(err)` (passing the caught error to the centralized handler). Keep the `logger.error(...)` calls — they add context the centralized handler may not have. This matches the pattern already used correctly in `middleware/errorHandler.ts`.

---

## Architecture Rule Compliance Summary

| Rule | Status | Notes |
|------|--------|-------|
| Specs are source of truth | ⚠️ PARTIAL | self-judging-workflow: OK; dev-workflow-platform: 0% implemented |
| No direct DB calls from route handlers | ✅ OK | No DB found in Source/ routes (in-memory store) |
| Shared types single source of truth | ⚠️ PARTIAL | Duplicate logger wrapper (QO-005) |
| Every FR needs a test with Verifies | ⚠️ PARTIAL | self-judging-workflow: all covered; frontend components: no tests |
| No hardcoded secrets | ✅ OK | Only dev localhost URLs in config files |
| All list endpoints return {data: T[]} wrappers | ✅ OK | Confirmed in route files |
| New routes must have observability | ✅ OK | Structured logging + Prometheus metrics present |
| Business logic no framework imports | ✅ OK | Services are pure TS; no express imports in service layer |
| Never swallow errors silently | ⚠️ PARTIAL | api/client.ts silent JSON catch (QO-004); workflow.ts bypasses centralized handler (QO-008) |
| No console.log in production source | ✅ OK | Only one logger.ts reference in comment; all output via logger abstraction |

---

## Test Quality Assessment

| Metric | Value |
|--------|-------|
| Backend test files | 11 |
| Frontend test files | 9 (including component/page subdirs) |
| Skipped tests (`skip`/`todo`/`xit`) | 0 |
| Test files with 0 assertions | 0 |
| Backend production source files with 0 Verifies | 0 |
| Frontend production source files with 0 Verifies | 0 |
| Frontend source files with no test counterpart | 5 (Layout, PriorityBadge, StatusBadge, TypeBadge, DebugPortalPage) |
| Files > 500 lines | 0 |
| Largest file | dependency.test.ts (423 lines) |

---

## JSON Summary

```json
{
  "audit_date": "2026-09-23",
  "spec_coverage": {
    "self_judging_workflow": { "total": 13, "covered": 13, "pct": 100 },
    "dependency_linking": { "total": 7, "covered": 0, "pct": 0, "note": "stale FR IDs from portal/ codebase" },
    "dev_workflow_platform": { "total": 34, "covered": 0, "pct": 0, "note": "never implemented — different domain" }
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "architecture-violation", "title": "Traceability enforcer only gates most-recently-modified plan" },
    { "id": "QO-002", "severity": "P1", "category": "spec-drift", "title": "dev-workflow-platform FR-001 to FR-032 entirely unimplemented" },
    { "id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "dependency-linking plan uses stale FR IDs from portal/ codebase" },
    { "id": "QO-004", "severity": "P2", "category": "architecture-violation", "title": "Silent JSON-parse suppression in api/client.ts" },
    { "id": "QO-005", "severity": "P3", "category": "architecture-violation", "title": "Duplicate logger module with unexplained wrapper" },
    { "id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "eslint-disable without rationale in useWorkItems.ts" },
    { "id": "QO-007", "severity": "P3", "category": "untested", "title": "5 frontend components/pages have no test file" },
    { "id": "QO-008", "severity": "P3", "category": "architecture-violation", "title": "workflow.ts catch blocks bypass centralized error handler" }
  ],
  "grade": "C",
  "grade_reason": "2 P1 findings; active plan at 100% coverage but cross-plan coverage at ~30%"
}
```

---

## Grade: **C**

Grading criteria (`inspector.config.yml`):
- A: 0 P1, ≤3 P2, ≥80% spec coverage
- B: 0 P1, ≤8 P2, ≥60% spec coverage  
- **C: ≤2 P1, ≤15 P2, ≥40% spec coverage** ← this audit
- D: anything worse

The project ships clean code for the active (self-judging-workflow) feature with 100% FR traceability and zero skipped tests. The P1 findings are structural (spec governance and enforcer scope) rather than runtime bugs. Resolving QO-001 and QO-002 would move the grade to B or A.
