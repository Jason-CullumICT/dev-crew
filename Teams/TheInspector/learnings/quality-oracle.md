# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Run History

### 2026-06-26 — First Full Audit

**Project:** dev-crew (workflow engine + dev-workflow-platform portal + tiered-merge pipeline)

**Grade: B** | P1: 0 | P2: 3 | P3: 3 | P4: 2

---

## Architecture Map (Critical for Fast Re-Audits)

The project has THREE distinct implementation areas — the `inspector.config.yml` only covers `Source/`:

| Implementation area | Spec it implements | FR ID namespace | Test location |
|--------------------|--------------------|-----------------|---------------|
| `Source/` | `workflow-engine.md` via `Plans/self-judging-workflow/requirements.md` | `FR-WF-001` to `FR-WF-013`, `FR-dependency-*` | `Source/Backend/tests/`, `Source/Frontend/tests/` |
| `portal/` | `dev-workflow-platform.md` via `Plans/dev-workflow-platform`, `Plans/orchestrated-dev-cycles`, `Plans/dev-cycle-traceability`, `Plans/image-upload`, `Plans/orchestrator-cycle-dashboard`, `Plans/dependency-linking`, `Plans/duplicate-deprecated-status` | `FR-001` to `FR-095` | `portal/Backend/tests/` (480 Verifies, 15 files) |
| `platform/orchestrator/` | `tiered-merge-pipeline.md` | `FR-TMP-001` to `FR-TMP-010` | `platform/orchestrator/lib/workflow-engine.test.js` |

## Spec Coverage Trend

| Run | Enforcer result | Actual FR count | Enforcer scope |
|-----|-----------------|-----------------|----------------|
| 2026-06-26 | PASSED (13/13) | ~120+ defined FRs | 13 FR-WF-* only (11%) |

**The enforcer passes green but only checks 11% of all requirements.** This is the biggest quality risk.

## Known Open Issues (by priority)

### P2 — Active

**QO-001 (enforcer scope gap):** `tools/traceability-enforcer.py` uses "most recently modified requirements.md" as its target, currently pinned to `Plans/self-judging-workflow/requirements.md`. Seven other plan files (FR-001 to FR-095) and `platform/` (FR-TMP-*) are NEVER checked. Fix: add `--all-plans` mode or configure enforcer to scan all plans + portal/ + platform/.

**QO-002 (portal route/DB coupling):** All 9 portal route files call `getDb()` in the route handler and pass `db` to service functions. This is a dependency-injection variant but violates the architecture rule "no direct DB calls from route handlers." Services should call `getDb()` internally; routes should not touch the DB layer at all. Systemic across: `bugs.ts`, `cycles.ts`, `featureRequests.ts`, `features.ts`, `learnings.ts`, `pipelines.ts`, `search.ts`, `teamDispatches.ts`, `dashboard.ts`.

**QO-003 (unspecified FR-090 to FR-095):** Portal Frontend implements FR-090 (orchestrator types/API client), FR-091 to FR-095 (RunsTab, RunDetailRow components) with `// Verifies:` comments, but no `Plans/*/requirements.md` defines these IDs. The closest is `Plans/orchestrator-cycle-dashboard/requirements.md` which only goes to FR-076. A requirements.md for the orchestrator run detail UI is missing.

### P3 — Active

**QO-004 (FR-ID collision):** `Plans/orchestrator-cycle-dashboard/requirements.md` and `Plans/image-upload/requirements.md` both define FR-070 through FR-076 for completely different features. Makes any `// Verifies: FR-070` comment ambiguous. Portal Verifies comments for FR-070 to FR-076 are overloaded.

**QO-005 (FR-TMP-008 untraced):** `tiered-merge-pipeline.md` FR-TMP-008 (Worker Container Prerequisites: `gh` CLI in Dockerfile.worker, Playwright installable on demand) has no `// Verifies: FR-TMP-008` in `platform/`. All other FR-TMP-* IDs are covered.

**QO-006 (inspector.config.yml source scope):** Config declares `source.dirs: ["Source/"]` but the main production app is `portal/`. The inspector mis-scopes static analysis to the smaller workflow-engine component. Should add `portal/` to `source.dirs` and `portal/Backend/tests/` to `test_dirs`.

### P4 — Technical Debt

**QO-007 (eslint-disable in production):**
- `Source/Frontend/src/components/DependencyPicker.tsx:82` — `eslint-disable-next-line react-hooks/exhaustive-deps`
- `Source/Frontend/src/hooks/useWorkItems.ts:63` — `eslint-disable-next-line react-hooks/exhaustive-deps`

**QO-008 (oversized service files in portal):**
- `portal/Backend/src/services/cycleService.ts` — 526 lines (threshold 500)
- `portal/Backend/src/services/featureRequestService.ts` — 506 lines (threshold 500)

## Useful File Paths for Fast Re-Audits

- Spec files: `Specifications/dev-workflow-platform.md`, `Specifications/workflow-engine.md`, `Specifications/tiered-merge-pipeline.md`
- All plan requirements: `Plans/*/requirements.md` (8 files total)
- Enforcer target: `Plans/self-judging-workflow/requirements.md` (auto-selected as most recent)
- Portal route violations: `portal/Backend/src/routes/*.ts` (9 files, all call `getDb()`)
- Platform FR-TMP coverage: `platform/orchestrator/lib/workflow-engine.js`, `platform/orchestrator/lib/dispatch.js`, `platform/orchestrator/lib/config.js`
- FR-090 to FR-095 in portal: `portal/Frontend/src/components/orchestrator/types.ts`, `portal/Frontend/src/components/orchestrator/RunsTab.tsx`, `portal/Frontend/src/components/orchestrator/RunDetailRow.tsx`, `portal/Frontend/src/api/client.ts`

## Common Pattern Violations Found

1. **Portal routes bypass service abstraction for DB connection** — DI pattern (routes call `getDb()` and pass to service) rather than services owning their own connection
2. **Enforcer auto-selects one plan only** — in multi-plan repos the enforcer must be run with an explicit `--file` or against all plans
3. **FR ID namespaces collide** when multiple plans start numbering from the same base (FR-070 used by both image-upload and orchestrator-cycle-dashboard)
4. **Unregistered requirements** — FR-090 to FR-095 implemented but no spec entry

## No Violations Found

- No `console.log` in production source code (`Source/` or `portal/`)
- No hardcoded credentials/secrets
- No empty catch blocks (all log and respond with structured errors)
- No skipped/TODO tests
- All catch blocks use `logger.error` before responding — no silent error swallowing
- `Source/` architecture is clean: no direct DB calls, proper service layer, full traceability
