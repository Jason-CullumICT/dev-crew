# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-10-19

### Architecture Discovery: Two-System Split

This repo is **two products**, not one:

| Spec file | Implementation target | FR namespace |
|---|---|---|
| `Specifications/workflow-engine.md` | `Source/` | FR-WF-001 to FR-WF-013 |
| `Specifications/dev-workflow-platform.md` | `portal/` | FR-001 to FR-069 |
| `Specifications/tiered-merge-pipeline.md` | `platform/orchestrator/` | FR-TMP-001 to FR-TMP-010 |

- `Source/` — the self-judging workflow engine (in-memory store, Express, React)
- `portal/` — the dev-workflow-platform app (SQLite, feature requests, bugs, cycles, pipeline runs)
- `platform/` — orchestrator infrastructure (Docker, pipeline server, auto-PR, E2E runner)

The traceability enforcer only checks `Plans/*/requirements.md` → `Source/` and `E2E/`. It **does not** scan `Specifications/` or `portal/` or `platform/`.

### Traceability Enforcer Scope

- Entry point: `tools/traceability-enforcer.py`
- Auto-picks most-recently-modified `Plans/*/requirements.md`
- Scans only `Source/` and `E2E/` for `// Verifies:` comments
- **Does NOT scan**: `portal/`, `platform/`, `Specifications/`
- Active plans: `Plans/self-judging-workflow/requirements.md` (13 FR-WF-*) and `Plans/dependency-linking/requirements.md` (15 FR-dependency-*)

### Spec Coverage Trend (first audit)

- Active plan (Source/): **100%** — fully traced
- dev-workflow-platform (portal/): unknown — enforcer doesn't scan portal/
- tiered-merge-pipeline (platform/): FR-TMP-001 through FR-TMP-010 covered in platform/orchestrator (all except FR-TMP-008 which targets Dockerfile)

### Useful File Paths for Future Audits

| Purpose | Path |
|---|---|
| Active plan (Source/) | `Plans/self-judging-workflow/requirements.md` |
| Dependency plan (Source/) | `Plans/dependency-linking/requirements.md` |
| Platform workflow engine impl | `platform/orchestrator/lib/workflow-engine.js` |
| Platform dispatch impl | `platform/orchestrator/lib/dispatch.js` |
| Platform tests (FR-TMP-*) | `platform/orchestrator/lib/workflow-engine.test.js` |
| Shared types for Source/ | `Source/Shared/types/workflow.ts` |
| Backend app entry | `Source/Backend/src/app.ts` |
| Backend metrics | `Source/Backend/src/metrics.ts` |

### Known Issues (OPEN as of 2026-10-19)

| ID | Status | Summary |
|---|---|---|
| QO-001 | OPEN | Enforcer blind to Specifications/ — add multi-spec mode |
| QO-002 | OPEN | System split (Source/ vs portal/) not documented anywhere |
| QO-003 | OPEN | Duplicate test files: tests/ and tests/pages/ for WorkItemDetailPage + WorkItemListPage |
| QO-004 | OPEN | 2 eslint-disable react-hooks/exhaustive-deps in DependencyPicker.tsx and useWorkItems.ts |
| QO-005 | OPEN | FR-TMP-008 has no Verifies comment in platform/ Dockerfile |
| QO-006 | OPEN (low) | Silent .catch() in api/client.ts error path — documented but borderline |

### Pattern Notes

- All production source files in `Source/` have `// Verifies:` comments — good hygiene
- Zero `console.log` violations in production source
- Zero hardcoded secrets
- Zero files over 500 lines
- Zero skipped/todo tests
- The `catch () {}` in DependencyPicker.tsx is intentionally documented (search errors → empty results)
