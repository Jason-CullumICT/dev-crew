# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-07-28 — Full Audit

### Spec Coverage Trend

| Plan/Spec | FRs | Covered | % |
|-----------|-----|---------|---|
| `Plans/self-judging-workflow/requirements.md` | 13 | 12 | 92.3% |
| `Plans/dependency-linking/requirements.md` | 16 | 15 | 93.8% |
| `Specifications/dev-workflow-platform.md` | 69 | 0 | 0% ⚠️ |

**Overall enforcer-scoped coverage (Plans only): ~93%**
**Spec-level coverage (Specifications/): 0% — entirely different system**

### Key Structural Findings

1. **The codebase implements the Self-Judging Workflow Engine** (FR-WF-*), as specified in `Specifications/workflow-engine.md` and planned in `Plans/self-judging-workflow/`. Source implements an in-memory Work Item workflow with routing, assessment, and dispatch.

2. **`Specifications/dev-workflow-platform.md`** (FR-001 – FR-069) describes a completely different product (FeatureRequests, BugReports, DevelopmentCycles with SQLite). This spec is **not implemented** in `Source/`. It is unclear if it is superseded or aspirational. **This is the #1 spec-drift finding.**

3. **Traceability enforcer is scoped to Plans/, not Specifications/**. It auto-selects the most-recently-modified `requirements.md` from `Plans/`. It will never check `Specifications/` FR IDs (FR-001 to FR-069). The enforcer should be run with `--file` targeting each active plan.

4. **Architecture violation pattern**: Routes (`workItems.ts`, `intake.ts`, `workflow.ts`) import directly from `../store/workItemStore`. CLAUDE.md says "No direct DB calls from route handlers — use the service layer." Intentional or not, this is a live violation.

5. **FR-WF-013 (Observability)** is implemented in production source (`logger.ts`, `metrics.ts`, middleware, routes) but has ZERO test coverage. No test file carries `// Verifies: FR-WF-013`. The `metrics.test.ts` only covers `FR-dependency-metrics`.

6. **FR-dependency-seed** has no implementation and no test in the current `Source/` directory.

7. **Duplicate test files** exist in `Source/Frontend/tests/`:
   - `tests/WorkItemDetailPage.test.tsx` AND `tests/pages/WorkItemDetailPage.test.tsx`
   - `tests/WorkItemListPage.test.tsx` AND `tests/pages/WorkItemListPage.test.tsx`

### Fast-path Locations for Future Audits

- Production source: `Source/Backend/src/`, `Source/Frontend/src/`
- Backend tests: `Source/Backend/tests/`
- Frontend tests: `Source/Frontend/tests/`
- Active plan requirements: `Plans/self-judging-workflow/requirements.md`, `Plans/dependency-linking/requirements.md`
- Main spec (current system): `Specifications/workflow-engine.md`
- Legacy spec (unimplemented): `Specifications/dev-workflow-platform.md`
- Traceability enforcer: `tools/traceability-enforcer.py` — auto-picks by mtime, run with `--file` for multi-plan coverage

### Common Pattern Violations Found

- `eslint-disable-next-line react-hooks/exhaustive-deps` in `useWorkItems.ts:63` and `DependencyPicker.tsx:82`
- Routes bypass service layer for store access (architecture rule violation)
