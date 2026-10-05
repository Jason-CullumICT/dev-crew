# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-10-05

### Architecture Facts
- **In-memory store only** (`Source/Backend/src/store/workItemStore.ts` — `Map<string, WorkItem>`). No database. All state lost on restart. Red teamer must set up state within a single session.
- **All IDs are UUIDv4** — unpredictable. DocIDs (`WI-001`, `WI-002`) are sequential integers but are cosmetic, not used as route params.
- **No authentication layer exists anywhere** — zero middleware guards any endpoint. Treat every endpoint as world-writable.

### High-Value Attack Patterns Unique to This Codebase

1. **State Machine Bypass via `overrideRoute`** — `POST /api/work-items/:id/route` with `{"overrideRoute":"fast-track"}` jumps any `Backlog` item directly to `Approved` status, bypassing the full assessment pod pipeline. This is the highest-leverage single API call in the system.

2. **Dashboard as ID Enumeration Oracle** — `GET /api/dashboard/queue` returns the full UUID of every work item. Use this to build a target list before attempting workflow actions. More reliable than paginating `/api/work-items`.

3. **Intake Endpoints as Injection Point** — `POST /api/intake/zendesk` and `/api/intake/automated` skip enum validation on `type` and `priority`. Can inject arbitrary string values into work items. These endpoints also have no webhook signature checking.

4. **Unbounded Pagination** — `GET /api/work-items?limit=999999` dumps the entire store. No cap enforced at any layer.

5. **Assessment NeedsClarification = Silent Reject** — items without `complexity` set will be silently rejected (not just deferred) when assessed. Useful for understanding unexpected state transitions.

### IDOR-Prone Routes
- `GET /api/work-items/:id` — returns 404 for soft-deleted items (not a true IDOR, but confirms UUID existence/deletion state)
- `POST /api/work-items/:id/approve|reject|dispatch|route|assess` — any known UUID can be targeted, no ownership check
- `POST /api/work-items/:id/dependencies` — dependency graph traversal with any two valid UUIDs

### Logic Flaw Hotspots
- `Source/Backend/src/services/assessment.ts` lines 162–168: `NeedsClarification` mapped to `Rejected` in status transition
- `Source/Backend/src/services/router.ts` lines 66–75: `overrideRoute` bypasses all classification logic
- `Source/Backend/src/routes/intake.ts` lines 22–23, 44–45: no enum validation on user-supplied `type`/`priority`
- `Source/Backend/src/routes/workItems.ts` lines 68–70: no upper-bound on `limit` query parameter

### Endpoints With No Protection
All 14 API routes are unauthenticated. Most dangerous for red team:
- `POST /api/work-items/:id/approve` — approve any item
- `POST /api/work-items/:id/dispatch` — dispatch any approved item
- `POST /api/intake/zendesk` — inject items as fake Zendesk events
- `DELETE /api/work-items/:id` — soft-delete any item
