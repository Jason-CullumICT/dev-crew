# Requirements Reviewer Learnings

## Project Context

- Dev-crew uses TWO codebases:
  - `portal/` — the main portal app (bugs, FRs, dev cycles, pipeline). This is the primary application coders modify.
  - `Source/` — the workflow engine (work items, assessment pod). Separate domain, separate FR namespace.
  - The traceability enforcer (`tools/traceability-enforcer.py`) only scans `Source/` and `E2E/`, NOT `portal/`.

## FR Numbering in portal/

- `portal/` uses formal numbered FRs that do NOT appear in `Specifications/dev-workflow-platform.md` beyond FR-069.
- As of 2026-04-14, portal code uses FRs up to **FR-095**. New portal FRs should start at **FR-096**.
- Some portal/ code uses informal FR IDs like `FR-dependency-linking` — these are placeholders, not canonical FRs.

## Dependency Linking Feature (Plans/dependency-linking)

- As of 2026-04-14, the dependency linking feature is **~90% implemented** in `portal/`:
  - `portal/Shared/types.ts` has all types: DependencyLink, AddDependencyRequest, ReadyResponse, `pending_dependencies` status, `blocked_by`/`blocks`/`has_unresolved_blockers` on Bug and FeatureRequest.
  - `portal/Backend/src/services/dependencyService.ts` — full implementation (335 lines).
  - Backend routes for bugs and feature-requests have dependency endpoints and dispatch gating.
  - Frontend components `BlockedBadge`, `DependencySection`, `DependencyPicker` all exist and are integrated.
  - Backend test coverage: `portal/Backend/tests/dependencies.test.ts` (401 lines).
  - Frontend test coverage: `portal/Frontend/tests/DependencyPicker.test.tsx` (321 lines).
- **Remaining gaps**: seed data, `blocked_by` type in `portal/Shared/api.ts`, DependencySection tests, extended list-view tests.

## Portal Architecture Patterns

- Services live in `portal/Backend/src/services/`; routes in `portal/Backend/src/routes/`. Routes never call the DB directly — they use services. This is correctly enforced.
- Seed / demo data has no dedicated `seed.ts` — it is inserted inside `runMigrations()` in `portal/Backend/src/database/schema.ts` after CREATE TABLE statements.
- Frontend tests are in `portal/Frontend/tests/` (not `src/__tests__/`).
- Frontend API calls go through `portal/Frontend/src/api/client.ts`; shared type definitions are in `portal/Shared/api.ts`.

## Duplicate/Deprecated Status Pattern

- Both BugStatus and FeatureRequestStatus include `duplicate` and `deprecated` statuses.
- The `listBugs` / `listFeatureRequests` functions have an `include_hidden` option to exclude these statuses from normal list views.

## Cycle Service Dispatch Gating

- Cycle creation (`cycleService.createCycle`) selects ONLY `triaged` bugs and `approved` FRs.
- Items with `pending_dependencies` status are naturally excluded — no special gating code is needed in the cycle service.
