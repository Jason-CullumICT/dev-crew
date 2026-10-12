# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaw hotspots. -->

## Run: 2026-10-12

### Architecture Notes
- **No auth layer exists anywhere.** The entire Express app (`app.ts`) has no authentication or authorization middleware. Every finding builds on this baseline. Check `app.ts` first in future runs — if auth is added, most current findings will change severity.
- **In-memory store only.** `workItemStore.ts` uses a `Map<string, WorkItem>`. No database, no persistence across restarts. This means all attacks are ephemeral, but also means there are no SQL injection vectors — the attack surface is pure business logic and HTTP API.
- **Primary ID is UUID v4; docId is sequential WI-001, WI-002...** The sequential `docId` is returned in all responses and embedded in change history notes, enabling item count enumeration even for an attacker with no other data.

### Logic Flaw Hotspots
- **`computeHasUnresolvedBlockers()` in `dependency.ts:64-75`** — treats soft-deleted blockers as unresolved. Soft-delete cleans the item but NOT its reverse index entries in dependents. Permanently locks dependents if their blocker is deleted.
- **`setDependencies()` via PATCH** — bulk dependency replacement is exposed on the general-purpose PATCH endpoint (workItems.ts:120-129). This is a high-impact workflow control with no privilege check.
- **Cascade dispatch in `onItemResolved()` (dependency.ts:251-315)** — triggered on rejection only (not soft-delete, not completion called from test paths). The cascade auto-dispatch does NOT revalidate team names the way the `/dispatch` route does.
- **Assessment pod bypass paths:** (1) `POST /:id/approve` manual override, (2) `POST /:id/route` with `overrideRoute: "fast-track"`. Both require no auth and no role. Feature items should always require full-review per spec but the override ignores item type.

### IDOR-Prone Routes
- All routes use UUID as the primary lookup key (non-enumerable). However, the `docId` field in responses enables indirect enumeration of total historical creation count.
- `GET /api/work-items/:id` with a soft-deleted UUID returns 404 — correct. But dependency arrays in other items retain stale UUIDs of deleted items (no cascade cleanup).

### Intake Webhook Pattern
- `/api/intake/zendesk` and `/api/intake/automated` skip enum validation for `type` and `priority` using `||` fallback. The main `/api/work-items` POST DOES validate. Always check intake-specific routes separately from the main CRUD route — they tend to have weaker validation.

### Pagination Pattern
- Both paginated endpoints (`/api/work-items`, `/api/dashboard/activity`) use raw `parseInt` on `page` and `limit` with no cap or NaN guard. Test `limit=999999`, `page=-1`, `page=abc` on any paginated endpoint in this codebase.

### Metrics Endpoint
- `GET /metrics` is public, unauthenticated. Exposes counter breakdowns by team, type, source, verdict. Future runs should check if any auth is added here.
