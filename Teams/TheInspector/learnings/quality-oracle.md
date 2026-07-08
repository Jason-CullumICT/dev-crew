# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Audit 2026-07-08 — First full audit of Source/

**Spec Coverage trend:** Baseline established.
- FR-WF-001 to FR-WF-013 (self-judging-workflow): 100% enforced and implemented ✅
- FR-dependency-* (11 requirements): implemented with Verifies comments but NOT in the enforcer's scope ⚠️
- FR-TMP-001 to FR-TMP-010 (tiered-merge-pipeline): in Specifications/ but implemented in platform/ (outside Source/) ⚠️
- FR-001 to FR-069 (dev-workflow-platform): in Specifications/ but implemented in portal/ (outside Source/) ℹ️

**Common pattern violations found:**
1. Direct store access from route handlers — `workItems.ts`, `workflow.ts`, `intake.ts` all bypass the service layer
2. Dual logger abstraction — `src/logger.ts` (compat shim) + `src/utils/logger.ts` (canonical) with different calling conventions
3. Duplicate frontend test files at both `tests/*.test.tsx` and `tests/pages/*.test.tsx`
4. eslint-disable suppressions without inline justification in `DependencyPicker.tsx` and `useWorkItems.ts`

**Useful file paths for faster future audits:**
- Traceability enforcer: `tools/traceability-enforcer.py` — targets `Plans/self-judging-workflow/requirements.md` (only FR-WF-*)
- Spec drift report (stale): `spec-drift-report.json` — shows tiered-merge-pipeline at 0% coverage
- Canonical logger: `Source/Backend/src/utils/logger.ts` — string+context API
- Compat logger shim: `Source/Backend/src/logger.ts` — object-style API {msg, ...ctx}
- Store (in-memory DB): `Source/Backend/src/store/workItemStore.ts`
- Missing route: `GET /api/search` — has tests in `tests/routes/search.test.ts` but is NOT wired in `app.ts`
- Missing metric: `dependency_check_duration` histogram (FR-dependency-metrics requires 4; only 3 in `metrics.ts`)

**Enforcer gap:** The enforcer only tracks 13 requirements. FR-dependency-* (11 reqs) are implemented and have Verifies comments but fall outside the enforcer's scope. To close this, either add them to `Plans/self-judging-workflow/requirements.md` or create a separate requirements file.

**OTel status:** No `@opentelemetry` packages in `Source/Backend/package.json`. CLAUDE.md mandates OTel tracing but it is not implemented in the workflow engine backend.
