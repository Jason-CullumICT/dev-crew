# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-08-11

### Spec Coverage Trend
- **Domain spec** (`Specifications/dev-workflow-platform.md`): **0%** — 74 requirements, 0 traced
- **Plan-level spec** (`Plans/self-judging-workflow/requirements.md`): **100%** — 13 requirements, all traced
- The traceability enforcer defaults to the most-recently-modified `requirements.md` in `Plans/`, NOT the domain specs. This creates a false-green CI gate.

### Key Structural Discovery
The implementation is a **work-item workflow engine** (FR-WF-001–FR-WF-013) built against a plan-level spec. The domain spec (`dev-workflow-platform.md`) describes a DIFFERENT system: a feature-request/bug-report/development-cycle platform with SQLite. These two are architecturally separate; the source does not implement the domain spec at all.

### Common Pattern Violations Found
1. **Direct store access from route handlers** — `workItems.ts`, `intake.ts`, `workflow.ts` all call `store.*` directly, bypassing the service layer. Architecture rule violation.
2. **`eslint-disable react-hooks/exhaustive-deps`** in production frontend source (`useWorkItems.ts:63`, `DependencyPicker.tsx:82`). Should be documented with explanation or fixed.
3. **Duplicate logger modules** — `src/logger.ts` is a compatibility shim re-exporting `src/utils/logger.ts`. Created by multi-coder pipeline. Needs consolidation.
4. **Duplicate test files** — `tests/WorkItemDetailPage.test.tsx` and `tests/pages/WorkItemDetailPage.test.tsx` test the same component with slightly different mocks. Same for `WorkItemListPage`.
5. **OpenTelemetry not implemented** — OTel traceparent propagation is an architecture rule and in FR-021, but no OTel code exists in the backend.
6. **Search route unregistered** — `tests/routes/search.test.ts` explicitly notes `/api/search` is not wired into `app.ts`. Tests intentionally fail to surface the gap.

### Useful File Paths for Faster Future Audits
- Domain spec: `Specifications/dev-workflow-platform.md` (74 requirements, FR-001 to FR-069 + dependency FRs)
- Plan spec: `Plans/self-judging-workflow/requirements.md` (13 requirements, FR-WF-001 to FR-WF-013)
- Traceability enforcer: `tools/traceability-enforcer.py` — run with `--file Specifications/dev-workflow-platform.md` to audit domain coverage
- Store (data layer): `Source/Backend/src/store/workItemStore.ts`
- Architecture violations: `Source/Backend/src/routes/workItems.ts`, `intake.ts`, `workflow.ts` (direct store imports)
- Missing route test: `Source/Backend/tests/routes/search.test.ts` (known failing)
- Duplicate loggers: `Source/Backend/src/logger.ts` (shim) vs `Source/Backend/src/utils/logger.ts` (canonical)

### Grading
- P1 findings: 3 → Grade: **D** (>2 P1s)
- Spec coverage (domain): **0%** (below the 40% threshold for Grade C)

---

_(prior entries: none)_
