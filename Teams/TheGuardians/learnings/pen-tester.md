# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-08-31

### Architecture Snapshot
- **Stack:** Express/TypeScript, in-memory `Map` store (no DB, no persistence)
- **Auth:** NONE — entire API is unauthenticated
- **IDs:** UUID v4 (`id`), sequential docId (`WI-NNNN`)
- **State machine:** Enforced per route handler (not in middleware), bypassable via `overrideRoute`

### IDOR-Prone Routes
- `GET /api/work-items/:id` — returns 404 for soft-deleted items (correct), but DependencyLink objects inside `blockedBy`/`blocks` arrays still contain docIds of deleted items
- `GET /api/work-items/:id/ready` — `unresolvedBlockers` array leaks docIds of soft-deleted blockers
- `POST /api/work-items/:id/dependencies` — error message reveals whether item exists ("not found" vs "self-reference") — enables existence enumeration

### State Machine Bypass Patterns
- `POST /api/work-items/:id/route {"overrideRoute":"fast-track"}` → directly reaches `Approved`, skipping assessment pod; no auth check
- `POST /api/work-items/:id/approve` — allows manual approval from `proposed`, `reviewing`, or `routing`; no role check
- `PATCH /api/work-items/:id {"blockedBy":[]}` → strips all blockers, clearing `hasUnresolvedBlockers` — bypasses dispatch gating

### Logic Flaw Hotspots
- **Intake endpoints** (`/api/intake/zendesk`, `/api/intake/automated`) have NO enum validation on `type` and `priority` — arbitrary strings stored as work item fields
- **Rejection cascade** (`onItemResolved` called from reject endpoint only): rejecting any blocker auto-dispatches its dependents; `onItemResolved` is NOT called when items complete (no complete endpoint exists in the API)
- **Pagination**: no upper limit on `limit` param; `NaN` from non-numeric input silently returns empty dataset with 200 OK
- **Dependency manipulation on any-status item**: `PATCH blockedBy` has no status guard — can clear blockers from `in-progress` or `completed` items

### Metrics Endpoint
- `GET /metrics` is unauthenticated and exposes operational counters — useful for confirming store state before enumerating

### Non-Findings (Do Not Re-probe)
- SQL injection: No SQL database — in-memory Map only
- XSS via stored data: No HTML rendering in backend
- Path traversal: No filesystem access in routes
- Status via PATCH: `status` is not in the PATCH `allowedFields` list — cannot set status via PATCH directly
