# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-08-24

### Spec Coverage Trend
- **Plans-level coverage (enforcer scope):** 100% — FR-WF-001 to FR-WF-013 all traced
- **Specifications/ directory coverage:** ~0% — `Specifications/dev-workflow-platform.md` (FR-001–FR-069) describes a different product (SQLite-backed dev-workflow platform) that was never built. The project pivoted to a Self-Judging Workflow Engine. The spec was **not updated to reflect the pivot**.
- **Trend:** Needs spec reconciliation — either archive/rewrite `dev-workflow-platform.md` or accept it as aspirational backlog.

### Key File Paths (faster future audits)
- Active requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013)
- Dependency requirements: `Plans/dependency-linking/requirements.md` (FR-dependency-*)
- Stale/mismatched spec: `Specifications/dev-workflow-platform.md` (FR-001..FR-069)
- Traceability enforcer: `tools/traceability-enforcer.py` — targets **most recently modified** `Plans/**/requirements.md` only
- Logger compat wrapper: `Source/Backend/src/logger.ts` (wraps `utils/logger.ts`)
- All source files: `Source/Backend/src/`, `Source/Frontend/src/`, `Source/Shared/types/workflow.ts`

### Common Pattern Violations Found
1. `workItemStore.ts` imports directly from `utils/logger` (string API) while all other files use the compat wrapper from `../logger` (object-style `{msg: '...'}`). Not a bug today, but a maintenance inconsistency.
2. `eslint-disable-next-line react-hooks/exhaustive-deps` in `useWorkItems.ts:63` and `DependencyPicker.tsx:82` — undocumented suppressions.
3. Plans delta tables go stale after implementation — `Plans/dependency-linking/requirements.md` still shows FR-dependency-frontend-tests as ❌ Missing when the tests exist in `Source/Frontend/tests/`.

### Traceability Enforcer Limitation
The enforcer uses "most recently modified requirements.md under Plans/" as its target. It will NEVER scan `Specifications/` directory. This means the 69 FRs in `dev-workflow-platform.md` and the entire `workflow-engine.md` are outside the enforcer's scope. Consider extending the enforcer to optionally scan `Specifications/` or accept a multi-file mode.

### FR ID Namespaces in Use
- `FR-WF-001..013` → Plans/self-judging-workflow/requirements.md ✅ all traced
- `FR-dependency-*` (16 IDs) → Plans/dependency-linking/requirements.md ✅ mostly traced
- `FR-001..FR-069` → Specifications/dev-workflow-platform.md ❌ 0% implemented (wrong product)
