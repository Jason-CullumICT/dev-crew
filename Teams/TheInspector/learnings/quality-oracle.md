# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

---

## Run: 2026-06-12 — Full Audit

### Spec Coverage Trend
- Enforcer-visible scope (FR-WF-001 — FR-WF-013): **100%** (13/13)
- FR-dependency-* scope: **~87%** (14/16 — seed and histogram missing)
- Tiered-merge-pipeline scope (FR-TMP-001 — FR-TMP-010): **0%** (unstarted)
- Overall (Source/ scope): **~69%** (27/39 trackable FRs)

### Key Architectural Insight — Two Products, One Repo

The repo contains **two separate product codebases**:

| Path | Spec | FR namespace |
|------|------|-------------|
| `Source/` | `Specifications/workflow-engine.md` | `FR-WF-*`, `FR-dependency-*` |
| `portal/` | `Specifications/dev-workflow-platform.md` | `FR-001` — `FR-069` |

The traceability enforcer (`tools/traceability-enforcer.py`) and inspector config only target `Source/`. Portal coverage is separately tracked in `portal/`. This is correct for the inspector's scope but the `Specifications/` directory contains specs for both, so surface-level FR-001..FR-069 coverage will always appear as 0% in Source/ scans — **this is expected**.

### Traceability Enforcer Limitation
- The enforcer uses `FR-\d+` regex, which does NOT match `FR-dependency-*` IDs. These are only picked up because the enforcer targets the whole file text, not just IDs. The 100% pass is technically correct for the 13 `FR-WF-*` IDs but silently ignores all `FR-dependency-*` identifiers.
- To check dependency traceability, grep for `FR-dependency-` separately.

### Open Findings (P2+)

| ID | Finding | Status |
|----|---------|--------|
| QO-001 | `GET /api/search` not in `app.ts` — FR-dependency-search gap | OPEN |
| QO-002 | `dependencyCheckDuration` Histogram missing from `metrics.ts` | OPEN |
| QO-003 | Direct store calls from route handlers violates service-layer rule | OPEN |
| QO-004 | `tiered-merge-pipeline.md` spec entirely unimplemented in Source/ | OPEN (deferred) |

### Useful File Paths for Future Audits
- Traceability enforcer: `tools/traceability-enforcer.py`
- Inspector config: `Teams/TheInspector/inspector.config.yml`
- Workflow engine spec: `Specifications/workflow-engine.md`
- FR-WF requirements: `Plans/self-judging-workflow/requirements.md`
- Source backend routes: `Source/Backend/src/routes/`
- Source backend metrics: `Source/Backend/src/metrics.ts`
- Source backend app entrypoint: `Source/Backend/src/app.ts`
- Shared types: `Source/Shared/types/workflow.ts`
- Search test (documents missing impl): `Source/Backend/tests/routes/search.test.ts`

### Pattern Violations Found
- No `console.log` in production code (clean)
- Two eslint-disable comments in production frontend (minor)
- Duplicate logger: `src/logger.ts` wraps `src/utils/logger.ts` (technical debt)
- `playwright.pipeline.config.ts` has hardcoded cycle-run testDir pointing to a specific past run artifact

### Test Environment Note
The backend test suite uses Jest (not Vitest), configured in `jest.config.js`. In CI static-analysis environments where `node_modules` is empty, tests cannot be executed. Always run `npm install` in `Source/Backend/` before running test gates.
