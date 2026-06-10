# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit 2026-06-10 — First Run

### Project Layout

- **Source/** — implements the "Self-Judging Workflow Engine" (Plans/self-judging-workflow/requirements.md, FR-WF-001 to FR-WF-013)
- **portal/** — implements the "Development Workflow Platform" (Specifications/dev-workflow-platform.md, FR-001 to FR-069+)
- **Specifications/workflow-engine.md** — narrative spec for the workflow engine (no FR IDs, use Plans/self-judging-workflow/requirements.md for IDs)
- **Specifications/dev-workflow-platform.md** — spec for the portal app, not Source/

### Traceability Enforcer Behaviour

- `python3 tools/traceability-enforcer.py` defaults to the **most-recently-modified** requirements.md under Plans/
- Currently targets: `Plans/self-judging-workflow/requirements.md` (FR-WF-001–013) — passes ✅
- Running it against `Plans/dependency-linking/requirements.md` produces false positives: the regex `FR-[A-Z0-9-]+` matches seed data IDs (FR-0002, FR-0003, etc.) and spec cross-reference ranges (FR-070, FR-085) that are NOT requirement IDs
- To check all plans, must invoke with `--file` flag per plan. There is no "check all" mode.

### Key File Paths

| What | Where |
|------|-------|
| Active plan requirements | Plans/self-judging-workflow/requirements.md |
| Dependency requirements | Plans/dependency-linking/requirements.md |
| Dev-cycle traceability reqs | Plans/dev-cycle-traceability/requirements.md (if exists) |
| Source types | Source/Shared/types/workflow.ts |
| Backend routes | Source/Backend/src/routes/ |
| Backend services | Source/Backend/src/services/ |
| Backend tests | Source/Backend/tests/ |
| Frontend tests | Source/Frontend/tests/ |
| Logger abstraction | Source/Backend/src/logger.ts (wrapper) + src/utils/logger.ts (impl) |

### Open Issues (first run, 2026-06-10)

| ID | Severity | Status |
|----|----------|--------|
| QO-001 | P2 | Enforcer only checks one requirements.md at a time |
| QO-002 | P2 | Enforcer false positives on dependency-linking requirements |
| QO-003 | P2 | Duplicate frontend test files (old vs new in tests/ vs tests/pages/) |
| QO-004 | P2 | FR-WF-013 workflow Prometheus counters not tested |
| QO-005 | P3 | isValidTransition in route handler (business logic in route) |
| QO-006 | P3 | Split logger import paths (store uses utils/logger, rest uses src/logger) |
| QO-007 | P3 | Silent catch in api/client.ts:26 |
| QO-008 | P3 | eslint-disable in useWorkItems.ts and DependencyPicker.tsx (undocumented) |
| QO-009 | P3 | Specifications/dev-workflow-platform.md not traced to Source/ (portal scope mismatch) |
| QO-010 | P4 | WorkItemDetailPage.tsx approaching 500-line threshold (426 lines) |

### Spec Coverage (Source/ scope only)

- FR-WF-001 to FR-WF-013: **100%** (13/13)
- FR-dependency-*: **100%** (15/15)
- Specifications/dev-workflow-platform.md: **N/A** — portal/ scope, out of scope for Source/

### Grade

**B** (0 P1, 4 P2, 100% active spec coverage)
