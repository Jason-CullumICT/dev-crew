# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Audit: 2026-11-18 — Full Audit

#### Spec System Architecture (Critical to Understand)
The project has **two separate requirements layers** that use different ID schemes and are NOT cross-linked:
1. **Domain Specs** (`Specifications/`) — Use `FR-NNN` (3-digit) IDs. `dev-workflow-platform.md` has 69 FRs, `tiered-merge-pipeline.md` has 10 FRs (FR-TMP-*). These are the canonical domain truth.
2. **Plan Requirements** (`Plans/<feature>/requirements.md`) — Use `FR-WF-NNN`, `FR-dependency-NNN` etc. These are the implementation-level breakdown used by agents.

The traceability enforcer (`tools/traceability-enforcer.py`) **only checks Plans/**, not `Specifications/`. This creates a blind spot: 79 canonical domain requirements have zero source traceability.

#### Architecture Rule: Service Layer Bypass (Confirmed P1)
Three route handlers directly import and call `../store/workItemStore` instead of going through services:
- `Source/Backend/src/routes/workItems.ts` — 6 direct store calls
- `Source/Backend/src/routes/intake.ts` — 2 direct store calls
- `Source/Backend/src/routes/workflow.ts` — many direct store calls

The service layer (`services/`) correctly owns store access for assessment, dashboard, dependency, and router logic, but CRUD routes bypass it entirely.

#### File Paths for Fast Future Audits
- Domain specs: `Specifications/dev-workflow-platform.md` (69 FRs), `Specifications/tiered-merge-pipeline.md` (10 FRs)
- Plan requirements: `Plans/self-judging-workflow/requirements.md` (13 FRs, all traced)
- Dependency requirements: `Plans/dependency-linking/` (15 FRs, all traced)
- Routes with architecture violations: `src/routes/workItems.ts`, `src/routes/intake.ts`, `src/routes/workflow.ts`
- ESLint suppressions: `src/hooks/useWorkItems.ts:63`, `src/components/DependencyPicker.tsx:82`
- Untested components: `Layout.tsx`, `PriorityBadge.tsx`, `StatusBadge.tsx`, `TypeBadge.tsx`, `DebugPortalPage.tsx`

#### Traceability Coverage Trend
- Plan-level (FR-WF-* + FR-dependency-*): **100%** — 28 of 28 requirements traced ✅
- Specification-level (FR-NNN): **0%** — 0 of 79 requirements traced ❌
- Traceability enforcer passes because it only checks Plans/

#### Common Pattern Violations
1. Routes bypassing service layer (architecture rule violation)
2. `eslint-disable-next-line react-hooks/exhaustive-deps` in two files (suppressed linting)
3. Missing component tests for 4 components (Layout, PriorityBadge, StatusBadge, TypeBadge)
4. DebugPortalPage has no test coverage
5. Duplicate test file: WorkItemDetailPage.test.tsx exists in both `tests/` root and `tests/pages/`
