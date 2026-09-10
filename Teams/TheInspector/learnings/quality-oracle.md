# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## 2026-09-10 — First Audit Run

### Spec Coverage Trend
- **Starting baseline: 13%** (13/97 FRs traced)
- Plans-level coverage (FR-WF-001..013) is 100% — Plans are well-traced.
- Specification-level coverage (FR-001..069, FR-TMP-001..010) is 0% — never audited before.

### Useful File Paths (for faster future audits)

| Purpose | Path |
|---------|------|
| Active plan requirements | `Plans/self-judging-workflow/requirements.md` |
| Domain spec (main) | `Specifications/dev-workflow-platform.md` |
| Workflow engine spec | `Specifications/workflow-engine.md` |
| Pipeline spec | `Specifications/tiered-merge-pipeline.md` |
| Traceability enforcer | `tools/traceability-enforcer.py` |
| Backend source | `Source/Backend/src/` |
| Backend services (correct layer) | `Source/Backend/src/services/` |
| Backend routes (architecture concern) | `Source/Backend/src/routes/` |
| Store (being called directly from routes) | `Source/Backend/src/store/workItemStore.ts` |
| Frontend tests with Verifies | `Source/Frontend/tests/` |
| Backend tests with Verifies | `Source/Backend/tests/` |

### Common Pattern Violations Found
1. **Route → Store direct calls**: `workItems.ts`, `workflow.ts`, `intake.ts` all bypass service layer.
2. **eslint-disable-next-line** without justification: `useWorkItems.ts:63`, `DependencyPicker.tsx:82`.
3. **Hardcoded localhost fallback** in `DebugPortalPage.tsx`.

### Traceability Enforcer Gotcha
- The enforcer scans only `Plans/*/requirements.md` (most-recently-modified). It does NOT scan `Specifications/`.
- Running `python3 tools/traceability-enforcer.py` will report PASSED even when `Specifications/` FRs are completely untraced.
- To audit Specifications, manually grep for FR IDs and cross-reference with `grep -rn "Verifies:"`.

### Architecture Observations
- Service layer exists for: `assessment`, `changeHistory`, `dashboard`, `dependency`, `router`.
- **Missing services**: no `workItemService.ts`, no `intakeService.ts` — these operations go directly to the store.
- `/route` and `/assess` workflow actions correctly use the service layer.
- `/approve`, `/reject`, `/dispatch` workflow actions embed business logic directly in route handlers.

### Open P1 Findings (from this run)
- **QO-001**: Routes bypass service layer (3 route files, ~15 direct store calls)
- **QO-002**: Traceability enforcer blind spot (84 spec FRs untraced, gate reports false PASSED)

### Re-verification Checklist (next run)
- [ ] Check if `workItemService.ts` / `intakeService.ts` have been created
- [ ] Check if `workflow.ts` approve/reject/dispatch have been refactored to use services
- [ ] Check if traceability enforcer has been updated to scan `Specifications/`
- [ ] Check if `dev-workflow-platform.md` has been marked deprecated or a plan created for it
- [ ] Check if E2E tests have been scaffolded (FR-TMP-002)
