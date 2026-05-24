---

## Quality Oracle Findings

**Grade: C** | Audit date: 2026-05-24

---

### Spec Coverage: ~100% (active product)
- **13** requirements in `Plans/self-judging-workflow/requirements.md` → **13 traced** ✅  
- `Specifications/dev-workflow-platform.md` (70+ FRs) → **0 traced** — orphaned historical spec  
- `Specifications/tiered-merge-pipeline.md` (10 FRs) → implemented in `platform/`, not `Source/`

---

### QO-001 — GET /api/search Not Implemented · **P1** · spec-drift/untested
`Source/Backend/src/app.ts` (missing route) / `tests/routes/search.test.ts` (5 tests, all expected to fail)

The `GET /api/search` endpoint for the `DependencyPicker` typeahead is explicitly **not wired** into the app. `search.test.ts` carries a comment: *"these tests will FAIL until the route is implemented — this is intentional."* No `routes/search.ts` file exists in `Source/Backend/src/`. The frontend `searchItems()` API client call hits this dead endpoint.

**Fix:** Create `Source/Backend/src/routes/search.ts`, implement `GET /api/search?q=` returning `{data: WorkItem[]}`, register in `app.ts`.

---

### QO-002 — Traceability Enforcer Blind Spot · **P2** · pattern-violation
`tools/traceability-enforcer.py`

Default invocation auto-selects **one** (most recently modified) `requirements.md`. Currently passes because it picks `self-judging-workflow`. The 7 other plans all fail when scanned explicitly, and the mandatory verification gate command gives a false green. Agents running `python3 tools/traceability-enforcer.py` never see 87% of the plans.

**Fix:** Either add `--all-plans` mode, or update CLAUDE.md gate to `python3 tools/traceability-enforcer.py --plan self-judging-workflow` (explicit).

---

### QO-003 — Route Handlers Bypass Service Layer · **P2** · architecture-violation
`Source/Backend/src/routes/workItems.ts:12`, `workflow.ts:15`, `intake.ts:4`

All three route files `import * as store from '../store/workItemStore'` and call store functions directly (findById, createWorkItem, updateWorkItem, softDelete, findAll). Architecture rule: **"No direct DB calls from route handlers — use the service layer."** The dashboard service pattern (`dashboardService → getAllItems()`) demonstrates the correct approach.

**Fix → TheFixer:** Extract `workItemService.ts` wrapping store CRUD; route handlers call the service.

---

### QO-004 — Orphaned Spec with 70+ Untraced FRs · **P2** · spec-drift/doc-stale
`Specifications/dev-workflow-platform.md`

This spec describes FR-001 through FR-069 for a feature-request/bug-report system that was **never implemented** in `Source/`. The current implementation is the Self-Judging Workflow Engine (`workflow-engine.md`). The file sits in `Specifications/` — called "domain truth, the most critical documents" in CLAUDE.md — with no deprecation banner, which misleads future agents.

**Fix:** Add `> **ARCHIVED — superseded by workflow-engine.md**` at top, or move to `docs/archive/`.

---

### QO-005 — Enforcer Regex Misses Lowercase FR IDs · **P3** · pattern-violation
`tools/traceability-enforcer.py:62` — pattern `FR-[A-Z0-9-]+`

`FR-dependency-types`, `FR-dependency-search`, etc. (lowercase) are invisible to the extractor. The dependency-linking plan shows 7 "missing" that are actually implemented, while the genuinely missing `FR-dependency-search` blends into the noise.

**Fix:** Change to `FR-[A-Za-z0-9-]+` (case-insensitive).

---

### QO-006 — Duplicate Frontend Test Files · **P3** · untested/pattern-violation
`tests/WorkItemDetailPage.test.tsx` (368 lines) + `tests/pages/WorkItemDetailPage.test.tsx` (393 lines) — same for WorkItemListPage

The `tests/pages/` versions are more complete (typed imports, richer fixtures). The root-level duplicates are shallower but get picked up by the test runner, creating redundant coverage.

**Fix → TheFixer:** Delete root-level duplicates; keep `tests/pages/` versions.

---

### QO-007 — eslint-disable in Production Source · **P3** · pattern-violation
`Source/Frontend/src/components/DependencyPicker.tsx:82`, `hooks/useWorkItems.ts:63`

Two `// eslint-disable-next-line react-hooks/exhaustive-deps` suppressions violate the architecture rule.

---

### QO-008 — Files Approaching 500-Line Limit · **P4** · pattern-violation
`WorkItemDetailPage.tsx` (426 lines), `DependencyPicker.tsx` (376 lines), `workflow.ts` (374 lines) — flag for next refactor cycle.

---

### QO-009 — setup.ts Missing Verifies Comment · **P4** · untested
`Source/Frontend/tests/setup.ts` — expected for test infrastructure; add an intentional-omission comment.

---

**Findings summary:** 1× P1 · 3× P2 · 3× P3 · 2× P4

The P1 (unimplemented search endpoint with failing tests) prevents Grade B. The three P2s (service-layer bypass, enforcer blind spot, orphaned spec) collectively push the architecture health to **C**. Active product traceability is excellent at 100%; the drag comes from tooling gaps and an unresolved feature requirement.

Report saved to: `Teams/TheInspector/findings/audit-2026-05-24-C.md`  
Learnings updated: `Teams/TheInspector/learnings/quality-oracle.md`
