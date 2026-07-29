# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Learnings

### 2026-07-29 — First full audit

#### Project structure (critical to understand)

This repo has **three distinct applications**, each with its own source tree:

| Directory | Application | Spec | FR namespace |
|-----------|-------------|------|--------------|
| `Source/` | Workflow Engine | `Specifications/workflow-engine.md` | `FR-WF-001` – `FR-WF-013` |
| `portal/` | Dev Workflow Platform | `Specifications/dev-workflow-platform.md` | `FR-001` – `FR-095+` |
| `platform/orchestrator/` | Orchestrator / Tiered Merge Pipeline | `Specifications/tiered-merge-pipeline.md` | `FR-TMP-001` – `FR-TMP-010` |

**The traceability enforcer (`tools/traceability-enforcer.py`) ONLY scans `Source/` and `E2E/`.** Portal and platform are completely invisible to it. Running the enforcer against `Plans/dev-workflow-platform/requirements.md` or `Plans/tiered-merge-pipeline/dispatch-plan.md` will always fail even though those apps are fully implemented.

#### Traceability enforcer auto-select behavior

The enforcer auto-selects the **most recently modified** `requirements.md` under `Plans/`. As of this audit that is `Plans/self-judging-workflow/requirements.md` (FR-WF-*). Run with `--file` to target a specific plan.

#### Active implementation gap (confirmed failing test)

`Source/Backend/tests/routes/search.test.ts` explicitly documents that `GET /api/search` is **not wired** into `Source/Backend/src/app.ts`. The test file itself says it "will FAIL until the route is implemented." This is the only concrete failing-test / unimplemented-endpoint gap found in `Source/`.

#### Architecture pattern: route-to-store coupling in Source/

Routes in `Source/Backend/src/routes/workItems.ts`, `workflow.ts`, and `intake.ts` call `store.*` methods directly — bypassing the service layer. This violates the CLAUDE.md rule "No direct DB calls from route handlers — use the service layer." Services like `assessment.ts`, `router.ts`, and `dependency.ts` exist and show the correct pattern; the route files themselves have not been refactored.

#### Logger dev/prod mode

`Source/Backend/src/utils/logger.ts` always writes JSON (no pretty-print in development). CLAUDE.md + FR-003 require pretty-printing in dev. There is also a second logger compatibility shim at `Source/Backend/src/logger.ts`.

#### Fast-path for future audits

- Source/ traceability: `python3 tools/traceability-enforcer.py` (covers FR-WF-*)
- Portal traceability: `grep -rn "Verifies:" portal/ | grep -oP "FR-[\w-]+"` (manual)
- Platform traceability: `grep -rn "Verifies:" platform/ | grep -oP "FR-TMP-\d+"` (manual)
- Spec coverage per app: check if each FR-XXX in each spec file has at least one `Verifies: FR-XXX` comment in the corresponding source tree

#### Spec coverage trend

- `FR-WF-*` (Source): 100% (13/13) — enforcer-confirmed
- `FR-001` to `FR-069` (portal): ~100% — 1073 Verifies comments, FR-001 through FR-095 present
- `FR-TMP-*` (platform): ~80% — FR-TMP-001/002/003/004/007/009/010 confirmed; FR-TMP-005/006/008 not spot-checked; no enforcer coverage
- `FR-dependency-*` (portal): 100% — confirmed in portal/Backend/src/metrics.ts, dependencyService.ts, routes
