# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Audit Run: 2026-08-05

### Project Layout Insight

This repo contains TWO distinct applications that share the `Source/` directory:

1. **Workflow Engine** (`Source/`) — In-memory WorkItem system traced to `Plans/self-judging-workflow/requirements.md` (FR-WF-001 to FR-WF-013) and dependency extensions (FR-dependency-*).
2. **Dev Workflow Platform** — SQLite-backed FeatureRequest/Bug/Cycle system described in `Specifications/dev-workflow-platform.md`. This is implemented in the **`portal/`** directory (not `Source/`), so its FRs are irrelevant to a Source/-scoped audit.
3. **Tiered Merge Pipeline** (`Specifications/tiered-merge-pipeline.md`) — Orchestrator-layer features implemented in **`platform/`**, not `Source/`.

The `inspector.config.yml` scopes to `source.dirs: ["Source/"]`. The Specifications/ docs for the platform and pipeline target `portal/` and `platform/` respectively — do **not** flag them as unimplemented in Source/ scope.

### Traceability Enforcer Behavior

- The enforcer auto-selects `Plans/self-judging-workflow/requirements.md` (most recently modified).
- It covers 13 FR-WF-* IDs. All 13 pass.
- It does **not** scan Specifications/ directly — only Plans/.
- FR-dependency-* IDs are covered because they appear in Source/ files that the enforcer scans.

### Key File Paths for Fast Re-Audit

| Purpose | Path |
|---------|------|
| Shared types (single source of truth) | `Source/Shared/types/workflow.ts` |
| Backend routes | `Source/Backend/src/routes/` |
| Backend services | `Source/Backend/src/services/` |
| Metrics registry | `Source/Backend/src/metrics.ts` |
| App registration | `Source/Backend/src/app.ts` |
| Plans requirements | `Plans/self-judging-workflow/requirements.md` |

### Known Open Issues (as of 2026-08-05)

| ID | Severity | Description |
|----|----------|-------------|
| QO-001 | P1 | `GET /api/search` route documented in search.test.ts but NOT registered in app.ts — DependencyPicker typeahead non-functional |
| QO-002 | P2 | `pending_dependencies` WorkItemStatus absent — spec requires status-machine entry, impl uses boolean flag workaround |
| QO-003 | P2 | `dependencyCheckDuration` histogram missing from metrics.ts — FR-dependency-metrics requires 4 metrics, 3 implemented |
| QO-004 | P2 | Traceability enforcer scopes to Plans/ only — Specifications/ FR IDs never validated |
| QO-005 | P3 | `eslint-disable-next-line react-hooks/exhaustive-deps` in useWorkItems.ts:63 and DependencyPicker.tsx:82 |
| QO-006 | P3 | `.catch(() => ({}))` in api/client.ts:26 silently swallows JSON parse errors |
| QO-007 | P3 | DebugPortalPage.tsx Verifies comment is not a valid FR-XXX ID |

### Patterns Found

- All backend source files have `// Verifies: FR-XXX` at file header level — good hygiene.
- All frontend source files (non-test) have Verifies comments — good hygiene.
- Test files are well-covered with inline Verifies comments.
- No `console.log` in production source — logger abstraction is correctly used throughout.
- No hardcoded secrets found.
- No empty catch blocks in backend (all catch blocks log and re-throw or return structured error).
- The `.catch(() => ({}))` pattern in the frontend API client is the only silent swallow.
- Duplicate test file locations: WorkItemDetailPage and WorkItemListPage have tests in both `tests/` and `tests/pages/` — these appear to be intentional (different test scenarios).
