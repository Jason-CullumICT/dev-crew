# Pen Tester — Learnings

<!-- Updated after each Guardian run. Record attack surfaces unique to this codebase, auth patterns, IDOR-prone routes, logic flaws found historically. -->

## Run: 2026-07-27

### Architecture Fingerprint
- **Backend:** Express 4.x, TypeScript, pino logging, prom-client Prometheus metrics.
- **Storage:** Pure in-memory `Map<string, WorkItem>` — no persistence, no DB. All data is lost on restart; all enumeration is viable for the run's lifetime.
- **Auth:** **None.** There is zero authentication or authorization middleware on any route. Every finding in this codebase compounds with this baseline.

### IDOR-Prone Routes (High Priority)
All routes under `/api/work-items/:id/` are IDOR-prone by construction:
- `GET /:id` — direct lookup by UUID, no ownership check.
- `PATCH /:id` — direct update, no ownership check.
- `DELETE /:id` — soft-delete, no ownership check.
- `POST /:id/route`, `/:id/assess`, `/:id/approve`, `/:id/reject`, `/:id/dispatch` — all workflow actions.
- `POST /:id/dependencies`, `GET /:id/ready` — dependency management.

The store uses `findById()` → `items.get(id)` with a `deleted` check. The `id` is a UUID (v4), which is non-guessable, but list endpoints return all IDs to any caller, enabling enumeration.

### Business Logic Hotspots
1. **Fast-track override**: `POST /api/work-items/:id/route` body `{ "overrideRoute": "fast-track" }` → skips assessment pod entirely, moves directly to Approved. No permission check.
2. **Manual approve**: `POST /api/work-items/:id/approve` is allowed from `routing`, `proposed`, and `reviewing` states — no role guard. Any anonymous caller can short-circuit the workflow.
3. **Intake endpoints unvalidated**: `/api/intake/zendesk` and `/api/intake/automated` accept `type` and `priority` from the request body without enum validation. The main CRUD POST route validates these; the intake routes do not.
4. **Soft-deleted blocker trap**: `computeHasUnresolvedBlockers()` uses `findById` (which returns `undefined` for deleted items), treating a deleted blocker as "unresolved." Items blocked by a soft-deleted item become permanently un-dispatchable.
5. **Re-assess idempotency**: Calling `/assess` multiple times on a `reviewing` item appends duplicate assessment records and change history entries each time.

### State Machine Map
```
backlog → routing → proposed → reviewing → approved → in-progress → completed
                            ↘            ↗                        ↘ failed
                              rejected → backlog
```
Valid manual overrides (no auth required):
- `backlog → approved` (via `/route?overrideRoute=fast-track`)
- `routing → approved` (via `/approve`)
- `proposed → approved` (via `/approve`, skipping assess)

### Prometheus Attack Surface
- Labels `source`, `type` on `workflow_items_created_total` are user-controlled via intake endpoints.
- Label cardinality explosion possible via repeated requests with unique `type` strings.
- `/metrics` endpoint is publicly accessible, no auth.

### Pagination / DoS Notes
- `GET /api/work-items?limit=N` — no upper bound; can return entire store.
- `GET /api/dashboard/activity?limit=N` — aggregates ALL change history entries across ALL items in memory before slicing; O(items × history_depth) operation, unbounded.

### Notable Absence: Search Endpoint Not Implemented
- `/api/search?q=` is called by the frontend `DependencyPicker` typeahead.
- The test file `tests/routes/search.test.ts` explicitly notes the route is NOT wired in `app.ts` and the tests are expected to fail.
- When implemented, this endpoint will need: input sanitization, soft-delete exclusion, and pagination.
