# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-10-06 — Full Audit (first run)

**Architecture context:**
- `Source/` implements the **self-judging workflow engine** (Plans/self-judging-workflow, FR-WF-001…013).
  This is an in-memory Express + TypeScript app. There is NO SQLite database.
- `Specifications/dev-workflow-platform.md` (FR-001…FR-069) describes a DIFFERENT, older application
  (SQLite-based dev cycle platform). This spec is now stale relative to Source/.
- The traceability enforcer picks the **most recently modified** `Plans/*/requirements.md`. All files
  share the same mtime (clone artifact), so the selection is non-deterministic. It currently picks
  `Plans/self-judging-workflow/requirements.md` and PASSES (all 13 FR-WF-* traced).

**Key paths for future audits:**
- Active plan requirements: `Plans/self-judging-workflow/requirements.md` (FR-WF-001…013)
- Dependency-linking plan: `Plans/dependency-linking/requirements.md` (FR-dependency-*)
- Stale/legacy spec: `Specifications/dev-workflow-platform.md` (FR-001…FR-069 — not in Source/)
- Source backend services: `Source/Backend/src/services/` (assessment, changeHistory, dashboard, dependency, router)
- Source routes: `Source/Backend/src/routes/` (workItems, workflow, dashboard, intake)
- In-memory store (acts as data layer): `Source/Backend/src/store/workItemStore.ts`

**Recurring patterns:**
- All route handlers call `store.*` directly (no dedicated service façade for workItems CRUD).
  This is a grey-area violation of "no direct DB calls from routes" since the store IS the data
  layer in an in-memory architecture, but intake.ts and workflow.ts mix store calls with service
  calls inconsistently.
- `dependency-linking/requirements.md` references `portal/Backend/` and `portal/Frontend/` paths
  (old project layout). Actual implementation is in `Source/Backend/` and `Source/Frontend/`.
- ESLint suppression comments exist in `DependencyPicker.tsx` and `useWorkItems.ts` for
  `react-hooks/exhaustive-deps`.

**Spec coverage trend:**
- Plan-level FRs (FR-WF-* + FR-dependency-*): **100%** traced → healthy
- Specification-level FRs (Specifications/dev-workflow-platform.md): **0%** — spec is stale
- Overall blended coverage (excluding stale spec): **100%**

**Grade baseline:** B (no P1s if stale spec treated as archived; P2s are architectural patterns)
