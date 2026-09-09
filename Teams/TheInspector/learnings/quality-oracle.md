# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit: 2026-09-09 — Full Audit

### Spec Coverage Trend
- Plans/self-judging-workflow/requirements.md (13 FR-WF-* FRs): **100% covered** — enforcer passes
- Specifications/dev-workflow-platform.md (69+ FR-001..FR-069 FRs): **~0% covered** — entirely different system, not built
- Specifications/tiered-merge-pipeline.md (FR-TMP-* FRs): **0% covered** — no implementation
- Overall Specifications/ coverage: **~13%** (only FR-dependency-* concepts overlap)

### Key Architecture Facts
- Source/ implements the **workflow engine** (workflow-engine.md + Plans/self-judging-workflow/), NOT the dev-workflow-platform spec
- The traceability enforcer targets Plans/ not Specifications/ — this is the critical mismatch
- FR-WF-001 to FR-WF-013: all implemented and traced
- FR-dependency-*: all implemented in Source/Backend/src/services/dependency.ts and frontend components
- In-memory store — no SQLite/database layer; no migration needed for current product

### Common Pattern Violations Found
1. `eslint-disable-next-line react-hooks/exhaustive-deps` in two recently-modified source files:
   - `Source/Frontend/src/components/DependencyPicker.tsx:82`
   - `Source/Frontend/src/hooks/useWorkItems.ts:63`
2. Duplicate test files exist in `tests/` and `tests/pages/` — the pages/ versions are more complete

### Fast-Lookup File Paths (for future audits)
- Main spec: `Specifications/dev-workflow-platform.md` (lines 337-482 = all FRs)
- Workflow engine spec: `Specifications/workflow-engine.md`
- Tiered pipeline spec: `Specifications/tiered-merge-pipeline.md`
- Actual requirements (enforcer target): `Plans/self-judging-workflow/requirements.md`
- In-memory store: `Source/Backend/src/store/workItemStore.ts`
- Dependency service: `Source/Backend/src/services/dependency.ts`
- Shared types: `Source/Shared/types/workflow.ts`
- Traceability enforcer script: `tools/traceability-enforcer.py`

### Spec Drift Root Cause
The project appears to have **pivoted** from the dev-workflow-platform.md design (SQLite-backed feature request management platform, FR-001—FR-069) to the self-judging workflow engine (in-memory, FR-WF-001—FR-013). The dev-workflow-platform.md spec was never deprecated or archived — it sits in Specifications/ as if active but describes a system that was never built from this codebase.
