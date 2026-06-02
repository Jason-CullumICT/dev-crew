# Quality Oracle Findings — 2026-06-02

**Config:** `Teams/TheInspector/inspector.config.yml`
**Mode:** Full audit (static analysis only)
**Apps in scope:** `Source/` (workflow-engine), `portal/` (dev-workflow-platform), `platform/` (orchestrator)

---

## Spec Coverage Summary

| Spec | Plan Requirements | Traced | Coverage |
|------|------------------|--------|----------|
| `Specifications/workflow-engine.md` (FR-WF-*) | 13 | 13 | **100%** |
| `Specifications/dev-workflow-platform.md` (FR-001..032) | 34 | 34 | **100%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 10 | 9 | **90%** |
| **Aggregate (canonical spec FRs)** | **57** | **56** | **98%** |

> **Note on extended FRs:** The portal implements ~60 additional FRs beyond the canonical spec (FR-070–FR-095, FR-dependency-*, FR-DUP-*) that exist only in Plans documents. The canonical `Specifications/dev-workflow-platform.md` has not been updated to reflect these. See QO-008.

---

## Findings

### QO-001: Traceability Enforcer Blind to Portal App
- **Severity:** P1
- **Category:** spec-drift / architecture-violation
- **File:** `tools/traceability-enforcer.py:70-78`
- **Detail:** The enforcer hardcodes scan dirs to `["Source", "E2E"]`. The dev-workflow-platform app lives in `portal/`. Running `python3 tools/traceability-enforcer.py --file Plans/dev-workflow-platform/requirements.md` reports all 34 FRs as MISSING — a 100% false-negative rate. The default invocation (no args) resolves to the most recently modified plan (`Plans/self-judging-workflow/requirements.md`) and only checks FR-WF-* IDs; it silently skips the portal's 100+ FRs. Any CI gate using this tool will pass on portal regressions.
- **Recommendation:** Add `portal` to `source_dirs` in the enforcer (or make it configurable via CLI flag). At minimum add a warning when the resolved plan targets FRs that have zero matches in any scanned dir — silent pass on a wrong-dir scan is worse than a failure.
- **Cross-ref:** Affects all verification gates listed in CLAUDE.md Testing Rules.

---

### QO-002: FR-TMP-008 Untraced — Worker Container Spec Has No Code Comment
- **Severity:** P2
- **Category:** spec-drift
- **File:** `platform/Dockerfile.worker:32-40`
- **Detail:** `FR-TMP-008` specifies that the worker Docker image must have `gh` CLI installed and Playwright installable on demand. `platform/Dockerfile.worker` correctly implements both (`apt-get install -y gh` at line 32, `playwright install chromium` at lines 39-40), but carries no `// Verifies: FR-TMP-008` comment. It is the only FR-TMP requirement without a traceability link. The enforcer also does not scan `.dockerfile` files, so this gap would persist even after QO-001 is fixed.
- **Recommendation:** Add `# Verifies: FR-TMP-008` comment at the gh CLI install block in `Dockerfile.worker`. Consider extending the enforcer to scan Dockerfile and shell script files.

---

### QO-003: Architecture Violation — Direct DB Access in teamDispatches Route
- **Severity:** P2
- **Category:** architecture-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:37-75`
- **Detail:** This route handler calls `db.prepare(...)` and `.all()/.run()` directly inside `router.get` and `router.post`. All other portal routes delegate to a service class (bugService, featureRequestService, pipelineService, etc.). This violates the non-negotiable CLAUDE.md rule: **"No direct DB calls from route handlers — use the service layer."** It also makes this route impossible to unit-test without a real DB connection.
- **Recommendation:** Extract a `teamDispatchService.ts` (or `dispatchService.ts`) with `list(team, limit)` and `create(data)` methods. Route handler becomes two lines.
- **Cross-ref:** QO-004 (same file is also untraced).

---

### QO-004: teamDispatches.ts Is Completely Untraced and Has Inline Type Definition
- **Severity:** P2
- **Category:** untested / pattern-violation
- **File:** `portal/Backend/src/routes/teamDispatches.ts:14-22`
- **Detail:** The file has zero `// Verifies: FR-XXX` comments. There is no corresponding spec requirement (no FR in `Specifications/`, no matching ID in any `Plans/*/requirements.md`). Additionally, `interface TeamDispatch` is defined inline in the route file rather than in `portal/Shared/types.ts`, violating the **"Shared types are single source of truth"** rule. This route and its data shape represent untracked scope creep.
- **Recommendation:** (1) Either identify the FR this satisfies and add traceability, or file a new FR in the spec before the next pipeline run. (2) Move `TeamDispatch` to `portal/Shared/types.ts`. (3) Add a backend test covering list and create operations.

---

