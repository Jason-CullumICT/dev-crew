# Quality Oracle Learnings

_Persistent learnings for the quality oracle agent. Updated after each audit run._

## Learnings

### Architecture (2026-07-26)

- **Two logger abstractions exist**: `Source/Backend/src/logger.ts` (compat wrapper) and `Source/Backend/src/utils/logger.ts` (canonical). Route/service files import from `../logger` (the wrapper). Future coders should import `logger` default from `../logger`, which re-exports `utils/logger` — do not import directly from `utils/logger`.
- **Route handlers bypass the service layer for CRUD**: `workItems.ts` and `workflow.ts` call `store.*` directly. Only `dashboardService` follows the full service → route pattern. This violates the "no direct DB calls from route handlers" architecture rule, and is a systemic pattern.
- **In-memory store (`workItemStore.ts`) IS the data layer**: There is no SQLite DB in `Source/`. The "DB" rule applies to this in-memory store. The `store/` module is the persistence boundary.

### Traceability System (2026-07-26)

- **Traceability enforcer only checks the most-recently-modified `requirements.md`** in `Plans/`. As of this run it targets `Plans/self-judging-workflow/requirements.md` (13 FRs). It does NOT enforce `Specifications/dev-workflow-platform.md` (FR-001 to FR-069, portal/ app), `Specifications/tiered-merge-pipeline.md` (FR-TMP-001 to FR-TMP-010), or `Plans/dependency-linking/requirements.md` (FR-dependency-*).
- **`Plans/dependency-linking/requirements.md` contains portal/ FR IDs** (FR-0002, FR-0004, etc.) which reference the portal app's items by number. Running the enforcer against this file produces false failures for those IDs — they're not `Source/` requirements.
- **Tiered merge pipeline spec (FR-TMP-*) is orchestrator/platform/ scope**, not Source/. Do not expect `// Verifies: FR-TMP-*` comments in `Source/`.

### Spec Gaps (2026-07-26)

- **`pending_dependencies` status is contractually defined** in `Source/Shared/api-contracts.md` (line 181-182) and in `Specifications/dev-workflow-platform.md` but is **absent from `WorkItemStatus` enum** in `Source/Shared/types/workflow.ts`. The dispatch-gating code blocks dispatch with a 400 error instead of transitioning to `pending_dependencies`.
- **`GET /api/search?q=` route is not wired in `app.ts`**: The `searchItems()` client function and `search.test.ts` both exist and are complete. Only the route registration is missing. The test file explicitly documents this as intentional (failing tests). Fix: add a `searchRouter` and mount at `/api/search`.
- **`BlockedBadge` component** is missing the amber `"Pending Dependencies"` state specified in FR-dependency-blocked-badge. The component only renders the red "Blocked" badge. The `status` prop is absent entirely.

### Useful File Paths (2026-07-26)

| File | Notes |
|------|-------|
| `Source/Shared/types/workflow.ts` | Canonical domain types + VALID_STATUS_TRANSITIONS |
| `Source/Shared/api-contracts.md` | Full API contract including pending_dependencies state machine |
| `Source/Backend/src/app.ts` | Route registration — check here for missing routes |
| `Source/Backend/src/store/workItemStore.ts` | In-memory data store (the "DB" for Source/) |
| `Source/Backend/src/services/dependency.ts` | Dependency service: addDependency, removeDependency, setDependencies, onItemResolved |
| `Source/Backend/tests/routes/search.test.ts` | Documents expected search contract; tests intentionally fail until route wired |
| `Plans/dependency-linking/requirements.md` | Has an "Implementation Delta" table showing what was done/missing at time of writing |
| `tools/traceability-enforcer.py` | Only checks most-recently-modified Plan requirements.md — run with `--file` flag to target specific specs |

### Spec Coverage Trend

| Run | Date | Coverage | P1 | P2 | Grade |
|-----|------|----------|----|----|-------|
| 1 | 2026-07-26 | ~94% (Source/ scope) | 1 | 4 | C |
