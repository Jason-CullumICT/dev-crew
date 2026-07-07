# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### 2026-07-07 — First full audit of Source/ (Self-Judging Workflow Engine)

**Spec layout:**
- `Source/` implements the **Self-Judging Workflow Engine** (`Specifications/workflow-engine.md`, FR-WF-001–013) plus the **Dependency-Linking** feature (`Plans/dependency-linking/requirements.md`, FR-dependency-*).
- `Specifications/dev-workflow-platform.md` (FR-001–069) and `Specifications/tiered-merge-pipeline.md` (FR-TMP-001–010) target the **`portal/`** codebase, not `Source/`. Do not flag these as gaps in `Source/` — they are in-scope for a different codebase.

**Traceability enforcer scope:**
- `python3 tools/traceability-enforcer.py` only scans `Plans/self-judging-workflow/requirements.md` (13 FR-WF-* IDs).
- FR-dependency-* requirements (13 items) are entirely outside enforcer scope — it reports PASSED regardless of dependency feature defects.
- To fix: extend enforcer to also target `Plans/dependency-linking/requirements.md`.

**Fast-path file locations for future audits:**
- Shared types: `Source/Shared/types/workflow.ts` — enum definitions, VALID_STATUS_TRANSITIONS
- Backend routes: `Source/Backend/src/routes/` — workItems.ts, workflow.ts, dashboard.ts, intake.ts
- Backend services: `Source/Backend/src/services/` — dependency.ts, assessment.ts, router.ts
- Backend metrics: `Source/Backend/src/metrics.ts` — all Prometheus counters/histograms
- Frontend components: `Source/Frontend/src/components/` — BlockedBadge, DependencySection, DependencyPicker
- App entry: `Source/Backend/src/app.ts` — route registration (check here for missing wiring)
- API contracts doc: `Source/Shared/api-contracts.md` — the canonical REST contract

**Known open defects (as of 2026-07-07):**
| ID | Severity | Title |
|----|----------|-------|
| QO-001 | P1 | `GET /api/search` route exists in tests but NOT registered in `Source/Backend/src/app.ts` |
| QO-002 | P2 | `pending_dependencies` WorkItemStatus missing from enum; dispatch returns 400 instead of 200+status |
| QO-003 | P2 | `BlockedBadge` missing amber state for `status='pending_dependencies'` |
| QO-004 | P2 | `dependencyCheckDuration` histogram absent from metrics.ts (FR-dependency-metrics requires 4) |
| QO-005 | P3 | Dual logger: `utils/logger.ts` + `logger.ts` compat shim; no dev pretty-printing |
| QO-006 | P3 | Traceability enforcer blind to FR-dependency-* requirements |
| QO-007 | P3 | `eslint-disable-next-line react-hooks/exhaustive-deps` in useWorkItems.ts without rationale |

**Coverage trend:** First measurement — 88% in-scope coverage (13/13 FR-WF + 10/13 FR-dependency).

**Pattern violations found:**
- Dual logger abstractions created by independent coders working without coordination (classic multi-agent seam failure)
- Endpoint implemented and tested but not wired into app — test proves intent but the gate doesn't catch the registration gap

**Useful negative results:**
- No `console.log` / `console.error` in production source (logger abstraction working correctly)
- No empty catch blocks (`catch () {}`)
- No hardcoded secrets or URLs found
- No files over 500 lines in Source/Backend
- 123 traceability comments in backend tests — good density
