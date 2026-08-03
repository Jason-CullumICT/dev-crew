---

## Quality Oracle Findings

**Grade: C** — 1 P1, 5 P2, 3 P3, 1 P4

---

### Spec Coverage: ~95%
- **FR-WF-001–013** (workflow engine): 13/13 traced and implemented ✅
- **FR-dependency-search**: 1 unimplemented in Source/ — tests actively failing ❌
- **FR-001–069** (dev-workflow-platform / portal/): 0% enforced — enforcer never scans `portal/` ⚠️

---

### QO-001 — P1 · spec-drift/untested
**`GET /api/search` not registered — 5 tests fail**  
`Source/Backend/tests/routes/search.test.ts` documents `FR-dependency-search` but the route is not wired into `app.ts`. The test file itself warns this ("will FAIL until implemented"). Confirmed: all 5 tests return HTTP 404. CI is red on this file.  
**Fix:** Register `GET /api/search` in `app.ts` (implement the route), or quarantine the test file if search is deferred.

---

### QO-002 — P2 · architecture-violation
**Routes bypass service layer — direct store imports in 3 route files**  
`routes/workItems.ts:12`, `routes/workflow.ts:15`, `routes/intake.ts:4` all `import * as store from '../store/workItemStore'`. The CLAUDE.md rule is "No direct DB calls from route handlers — use the service layer." The `workflow.ts` is worst: approve/reject/dispatch handlers build `ChangeHistoryEntry` objects and mutate `item.changeHistory` in-place inside the handler — business logic belongs in services.

---

### QO-003 — P2 · spec-drift
**Traceability enforcer blind spot — `portal/` never scanned**  
`Specifications/dev-workflow-platform.md` has 70+ FRs for the `portal/` app. The enforcer scans only `["Source", "E2E"]`. Portal traceability coverage: **0% enforced**.  
**Fix:** Add `portal` to `tools/traceability-enforcer.py` scan dirs; update `inspector.config.yml` `source.dirs`.

---

### QO-004 — P2 · test-coverage
**Duplicate test files — two generations running simultaneously**  
`tests/WorkItemDetailPage.test.tsx` vs `tests/pages/WorkItemDetailPage.test.tsx` (same for WorkItemListPage). The `pages/` versions are more complete. Both run in the suite — overlapping coverage with inconsistent mock setups.  
**Fix:** Delete the top-level `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx`; the `pages/` versions are canonical.

---

### QO-005 — P2 · architecture-violation
**Dual logger modules with split import paths**  
`src/utils/logger.ts` (actual implementation, `(msg: string, ctx?)` interface) vs `src/logger.ts` (wrapper, accepts `string | {msg, ...}` spread). `workItemStore.ts` imports the raw utility while everything else uses the wrapper. Two callers, two interfaces, one concern.

---

### QO-006 — P2 · architecture-violation
**Logger ignores `LOG_LEVEL` and `NODE_ENV`**  
`src/utils/logger.ts` always emits structured JSON at all levels. CLAUDE.md requires: pretty-printing in development, `LOG_LEVEL` env var controls verbosity. Neither is implemented.

---

### QO-007 — P3 · pattern-violation
**Two `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions** in `useWorkItems.ts:63` and `DependencyPicker.tsx:82` with no inline rationale.

---

### QO-008 — P3 · test-coverage
**E2E test suite has zero tests** — `Source/E2E/tests/` directory does not exist; `package.json` test script is the placeholder error stub.

---

### QO-009 — P3 · spec-drift
**`Specifications/workflow-engine.md` has no formal FR-IDs** — Spec-to-code traceability loop for the Source/ app runs through `Plans/`, not `Specifications/`. Inconsistent with the "Specifications are domain truth" principle in CLAUDE.md.

---

### QO-010 — P4 · test-coverage
**No test files for** `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `DebugPortalPage.tsx`.

---

Findings saved to `Teams/TheInspector/findings/audit-2026-08-03-C.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
