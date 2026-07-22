# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit: 2026-07-22 — Full Audit (Source/ — Self-Judging Workflow Engine)

### Spec Coverage Trend

- **Grade: A** (2 P2s, 0 P1s, ~96% in-scope spec coverage)
- In-scope FRs (FR-WF-001..013 + active FR-dependency-*): 26/27 covered = **96%**
- One confirmed failing test suite: `tests/routes/search.test.ts` (5 tests, FR-dependency-search)

### Multi-System Architecture (Critical Context)

This repo contains **multiple independent systems** sharing one Specifications/ directory:

| System | Location | Spec | FR IDs |
|--------|----------|------|--------|
| Self-Judging Workflow Engine | `Source/` | Specifications/workflow-engine.md | FR-WF-001..013 (plan-level) |
| Dev Workflow Platform | `portal/` | Specifications/dev-workflow-platform.md | FR-001..FR-069 |
| Tiered Merge Pipeline | `platform/` | Specifications/tiered-merge-pipeline.md | FR-TMP-001..010 |

When auditing `Source/`, scope to FR-WF-* and FR-dependency-* IDs only. FR-001..069 and FR-TMP-* are for different systems.

### Traceability Enforcer Scope Warning

- **The enforcer auto-selects the most recently modified `requirements.md` in Plans/**.
- Currently selects: `Plans/self-judging-workflow/requirements.md` (FR-WF-001..013).
- Does NOT check: `Plans/dependency-linking/requirements.md` (FR-dependency-*).
- Does NOT check: canonical Specifications/ files.
- **Workaround**: run `python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md` to check dependency requirements separately.

### Key File Paths for Future Audits

| Purpose | Path |
|---------|------|
| Workflow spec | Specifications/workflow-engine.md |
| Plan requirements (primary) | Plans/self-judging-workflow/requirements.md |
| Plan requirements (dependency) | Plans/dependency-linking/requirements.md |
| Backend routes | Source/Backend/src/routes/ (4 files: workItems, workflow, dashboard, intake) |
| Store (in-memory DB) | Source/Backend/src/store/workItemStore.ts |
| Metrics | Source/Backend/src/metrics.ts |
| Logger (shim) | Source/Backend/src/logger.ts |
| Logger (impl) | Source/Backend/src/utils/logger.ts |
| Shared types | Source/Shared/types/workflow.ts |
| Backend tests | Source/Backend/tests/routes/ + tests/services/ + tests/store/ |
| Frontend tests | Source/Frontend/tests/ + tests/components/ + tests/pages/ |

### Known Issues (Open)

1. **FR-dependency-search**: `GET /api/search` route NOT in app.ts — 5 tests failing in `tests/routes/search.test.ts`
2. **dependencyCheckDuration histogram**: Missing from Source/Backend/src/metrics.ts (3 of 4 dep metrics present)
3. **Logger**: No LOG_LEVEL filtering, no NODE_ENV pretty-print switch
4. **Duplicate test files**: WorkItemDetailPage and WorkItemListPage each have test files in both `tests/` and `tests/pages/`
5. **No service layer for CRUD**: Route handlers call workItemStore directly (arch rule violation)

### Pattern Violations Found

- `workItemStore.ts` imports logger from `'../utils/logger'` directly; all other files use `'../logger'` (the shim)
- Two `eslint-disable react-hooks/exhaustive-deps` without justification comments in DependencyPicker.tsx and useWorkItems.ts
- Prometheus metric label names deviate from spec (e.g., `action` instead of `operation, item_type`)

### Plans with Stale Portal Paths

- `Plans/dependency-linking/requirements.md` Implementation Delta table references `portal/` paths but the implementation is in `Source/`. Status column is unreliable.
