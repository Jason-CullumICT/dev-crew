# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Audit: 2026-08-04 (Full Audit)

#### Project Structure

This repo contains **two separate product codebases** plus infrastructure:
- **`Source/`** — Self-judging workflow engine (in-memory, work items + dependency tracking)
- **`portal/`** — Dev-workflow-platform (SQLite, full feature-request/bug/cycle lifecycle)
- **`platform/`** — Orchestrator infrastructure (Docker, pipeline server, tiered-merge)

The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`. It is **blind to `portal/` and `platform/`**. Running it without `--file` gives non-deterministic results when all requirements.md files share the same mtime (which they do in this repo).

#### Spec / Plan Mapping

| Specification | Implemented In | Plan FR IDs |
|---|---|---|
| `Specifications/workflow-engine.md` | `Source/` | FR-WF-001 to FR-WF-013 |
| `Specifications/dev-workflow-platform.md` | `portal/` | FR-001 to FR-069, FR-dependency-* |
| `Specifications/tiered-merge-pipeline.md` | `platform/` | FR-TMP-001 to FR-TMP-010 |

The `Plans/dependency-linking/requirements.md` was repurposed — it describes `portal/` paths (portal/Backend, portal/Frontend) but the self-judging workflow engine (`Source/`) also independently implements dependency tracking using `FR-dependency-*` IDs.

#### Open Implementation Gaps (as of 2026-08-04)

1. **`GET /api/search` not wired** — `Source/Backend/src/app.ts` does not register the search route. `Source/Backend/tests/routes/search.test.ts` explicitly notes this gap. 5 tests fail.
2. **`dependencyCheckDuration` histogram missing** — `Source/Backend/src/metrics.ts` has 3 of 4 required FR-dependency-metrics (missing the Histogram). 
3. **`FR-TMP-008` untraced** — No `// Verifies: FR-TMP-008` anywhere in `platform/`.
4. **LOG_LEVEL not respected** — `Source/Backend/src/utils/logger.ts` emits all levels unconditionally; no production/development mode switching.

#### Useful Quick-Access Paths

- **Backend app wiring**: `Source/Backend/src/app.ts` — all route registrations here
- **Backend metrics**: `Source/Backend/src/metrics.ts`
- **Shared types**: `Source/Shared/types/workflow.ts`
- **Traceability enforcer**: `tools/traceability-enforcer.py` — targets most-recently-modified requirements.md by default
- **Test runner**: `cd Source/Backend && npm install && npx jest`
- **Search test (intentional failures)**: `Source/Backend/tests/routes/search.test.ts`
- **Prior drift report**: `spec-drift-report.json` (stale — treated FR-WF-* as "unresolved legacy IDs")

#### Pattern Notes

- No `console.log` in production source anywhere — enforcer would catch it via structured logger
- No hardcoded secrets found anywhere in Source/
- All list endpoints correctly return `{data: T[]}` wrappers in Source/Backend
- Frontend source: all production `.tsx/.ts` files have `// Verifies:` comments
- Two logger files: `src/logger.ts` (compat shim) → `src/utils/logger.ts` (real impl). Routes use `src/logger.ts`, store uses `src/utils/logger.ts`. Both are correct — shim wraps real impl.
- `eslint-disable-next-line react-hooks/exhaustive-deps` used twice in Frontend — acceptable, but documented

#### Spec Coverage Trend

| First audit 2026-08-04 |
- Source/ FR-WF-*: 100% (13/13)
- Source/ FR-dependency-*: 93.75% (15/16 — search endpoint not wired)
- platform/ FR-TMP-*: 90% (9/10 — FR-TMP-008 untraced)
- portal/ FR-*: not measured by enforcer scope
