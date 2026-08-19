# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-08-19

### Spec Coverage Trend
- First audit — baseline established
- Overall coverage against all `Specifications/`: **~31%** (grade D)
- Coverage against enforcer-tracked `Plans/self-judging-workflow/requirements.md`: **100%**

### Critical Structural Finding
The project has TWO parallel requirement namespaces:
1. **`FR-WF-001..013`** — defined in `Plans/self-judging-workflow/requirements.md`; these are what the source code actually implements (workflow-engine, in-memory store)
2. **`FR-001..069` + `FR-dependency-*`** — defined in `Specifications/dev-workflow-platform.md` (SQLite-based 7-subsystem platform); FR-dependency-* IS implemented in Source; FR-001..069 is NOT
3. **`FR-TMP-001..010`** — defined in `Specifications/tiered-merge-pipeline.md`; zero implementation

The traceability enforcer reads Plans file, not Specifications/ — so it always passes even when primary specs are untraced.

### Key File Paths (for faster future audits)
- Requirements enforcer: `Plans/self-judging-workflow/requirements.md` (13 FRs, FR-WF-*)
- Primary domain spec: `Specifications/dev-workflow-platform.md` (69 + ~17 FRs)
- Pipeline spec: `Specifications/tiered-merge-pipeline.md` (10 FRs)
- Workflow engine spec: `Specifications/workflow-engine.md` (no FR IDs — narrative only)
- Metrics implementation: `Source/Backend/src/metrics.ts`
- Shared types: `Source/Shared/types/workflow.ts`
- Frontend API client: `Source/Frontend/src/api/client.ts`

### Common Pattern Violations Found
- `eslint-disable react-hooks/exhaustive-deps` in DependencyPicker.tsx:82 and useWorkItems.ts:63
- Hardcoded URL fallback (`localhost:4200`) in DebugPortalPage.tsx:5
- Duplicate test files: WorkItemListPage and WorkItemDetailPage each have root + pages/ variants

### Open Findings (carry forward)
| ID | Severity | Status | Summary |
|----|----------|--------|---------|
| QO-001 | P1 | OPEN | Primary spec (FR-001..069) has 0% source coverage |
| QO-002 | P2 | OPEN | tiered-merge-pipeline.md (FR-TMP-001..010) fully unimplemented |
| QO-003 | P2 | OPEN | Missing dependencyCheckDuration histogram in metrics.ts |
| QO-004 | P2 | OPEN | Traceability enforcer only checks 13 of 96 spec requirements |
| QO-005 | P3 | OPEN | Duplicate test files for WorkItemListPage + WorkItemDetailPage |
| QO-006 | P3 | OPEN | eslint-disable suppresses react-hooks in 2 files |
| QO-007 | P3 | OPEN | Hardcoded localhost:4200 in DebugPortalPage |
