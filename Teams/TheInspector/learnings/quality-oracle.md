# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit: 2026-11-16

### Spec Coverage Trend
- **Effective coverage (self-judging-workflow plan only):** 100% (13/13 FR-WF-* IDs traced)
- **Effective coverage (all plans combined):** ~40–50% — multiple plans with zero implementation
- Trend: **declining** as new plans are written but not implemented

### Key Structural Discoveries

**Traceability enforcer scope flaw (P1):**
`tools/traceability-enforcer.py` only checks the most recently modified `requirements.md` (currently `Plans/self-judging-workflow/requirements.md`). It PASSES because all 13 FR-WF-* IDs are traced. However, 6 other plans fail when checked individually — the gate gives a false green.

**FR namespace fragmentation:**
- `Specifications/dev-workflow-platform.md` uses FR-001 through FR-069+ (sequential numbers)
- Implemented source uses FR-WF-001 through FR-WF-013 and FR-dependency-* (plan-scoped IDs)
- These namespaces do not overlap — the main spec FRs are largely NOT traced in source
- The traceability-enforcer only validates plan-level requirements.md, NOT the Specifications/ docs

**Plans referencing old portal/ paths:**
`Plans/dependency-linking/requirements.md` still references `portal/Backend/`, `portal/Frontend/`, `portal/Shared/` — the old project structure. Active code is in `Source/`. These path references are stale but the FR-dependency-* IDs are correctly traced.

**Direct store calls from route handlers (architecture violation):**
- `Source/Backend/src/routes/workItems.ts`: 6 direct `store.*` calls (createWorkItem, findAll, findById x2, updateWorkItem, softDelete)
- `Source/Backend/src/routes/workflow.ts`: multiple direct `store.*` calls
- `Source/Backend/src/routes/intake.ts`: 2 direct `store.*` calls
- Architecture rule: "No direct DB calls from route handlers — use the service layer"
- Assessment: This is an in-memory store (not a true DB), and there is no business logic in routes, so the violation is structural/hygiene rather than a correctness bug

### Completely Unimplemented Plans (Spec Drift)
These plans have requirements.md files with zero implementation in Source/:
1. `image-upload` — FR-078 through FR-089 (12 FRs)
2. `duplicate-deprecated-status` — FR-DUP-01 through FR-DUP-13 (13 FRs)
3. `orchestrator-cycle-dashboard` — FR-070 through FR-076 (8 FRs)

Partially unimplemented plans:
4. `dev-workflow-platform` — FR-027 through FR-032 missing (frontend pages: Dev Cycle, Approvals, Feature Browser, Learnings)
5. `orchestrated-dev-cycles` — FR-043 through FR-049 missing (pipeline orchestration)
6. `dev-cycle-traceability` — FR-063 through FR-069 missing

### Useful File Paths for Future Audits
- Requirements files: `Plans/*/requirements.md`
- Traceability enforcer: `tools/traceability-enforcer.py`
- Main spec: `Specifications/dev-workflow-platform.md`
- Backend routes (architecture violation site): `Source/Backend/src/routes/`
- Shared types (single source of truth): `Source/Shared/types/workflow.ts`
- ESLint disables found in: `Source/Frontend/src/hooks/useWorkItems.ts:63`, `Source/Frontend/src/components/DependencyPicker.tsx:82`

### Common Pattern Violations Found
1. Direct store calls from route handlers (architecture rule)
2. `eslint-disable` suppression in hooks (react-hooks/exhaustive-deps)
3. Plans written but never started (spec drift without git evidence of work)