### QO-005: Missing Required Test Files for Dependency UI Components
- **Severity:** P2
- **Category:** untested
- **File:** `portal/Frontend/tests/` (directory)
- **Detail:** `FR-dependency-frontend-tests` (referenced in `Specifications/dev-workflow-platform.md`) explicitly requires dedicated `DependencySection.test.tsx` and `BlockedBadge.test.tsx` files in `portal/Frontend/tests/`. Neither exists. `DependencyPicker.test.tsx` (which does exist) covers only the modal picker. The `DependencySection` component (portal/Frontend/src/components/shared/DependencySection.tsx, 226 lines) and `BlockedBadge` (70 lines) are integrated into BugDetail, BugList, FeatureRequestDetail, and FeatureRequestList but have zero dedicated test coverage.
- **Recommendation:** Create `portal/Frontend/tests/DependencySection.test.tsx` and `portal/Frontend/tests/BlockedBadge.test.tsx` with at minimum: render-per-state (unblocked / has-blockers / pending_dependencies), chip-click navigation, and edit-button rendering tests.
- **Cross-ref:** QO-006 (wrong FR ID on the components themselves).

---

### QO-006: BlockedBadge and DependencySection Use Wrong Traceability ID
- **Severity:** P2
- **Category:** spec-drift
- **Files:** `portal/Frontend/src/components/shared/BlockedBadge.tsx:1`, `portal/Frontend/src/components/shared/DependencySection.tsx:1`
- **Detail:** Both files carry `// Verifies: FR-0001`. The spec assigns them to `FR-dependency-blocked-badge` and `FR-dependency-section` respectively (per `Plans/dependency-linking/requirements.md` and `Specifications/dev-workflow-platform.md`). `FR-0001` does not exist in any plan or spec file. This means the traceability enforcer — even if fixed per QO-001 — would count `FR-dependency-blocked-badge` and `FR-dependency-section` as unimplemented while counting a nonexistent `FR-0001` as covered.
- **Recommendation:** Change `// Verifies: FR-0001` to `// Verifies: FR-dependency-blocked-badge` in BlockedBadge.tsx and `// Verifies: FR-dependency-section` in DependencySection.tsx.

---

### QO-007: platform/orchestrator Uses console.log in 212 Places
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `platform/orchestrator/` (multiple files)
- **Detail:** CLAUDE.md states as an architecture rule: **"Use the project's logger abstraction, never `console.log`."** The orchestrator has 212 `console.log`/`console.warn` calls. While `platform/` is infrastructure code (not the product), this makes orchestrator logs unstructured, non-queryable, and inconsistent with the observability posture required by all "new code." Log correlation across orchestrator → portal → Source is broken when logs have different formats.
- **Recommendation:** Introduce a lightweight structured logger in `platform/orchestrator/lib/logger.js` (pino or equivalent) and replace `console.*` calls in stages where tracing matters most (workflow-engine.js, stage transitions). Low-priority call sites (startup banners) can remain.

---

