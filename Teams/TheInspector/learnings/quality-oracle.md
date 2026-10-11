# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Audit: 2026-10-11

**Spec Coverage Trend:** Improving (primary plan 100%). Secondary plans have gaps.

**Project Has Two App Codebases**
- `Source/` — Self-Judging Workflow Engine (implements `Specifications/workflow-engine.md`, FR-WF-* requirements)
- `portal/` — Dev Workflow Platform UI (implements `Specifications/dev-workflow-platform.md`, FR-001..FR-069 + FR-dependency-*)

The traceability enforcer at `tools/traceability-enforcer.py` only scans `Source/` and `E2E/`. Portal requirements (60+ FRs) have **no automated traceability gate**. Running the enforcer against `Plans/dependency-linking/requirements.md` reports 7 MISSING because it searches Source/ instead of portal/.

**Active Plan Context**
- Traceability enforcer defaults to most-recently-modified plan in `Plans/`
- Active plan as of this audit: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..FR-WF-013)
- All 13 FR-WF-* requirements traced → 100% coverage for this plan

**Known Open Gaps (confirmed unimplemented)**
- `portal/Backend/src/database/seed.ts` — DOES NOT EXIST (FR-dependency-seed ❌)
- `portal/Shared/api.ts::UpdateBugInput` and `UpdateFeatureRequestInput` — missing `blocked_by?: string[]` (FR-dependency-api-types ❌ partial)
- `portal/Frontend/src/components/shared/DependencyPicker.tsx:291,293` — `as any` casts due to above missing types

**Pattern Violations Found**
- `portal/Backend/src/routes/teamDispatches.ts` — zero `// Verifies:` comments (recently modified, unlinked implementation)
- `Source/Backend/src/store/workItemStore.ts` — imports `{ logger }` from `'../utils/logger'` directly; all other modules use default from `'../logger'` wrapper. Inconsistent interface.

**Useful File Paths for Future Audits**
- Active plan: `Plans/self-judging-workflow/requirements.md`
- Dependency-linking plan status: `Plans/dependency-linking/requirements.md` (has ✅/❌ status table at bottom)
- Portal shared types: `portal/Shared/types.ts`, `portal/Shared/api.ts`
- Portal backend services: `portal/Backend/src/services/`
- Workflow engine shared types: `Source/Shared/types/workflow.ts`
- Logger wrapper: `Source/Backend/src/logger.ts` (wraps `Source/Backend/src/utils/logger.ts`)
- TeamDispatches route (no traceability): `portal/Backend/src/routes/teamDispatches.ts`

**Architecture Rule Check Results**
- ✅ No `console.log` in production source (Source/ and portal/)
- ✅ No hardcoded secrets found
- ✅ Business logic in services, not route handlers (Source/ and portal/)
- ✅ All list endpoints return `{data: T[]}` wrappers
- ✅ No framework imports in service files
- ⚠️ `as any` casts in DependencyPicker.tsx (Type safety bypass — caused by missing api-types)
- ⚠️ Two `eslint-disable-next-line react-hooks/exhaustive-deps` without written justification
