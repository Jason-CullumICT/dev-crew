---

## Quality Oracle Findings

**Audit date:** 2026-05-10 | **Grade: C** | Report saved to `Teams/TheInspector/findings/audit-2026-05-10-C.md`

---

### Spec Coverage: 27% overall · 96% active plans

| Spec | Requirements | Traced | % |
|------|------------|--------|---|
| `Plans/self-judging-workflow/requirements.md` (FR-WF-*) | 13 | 13 | 100% |
| `Plans/dependency-linking/requirements.md` (FR-dependency-*) | 15 | 15 (1 broken) | 93% |
| `Specifications/dev-workflow-platform.md` (FR-001–069) | 74 | **0** | **0%** |

---

### QO-001 · P1 · spec-drift
**Main spec has 74 untraced requirements**

`Specifications/dev-workflow-platform.md` (FR-001 through FR-069) describes a Feature-Request/Bug/Dev-Cycle platform. The codebase implements the self-judging workflow engine instead. Not a single source file contains `// Verifies: FR-0XX`. The spec file has no deprecation notice and is still listed as domain truth in `Specifications/`. **Action:** Add a deprecation header pointing to `workflow-engine.md`, or move the file to `_archived/`.

---

### QO-002 · P1 · spec-drift
**Traceability enforcer gives a false PASS**

`tools/traceability-enforcer.py` selects its target by "most recently modified `requirements.md`" heuristic — currently `Plans/self-judging-workflow/requirements.md`. It never reads `Specifications/dev-workflow-platform.md`. The mandated gate (`python3 tools/traceability-enforcer.py`) reports `TRACEABILITY PASSED` while 74 requirements are completely dark. Every agent in every pipeline has been given a false green signal. **Action:** Extend the enforcer to also scan `Specifications/` for FR-IDs, or wire `--file Specifications/dev-workflow-platform.md` as a second gate invocation.

---

### QO-003 · P2 · architecture-violation
**Business logic lives inside route handlers (approve / reject / dispatch)**

`Source/Backend/src/routes/workflow.ts` — the `approve` (lines 93–141), `reject` (155–208), and `dispatch` (212–290) handlers each: validate state-machine transitions, build change-history entries via `buildChangeEntry()`, mutate `item.changeHistory`, and write directly to the store via `store.updateWorkItem()`. The `route` and `assess` handlers correctly delegate to `routeWorkItem()` / `assessWorkItem()` services. **Action (TheFixer):** Extract `approveWorkItem()`, `rejectWorkItem()`, `dispatchWorkItem()` into `services/workflow.ts`. Route handlers become thin: parse input → call service → return result.

---

### QO-004 · P2 · untested
**`GET /api/search` is not wired — tests claim it's implemented**

`Source/Backend/tests/routes/search.test.ts` lines 3–6 explicitly document: *"GET /api/search endpoint is NOT wired into app.ts. Tests will FAIL until implemented."* Yet the traceability enforcer counts these tests as satisfying `FR-dependency-search`. The frontend `searchItems()` API client function also points to this missing route. **Action (TheFixer):** Implement and wire the search route, or mark `FR-dependency-search` explicitly deferred.

---

### QO-005 · P2 · test-quality
**Duplicate diverged test files**

Four test files appear twice — the older root-level version and a newer `/pages/` version:
- `tests/WorkItemDetailPage.test.tsx` vs `tests/pages/WorkItemDetailPage.test.tsx`
- `tests/WorkItemListPage.test.tsx` vs `tests/pages/WorkItemListPage.test.tsx`

The older files have incomplete mocks (missing `getById`, `approve`, `reject`, `dispatch`, `dashboardApi`). Both run in CI, inflating counts without reliable signal. **Action:** Delete the four older root-level files; keep the `/tests/pages/` versions.

---

### QO-006 · P3 · spec-drift
`Plans/dependency-linking/requirements.md` references `Specifications/dev-workflow-platform.md (FR-070–FR-085)` — but the spec file ends at FR-069. These IDs were never added to the canonical spec.

### QO-007 · P3 · pattern-violation
Two `// eslint-disable-next-line react-hooks/exhaustive-deps` suppressions in production frontend: `DependencyPicker.tsx:82`, `useWorkItems.ts:63`. Each should be documented or the dep array fixed.

### QO-008 · P3 · pattern-violation
`DebugPortalPage.tsx:5` — `'http://localhost:4200'` hardcoded as a fallback. Will silently misbehave in any non-dev environment where `VITE_PORTAL_URL` is unset.

### QO-009 · P3 · architecture-violation
`DependencyPicker.tsx:7` — `interface BlockerRef` (a domain type for blocker references) defined inline in a UI component. Should live in `Source/Shared/types/workflow.ts` referencing the existing `WorkItemType` enum.

### QO-010 · P3 · spec-drift
`Specifications/workflow-engine.md` is a narrative spec with no FR-IDs. The spec→plan→code chain is broken at the top: you can't trace from the spec document to any source file.

### QO-011 · P4 · untested
22+ test cases in backend service/store tests lack `// Verifies:` comments (`dependency.test.ts`, `workItemStore.test.ts`, others).

### QO-012 · P4 · untested
`Source/E2E/` — no test specs exist. Package.json test script is `exit 1`.

---

**Positive signals:** Zero `console.log` in production source ✅ · All catch blocks log with context ✅ · All list endpoints use `{data: T[]}` wrappers ✅ · Prometheus metrics wired for domain operations ✅ · Structured logger abstraction used throughout ✅