### QO-008: Canonical Spec Out of Date — ~60 Implemented FRs Not in Specifications/
- **Severity:** P3
- **Category:** doc-stale / spec-drift
- **File:** `Specifications/dev-workflow-platform.md`
- **Detail:** The canonical spec defines FR-001 through FR-069. The portal codebase implements and traces: FR-070–FR-095 (orchestrator dashboard, image upload), FR-dependency-* (dependency linking, ~15 FRs), FR-DUP-* (duplicate/deprecated status, ~12 FRs). These ~60 additional requirements exist only in Plans documents — not in the spec. A new team member or QA agent reading the spec would have an incomplete picture of the domain. The Specifications/ dir is described in CLAUDE.md as **"Domain truth — The most critical documents."**
- **Recommendation:** Backfill the implemented FRs into `Specifications/dev-workflow-platform.md` using the Plans/*/requirements.md files as source. Alternatively, add a `Specifications/dev-workflow-platform-extensions.md` to formally document the extended scope.

---

### QO-009: Source/Backend/src/routes/workflow.ts Calls Store Directly
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/routes/workflow.ts` (13 direct store calls)
- **Detail:** The workflow route handler calls `store.findById()` and `store.updateWorkItem()` directly in 8 route handlers. There is no `workflowService.ts` in `Source/Backend/src/services/`. The CRUD routes (`workItems.ts`) correctly delegate to the store through a thin access layer, but workflow actions (route, assess, approve, reject, dispatch) bypass it. While the in-memory store is not a SQL database, the CLAUDE.md rule "No direct DB calls from route handlers" applies to all persistence layers.
- **Recommendation:** Extract a `workflowService.ts` with functions `routeItem`, `assessItem`, `approveItem`, `rejectItem`, `dispatchItem`. Route handlers become thin: validate input → call service → return result.

---

### QO-010: 4 Disabled ESLint Rules
- **Severity:** P4
- **Category:** pattern-violation
- **Files:** `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`, `portal/Backend/src/middleware/errorHandler.ts:21`, `portal/Frontend/src/hooks/useApi.ts:35`
- **Detail:** 3× `eslint-disable-next-line react-hooks/exhaustive-deps` (dependency array suppressions hiding potential stale-closure bugs), 1× `eslint-disable-line @typescript-eslint/no-unused-vars` (intentional Express 4 `next` parameter). None are documented with a justification comment.
- **Recommendation:** Add inline comment explaining why the suppression is intentional. For `react-hooks/exhaustive-deps`, consider whether the deps are genuinely stable (useCallback/useRef pattern) or whether adding them would cause infinite renders — fix the former, document the latter.

---

### QO-011: Several Files Exceed or Approach 500-Line Threshold
- **Severity:** P4
- **Category:** pattern-violation
- **Detail:** Files over the 500-line maintainability threshold:

| File | Lines | Action |
|------|-------|--------|
| `portal/Backend/tests/pipelines.test.ts` | 1010 | Split into pipeline-routes.test.ts + pipeline-service.test.ts |
| `portal/Backend/tests/chaos-invariants.test.ts` | 956 | Group by invariant category into separate files |
| `portal/Backend/tests/featureRequests.test.ts` | 861 | Split by endpoint group |
| `portal/Backend/src/services/cycleService.ts` | 526 | Extract pipeline-integration helpers to pipelineIntegration.ts |
| `portal/Frontend/src/api/client.ts` | 525 | Split by domain (featureRequests, bugs, cycles, pipeline) |
| `portal/Backend/src/services/featureRequestService.ts` | 506 | Extract votingHelper.ts (voting simulation is self-contained) |

---

## JSON Summary

```json
{
  "run_date": "2026-06-02",
  "spec_coverage": {
    "workflow_engine_pct": 100,
    "dev_workflow_platform_pct": 100,
    "tiered_merge_pipeline_pct": 90,
    "aggregate_pct": 98
  },
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "title": "Traceability enforcer blind to portal app", "file": "tools/traceability-enforcer.py" },
    { "id": "QO-002", "severity": "P2", "category": "spec-drift", "title": "FR-TMP-008 untraced in Dockerfile.worker", "file": "platform/Dockerfile.worker" },
    { "id": "QO-003", "severity": "P2", "category": "architecture-violation", "title": "Direct DB access in teamDispatches route", "file": "portal/Backend/src/routes/teamDispatches.ts" },
    { "id": "QO-004", "severity": "P2", "category": "untested", "title": "teamDispatches.ts untraced with inline type", "file": "portal/Backend/src/routes/teamDispatches.ts" },
    { "id": "QO-005", "severity": "P2", "category": "untested", "title": "Missing DependencySection.test.tsx and BlockedBadge.test.tsx", "file": "portal/Frontend/tests/" },
    { "id": "QO-006", "severity": "P2", "category": "spec-drift", "title": "BlockedBadge and DependencySection use wrong FR-0001 ID", "file": "portal/Frontend/src/components/shared/" },
    { "id": "QO-007", "severity": "P3", "category": "pattern-violation", "title": "platform/orchestrator uses console.log 212x", "file": "platform/orchestrator/" },
    { "id": "QO-008", "severity": "P3", "category": "doc-stale", "title": "Canonical spec missing ~60 implemented FRs", "file": "Specifications/dev-workflow-platform.md" },
    { "id": "QO-009", "severity": "P3", "category": "architecture-violation", "title": "workflow.ts calls store directly in route handlers", "file": "Source/Backend/src/routes/workflow.ts" },
    { "id": "QO-010", "severity": "P4", "category": "pattern-violation", "title": "4 disabled ESLint rules without justification", "file": "multiple" },
    { "id": "QO-011", "severity": "P4", "category": "pattern-violation", "title": "6 files exceed 500-line threshold", "file": "multiple" }
  ],
  "p1_count": 1,
  "p2_count": 5,
  "p3_count": 3,
  "p4_count": 2,
  "grade": "C",
  "grade_rationale": "1 P1 (broken verification gate) + 5 P2 findings disqualifies grade A/B per grading config (max_p1:0 for both). C requires max_p1:2, max_p2:15 — met. Spec coverage 98% (>40% min for C). Architecture violations in teamDispatches.ts and enforcer scope gap are the primary concerns."
}
```

---

## Escalations

No findings trigger security escalation to TheGuardians. QO-003 is an architecture violation, not an injection risk (the SQL params are typed and bound, not string-concatenated).

QO-003, QO-004, QO-005, QO-006 are routed to **TheFixer** for remediation.
QO-001 is routed to **TheFixer** (tools/traceability-enforcer.py update).
QO-008 is routed to **requirements-reviewer** to backfill the canonical spec.
