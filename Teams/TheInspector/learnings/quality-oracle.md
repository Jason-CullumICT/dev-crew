# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-05-24 (First Run)

### Product Identity

- The **active product** in `Source/` is the **Self-Judging Workflow Engine** (FR-WF-001 to FR-WF-013), NOT the Dev Workflow Platform (FR-001 to FR-069).
- `Specifications/workflow-engine.md` is the authoritative active spec. `Specifications/dev-workflow-platform.md` is an orphaned/historical spec for a different (now-abandoned) product.
- All `Plans/` directories EXCEPT `self-judging-workflow/` describe either the old portal app or infrastructure. Only `self-judging-workflow` and (partially) `dependency-linking` map to the current `Source/` codebase.

### Traceability Enforcer Behavior

- **Default invocation** (`python3 tools/traceability-enforcer.py`) auto-selects the **most recently modified** `requirements.md` in `Plans/`. Currently this is `Plans/self-judging-workflow/requirements.md` → PASSES.
- Running enforcer against all 8 plans: 7 fail (all for old portal/ system), 1 passes (self-judging-workflow).
- **Regex bug**: `FR-[A-Z0-9-]+` doesn't match lowercase FR IDs like `FR-dependency-types`, `FR-dependency-search`. Fix: use `FR-[A-Za-z0-9-]+`.
- To target the active plan explicitly: `python3 tools/traceability-enforcer.py --plan self-judging-workflow`
- To target dependency requirements: `python3 tools/traceability-enforcer.py --plan dependency-linking`

### Critical Open Issue

- `GET /api/search` endpoint is **not implemented**. Tests exist at `Source/Backend/tests/routes/search.test.ts` with 5 test cases and a note that they will fail intentionally until implemented. This is `FR-dependency-search`. The `DependencyPicker` component calls `searchItems()` which hits this missing endpoint.

### Architecture Violations

- Route handlers `workItems.ts`, `workflow.ts`, `intake.ts` directly import and call `workItemStore.*` functions. This violates "no direct DB/store calls from route handlers." Services like `dashboard.ts`, `assessment.ts`, `router.ts` correctly use the service layer pattern.
- `DependencyPicker.tsx:82` and `hooks/useWorkItems.ts:63` have `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions.

### Test Quality

- No skipped/todo tests found in active codebase.
- Two duplicate test file pairs in `Source/Frontend/tests/` (root) and `Source/Frontend/tests/pages/` (subdirectory). The `pages/` versions are more complete and should be retained.
- `Source/Frontend/tests/setup.ts` has no Verifies comment — this is expected for test infrastructure.
- Dashboard test (4 test cases) and changeHistory test (4 test cases) are thin but not zero.

### Key File Paths for Fast Future Audits

- Active spec: `Specifications/workflow-engine.md`
- Historical/obsolete spec: `Specifications/dev-workflow-platform.md`
- Active requirements: `Plans/self-judging-workflow/requirements.md`
- Enforcer: `tools/traceability-enforcer.py`
- Missing endpoint test: `Source/Backend/tests/routes/search.test.ts`
- Store layer (don't call from routes): `Source/Backend/src/store/workItemStore.ts`
- Service layer (correct call site): `Source/Backend/src/services/`
- Shared types: `Source/Shared/types/workflow.ts`

### Spec Coverage Trend

- First audit. Baseline: **100% for active product (FR-WF-001 to FR-WF-013)**; **0% for inactive/orphaned specs**.

### Common Patterns Found

1. Orphaned specs in `Specifications/` with no deprecation notice
2. Traceability enforcer silently scoping to wrong plan
3. Store access from route handlers (service layer bypass)
4. Duplicate test files created during iterative pipeline runs
