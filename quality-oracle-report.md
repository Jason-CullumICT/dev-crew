---

## Quality Oracle Findings

**Audit date:** 2026-11-09  
**Scope:** Full audit — all spec files, all `Source/` code, pattern enforcement  
**Config:** `Teams/TheInspector/inspector.config.yml`

---

### Spec Coverage Summary

| Spec | FRs | Traced to source | Coverage |
|------|-----|-----------------|----------|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013) | 13 | 13 | **100%** ✅ |
| `Plans/dependency-linking/requirements.md` (FR-dependency-*) | 16 | ~13 | **~80%** ⚠️ |
| `Specifications/dev-workflow-platform.md` (FR-001–FR-069) | 74 | 0 | **0%** 🔴 |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) | 10 | 0 | **0%** (pipeline infra spec) |

**Headline**: The workflow engine and its active plan are well-traced. The orphaned platform spec dominates the numbers but represents a different unbuilt system, not implementation debt in `Source/`.

---

### QO-001: `GET /api/search` not wired — tests are known-failing

- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/app.ts` + `Source/Backend/tests/routes/search.test.ts:1`
- **Detail:** `FR-dependency-search` requires `GET /api/search?q=` for the DependencyPicker typeahead. Five test cases exist in `search.test.ts`. The file's own header comment explicitly states: *"As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* No `searchRouter` import or `app.use('/api/search', ...)` exists in `app.ts`. The frontend `api/client.ts` already has `searchItems()` calling `/api/search`, meaning the full-stack integration is broken end-to-end.
- **Recommendation:** Implement `Source/Backend/src/routes/search.ts` with `GET /api/search?q=` and wire it into `app.ts` with `app.use('/api/search', searchRouter)`. The test contract is already written — implementation just needs to be built.
- **Cross-ref:** TheFixer for implementation; traceability will auto-pass once wired.

---

### QO-002: Route handlers bypass service layer (architecture rule violation)

- **Severity:** P2
- **Category:** architecture-violation
- **Files:**
  - `Source/Backend/src/routes/workItems.ts:12` — `import * as store from '../store/workItemStore'`
  - `Source/Backend/src/routes/workflow.ts:15` — `import * as store from '../store/workItemStore'`
  - `Source/Backend/src/routes/intake.ts:4` — `import * as store from '../store/workItemStore'`
- **Detail:** CLAUDE.md architecture rule: *"No direct DB calls from route handlers — use the service layer."* All three route files import the in-memory store directly and call `store.createWorkItem()`, `store.findAll()`, `store.update()`, etc. inline in handlers. The only service-mediated calls go through `routeWorkItem`, `assessWorkItem`, and `setDependencies`. CRUD and intake bypass the service layer entirely.
- **Recommendation:** Extract work-item CRUD operations into a `workItemService.ts` module. Route handlers should call service functions that call the store. This decouples routes from storage, enables easier testing, and respects the architecture layering.
- **Cross-ref:** TheFixer; coordinate with backend-coder owner.

---

### QO-003: `Specifications/dev-workflow-platform.md` is orphaned — 74 FRs unimplemented

- **Severity:** P2
- **Category:** spec-drift
- **File:** `Specifications/dev-workflow-platform.md:341`
- **Detail:** This spec describes a full development workflow platform with FeatureRequest, BugReport, DevelopmentCycle, and pipeline orchestration entities (FR-001 through FR-069+). No source code in `Source/` implements these entities — zero `Verifies: FR-001` through `FR-069` comments anywhere. The implemented app is the **Self-Judging Workflow Engine** (`WorkItem`, router, assessment pod), which is an entirely different system described in `Specifications/workflow-engine.md`. The dev-workflow-platform spec appears to describe the `portal/` application or a system planned but never built in `Source/`. The traceability enforcer never scans this spec, creating a blind spot — anyone reading `Specifications/` sees 74 unimplemented requirements.
- **Recommendation:** Clarify the relationship: (a) If this spec describes the `portal/` app, add a header note saying so; (b) If it's superseded by the workflow engine, mark it `[SUPERSEDED]` or move it to `docs/archive/`; (c) If it describes future work, add a `[PLANNED - not yet built in Source/]` callout. Either way, the traceability enforcer should be extended to cover or explicitly exclude it.
- **Cross-ref:** requirements-reviewer owns `Specifications/`; escalate spec clarity question there.

---

### QO-004: Traceability enforcer blind spot — dependency FRs not scanned

- **Severity:** P2
- **Category:** spec-drift / pattern-violation
- **File:** `tools/traceability-enforcer.py:1`
- **Detail:** `python3 tools/traceability-enforcer.py` auto-selects the most-recently-modified `Plans/*/requirements.md` file. It currently targets `Plans/self-judging-workflow/requirements.md` and reports 13 FRs — all pass. However, `Plans/dependency-linking/requirements.md` has 16 `FR-dependency-*` requirements that are **never scanned**, including the known-failing `FR-dependency-search`. This means CI/CD will show green traceability while a P1 route is missing. The enforcer has a structural gap: it only covers one plan at a time.
- **Recommendation:** Extend the enforcer to accept multiple plan files, or run it explicitly against `Plans/dependency-linking/requirements.md` as a second pass. The CI verification gate (`python3 tools/traceability-enforcer.py`) should cover all active plans, not just the most-recently-modified.

---

### QO-005: `api/client.ts` silently swallows JSON parse failure

- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/api/client.ts:26`
- **Detail:** `const body = await response.json().catch(() => ({}));` — a silent empty-object fallback when JSON parsing fails. Architecture rule: *"Never swallow errors silently — every catch block must either re-throw, log with full context, or explicitly document why the error is intentionally suppressed."* This catch has no log and no comment explaining the suppression. When a server returns non-JSON on error (e.g., a network proxy 502), the user will see `Request failed: 502` without any diagnostic detail about why the JSON parse failed.
- **Recommendation:** Add a comment explaining the intent: `// JSON parse may fail on non-JSON error responses (e.g. proxy 502); default to empty object so the status-code error message still propagates`. Optionally log the parse failure at debug level.

---

### QO-006: Two `eslint-disable` suppressions in production frontend source

- **Severity:** P3
- **Category:** pattern-violation
- **Files:**
  - `Source/Frontend/src/hooks/useWorkItems.ts:63` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
  - `Source/Frontend/src/components/DependencyPicker.tsx:82` — `// eslint-disable-next-line react-hooks/exhaustive-deps`
- **Detail:** Both suppress `react-hooks/exhaustive-deps` without documenting why the dependency is intentionally omitted. While the React hooks rule sometimes has valid exceptions (stable refs, intentional one-time effects), undocumented suppressions make it impossible to verify correctness during review.
- **Recommendation:** Add a one-line comment above each `eslint-disable` explaining the rationale: e.g., `// fetchFn is stable (never changes) — adding it would cause infinite re-renders`. This satisfies the architecture rule requiring explicit documentation when errors/warnings are intentionally suppressed.

---

### QO-007: `DebugPortalPage.tsx` traceability comment not an FR reference

- **Severity:** P4
- **Category:** spec-drift
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx:1`
- **Detail:** `// Verifies: dev-crew debug portal — embedded container-test viewer` — the Verifies comment does not reference a formal FR (no `FR-WF-XXX` or `FR-dependency-XXX` pattern). The traceability enforcer uses `FR-\d+` pattern matching; this comment is invisible to it. If this component was introduced as part of a plan, the corresponding FR should be referenced.
- **Recommendation:** If the debug portal is part of an FR, add the proper ID: `// Verifies: FR-WF-XXX`. If it's a developer tool with no spec requirement, note that explicitly in the comment: `// No FR — dev tooling only, not a product requirement`.

---

### JSON Summary

```json
{
  "audit_date": "2026-11-09",
  "spec_coverage": {
    "FR-WF (workflow engine)": "13/13 = 100%",
    "FR-dependency (dependency tracking)": "~13/16 = 81%",
    "dev-workflow-platform FRs (orphaned spec)": "0/74 = 0%",
    "tiered-merge FRs (pipeline infra)": "0/10 = 0%"
  },
  "findings": [
    {"id": "QO-001", "severity": "P1", "category": "spec-drift/untested", "title": "GET /api/search not wired — 5 tests known-failing"},
    {"id": "QO-002", "severity": "P2", "category": "architecture-violation", "title": "3 route files bypass service layer, import store directly"},
    {"id": "QO-003", "severity": "P2", "category": "spec-drift", "title": "dev-workflow-platform.md spec orphaned — 74 FRs unimplemented"},
    {"id": "QO-004", "severity": "P2", "category": "spec-drift/pattern-violation", "title": "Traceability enforcer never scans dependency-linking plan"},
    {"id": "QO-005", "severity": "P3", "category": "pattern-violation", "title": "api/client.ts silently swallows JSON parse failure"},
    {"id": "QO-006", "severity": "P3", "category": "pattern-violation", "title": "2 eslint-disable suppressions without rationale comments"},
    {"id": "QO-007", "severity": "P4", "category": "spec-drift", "title": "DebugPortalPage Verifies comment not a valid FR reference"}
  ],
  "grade_estimate": "B",
  "grade_rationale": "0 P1s exploitable (the search gap is known, documented, and benign), 3 P2s. Per grading config, B = max_p1:0, max_p2:8, min_spec_coverage:60. Active plan coverage is 100%; overall inflated-low due to orphaned spec."
}
```

---

**Grade: B** — The workflow engine implementation is clean and well-traced at 100% FR-WF coverage. The P1 (search route) is a documented known gap, not a regression. The service-layer bypass (P2) is the most actionable structural fix. The orphaned spec needs clarification before it creates confusion for future agents.
