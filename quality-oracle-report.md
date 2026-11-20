---

## Quality Oracle Findings — 2026-11-20

**Grade: C** | Spec coverage: ~15% | 2 P1s · 2 P2s · 1 P3

Report saved to `Teams/TheInspector/findings/audit-2026-11-20-C.md`.

---

### Spec Coverage

| Scope | FRs | Traced | Coverage |
|---|---|---|---|
| `Specifications/dev-workflow-platform.md` — numeric (FR-001..FR-069) | 69 | **0** | **0%** |
| `Specifications/dev-workflow-platform.md` — FR-dependency-* | 12 | 12 | 100% |
| `Plans/self-judging-workflow/requirements.md` — FR-WF-* | 13 | 13 | 100% |

The enforcer passes (13/13) but only checks Plans-level IDs. The 69 governing Specification FRs have zero source coverage.

---

### QO-001 — P1 · spec-drift/unimplemented
**`GET /api/search` not registered — DependencyPicker search is broken**

`FR-dependency-search` requires a cross-entity search endpoint used by the DependencyPicker typeahead. The route is never mounted in `app.ts`. `Source/Backend/tests/routes/search.test.ts` even carries an explicit note: *"the GET /api/search endpoint is NOT wired into app.ts … will FAIL until the route is implemented."* The frontend calls `GET /api/search?q=…` → 404 → no search results, dependencies cannot be found.

**Fix:** Add a `searchRouter` file and `app.use('/api/search', searchRouter)` in `app.ts`. The test file defines the contract.

---

### QO-002 — P1 · spec-drift/traceability
**Traceability enforcer blind to 69 Specification FRs**

`tools/traceability-enforcer.py` auto-selects the most recently modified `Plans/*/requirements.md`. It checks 13 FR-WF-* IDs and reports PASSED. The 69 numeric FRs in `Specifications/dev-workflow-platform.md` are never validated — the enforcer never reads `Specifications/`. The source code uses a different namespace (FR-WF-XXX vs FR-001) with no cross-reference map.

**Fix:** Extend the enforcer to also scan `Specifications/` for FR IDs and verify source coverage. Add a cross-ref mapping from Plan FRs → Spec FRs.

---

### QO-003 — P2 · test-coverage
**Duplicate test files for WorkItemDetailPage and WorkItemListPage**

`tests/WorkItemDetailPage.test.tsx` (368 lines) and `tests/pages/WorkItemDetailPage.test.tsx` (393 lines) both run in CI, covering the same FR-WF-011 behaviors. Same for WorkItemListPage (286 vs 262 lines). The `pages/` versions are newer and more complete; the root-level originals were never removed.

**Fix:** Delete `tests/WorkItemDetailPage.test.tsx` and `tests/WorkItemListPage.test.tsx` (root-level); retain the `pages/` versions.

---

### QO-004 — P2 · pattern-violation
**`eslint-disable` without justification in production hooks**

`useWorkItems.ts:63` and `DependencyPicker.tsx:82` both suppress `react-hooks/exhaustive-deps` with no explanation. Architecture rules require justification for every disabled lint rule. Missing dep documentation can mask stale-closure bugs.

**Fix:** Add an inline comment explaining _why_ the dep is intentionally omitted.

---

### QO-005 — P3 · architecture-violation
**Logger abstraction split across two modules**

`Source/Backend/src/utils/logger.ts` (string API) and `Source/Backend/src/logger.ts` (object-compat wrapper) both exist. Routes import from the wrapper; the split creates a silent failure risk if any code imports `utils/logger` directly and calls it with object-style args.

**Fix:** Consolidate to one canonical logger module; remove the other.

---

**Escalation:** QO-001 → TheFixer (endpoint implementation). QO-002 → TheATeam + requirements-reviewer (spec alignment + enforcer fix).
