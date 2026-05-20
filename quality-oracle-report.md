---

## Quality Oracle Findings — 2026-05-20

**Grade: C** | Spec Coverage: ~97% | Tests: 5 failing / 169

---

### Spec Coverage

| Zone | FRs in Spec | Traced | % |
|------|-------------|--------|---|
| `Source/` — workflow-engine.md (FR-WF-*) | 13 | 13 | 100% |
| `portal/` — dev-workflow-platform.md (FR-001–FR-095) | ~95 | ~94 | ~99% |
| `platform/` — tiered-merge-pipeline.md (FR-TMP-*) | 10 | 8 | 80% |
| **Combined** | **~118** | **~115** | **~97%** |

---

### Findings

#### QO-001 — P1 · untested
**`/api/search` route not implemented — 5 tests currently failing**

`FR-dependency-search` has a full test suite (`tests/routes/search.test.ts`, 5 cases, all with `Verifies: FR-dependency-search`) but no route file and nothing registered in `app.ts`. Every test hits 404. The traceability enforcer passed because it only checks for `Verifies:` comment presence, not whether the code actually runs.

**Fix:** Create `Source/Backend/src/routes/search.ts` + register `app.use('/api', searchRouter)`. Route to **TheFixer**.

---

#### QO-002 — P2 · architecture-violation (tooling)
**Traceability enforcer blind spot — 6/7 plans always falsely fail**

`tools/traceability-enforcer.py` only scans `Source/` + `E2E/`. Six plans target `portal/` or `platform/` code, which have 1,073 + Verifies comments respectively. Running the enforcer against those plans always reports 15–34 "missing" requirements — all false alarms. This desensitises developers to real failures.

**Fix:** Extend enforcer to accept scan dirs from `inspector.config.yml`. Add `portal/` and `platform/` to the scan list. Solo session required (tools/).

---

#### QO-003 — P2 · architecture-violation
**All 9 portal backend routes bypass service layer**

Every route in `portal/Backend/src/routes/` imports `getDb` from `database/connection` and runs raw SQL directly in the request handler. Architecture rule: _"No direct DB calls from route handlers — use the service layer."_ Worst offenders: `featureRequests.ts` (17 DB calls), `bugs.ts` (16 DB calls), `cycles.ts` (11 DB calls).

**Fix:** Extract SQL into service modules. Route to **TheFixer**.

---

#### QO-004 — P2 · architecture-violation
**Source/ routes bypass service layer (3 route files)**

`workItems.ts`, `workflow.ts`, and `intake.ts` all `import * as store from '../store/workItemStore'` directly. `intake.ts` is the worst — no service at all.

**Fix:** Introduce `workItemService.ts`, migrate route business logic there. Route to **TheFixer**.

---

#### QO-005 — P2 · spec-drift
**FR-TMP-001 (risk classification) implemented but missing Verifies comment**

The riskLevel logic is fully implemented in `platform/orchestrator/lib/workflow-engine.js` (lines 739–775) but has no `// Verifies: FR-TMP-001` comment. All other FR-TMP-* have been commented. Solo session fix: add comment at line 739.

---

#### QO-006 — P3 · untested
**Duplicate test files — stale root-level vs canonical pages/ versions**

Two pairs:
- `tests/WorkItemDetailPage.test.tsx` (368L, stale) vs `tests/pages/WorkItemDetailPage.test.tsx` (393L, canonical)
- `tests/WorkItemListPage.test.tsx` (286L, stale) vs `tests/pages/WorkItemListPage.test.tsx` (262L, canonical)

The root-level versions have wrong import paths and incomplete mocks. Both run in CI.

**Fix:** Delete the root-level duplicates after confirming no unique test cases. Route to **TheFixer**.

---

#### QO-007 — P3 · pattern-violation
**113 `console.log` calls in `platform/orchestrator/lib/workflow-engine.js`**

Architecture rule: _"Use the project's logger abstraction, never `console.log`."_ No logger abstraction exists in platform/. Structured logging requires a solo session (platform/ is solo-session-only).

---

#### QO-008 — P3 · pattern-violation
**2 unexplained `eslint-disable` suppressions**

- `Source/Frontend/src/components/DependencyPicker.tsx:82`
- `Source/Frontend/src/hooks/useWorkItems.ts:63`

Both suppress `react-hooks/exhaustive-deps` without explanation. Add a comment explaining why the dep is intentionally omitted, or fix the dependency array.

---

#### QO-009 — P3 · spec-drift
**`Source/E2E/playwright.pipeline.config.ts` recently modified, no Verifies comment**

Should carry `// Verifies: FR-TMP-003`.

---

#### QO-010/011 — P4 · doc-stale / spec-drift

- `Plans/dependency-linking/requirements.md` references `portal/` paths but implementation is in `Source/`. Plan is out of sync.
- Portal is missing `FR-dependency-seed` (no `seed.ts`) and `FR-dependency-api-types` (`blocked_by` not in `UpdateBugInput`/`UpdateFeatureRequestInput`).

---

**Full report saved to:** `Teams/TheInspector/findings/audit-2026-05-20-C.md`
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
