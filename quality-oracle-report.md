Now writing the full findings report:

---

## Quality Oracle Findings

### Re-Verification of Prior P1/P2 Findings
*(First run — no prior findings to re-verify.)*

---

### Spec Coverage Summary

| Scope | Requirements | Traced | Coverage |
|-------|-------------|--------|----------|
| Self-Judging Workflow Engine (`FR-WF-*`) | 13 | 13 | **100%** |
| Dependency Tracking (`FR-dependency-*`) | 15 | 14 | **93%** |
| Portal plans (`FR-001`–`FR-069`, `FR-TMP-*`, pipeline phases) | ~100+ | N/A | **Not enforced** — portal code is in `portal/`, enforcer scans `Source/` only |

---

### QO-001: GET /api/search Route Not Wired Into app.ts
- **Severity:** P1
- **Category:** spec-drift / untested
- **File:** `Source/Backend/src/app.ts` (line 54 — no `/api/search` route)
- **Detail:** `FR-dependency-search` requires a `GET /api/search?q=` cross-entity typeahead endpoint used by the DependencyPicker frontend component. The route logic is expected in `Source/Backend/src/routes/` but no `search.ts` file exists there, and `app.ts` never registers the route. The test file `Source/Backend/tests/routes/search.test.ts` opens with an explicit disclaimer: *"NOTE: As of this review cycle the GET /api/search endpoint is NOT wired into Source/Backend/src/app.ts. These tests document the expected contract and will FAIL until the route is implemented."* All four test cases in that file will fail in CI. The `DependencyPicker` component calls `workItemsApi.searchItems()` which POSTs to `/api/search` — this means the dependency picker modal is silently broken in the running app.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` implementing `GET /api/search?q=` scanning `title` and `description` fields of all non-deleted work items, returning `{data: WorkItem[]}`. Wire it into `app.ts` with `app.use('/api/search', searchRouter)`. Add `// Verifies: FR-dependency-search` comment.
- **Cross-ref:** TheFixer

---

### QO-002: Traceability Enforcer Scope Gap — Portal Codebase Unguarded
- **Severity:** P2
- **Category:** architecture-violation / spec-drift
- **File:** `Teams/TheInspector/inspector.config.yml` (line 42 — `source.dirs: ["Source/"]`), `tools/traceability-enforcer.py`
- **Detail:** The repo contains two distinct applications: the Self-Judging Workflow Engine in `Source/` and the Dev Workflow Platform in `portal/`. The enforcer scans only `Source/` and `E2E/`. When run against plans targeting the portal (`dev-workflow-platform`, `dev-cycle-traceability`, `orchestrated-dev-cycles`, `image-upload`, `orchestrator-cycle-dashboard`), the enforcer reports 100% failure for every FR because the code lives in `portal/`, not `Source/`. As a result, running the verification gate `python3 tools/traceability-enforcer.py` on any portal plan always fails for the wrong reason — traceability comments *exist* in `portal/Backend/` and `portal/Frontend/` but are invisible to the tool. This means the **verification gate is a no-op for the entire portal codebase**. Additionally, the enforcer extracts FR IDs from prose in requirements files (e.g., seed data descriptions like "FR-0004 blocked_by FR-0003"), producing false positives unrelated to actual requirement IDs.
- **Recommendation:** Add `portal/Backend` and `portal/Frontend` to `inspector.config.yml` `source.dirs`. Update `tools/traceability-enforcer.py` to scope FR extraction to table rows only (lines matching `| FR-` pattern) rather than whole-file regex, to avoid prose false positives.
- **Cross-ref:** TheFixer

---

### QO-003: Duplicate Frontend Test Files for WorkItemDetailPage and WorkItemListPage
- **Severity:** P2
- **Category:** test-coverage
- **File:** `Source/Frontend/tests/WorkItemDetailPage.test.tsx` (368 lines) vs `Source/Frontend/tests/pages/WorkItemDetailPage.test.tsx` (393 lines); same pair for WorkItemListPage (286 vs 262 lines)
- **Detail:** Both locations verify `FR-WF-011` / `FR-WF-010`. The two files for `WorkItemDetailPage` have overlapping test descriptions (e.g. "shows loading indicator while fetching" vs "shows loading indicator initially") with different mock setups — one mocks `assess`, the other doesn't. Running both in CI wastes time and creates confusion: a developer fixing a test in one file will not notice the counterpart. The `tests/pages/` variants appear to be newer (they cover dependency section and more actions) but the `tests/` variants are also active. There is no Vitest config exclusion for the older ones.
- **Recommendation:** Remove the older `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` (root-level). Keep the `tests/pages/` variants as canonical. Verify the newer files cover all cases the old ones had; add any missing test cases to the `tests/pages/` files.
- **Cross-ref:** TheFixer

