# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Audit Run: 2026-05-25

### Codebase Architecture (Critical to understand before auditing)

This project has a **split implementation**. Code does not all live in `Source/`:

| Directory | What lives here | FR coverage |
|-----------|----------------|-------------|
| `Source/Backend/` + `Source/Frontend/` | **Self-Judging Workflow Engine** — in-memory WorkItem workflow, assessment pod, dependency linking | FR-WF-001 to FR-WF-013, FR-dependency-* |
| `portal/Backend/` + `portal/Frontend/` | **Dev Workflow Platform** — full lifecycle: FRs, bugs, cycles, pipeline orchestration, image uploads, duplicate tracking | FR-001 to FR-069, FR-070-095, FR-DUP-01-13 |
| `platform/orchestrator/` | **Orchestration infrastructure** — workflow engine JS, merge pipeline | FR-TMP-001 to FR-TMP-010 |

**If the enforcer reports a "missing" FR and you don't find it in Source/, check portal/ and platform/ before declaring it unimplemented.**

### Traceability Enforcer Limitations (P1)

The enforcer at `tools/traceability-enforcer.py` has two fundamental gaps:

1. **Scan scope**: It only scans `Source/` and `E2E/` directories. The `portal/` codebase (which implements ~80% of product FRs) is invisible to it.
2. **Plan selection**: It checks only the most-recently-modified `requirements.md`. 8 plans exist; only 1 is enforced per run.

Running `python3 tools/traceability-enforcer.py` with no arguments shows "TRACEABILITY PASSED" for FR-WF-* (the self-judging-workflow plan) while completely ignoring FR-001 through FR-069 and all FR-DUP-* and FR-TMP-* requirements.

**Workaround**: Run `--plan <name>` for each plan; mentally adjust for portal/ scan gap.

### Architecture Patterns

- **Source/ routes call store directly** — `workItems.ts`, `workflow.ts`, `intake.ts` all do `import * as store` and call `store.findById()` etc. directly. This violates the architecture rule "No direct DB calls from route handlers". The service layer (assessment.ts, router.ts, dependency.ts, changeHistory.ts, dashboard.ts) is only used for domain operations, not CRUD. This is a known P2 violation.

- **Dual logger pattern** — `Source/Backend/src/logger.ts` wraps `src/utils/logger.ts` to provide a default export for compatibility. This is intentional, not a defect.

- **In-memory store is the "DB"** — No SQLite in Source/; persistence is in-memory with file backup. The portal/ backend uses SQLite (better-sqlite3).

### FR ID Naming Confusion

- `FR-0002`, `FR-0003`, `FR-0004`, `FR-0005`, `FR-0007` appearing in `Plans/dependency-linking/requirements.md` are **Feature Request entity IDs** in the seed data spec, not functional requirement IDs. The enforcer mistakenly treats them as requirement IDs to verify, producing false positives.
- `FR-XXX`, `FR-XXXX`, `FR-0XX` in multiple requirements files are **template placeholders** that should be removed.

### Truly Unimplemented Requirements (as of 2026-05-25)

| FR ID | Description | Plan | Status |
|-------|-------------|------|--------|
| FR-dependency-seed | Create `portal/Backend/src/database/seed.ts` for idempotent seeding of known dependency relationships | dependency-linking | **NOT IMPLEMENTED** — no seed.ts file, no traceability comment anywhere |

### Spec Coverage Gaps

FR-070 through FR-095 and FR-DUP-01 through FR-DUP-13 appear in `Plans/` and are implemented in `portal/`, but are **NOT defined in `Specifications/`** (the canonical domain truth). The spec documents lag behind implementation by ~30 requirement IDs.

### Fast-Path File Locations for Future Audits

- Main workflow spec: `Specifications/dev-workflow-platform.md`
- Workflow engine spec: `Specifications/workflow-engine.md`
- Merge pipeline spec: `Specifications/tiered-merge-pipeline.md`
- Source/ types: `Source/Shared/types/workflow.ts`
- Portal types: `portal/Shared/types.ts`, `portal/Shared/api.ts`
- Plans with requirements.md: dependency-linking, dev-cycle-traceability, dev-workflow-platform, duplicate-deprecated-status, image-upload, orchestrated-dev-cycles, orchestrator-cycle-dashboard, self-judging-workflow
- Portal backend routes: `portal/Backend/src/routes/`
- Portal backend services: `portal/Backend/src/services/`
