# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-10-26

### Architecture Patterns to Always Check
- **In-memory store (Map)** — no persistence, no row-level auth. All data is accessible to any caller who knows or guesses a UUID. UUIDs are returned in every API response so enumeration is trivial via PEN-006.
- **Single-file `app.ts` middleware stack** — check this first for auth/CORS/rate-limit presence. If only `errorHandler` is in `middleware/`, the API is wide open.
- **`overrideRoute` parameter on route endpoint** — this is the primary fast-track bypass vector. Always check for unauthenticated route overrides in workflow state machines.
- **`onItemResolved` cascade in dependency service** — called from the reject endpoint, auto-dispatches dependents without human gate. Rejecting any blocker item triggers silent team dispatch for all approved dependents.

### IDOR-Prone Routes
- All `/api/work-items/:id/*` endpoints (GET, PATCH, DELETE, route, assess, approve, reject, dispatch, dependencies, ready).
- IDs are UUID v4 (random, non-sequential) but are fully exposed in every list/detail response.

### Logic Flaw Hotspots
- `computeHasUnresolvedBlockers()` in `dependency.ts` — soft-deleted blocker returns `undefined` from `findById()`, treated as unresolved. Can permanently block dispatch.
- `classifyRoute()` in `router.ts` — `overrideRoute` is accepted verbatim without authorization; "fast-track" skips assessment pod entirely.
- Intake routes (`intake.ts`) — `body.type` and `body.priority` fall back to defaults but are NOT validated against enums; invalid enum strings propagate into the store.

### Missing Routes
- `GET /api/search?q=` — referenced by frontend `DependencyPicker` but not implemented in `app.ts`. Frontend dependency picker non-functional; tests document the gap explicitly.