---

### QO-004: Dual Logger Implementations; Neither Does Dev Pretty-Printing (FR-003 Spec Deviation)
- **Severity:** P2
- **Category:** spec-drift / architecture-violation
- **File:** `Source/Backend/src/logger.ts` (wraps) + `Source/Backend/src/utils/logger.ts` (underlying)
- **Detail:** FR-WF-013 (from `workflow-engine.md` via `Plans/self-judging-workflow/requirements.md`) and the global FR-003 require "structured JSON logging in production, pretty-printing in development". The codebase has two logger files: `utils/logger.ts` implements a plain JSON-to-stdout emitter; `logger.ts` is a compatibility shim wrapping it with a different call signature. Neither checks `NODE_ENV` — JSON is always emitted regardless of environment. Developers running the app locally get raw JSON instead of human-readable output. Additionally, having two logger abstractions signals that two coders independently implemented the same concern; the shim's `normalize()` wrapper silently drops context keys when `msg` is missing from an object argument.
- **Recommendation:** Consolidate to a single logger in `src/utils/logger.ts`. Add `NODE_ENV` detection: in `development`, use a simple `console.log` formatter; in `production`, emit JSON. Remove `src/logger.ts` and update all imports to point directly to `src/utils/logger.ts`. Add a direct export for the default import pattern the routes expect.
- **Cross-ref:** TheFixer

---

### QO-005: DebugPortalPage Has No Valid Spec Traceability — Unspecified Feature
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Frontend/src/pages/DebugPortalPage.tsx` (line 1)
- **Detail:** The file carries `// Verifies: dev-crew debug portal — embedded container-test viewer` which is **not** a valid FR-XXX reference. Neither `Specifications/workflow-engine.md` nor `Plans/self-judging-workflow/requirements.md` mention a debug portal page. The route `/debug` in `App.tsx` routes to this page, which embeds `portal/` via an iframe. This is scope creep from a development convenience feature that was never specified. The traceability enforcer does not flag it (because the enforcer only checks that required FRs *appear* in source, not the reverse). If this page is intended to ship to production, it needs a spec entry and a proper `// Verifies: FR-XXX` comment; if it is a dev-only tool, it should be conditionally rendered or excluded from production builds.
- **Recommendation:** Either (a) add a spec entry to `Specifications/workflow-engine.md` and create a formal FR-WF-014 requirement, or (b) guard the route with `import.meta.env.DEV` so it only renders in development. Update the traceability comment accordingly.
- **Cross-ref:** Requirements Reviewer (if promoting to spec)

---

