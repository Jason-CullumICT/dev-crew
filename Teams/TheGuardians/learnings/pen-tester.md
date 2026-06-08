# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-06-08

### Architecture Observations
- **Fully unauthenticated Express API** — no auth middleware whatsoever in `app.ts`. Every finding is amplified by this root cause.
- **In-memory store** (`workItemStore.ts`) — a `Map<string, WorkItem>`. Not persistent across restarts. All items are accessible by UUID. No tenant isolation.
- **Single source of IDs** — UUIDs via `uuid` package (v4), plus sequential `WI-NNN` docIds. DocIds are predictable (WI-001, WI-002, ...) but UUIDs are random.

### Attack Surface Hotspots
1. **`POST /api/work-items/:id/route`** — highest-value endpoint. `overrideRoute: "fast-track"` bypasses the entire assessment pipeline and directly sets status = `approved`. No auth, no role check.
2. **`POST /api/intake/*` endpoints** — completely skip the enum validation that `POST /api/work-items` applies. Can inject items with arbitrary `type`/`priority` strings. No HMAC verification.
3. **`onItemResolved()` in `dependency.ts`** — called on reject; auto-dispatches dependent approved items. Unauthenticated rejection can trigger cascade dispatch.
4. **`computeHasUnresolvedBlockers()` / `isReady()`** — treats soft-deleted blockers as unresolved. Deleting a blocker item after adding a dependency creates a permanent phantom block.

### Business Logic Flaws
- **`NeedsClarification` → `Rejected`**: In `assessWorkItem()`, any non-Approve verdict (including NeedsClarification from domain-expert) maps to `Rejected` status. Items with missing `complexity` silently get rejected. This is exploitable to force cascade dispatches via dependency chain.
- **Transient `routing` state in `VALID_STATUS_TRANSITIONS`**: The transition table explicitly allows `routing → approved`, but the route handler skips this state on normal paths. Any future code leaving an item in `routing` would allow the approve shortcut.

### Enum Validation Gap Pattern
- `POST /api/work-items` (workItems.ts lines 29–50): **validates** all enums.
- `POST /api/intake/zendesk` and `POST /api/intake/automated` (intake.ts): **no validation** of `type` or `priority`. Classic inconsistency between "main" and "webhook" paths.

### Dashboard Enumeration
- `GET /api/dashboard/queue` returns **full WorkItem objects** including UUIDs, changeHistory, assessments, blockedBy, blocks. Best endpoint for ID enumeration — no auth needed.
- Pagination limit is unbounded on both `/api/work-items` and `/api/dashboard/activity`.

### Dependencies to Watch
- If a real database is added, the non-atomic routing state transition (backlog→routing→final in one DB call) could become a real race condition.
- `setDependencies()` is not atomic: removes all then adds. Concurrent calls can create inconsistent state.

### No Middleware Stack
The app has: body parser → debug logger → routes → error handler. No: CORS, helmet, rate limiter, auth, CSRF, request size limit (Express default 100kb body limit applies).
