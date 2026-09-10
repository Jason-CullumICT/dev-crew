---

## Quality Oracle Findings — 2026-09-10

**Overall Grade: C** (2 P1s, 2 P2s, 2 P3s, 1 P4)
**Spec Coverage: 13%** (13 of 97 spec-level FRs traced to code)

---

### QO-001 — P1 · Architecture Violation: Routes Bypass Service Layer

**Files:** `workItems.ts`, `workflow.ts`, `intake.ts`

All three route handlers directly import and call `workItemStore` methods (`store.findById`, `store.createWorkItem`, `store.updateWorkItem`, etc.) instead of going through the service layer. This violates the explicit architecture rule. Worse, the `approve`, `reject`, and `dispatch` actions in `workflow.ts` embed business logic — state-transition validation, change-history construction, team assignment — *inside the route handler body*.

Note the split: `/route` and `/assess` actions correctly delegate to `routeWorkItem()` and `assessWorkItem()` services. But no `workItemService.ts` or `intakeService.ts` exists — so all CRUD and the remaining workflow verbs bypass the layer entirely.

---

### QO-002 — P1 · Traceability Enforcer Has an 84-FR Blind Spot

**File:** `tools/traceability-enforcer.py`

The enforcer only scans the most-recently-modified `Plans/*/requirements.md` — currently `Plans/self-judging-workflow/requirements.md` (13 FRs). It reports **PASSED** while two spec files are completely untraced:

| Spec | FRs | Traced |
|------|-----|--------|
| `Specifications/dev-workflow-platform.md` | 74 | 0 |
| `Specifications/tiered-merge-pipeline.md` | 10 | 0 |

The verification gate produces a false green on every run.

---

### QO-003 — P2 · Spec Drift: dev-workflow-platform.md Describes an Unimplemented Product

74 FRs specify a **Feature Request / Bug Report / Development Cycle** platform with SQLite, AI voting, human approval gates, and 7 subsystems. The current implementation is a **Work Item workflow engine with an in-memory store** — a different product. There is no deprecation notice, no decision record, and no plan tracking the gap. Any new agent reading `Specifications/` will treat these 74 FRs as current requirements.

---

### QO-004 — P2 · Spec Drift: tiered-merge-pipeline.md Unimplemented (E2E Suite Empty)

FR-TMP-001 through FR-TMP-010 (risk classification, Playwright E2E generation, AI review, auto-merge) have zero implementation. The E2E package has `"test": "echo \"Error: no test specified\" && exit 1"` — the Playwright config files exist but no tests are written.

---

### QO-005 — P3 · eslint-disable Suppressions Without Justification

- `Source/Frontend/src/hooks/useWorkItems.ts:63`
- `Source/Frontend/src/components/DependencyPicker.tsx:82`

Both suppress `react-hooks/exhaustive-deps` without a comment explaining why the omission is intentional. Safe fix: add a one-line explanation alongside the directive.

---

### QO-006 — P3 · Hardcoded Fallback localhost URL in Production Component

`Source/Frontend/src/pages/DebugPortalPage.tsx:5` — `|| 'http://localhost:4200'` will silently fail in any deployment without `VITE_PORTAL_URL` set.

---

### QO-007 — P4 · No Backend Test Verifies FR-WF-013 Prometheus Workflow Metrics

`metrics.test.ts` covers `FR-dependency-metrics` only. The four `workflow_items_*_total` counters defined in `metrics.ts` have no integration test confirming they're exposed or increment correctly.

---

**Report written to:** `Teams/TheInspector/findings/audit-2026-09-10-quality-oracle.md`  
**Learnings updated:** `Teams/TheInspector/learnings/quality-oracle.md`
