# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Run: 2026-10-30 — First Full Audit

#### Critical Discovery: Three-Way Spec/Implementation Mismatch

The project has **three specification files** but the implementation only clearly traces to one (and even that one lacks formal FR IDs):

| Spec File | Formal FR IDs | Implementation Match |
|-----------|--------------|---------------------|
| `Specifications/workflow-engine.md` | None (narrative only) | ✅ Implemented (Work Items, Assessment Pod, in-memory store) |
| `Specifications/dev-workflow-platform.md` | FR-001–FR-069 | ❌ Not implemented (different domain: FeatureRequests, SQLite, Cycles) |
| `Specifications/tiered-merge-pipeline.md` | FR-TMP-001–FR-TMP-010 | ❌ Not in Source/ |

The codebase uses **invented IDs** (`FR-WF-001` through `FR-WF-013`) that appear in no spec file. Every `// Verifies:` comment references a non-existent formal ID.

#### Architecture Violation: Direct Store Access from Route Handlers

Route handlers in `workItems.ts`, `workflow.ts`, and `intake.ts` call the store layer directly (bypassing a service layer). The architecture rule explicitly forbids this.

#### FR-dependency-* Scope Confusion

The `dev-workflow-platform.md` spec places `FR-dependency-*` requirements in `portal/Shared/types.ts` and `portal/Backend`, but the implementation is in `Source/Shared/types/workflow.ts` and `Source/Backend/`. Either the spec is stale or the implementation is in the wrong directory.

#### Useful File Paths for Future Audits

- Shared types: `Source/Shared/types/workflow.ts`
- Store: `Source/Backend/src/store/workItemStore.ts`
- All route handlers: `Source/Backend/src/routes/`
- All services: `Source/Backend/src/services/`
- All tests: `Source/Backend/tests/`, `Source/Frontend/tests/`

#### Spec Coverage Trend

- First run: ~0% formal spec coverage (all `dev-workflow-platform.md` and `tiered-merge-pipeline.md` FRs unimplemented)
- The `workflow-engine.md` narrative is well-implemented but has no formal IDs to trace against
