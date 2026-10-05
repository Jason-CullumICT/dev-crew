# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-10-05

### Spec Coverage Trend

**Initial audit — no prior baseline.**

- `Specifications/dev-workflow-platform.md` defines **92 unique FR IDs** (FR-001 to FR-069 + FR-dependency-* family)
- `portal/` implements FR-001 to FR-069 with correct Verifies comments — coverage is high
- `Source/` implements FR-WF-001 to FR-WF-013 (from `Plans/self-judging-workflow/requirements.md`) — these IDs DO NOT appear in any `Specifications/` file
- The traceability enforcer (`tools/traceability-enforcer.py`) only checks against the most-recently-modified plan in `Plans/`, NOT the canonical `Specifications/` directory — **it passes while 100% of Specifications-level FR IDs are untraced in `Source/`**

### Architecture Findings

| Finding | Severity | File(s) |
|---------|----------|---------|
| Direct store calls from route handlers (no service layer) | P2 | `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, `intake.ts` |
| `portal/Backend/src/routes/teamDispatches.ts` has 0 Verifies comments, recently modified | P2 | `portal/Backend/src/routes/teamDispatches.ts` |
| FR-dependency-seed has no implementation in either portal/ or Source/ | P3 | `Specifications/dev-workflow-platform.md:475` |
| Duplicate test files: `tests/WorkItemDetailPage.test.tsx` and `tests/pages/WorkItemDetailPage.test.tsx` | P3 | `Source/Frontend/tests/` |
| Two eslint-disable comments in Source/Frontend hooks | P4 | `useWorkItems.ts:63`, `DependencyPicker.tsx:82` |

### Useful Paths for Future Audits

- Canonical specs: `Specifications/dev-workflow-platform.md` (FR-001..FR-069, FR-dependency-*)
- Plan-level specs: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..FR-WF-013)
- Traceability enforcer: `tools/traceability-enforcer.py` (targets Plans only — limitation)
- Source system: `Source/Backend/src/`, `Source/Frontend/src/`
- Portal system: `portal/Backend/src/`, `portal/Frontend/src/`, `portal/Shared/`
- FR IDs used in Source/: FR-WF-*, FR-dependency-*
- FR IDs used in portal/: FR-001..FR-069, FR-0001..FR-0007

### Key Discovery

There are **two separate application stacks** in this repo:
1. **`portal/`** — Dev Workflow Platform (Feature Requests, Bug Reports, Cycles, SQLite), traces to `Specifications/dev-workflow-platform.md`
2. **`Source/`** — Self-Judging Work Item Workflow (Work Items, Assessment Pod, Router), traces to `Plans/self-judging-workflow/requirements.md`

The `Specifications/` directory describes the portal system. The `Source/` system's specs live only in `Plans/`, not in `Specifications/`. This gap is the primary spec-drift risk: `Source/` has no canonical domain spec in `Specifications/`.

### Common Pattern Violations Found

- Architecture rule "No direct DB/store calls from route handlers" violated in `Source/Backend/src/routes/workItems.ts` and `intake.ts`
- No new `console.log` violations — both stacks use proper logger abstractions
- No hardcoded secrets found
- No empty catch blocks
