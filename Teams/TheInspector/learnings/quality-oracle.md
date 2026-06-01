# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-06-01 — First full audit of Source/ (self-judging workflow engine)

#### Spec Coverage Trend
- **Self-judging workflow FRs (FR-WF-001—013):** 100% traced, enforcer passes
- **Dependency FRs (FR-dependency-*):** ~88% (search endpoint unimplemented, histogram missing, pending_dependencies absent from enum)
- **Combined estimate:** ~93%

#### Key Architecture Facts (for faster future audits)
- **Active enforcer target:** `Plans/self-judging-workflow/requirements.md` (most-recently-modified wins) — always check if newer requirements.md files exist
- **Specs that apply to Source/:** `Specifications/workflow-engine.md` + `Plans/self-judging-workflow/requirements.md` + `Plans/dependency-linking/requirements.md`
- **Specs NOT in scope for Source/:** `Specifications/dev-workflow-platform.md` (portal/ app), `Specifications/tiered-merge-pipeline.md` (platform/ orchestrator)
- **Two logger abstractions:** `Source/Backend/src/utils/logger.ts` (raw structured logger, named export) and `Source/Backend/src/logger.ts` (compat shim wrapping utils/logger, default export). Only `workItemStore.ts` uses the raw one directly — all routes/services use the shim.
- **In-memory store:** No database. `workItemStore.ts` uses a `Map<string, WorkItem>` — all persistence is in-process. Restart = data loss by design.

#### Known Open Gaps (as of this audit)
| ID | FR | Gap | Severity |
|----|-----|-----|---------|
| QO-001 | FR-dependency-search | `GET /api/search` not mounted in app.ts — 5 tests will fail | P1 |
| QO-002 | FR-dependency-metrics | `dependencyCheckDuration` histogram missing from metrics.ts | P2 |
| QO-003 | FR-dependency-dispatch-gating | `pending_dependencies` WorkItemStatus value absent; dispatch returns 400 instead of setting to pending state | P2 |
| QO-004 | arch rule | No OpenTelemetry tracing anywhere in Source/ | P2 |
| QO-005 | arch rule | Traceability enforcer checks only one requirements.md at a time | P2 |

#### Common Pattern Violations
- Silent `.catch(() => ({}))` in frontend API client (client.ts:26) — needs suppression comment
- `eslint-disable-next-line react-hooks/exhaustive-deps` in useWorkItems.ts and DependencyPicker.tsx — undocumented

#### Useful File Paths for Future Audits
- Metrics: `Source/Backend/src/metrics.ts` — all Prometheus counters/histograms
- Shared types: `Source/Shared/types/workflow.ts` — enums, status transitions, dependency types
- App wiring: `Source/Backend/src/app.ts` — all route mounts (check for missing routes here first)
- Traceability enforcer: `tools/traceability-enforcer.py` — run with `--file Plans/<name>/requirements.md` for specific plans
- Test files: `Source/Backend/tests/routes/` and `Source/Backend/tests/services/`
- Frontend tests: `Source/Frontend/tests/` (pages + components subdirs)

#### Enforcer Invocations That Surface Gaps
```bash
# Default (self-judging-workflow — PASSES)
python3 tools/traceability-enforcer.py

# Dependency-linking (7 untraced IDs from portal cross-references — FAILS)
python3 tools/traceability-enforcer.py --file Plans/dependency-linking/requirements.md
```
