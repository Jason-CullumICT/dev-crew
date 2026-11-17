# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-11-17

### Spec Coverage Trend

| Metric | Value |
|--------|-------|
| Plans scanned by enforcer | 1 of 2 active plans |
| FR-WF-* coverage (self-judging-workflow) | 13/13 → **100%** |
| FR-dependency-* coverage (dependency-linking) | 16/16 → **100%** (not enforcer-verified) |
| Specifications/dev-workflow-platform.md coverage | 0/69 → **0%** (different domain, not implemented here) |
| Traceability enforcer result | **PASS** |

### Architecture: This Codebase

- **Source** implements `Specifications/workflow-engine.md` via `Plans/self-judging-workflow`
- `Specifications/dev-workflow-platform.md` describes a *different* product (feature requests, bug reports, dev cycles) and is **not implemented** in `Source/`. It is a product vision doc for a future/parallel project.
- Dependency tracking (`Plans/dependency-linking`) is fully implemented in `Source/` using FR-dependency-* IDs. The plan's delta section references `portal/` paths from an older iteration and is **stale**.
- Traceability enforcer targets most-recently-modified `requirements.md` by default → currently targets `Plans/self-judging-workflow/requirements.md`

### Useful Paths for Fast Re-Audits

| Path | Contents |
|------|----------|
| `Source/Shared/types/workflow.ts` | All shared domain types (WorkItem, enums, request/response shapes) |
| `Source/Backend/src/services/dependency.ts` | Dependency tracking service (315 lines) |
| `Source/Backend/src/routes/workflow.ts` | Workflow action routes (374 lines) |
| `Plans/self-judging-workflow/requirements.md` | 13 active FRs (FR-WF-001–FR-WF-013) |
| `Plans/dependency-linking/requirements.md` | 16 active FRs (FR-dependency-*); delta section is stale |
| `tools/traceability-enforcer.py` | Auto-picks most-recently-modified `requirements.md` |

### Common Pattern Violations Found (2026-11-17)

- 2× `eslint-disable-next-line react-hooks/exhaustive-deps` in production frontend hooks
- Duplicate test suites: `tests/WorkItemDetailPage.test.tsx` and `tests/pages/WorkItemDetailPage.test.tsx` cover the same component
- Same duplication for `WorkItemListPage`

### Open P1/P2 Findings

| ID | Severity | Status | File |
|----|----------|--------|------|
| QO-001 | P1 | OPEN | `Specifications/dev-workflow-platform.md` |
| QO-002 | P2 | OPEN | `tools/traceability-enforcer.py` |
| QO-003 | P2 | OPEN | `Plans/dependency-linking/requirements.md` |
| QO-004 | P3 | OPEN | `Source/Shared/types/workflow.ts` |
