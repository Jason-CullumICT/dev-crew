## Quality Oracle Findings — 2026-09-01

**Overall Grade: C** (2 P1s, 4 P2s, 3 P3s)

---

### Spec Coverage

| Scope | Requirements | Traced | Coverage |
|-------|------------|--------|----------|
| `Plans/self-judging-workflow` (FR-WF-*) | 13 | 13 | **100%** |
| `Plans/dependency-linking` (FR-dependency-*) | 16 | ~14 | **~88%** |
| `Specifications/dev-workflow-platform.md` (FR-001–FR-074) | 74 | 0 | **0%** |
| `Specifications/tiered-merge-pipeline.md` (FR-TMP-*) | 10 | 0 | **0%** |
| **TOTAL** | **113** | **~27** | **~24%** |

> Traceability enforcer reports PASS — but it only checks 13 of 113 requirements. The gate gives a **false confidence signal**.

---

### QO-001 — `GET /api/search` Not Wired in `app.ts` · **P1 · spec-drift/untested**
`Source/Backend/src/app.ts`

`FR-dependency-search` has a full 5-test suite in `tests/routes/search.test.ts` and Verifies comments — but the route is **never registered** in `app.ts`. The test file's own header documents this: *"tests will FAIL until the route is implemented."* These are known-failing tests that the CI gate is not surfacing as failures, masking a real gap.

**Fix:** Wire a `GET /api/search` route handler (filter work item store by title/description) and register it in `app.ts`.
**→ ESCALATE → TheFixer**

---

### QO-002 — Traceability Enforcer Blind to 84+ Requirements · **P1 · pattern-violation**
`tools/traceability-enforcer.py:45`

The enforcer picks the **most-recently-modified** `Plans/*/requirements.md` and stops there. It never scans `Specifications/*.md`. Currently it covers 13 of 113 known requirements (12%). The architecture rule *"Every FR needs a test"* is only enforced for the active plan — 100 requirements in specs and older plans are perpetually exempt.

**Fix:** Extend enforcer to scan **all** `Plans/*/requirements.md` files. Add optional `--specs` flag for `Specifications/*.md` scanning.
**→ ESCALATE → TheFixer**

---

### QO-003 — `Specifications/dev-workflow-platform.md`: 74 FRs, 0% Implementation · **P2 · spec-drift**
`Specifications/dev-workflow-platform.md`

This spec defines FR-001 through FR-074 (SQLite, feature requests, AI voting, dev cycles, pipeline orchestration). **None are implemented** — the codebase pivoted to the self-judging workflow engine. This spec is either obsolete (must be archived) or describes 80% of the product that's yet to be built. Every future audit will show 0% on these 74 requirements until the ambiguity is resolved.

**Fix:** Add `Status: ARCHIVED — superseded by workflow-engine.md` to the file header, or create a tracking plan if these are live requirements.

---

### QO-004 — `Plans/dependency-linking` References Stale `portal/` Paths · **P2 · doc-stale**
`Plans/dependency-linking/requirements.md:15-30`

Every requirement in this plan names paths like `portal/Backend/src/services/dependencyService.ts`. The implementation lives in `Source/Backend/`. A reviewer or agent following the plan to verify work looks in the wrong place.

**Fix:** Bulk-replace `portal/Backend` → `Source/Backend` and `portal/Frontend` → `Source/Frontend` throughout the plan.

---

### QO-005 — Duplicate Test Files for Same Pages · **P2 · test-coverage**
`Source/Frontend/tests/WorkItemDetailPage.test.tsx` + `tests/pages/WorkItemDetailPage.test.tsx` (same for WorkItemListPage)

Two separate test files exist for the same component, with different coverage. This creates ambiguity over which is authoritative and risks contradictory setups.

**Fix:** Merge into `tests/pages/` (canonical location). Delete root-level duplicates.

---

### QO-006 — `DebugPortalPage.tsx` — No Test File · **P2 · untested**
`Source/Frontend/src/pages/DebugPortalPage.tsx`

Recently added (modified within last 14 days), one Verifies comment, no test. Architecture rule: every FR needs a test.

**Fix:** Add `Source/Frontend/tests/pages/DebugPortalPage.test.tsx` with a basic render test.

---

### QO-007 — Silent JSON Parse Error Swallowed · **P3 · pattern-violation**
`Source/Frontend/src/api/client.ts:26`

`.catch(() => ({}))` silently discards JSON parse errors with no log or comment. Architecture rule: *"Never swallow errors silently — explicitly document why the error is intentionally suppressed."*

**Fix:** Add an inline comment explaining the intent.

---

### QO-008 — `eslint-disable` Without Rationale · **P3 · pattern-violation**
`Source/Frontend/src/hooks/useWorkItems.ts:63`, `DependencyPicker.tsx:82`

Both suppress `react-hooks/exhaustive-deps` with no comment. This rule guards against stale closures; suppressing it silently is a smell.

**Fix:** Add a one-line comment per suppression explaining the deliberate omission.

---

### QO-009 — Hardcoded `localhost:5105` in E2E Config · **P3 · pattern-violation**
`Source/E2E/playwright.pipeline.config.ts:7`

Architecture rule: *"No hardcoded… URLs."* Replace with `process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5105"`.

---

### Architecture Rule Compliance
| Rule | Status |
|------|--------|
| Specs are source of truth | ⚠️ Enforcer covers 12% of requirements |
| No direct DB calls from handlers | ✅ Store abstraction used throughout |
| Shared types single source of truth | ✅ `Source/Shared/types/workflow.ts` |
| Every FR needs a Verifies test | ⚠️ Active plan 100%; search route gap; DebugPortalPage untested |
| No console.log in production | ✅ Logger abstraction used everywhere |
| Catch blocks never silent | ⚠️ `client.ts` one instance |
| No hardcoded secrets/URLs | ⚠️ E2E config localhost port |
| Business logic framework-free | ✅ Services are pure |
| List endpoints return `{data: T[]}` | ✅ Consistent |
| New routes have observability | ✅ Structured logging in all routes |

Report saved to `Teams/TheInspector/findings/audit-2026-09-01-C.md`. Learnings updated at `Teams/TheInspector/learnings/quality-oracle.md`.
