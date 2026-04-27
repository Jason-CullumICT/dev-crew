# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-04-27

### Codebase Architecture (for future runs)
- **Backend:** Express 4.18 / TypeScript, **no auth middleware whatsoever**, in-memory Map store
- **No database:** pure in-memory; no SQL/NoSQL injection surface; no persistence
- **State machine is central:** all security-relevant logic flows through `VALID_STATUS_TRANSITIONS` in `Source/Shared/types/workflow.ts`
- **Two ID types:** `id` (UUID v4, used as route param) and `docId` (sequential `WI-NNN`, used in UI and logs)

### Unique Attack Patterns Discovered

#### 1. Fast-Track Override — Critical Bypass
- `POST /api/work-items/:id/route` with body `{"overrideRoute":"fast-track"}` immediately approves any backlog item
- No auth, no role check; this is THE primary state machine bypass
- Lives in `Source/Backend/src/services/router.ts` `classifyRoute()` function

#### 2. Dual Approval Bypass Paths
- Path A: route with `overrideRoute: "fast-track"` (backlog → approved in one call)
- Path B: `/approve` endpoint skips assessment for `proposed`, `reviewing`, `routing` states
- Both work without authentication

#### 3. Intake Webhook No Enum Validation
- `/api/intake/zendesk` and `/api/intake/automated` pass `body.type` and `body.priority` raw to store
- Main creation route validates enums; intake routes do NOT
- Can inject items with `type: "anything"` that poison routing and assessment logic

#### 4. Dependency DoS via Soft-Delete
- Adding a soft-deleted item as a blocker creates a permanent unresolvable block
- `computeHasUnresolvedBlockers` treats `findById() === undefined` (deleted) as "unresolved"
- Recovery requires calling `removeDependency` manually — which IS possible via the API even after blocker deletion

#### 5. Unbounded Pagination
- `?limit=999999` on `GET /api/work-items` and `GET /api/dashboard/activity` returns all records
- No server-side cap; validated by tracing `parseInt(req.query.limit)` → `slice(offset, offset + limit)` with no max

#### 6. Cascade Auto-Dispatch on Rejection
- When an item is rejected, `onItemResolved` auto-dispatches its dependents (items it blocks)
- `RESOLVED_STATUSES` includes `Rejected` and `Failed`
- Business logic: rejection unblocks dependents even though the blocking work was not completed

### IDOR-Prone Routes
- `GET /api/work-items/:id` — UUID-based; no ownership check; any ID returns full data
- `GET /api/work-items/:id/ready` — readiness exposed without auth
- All workflow action routes (`/route`, `/assess`, `/approve`, `/reject`, `/dispatch`) — operate on any item by UUID

### Logic Flaw Hotspots
- `Source/Backend/src/services/dependency.ts` — `computeHasUnresolvedBlockers` soft-delete interaction
- `Source/Backend/src/services/router.ts` — `classifyRoute` overrideRoute bypass
- `Source/Backend/src/routes/intake.ts` — missing enum validation
- `Source/Backend/src/routes/workItems.ts` line 69-74 — no pagination upper bound

### What Was Explicitly NOT Found
- No SQL/NoSQL injection (in-memory store only)
- No file path traversal (no file operations)
- No hardcoded secrets in source (credentials are in .env per CLAUDE.md)
- No JWT/session token issues (no auth at all — more fundamental problem)
- No prototype pollution in JSON body parsing (Express JSON parser handles this)