### QO-006: Backend Uses Jest; CLAUDE.md Mandates Vitest for Both Layers
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/package.json` (line 7: `"test": "jest --forceExit --detectOpenHandles"`)
- **Detail:** `CLAUDE.md` specifies "Vitest for both backend and frontend". The frontend correctly uses Vitest. The backend uses Jest 29 with `ts-jest`. This creates a split testing ecosystem: different runner APIs (expect matchers, mocking idioms differ between Jest and Vitest), different configuration surface (`jest.config.ts` vs `vite.config.ts`), and the `--forceExit` flag suggests the Jest teardown has an open-handle problem. Vitest is already a dev dependency of the Frontend workspace; consolidating would reduce maintenance overhead.
- **Recommendation:** Migrate `Source/Backend` from Jest to Vitest. Replace `jest.config.ts` with a `vitest.config.ts`, swap `@types/jest` → `@vitest/globals` (or use globals mode), remove `ts-jest`. Investigate the `--forceExit` root cause before migration (likely an unclosed server handle in the test setup).
- **Cross-ref:** TheFixer

---

### QO-007: OpenTelemetry Spans Not Implemented — Architecture Rule Violation
- **Severity:** P3
- **Category:** architecture-violation
- **File:** `Source/Backend/src/app.ts`, `Source/Backend/src/routes/workflow.ts`
- **Detail:** `CLAUDE.md` architecture rules state: *"Use OpenTelemetry for distributed tracing. Auto-instrument HTTP, database, and framework calls. Add custom spans for critical paths. Propagate W3C traceparent header across service boundaries."* No `@opentelemetry/*` imports exist anywhere in `Source/Backend/src/`. There is no span creation on the workflow action endpoints (route, assess, approve, dispatch), no `traceparent` header propagation, and no OTel initialization in `app.ts`. FR-WF-013 only covers metrics and logging; OTel spans are an architecture rule requirement above the plan level.
- **Recommendation:** Add `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`. Initialize in `app.ts` before Express. Add custom spans in `workflow.ts` for `route`, `assess`, `dispatch` actions. Propagate `traceparent` from incoming headers. Create `FR-WF-014` or extend `FR-WF-013` to cover this.
- **Cross-ref:** TheFixer — low urgency since no distributed tracing consumer exists yet

---

### QO-008: eslint-disable Suppresses React Hooks Lint Rule in Two Production Files
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `Source/Frontend/src/components/DependencyPicker.tsx` (line 82), `Source/Frontend/src/hooks/useWorkItems.ts` (line 63)
- **Detail:** Both use `// eslint-disable-next-line react-hooks/exhaustive-deps`. The `useWorkItems.ts` case is the higher-risk one: the `useEffect` deps array manually enumerates individual filter keys (`filters.status`, `filters.type`, etc.) instead of the full `filters` object. If a new filter field is added to `WorkItemFilters`, the developer must remember to add it here, and the disabled lint rule will not warn them. `DependencyPicker.tsx` suppresses the rule because `selectedIdSet` and `blocksIdSet` are computed values derived from state; the correct fix is `useMemo` for those sets.
- **Recommendation:** `useWorkItems.ts`: replace the manual key list with a proper `useCallback`-wrapped fetch function that takes filters as a parameter, or use `useMemo` to create a stable filter key string as the dep. `DependencyPicker.tsx`: wrap `blocksIdSet` and `selectedIdSet` in `useMemo`; the `useCallback` deps will then be stable refs and the disable comment can be removed.
- **Cross-ref:** TheFixer

---

### QO-009: Traceability Enforcer False Failures on dependency-linking Plan (Prose FR Extraction Bug)
- **Severity:** P3
- **Category:** pattern-violation
- **File:** `tools/traceability-enforcer.py` (line 64)
- **Detail:** The enforcer uses `re.compile(r"FR-[A-Z0-9-]+")` globally across the entire requirements file content. When run against `Plans/dependency-linking/requirements.md`, it extracts `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007`, `FR-070`, `FR-085` from seed data prose ("FR-0004 blocked_by FR-0003") and spec cross-references ("(FR-070 — FR-085)"). These are not requirement IDs for this plan. The enforcer then reports 7 false failures. The true FR-dependency-* IDs all pass — only phantom IDs fail.
- **Recommendation:** Narrow extraction to table rows: match lines of the form `| FR-XXX |` (requirement table rows) using a pattern like `r"^\|\s*(FR-[A-Z0-9-]+)\s*\|"` with the multiline flag. This eliminates extraction from prose while preserving all real requirement IDs.
- **Cross-ref:** TheFixer

---

### QO-010: VALID_STATUS_TRANSITIONS Comment Overstates `pending_dependencies` Support
- **Severity:** P4
- **Category:** spec-drift
- **File:** `Source/Shared/types/workflow.ts` (line 213)
- **Detail:** The comment `// Verifies: FR-dependency-dispatch-gating — Support for pending_dependencies blocking` precedes `VALID_STATUS_TRANSITIONS`, implying a `pending_dependencies` status is present in the state machine. No such status exists in the `WorkItemStatus` enum. `FR-dependency-dispatch-gating` in the portal spec says to set `status = pending_dependencies` when blockers are unresolved; the SJWE instead blocks dispatch with a 400 error (a different but valid design choice for this engine). The misleading comment may confuse maintainers into believing `pending_dependencies` is a valid transition target.
- **Recommendation:** Update the comment to accurately describe what is implemented: *"FR-dependency-dispatch-gating: dispatch is blocked (HTTP 400) when unresolved blockers exist. pending_dependencies status is not used in SJWE — see portal/ for that pattern."*
- **Cross-ref:** None

---

### QO-011: E2E Package.json Test Script Is a Placeholder
- **Severity:** P4
- **Category:** test-coverage
- **File:** `Source/E2E/package.json` (line 10: `"test": "echo \"Error: no test specified\" && exit 1"`)
- **Detail:** The `Source/E2E/` directory has both `playwright.config.ts` and `playwright.pipeline.config.ts`. Playwright E2E tests can be run directly via `npx playwright test`. However the `npm test` script in `Source/E2E/package.json` exits 1 with an error message. If a CI runner calls `npm test --workspaces --if-present` from the root, this workspace will fail the gate. The verification gate in CLAUDE.md calls `npm test --workspaces --if-present`, which would hit this.
- **Recommendation:** Update `Source/E2E/package.json` test script to `"playwright test"` (or `"npx playwright test"`). Alternatively, if E2E tests are not run in the standard test gate, remove the workspace from `package.json` workspaces config or use `--if-present` conditional.
- **Cross-ref:** TheFixer

---

### JSON Summary

```json
{
  "audit_date": "2026-07-16",
  "spec_coverage": {
    "FR_WF": { "total": 13, "traced": 13, "pct": "100%" },
    "FR_dependency": { "total": 15, "traced": 14, "pct": "93%", "missing": ["FR-dependency-search"] },
    "portal_plans": { "total": "~100+", "enforced": false, "reason": "portal/ not in enforcer scope" }
  },
  "overall_grade": "C",
  "grade_rationale": "1 P1 (broken endpoint), 4 P2 findings. Exceeds B threshold of max_p2=8 but P1 count=1 which exceeds A/B threshold of max_p1=0.",
  "findings": [
    { "id": "QO-001", "severity": "P1", "category": "spec-drift", "file": "Source/Backend/src/app.ts", "title": "GET /api/search route not wired — FR-dependency-search unimplemented" },
    { "id": "QO-002", "severity": "P2", "category": "architecture-violation", "file": "Teams/TheInspector/inspector.config.yml", "title": "Traceability enforcer blind to portal/ codebase" },
    { "id": "QO-003", "severity": "P2", "category": "test-coverage", "file": "Source/Frontend/tests/", "title": "Duplicate test files for WorkItemDetailPage and WorkItemListPage" },
    { "id": "QO-004", "severity": "P2", "category": "spec-drift", "file": "Source/Backend/src/logger.ts", "title": "Dual logger implementations; no dev pretty-printing (FR-003 deviation)" },
    { "id": "QO-005", "severity": "P2", "category": "spec-drift", "file": "Source/Frontend/src/pages/DebugPortalPage.tsx", "title": "DebugPortalPage has no valid FR traceability — unspecified feature" },
    { "id": "QO-006", "severity": "P3", "category": "architecture-violation", "file": "Source/Backend/package.json", "title": "Backend uses Jest; CLAUDE.md mandates Vitest for both layers" },
    { "id": "QO-007", "severity": "P3", "category": "architecture-violation", "file": "Source/Backend/src/app.ts", "title": "OpenTelemetry spans absent — architecture rule violated" },
    { "id": "QO-008", "severity": "P3", "category": "pattern-violation", "file": "Source/Frontend/src/components/DependencyPicker.tsx", "title": "eslint-disable suppresses react-hooks/exhaustive-deps in 2 production files" },
    { "id": "QO-009", "severity": "P3", "category": "pattern-violation", "file": "tools/traceability-enforcer.py", "title": "Enforcer extracts FR IDs from prose, causing false failures" },
    { "id": "QO-010", "severity": "P4", "category": "spec-drift", "file": "Source/Shared/types/workflow.ts", "title": "VALID_STATUS_TRANSITIONS comment overstates pending_dependencies support" },
    { "id": "QO-011", "severity": "P4", "category": "test-coverage", "file": "Source/E2E/package.json", "title": "E2E npm test script is a placeholder (exits 1)" }
  ],
  "escalations": []
}
```

---

**Overall Grade: C**
*(1 P1 exceeds the A/B threshold of `max_p1: 0`; four P2 findings are within C range of `max_p2: 15`. Spec coverage for enforced scope is 96% — within A threshold of 80%.)*
