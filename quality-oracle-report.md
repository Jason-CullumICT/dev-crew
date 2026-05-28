---

## Quality Oracle Findings

### Spec Coverage: ~81% (active specs)
- **FR-WF-*** (self-judging-workflow plan): **13/13 — 100%** ✅
- **FR-dependency-*** (dependency-linking plan): **~13/16 — 81%** — 3 gaps
- **Specifications/dev-workflow-platform.md** (FR-001–069): 0% — deliberate project pivot (see QO-008)

Traceability enforcer ran clean against the self-judging-workflow plan, but has a critical blind spot for the dependency-linking plan (see QO-004).

---

### QO-001: `GET /api/search` Not Registered in app.ts
- **Severity:** P1
- **Category:** spec-drift
- **File:** `Source/Backend/src/app.ts`, `Source/Backend/tests/routes/search.test.ts:6`
- **Detail:** `FR-dependency-search` is the cross-entity typeahead endpoint the `DependencyPicker` component depends on. The route handler doesn't exist anywhere in `Source/Backend/src/routes/`, and it is not registered in `app.ts`. The test file itself explicitly comments: _"These tests will FAIL until the route is implemented."_ The `DependencyPicker` UI component is broken without it.
- **Recommendation:** Create `Source/Backend/src/routes/search.ts` filtering the in-memory store by `?q=` against title/description, returning `{data: WorkItem[]}`. Register as `app.use('/api/search', searchRouter)` in `app.ts`.

---

### QO-002: Route Handlers Directly Call the Store (Architecture Violation)
- **Severity:** P2
- **Category:** architecture-violation
- **Files:** `workItems.ts:12`, `workflow.ts:15`, `intake.ts:4`
- **Detail:** CLAUDE.md: _"No direct DB calls from route handlers — use the service layer."_ Three route files import `workItemStore` directly. Domain logic (change-history tracking, dependency updates) leaks into route handlers.
- **Recommendation:** Extract CRUD operations into `workItemService.ts`. Routes call the service; service calls the store.

---

### QO-003: `dependencyCheckDuration` Histogram Missing
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/metrics.ts`
- **Detail:** `FR-dependency-metrics` specifies 4 metrics. Three counters are present; the `dependencyCheckDuration` Prometheus histogram is absent. `prom-client`'s `Histogram` is not even imported.
- **Recommendation:** Add the histogram with appropriate buckets and wire it into the `isReady()` / dependency-check code paths.

---

### QO-004: Traceability Enforcer Regex Blind to `FR-dependency-*` IDs
- **Severity:** P2
- **Category:** tooling / pattern-violation
- **File:** `tools/traceability-enforcer.py:64`
- **Detail:** Pattern `r"FR-[A-Z0-9-]+"` only matches **uppercase** letters. All `FR-dependency-*` IDs use lowercase — they are silently skipped. The enforcer cannot detect unimplemented dependency requirements. Running it against the dependency-linking plan yields only false-positive failures (incidental numeric refs in seed data examples).
- **Recommendation:** Change to `r"FR-[A-Za-z0-9-]+"`. This restores enforcer coverage over all 16 dependency FRs.

---

### QO-005: Logger Always Emits JSON — No Dev Pretty-Print
- **Severity:** P2
- **Category:** spec-drift
- **File:** `Source/Backend/src/utils/logger.ts:17`
- **Detail:** FR-WF-013 and CLAUDE.md require pretty-printing in development, JSON in production. The `emit()` function always calls `JSON.stringify()` with no `NODE_ENV` check.
- **Recommendation:** Add `if (process.env.NODE_ENV === 'development') console.log(...)` branch.

---

### QO-006: In-Memory Store Has No File Persistence (FR-WF-001)
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/src/store/workItemStore.ts`
- **Detail:** FR-WF-001 acceptance criteria explicitly states _"CRUD operations on in-memory store with **file persistence**."_ The store is a plain `Map` — all state is lost on restart.
- **Recommendation:** Serialize to `.data/workItems.json` on every write, hydrate on startup. Or explicitly document the gap in CLAUDE.md as intentional.

---

### QO-007: `FR-dependency-seed` Not Implemented
- **Severity:** P3
- **Category:** spec-drift
- **File:** `Source/Backend/src/` (no seed.ts)
- **Detail:** The seeding requirement was acknowledged as missing in the plan delta. No seed function exists. The DependencySection UI has nothing useful to show on first run.
- **Recommendation:** Create `Source/Backend/src/store/seed.ts` with idempotent startup seeding; call from `app.ts`.

---

### QO-008: `Specifications/dev-workflow-platform.md` Is a Dormant 69-FR Spec
- **Severity:** P3
- **Category:** doc-stale
- **Detail:** Describes a full dev-workflow platform (FRs 001–069) with 0% implementation in `Source/`. The project pivoted to the workflow-engine. Agents reading `Specifications/` will be misled about the product being built.
- **Recommendation:** Add a `> **Status: ARCHIVED**` banner or move to `docs/archive/`.

---

### QO-009: `Plans/dependency-linking/requirements.md` Targets Wrong Codebase Paths
- **Severity:** P3
- **Category:** doc-stale
- **Detail:** All paths in the plan reference `portal/Backend/`, `portal/Shared/`, `portal/Frontend/`. Implementation is under `Source/`. Delta table shows items as missing that actually exist in `Source/Frontend/tests/components/`.
- **Recommendation:** Update paths and delta table to reflect `Source/` reality.

---

### QO-010 / QO-011: `eslint-disable` Suppressions + Dual Logger
- **Severity:** P4
- **Files:** `DependencyPicker.tsx:82`, `useWorkItems.ts:63`; `src/logger.ts` + `src/utils/logger.ts`
- **Detail:** Two react-hooks lint suppressions (stale closure risk). Two logger files creating an indirection shim (inconsistent calling conventions across codebase).
- **Recommendation:** Fix hook dep arrays; standardize on one logger convention and eliminate the wrapper.

---

**Grade: C** — 1 P1, 4 P2s. The P1 (missing search route) leaves a visible feature broken. The P2 architecture violation (routes → store direct) is systemic. Grading rule B requires 0 P1s and ≤3 P2s. 

Report saved to: `Teams/TheInspector/findings/audit-2026-05-28-C.md`  
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
